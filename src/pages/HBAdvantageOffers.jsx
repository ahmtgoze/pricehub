import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Upload, Download, Filter, AlertCircle, Info, Trash2, Sparkles } from 'lucide-react';
import { calculatePriceBreakdown, findDesiShippingRate } from '@/components/PriceCalculationEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import PriceDetailModal from '@/components/modals/PriceDetailModal';

const Product = db.entities.Product;
const Platform = db.entities.Platform;
const Commission = db.entities.Commission;
const ShippingRate = db.entities.ShippingRate;
const MarketplaceProduct = db.entities.MarketplaceProduct;

// Excel başlıklarındaki satır sonu/çoklu boşlukları normalize eder ("Teklif 1 \nKatılabileceğiniz Maximum Fiyat\n" → tek satır)
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const normalizeRow = (row) => {
  const nr = {};
  Object.keys(row).forEach((k) => { nr[norm(k)] = row[k]; });
  return nr;
};
// "7,4 %" / "17,00 %" → 7.4 / 17
const parsePercent = (v) => {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace('%', '').replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const parseNum = (v) => {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
// HB komisyonları KDV hariç gelir; kasadan çıkan gerçek oran = ham × 1,20
const withVatRate = (rate) => Math.round((rate || 0) * 1.2 * 100) / 100;
const commLabel = (rate) => `%${rate || 0} (KDV'li %${withVatRate(rate)})`;

export default function HBAdvantageOffers() {
  const [userEmail, setUserEmail] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [uploadedData, setUploadedData] = useState([]);
  const [originalExcelData, setOriginalExcelData] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [detailModal, setDetailModal] = useState({ open: false, product: null, priceData: null, calculationDetails: null });

  React.useEffect(() => {
    db.auth.me().then((user) => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: platforms = [] } = useQuery({ queryKey: ['platforms', userEmail], queryFn: () => Platform.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: products = [] } = useQuery({ queryKey: ['products', userEmail], queryFn: () => Product.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: commissions = [] } = useQuery({ queryKey: ['commissions', userEmail], queryFn: () => Commission.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: shippingRates = [] } = useQuery({ queryKey: ['shippingRates'], queryFn: () => ShippingRate.list('-id', 10000), enabled: !!userEmail });
  const { data: packages = [] } = useQuery({ queryKey: ['packages'], queryFn: () => db.entities.Package.list(), enabled: !!userEmail });
  const { data: settings = [] } = useQuery({ queryKey: ['settings', userEmail], queryFn: () => db.entities.Settings.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: marketplaceProducts = [] } = useQuery({ queryKey: ['marketplaceProducts', userEmail], queryFn: () => MarketplaceProduct.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: productPrices = [] } = useQuery({ queryKey: ['productPrices', userEmail], queryFn: () => db.entities.ProductPrice.filter({ created_by: userEmail }), enabled: !!userEmail });

  const uniquePlatforms = platforms.filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);
  const hbPlatforms = uniquePlatforms
    .filter((p) => p.platform_type === 'hepsiburada' && p.is_active !== false)
    .filter((p, idx, arr) => arr.findIndex((x) => x.name === p.name) === idx);
  const hasHepsiburada = hbPlatforms.length > 0;

  React.useEffect(() => {
    if (hbPlatforms.length >= 1 && !selectedPlatform) setSelectedPlatform(hbPlatforms[0].name);
  }, [hbPlatforms.length]);

  const getMatchedProduct = (item) => {
    if (item.matched_product_id) {
      const direct = products.find((p) => String(p.id) === String(item.matched_product_id));
      if (direct) return direct;
    }
    const mp = marketplaceProducts.find((m) =>
      m.platform_account === selectedPlatform && m.matched_product_id &&
      ((item.sku && (m.hb_sku === item.sku || m.barkod === item.sku)) || (item.barcode && m.barkod === item.barcode))
    );
    if (mp) {
      const p = products.find((x) => String(x.id) === String(mp.matched_product_id));
      if (p) return p;
    }
    if (item.seller_stock_code) {
      const bysku = products.find((p) => p.sku === item.seller_stock_code);
      if (bysku) return bysku;
    }
    if (item.sku) {
      const bysku = products.find((p) => p.sku === item.sku);
      if (bysku) return bysku;
    }
    return null;
  };

  const getPackageCost = (packageId) => packages.find((p) => p.id === packageId)?.total_cost || 0;

  // Kategoriye göre güncel komisyon; bulunamazsa Excel'deki "Güncel Komisyon".
  const getCurrentCommission = (item) => {
    const matchedProduct = getMatchedProduct(item);
    const hbIds = hbPlatforms.map((p) => String(p.id));
    const hbNames = hbPlatforms.map((p) => (p.name || '').toLowerCase().trim());
    if (matchedProduct) {
      const c = commissions.find((c) =>
        c.is_active !== false &&
        (hbIds.includes(String(c.platform_id)) || hbNames.includes((c.platform_name || '').toLowerCase().trim())) &&
        ((matchedProduct.category_id && String(c.category_id) === String(matchedProduct.category_id)) ||
         (matchedProduct.category_name && (c.category_name || '').toLowerCase().trim() === (matchedProduct.category_name || '').toLowerCase().trim()))
      );
      if (c?.commission_rate > 0) return c.commission_rate;
    }
    return item.current_commission || 0;
  };

  const getSystemPrice = (item) => {
    const matchedProduct = getMatchedProduct(item);
    if (!matchedProduct) return null;
    const platform = uniquePlatforms.find((p) => p.name === selectedPlatform);
    if (!platform) return null;
    const priceInfo = productPrices.find((pp) => pp.product_id === matchedProduct.id && pp.platform_id === platform.id);
    const commissionRate = getCurrentCommission(item);
    const basePrice = priceInfo?.sale_price || item.current_price || 0;
    if (!basePrice) return priceInfo ? { ...priceInfo, commission_rate: commissionRate } : null;
    const calc = calculateProfit(basePrice, commissionRate, item);
    return {
      ...(priceInfo || {}),
      sale_price: basePrice,
      commission_rate: commissionRate,
      net_profit: calc.profit,
      profit_rate: calc.profitRate,
      barem_used: calc.baremUsed || 'desi',
    };
  };

  function calculateProfit(price, commissionRate, item) {
    try {
      if (!price || price <= 0) return { profit: 0, profitRate: 0, breakdown: null };
      const matchedProduct = getMatchedProduct(item);
      if (!matchedProduct) return { profit: 0, profitRate: 0, breakdown: null };
      const platform = uniquePlatforms.find((p) => p.name === selectedPlatform);
      if (!platform) return { profit: 0, profitRate: 0, breakdown: null };

      const platformShippingRates = shippingRates.filter((r) =>
        r.is_active !== false && (r.platform_id === platform.id || r.platform_type === platform.platform_type)
      );

      let packagingCost = 0;
      if (matchedProduct.multi_package && matchedProduct.packages) {
        try {
          const pp = typeof matchedProduct.packages === 'string' ? JSON.parse(matchedProduct.packages) : matchedProduct.packages;
          for (const pkg of pp) { if (pkg.package_id) packagingCost += getPackageCost(pkg.package_id); }
        } catch (e) { packagingCost = 0; }
      } else if (matchedProduct.package_id || matchedProduct.auto_package_id) {
        packagingCost = getPackageCost(matchedProduct.package_id || matchedProduct.auto_package_id);
      }

      let shippingCost = 0;
      let shippingVatRate = 20;
      let baremUsed = 'desi';
      const canUseBarem = !matchedProduct.special_shipping && !matchedProduct.multi_package;
      if (canUseBarem && price > 0) {
        if (price <= 149.99) {
          const r = platformShippingRates.find((r) => r.rate_type === 'barem1');
          if (r) { shippingCost = r.price; shippingVatRate = r.vat_rate || 20; baremUsed = 'barem1'; }
        } else if (price <= 299.99) {
          const r = platformShippingRates.find((r) => r.rate_type === 'barem2');
          if (r) { shippingCost = r.price; shippingVatRate = r.vat_rate || 20; baremUsed = 'barem2'; }
        }
      }
      if (shippingCost === 0) {
        if (matchedProduct.multi_package && matchedProduct.packages) {
          try {
            const pp = typeof matchedProduct.packages === 'string' ? JSON.parse(matchedProduct.packages) : matchedProduct.packages;
            if (matchedProduct.special_shipping) {
              const rc = settings.find((s) => s.setting_key === 'return_cost_per_package');
              const rcv = rc ? parseFloat(rc.setting_value) : 180.096;
              for (const pkg of pp) { const dr = findDesiShippingRate(platformShippingRates, pkg.desi || 0); if (dr) { shippingCost += (dr.price * 2) + rcv; shippingVatRate = dr.vat_rate || 20; } }
            } else {
              for (const pkg of pp) { const dr = findDesiShippingRate(platformShippingRates, pkg.desi || 0); if (dr) { shippingCost += dr.price; shippingVatRate = dr.vat_rate || 20; } }
            }
          } catch (e) {
            const dr = findDesiShippingRate(platformShippingRates, matchedProduct.desi || 0);
            shippingCost = dr?.price || 0; shippingVatRate = dr?.vat_rate || 20;
          }
        } else {
          const dr = findDesiShippingRate(platformShippingRates, matchedProduct.desi || 0);
          shippingCost = dr?.price || 0; shippingVatRate = dr?.vat_rate || 20;
        }
        baremUsed = 'desi';
      }

      const breakdown = calculatePriceBreakdown({
        salePriceInclVat: parseFloat(price),
        productCost: parseFloat(matchedProduct.cost) || 0,
        productVatRate: parseFloat(matchedProduct.vat_rate) || 20,
        shippingCost: parseFloat(shippingCost) || 0,
        shippingVatRate: parseFloat(shippingVatRate) || 20,
        commissionRate: parseFloat(commissionRate) || 0,
        commissionVatRate: 20,
        platform,
        baremUsed,
        packagingCost: parseFloat(packagingCost) || 0,
        printingCost: parseFloat(matchedProduct.printing_cost) || 0,
        extraCost: parseFloat(matchedProduct.extra_cost) || 0,
        isSameDayDelivery: matchedProduct.same_day_delivery || false,
      });

      return { profit: parseFloat(breakdown.netProfit) || 0, profitRate: parseFloat(breakdown.profitRate) || 0, breakdown, matchedProduct, platform, baremUsed };
    } catch (error) {
      return { profit: 0, profitRate: 0, breakdown: null };
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedPlatform) { toast.error('Lütfen önce platform seçin'); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        // "Teklifler" sayfasını bul; yoksa "Fiyat Gir" başlığı olan sayfayı dene
        let sheetName = workbook.SheetNames.find((n) => norm(n) === 'Teklifler');
        if (!sheetName) {
          sheetName = workbook.SheetNames.find((n) => {
            const r = XLSX.utils.sheet_to_json(workbook.Sheets[n], { header: 1, defval: '' })[0] || [];
            return r.map(norm).includes('Fiyat Gir');
          }) || workbook.SheetNames[workbook.SheetNames.length - 1];
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setOriginalExcelData({ workbook, sheetName });

        const parsed = jsonData.map((raw) => {
          const row = normalizeRow(raw);
          const sku = String(row['SKU'] ?? '').trim();
          const item = {
            offer_code: row['Teklif Kodu'] ?? '',
            product_name: row['Ürün Adı'] ?? '',
            sku,
            seller_stock_code: String(row['Satıcı Stok Kodu'] ?? row['Satıcı stok kodu'] ?? '').trim(),
            barcode: String(row['Barkod'] ?? '').trim(),
            category: row['Kategori'] ?? '',
            stock: parseNum(row['Mevcut Stok'] ?? row['Stok']),
            current_price: parseNum(row['Güncel Fiyat']),
            current_commission: parsePercent(row['Güncel Komisyon']),
            tier1_price: parseNum(row['Teklif 1 Katılabileceğiniz Maximum Fiyat']),
            tier1_commission: parsePercent(row['Komisyon Teklifi 1']),
            tier2_price: parseNum(row['Teklif 2 Katılabileceğiniz Maximum Fiyat']),
            tier2_commission: parsePercent(row['Komisyon Teklifi 2']),
            tier3_price: parseNum(row['Teklif 3 Katılabileceğiniz Maximum Fiyat']),
            tier3_commission: parsePercent(row['Komisyon Teklifi 3']),
            selected_tier: 'none',
            selected_price: 0,
            manual_price: 0,
          };
          const matched = getMatchedProduct(item);
          item.matched_product_id = matched?.id || null;
          return item;
        }).filter((it) => it.sku || it.product_name);

        setUploadedData(parsed);
        toast.success(`${parsed.length} teklif yüklendi`);
      } catch (error) {
        toast.error('Excel dosyası okunamadı: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const tierInfo = (item, n) => ({ price: item[`tier${n}_price`] || 0, commission: item[`tier${n}_commission`] || 0 });

  const handleTierSelect = (item, tier, price) => {
    setUploadedData((prev) => prev.map((it) => {
      if (it !== item) return it;
      if (it.selected_tier === tier) return { ...it, selected_tier: 'none', selected_price: 0 };
      return { ...it, selected_tier: tier, selected_price: price, ...(tier === 'manual' ? { manual_price: price } : {}) };
    }));
  };

  const handleManualPriceChange = (item, value) => {
    const manualPrice = parseFloat(value) || 0;
    setUploadedData((prev) => prev.map((it) => (it === item ? { ...it, manual_price: manualPrice } : it)));
  };

  const manualCommissionFor = (item, price) => {
    if (price <= 0) return getCurrentCommission(item);
    if (item.tier3_price && price <= item.tier3_price) return item.tier3_commission;
    if (item.tier2_price && price <= item.tier2_price) return item.tier2_commission;
    if (item.tier1_price && price <= item.tier1_price) return item.tier1_commission;
    return getCurrentCommission(item);
  };

  const handleSmartAutoSelect = () => {
    let count = 0, skippedNoMatch = 0;
    const updated = uploadedData.map((item) => {
      if (item.selected_tier !== 'none' || (item.manual_price && item.manual_price > 0)) return item;
      if (!getMatchedProduct(item)) { skippedNoMatch++; return item; }
      const candidates = [1, 2, 3]
        .map((n) => ({ tier: `tier${n}`, ...tierInfo(item, n) }))
        .filter((c) => c.price > 0)
        .map((c) => ({ ...c, ...calculateProfit(c.price, c.commission, item) }));
      const best = candidates.filter((c) => c.profit > 0).sort((a, b) => b.profit - a.profit)[0];
      if (best) { count++; return { ...item, selected_tier: best.tier, selected_price: best.price }; }
      return item;
    });
    setUploadedData(updated);
    const parts = [];
    if (count > 0) parts.push(`✅ ${count} teklif seçildi`);
    if (skippedNoMatch > 0) parts.push(`⚠️ ${skippedNoMatch} ürün eşleşmedi`);
    if (count === 0) toast.warning(parts.join(' • ') || 'Kârlı teklif bulunamadı');
    else toast.success(parts.join(' • '));
  };

  const openDetailModal = (price, commissionRate, item) => {
    const calc = calculateProfit(price, commissionRate, item);
    const matchedProduct = calc.matchedProduct || getMatchedProduct(item);
    setDetailModal({
      open: true,
      product: matchedProduct,
      priceData: {
        sale_price: price,
        net_profit: calc.profit,
        profit_rate: calc.profitRate,
        shipping_cost: calc.breakdown?.shippingCost || 0,
        packaging_cost: calc.breakdown?.packagingCost || 0,
        commission_amount: calc.breakdown?.commissionAmount || 0,
        withholding_amount: calc.breakdown?.withholdingAmount || 0,
        service_fee: calc.breakdown?.serviceFee || 0,
        net_vat: calc.breakdown?.netVat || 0,
        barem_used: calc.baremUsed || 'none',
      },
      calculationDetails: {
        productCost: matchedProduct?.cost || 0,
        productVatRate: matchedProduct?.vat_rate || 20,
        commissionRate,
        packagingCost: calc.breakdown?.packagingCost || 0,
        printingCost: matchedProduct?.printing_cost || 0,
        extraCost: matchedProduct?.extra_cost || 0,
        shippingCost: calc.breakdown?.shippingCost || 0,
      },
    });
  };

  const handleExport = () => {
    if (uploadedData.length === 0 || !originalExcelData) { toast.error('Yüklenmiş Excel bulunamadı'); return; }
    const { workbook, sheetName } = originalExcelData;
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    // Başlık -> kolon index haritası (normalize ile)
    const headerCol = {};
    for (let C = range.s.c; C <= range.e.c; C++) {
      const h = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })]?.v;
      if (h) headerCol[norm(h)] = C;
    }
    const skuCol = headerCol['SKU'];
    const fiyatGirCol = headerCol['Fiyat Gir'];
    if (fiyatGirCol === undefined) { toast.error('"Fiyat Gir" sütunu bulunamadı'); return; }
    let written = 0;
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const sku = String(worksheet[XLSX.utils.encode_cell({ r: R, c: skuCol })]?.v ?? '').trim();
      const item = uploadedData.find((i) => i.sku === sku);
      if (item && item.selected_tier !== 'none' && item.selected_price > 0) {
        worksheet[XLSX.utils.encode_cell({ r: R, c: fiyatGirCol })] = { v: item.selected_price, t: 'n' };
        written++;
      }
    }
    XLSX.writeFile(workbook, `hepsiburada-avantajli-teklifler.xlsx`);
    toast.success(`${written} ürün için fiyat yazıldı, Excel indirildi`);
  };

  const allCategories = [...new Set(uploadedData.map((it) => getMatchedProduct(it)?.category_name || it.category).filter(Boolean))].sort();

  const filteredData = uploadedData.filter((item) => {
    if (searchTerm && !item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) && !item.sku?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory) {
      const cat = getMatchedProduct(item)?.category_name || item.category;
      if (cat !== filterCategory) return false;
    }
    if (minStock && item.stock < parseFloat(minStock)) return false;
    if (maxStock && item.stock > parseFloat(maxStock)) return false;
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'product_name_asc') return (a.product_name || '').localeCompare(b.product_name || '');
    if (sortBy === 'product_name_desc') return (b.product_name || '').localeCompare(a.product_name || '');
    if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
    if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
    return 0;
  });

  const selectedCount = uploadedData.filter((i) => i.selected_tier !== 'none').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Avantajlı Teklifler</h1>
          <p className="text-muted-foreground mt-1">Hepsiburada avantajlı teklif Excel'ini yükleyip kademe bazlı kârlılık analizi yapın</p>
        </div>

        {!hasHepsiburada && (
          <div className="mb-6 flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
            <div>
              <h3 className="font-semibold text-amber-900 text-base mb-1">Hepsiburada Platformu Aktif Değil</h3>
              <p className="text-amber-800 text-sm leading-relaxed">Bu sayfayı kullanabilmek için önce <strong>Platformlar</strong> bölümünden Hepsiburada platformunu aktive etmeniz gerekir.</p>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader><CardTitle>Platform ve Dosya</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform *</Label>
                {hbPlatforms.length === 1 ? (
                  <div className="flex items-center h-10 px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium">{hbPlatforms[0].name}</div>
                ) : (
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger><SelectValue placeholder="Platform seçin" /></SelectTrigger>
                    <SelectContent>{hbPlatforms.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => document.getElementById('hbOfferUpload').click()} disabled={!selectedPlatform} className="bg-gray-900 hover:bg-gray-800">
                <Upload className="mr-2 h-4 w-4" />{uploadedData.length > 0 ? 'Yeni Excel Yükle' : 'Excel Yükle'}
              </Button>
              <input id="hbOfferUpload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              {uploadedData.length > 0 && (
                <>
                  <Button onClick={handleSmartAutoSelect} className="bg-orange-500 hover:bg-orange-600 text-white gap-2"><Sparkles className="h-4 w-4" />Akıllı Otomatik Seç</Button>
                  <Button variant="outline" onClick={() => { setUploadedData([]); setOriginalExcelData(null); toast.success('Liste temizlendi'); }} className="text-rose-600 hover:bg-rose-50"><Trash2 className="mr-2 h-4 w-4" />Temizle</Button>
                  <Button variant="outline" onClick={() => setUploadedData(uploadedData.map((i) => ({ ...i, selected_tier: 'none', selected_price: 0 })))}>Seçimleri Kaldır</Button>
                  <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Excel İndir ({selectedCount})</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {uploadedData.length > 0 && (
          <>
            <Card className="mb-6">
              <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filtreler</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <Input placeholder="Ürün / SKU ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <Select value={filterCategory || 'all'} onValueChange={(val) => setFilterCategory(val === 'all' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Kategori</SelectItem>{allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Min Stok" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
                  <Input type="number" placeholder="Max Stok" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger><SelectValue placeholder="Sırala" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sıralama Yok</SelectItem>
                      <SelectItem value="product_name_asc">Ürün Adı (A-Z)</SelectItem>
                      <SelectItem value="product_name_desc">Ürün Adı (Z-A)</SelectItem>
                      <SelectItem value="stock_asc">Stok (Artan)</SelectItem>
                      <SelectItem value="stock_desc">Stok (Azalan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Kârlılık Analizi ({filteredData.length} teklif)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-3 text-left font-semibold min-w-[200px]">Ürün</th>
                        <th className="p-3 text-center font-semibold">Stok</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Güncel</th>
                        <th className="p-3 text-center font-semibold min-w-[150px]">Teklif 1</th>
                        <th className="p-3 text-center font-semibold min-w-[150px]">Teklif 2</th>
                        <th className="p-3 text-center font-semibold min-w-[150px]">Teklif 3</th>
                        <th className="p-3 text-center font-semibold min-w-[170px]">Manuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((item, index) => {
                        const matchedProduct = getMatchedProduct(item);
                        const currentComm = getCurrentCommission(item);
                        const currentCalc = item.current_price ? calculateProfit(item.current_price, currentComm, item) : { profit: 0, profitRate: 0 };
                        return (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{item.product_name}</div>
                              <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                              {matchedProduct ? <div className="text-xs text-emerald-600">{matchedProduct.category_name || matchedProduct.name}</div> : <div className="text-xs text-rose-500">eşleşmedi</div>}
                            </td>
                            <td className="p-3 text-center">{item.stock}</td>
                            <td className="p-3">
                              <div className="text-center">
                                <div className="font-semibold text-slate-900">₺{(item.current_price || 0).toFixed(2)}</div>
                                <div className="text-xs text-slate-500 mb-1">Kom: {commLabel(currentComm)}</div>
                                {matchedProduct && (
                                  <div className={`text-xs font-medium ${currentCalc.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₺{currentCalc.profit.toFixed(2)} (%{currentCalc.profitRate.toFixed(1)})</div>
                                )}
                              </div>
                            </td>
                            {[1, 2, 3].map((n) => {
                              const { price, commission } = tierInfo(item, n);
                              const { profit, profitRate } = calculateProfit(price, commission, item);
                              const isSelected = item.selected_tier === `tier${n}`;
                              return (
                                <td key={n} className="p-3">
                                  {price > 0 ? (
                                    <div className={`border rounded-lg p-2 ${isSelected ? 'border-gray-900 bg-gray-50' : 'border-slate-200'}`}>
                                      <div className="text-xs font-semibold text-slate-700 mb-1">₺{price.toFixed(2)} ve altı</div>
                                      <div className="text-xs text-slate-500">Kom: {commLabel(commission)}</div>
                                      <div className="flex items-center justify-between mt-1">
                                        <div className={`text-xs font-semibold ${profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{profit > 0 ? '+' : ''}₺{profit.toFixed(2)} (%{profitRate.toFixed(1)})</div>
                                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openDetailModal(price, commission, item)}><Info className="h-3 w-3" /></Button>
                                      </div>
                                      <Button size="sm" variant={isSelected ? 'default' : 'outline'} onClick={() => handleTierSelect(item, `tier${n}`, price)} className="w-full mt-2 h-7 text-xs">{isSelected ? 'Seçili' : 'Seç'}</Button>
                                    </div>
                                  ) : <div className="text-center text-slate-400 text-xs">-</div>}
                                </td>
                              );
                            })}
                            <td className="p-3">
                              <div className={`border rounded-lg p-2 ${item.selected_tier === 'manual' ? 'border-gray-900 bg-gray-50' : 'border-slate-200'}`}>
                                <div className="text-xs font-semibold text-slate-700 mb-2">Manuel Fiyat</div>
                                <Input type="number" step="0.01" value={item.manual_price || ''} onChange={(e) => handleManualPriceChange(item, e.target.value)} placeholder="Fiyat girin" className="h-8 text-xs mb-2" />
                                {item.manual_price > 0 && (() => {
                                  const comm = manualCommissionFor(item, item.manual_price);
                                  const { profit, profitRate } = calculateProfit(item.manual_price, comm, item);
                                  return (
                                    <div className="flex items-center justify-between mb-2">
                                      <div className={`text-xs font-semibold ${profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{profit > 0 ? '+' : ''}₺{profit.toFixed(2)} (%{profitRate.toFixed(1)})
                                        <Badge variant="outline" className="ml-1 text-[10px]">Kom: {commLabel(comm)}</Badge>
                                      </div>
                                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openDetailModal(item.manual_price, comm, item)}><Info className="h-3 w-3" /></Button>
                                    </div>
                                  );
                                })()}
                                <Button size="sm" variant={item.selected_tier === 'manual' ? 'default' : 'outline'} onClick={() => handleTierSelect(item, 'manual', item.manual_price)} className="w-full h-7 text-xs" disabled={!item.manual_price || item.manual_price <= 0}>{item.selected_tier === 'manual' ? 'Seçili' : 'Seç'}</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {uploadedData.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Upload className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">Henüz dosya yüklenmedi</p>
              <p className="text-sm text-slate-400">Hepsiburada "Avantajlı Teklifler" Excel dosyasını yükleyin</p>
            </CardContent>
          </Card>
        )}
      </div>

      <PriceDetailModal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, product: null, priceData: null, calculationDetails: null })}
        product={detailModal.product}
        platform={detailModal.product && uniquePlatforms.find((p) => p.name === selectedPlatform)}
        priceData={detailModal.priceData}
        calculationDetails={detailModal.calculationDetails}
      />
    </div>
  );
}
