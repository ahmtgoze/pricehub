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

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const normalizeRow = (row) => {
  const nr = {};
  Object.keys(row).forEach((k) => { nr[norm(k)] = row[k]; });
  return nr;
};
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

export default function HBBasketCampaigns() {
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
    if (item.seller_stock_code) {
      const bysku = products.find((p) => p.sku === item.seller_stock_code);
      if (bysku) return bysku;
    }
    const mp = marketplaceProducts.find((m) =>
      m.platform_account === selectedPlatform && m.matched_product_id &&
      ((item.barcode && m.barkod === item.barcode) || (item.hb_sku && m.hb_sku === item.hb_sku))
    );
    if (mp) {
      const p = products.find((x) => String(x.id) === String(mp.matched_product_id));
      if (p) return p;
    }
    return null;
  };

  const getPackageCost = (packageId) => packages.find((p) => p.id === packageId)?.total_cost || 0;

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
        let sheetName = workbook.SheetNames.find((n) => norm(n) === 'Listelerim');
        if (!sheetName) {
          sheetName = workbook.SheetNames.find((n) => {
            const r = XLSX.utils.sheet_to_json(workbook.Sheets[n], { header: 1, defval: '' })[0] || [];
            return r.map(norm).some((h) => h.startsWith('Kampanyanın uygulanacağı fiyat'));
          }) || workbook.SheetNames[workbook.SheetNames.length - 1];
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setOriginalExcelData({ workbook, sheetName });

        const parsed = jsonData.map((raw) => {
          const row = normalizeRow(raw);
          const item = {
            product_name: row['Ürün Adı'] ?? '',
            brand: row['Marka'] ?? '',
            seller_stock_code: String(row['Satıcı stok kodu'] ?? row['Satıcı Stok Kodu'] ?? '').trim(),
            hb_sku: String(raw['__EMPTY'] ?? '').trim(),
            barcode: String(row['Barkod'] ?? '').trim(),
            category: row['Kategori'] ?? '',
            stock: parseNum(row['Stok']),
            max_price: parseNum(row['Girebileceğiniz max. fiyat']),
            current_price: parseNum(row['Mevcut satış fiyatı']),
            current_commission: parsePercent(row['Güncel Komisyon Oranı']),
            discounted_commission: parsePercent(row['İndirimli Komisyon Oranı']),
            campaign_price: 0,
            selected: false,
          };
          const matched = getMatchedProduct(item);
          item.matched_product_id = matched?.id || null;
          // Varsayılan kampanya fiyatı = girilebilecek max fiyat (satıcı için en yüksek, en kârlı)
          item.campaign_price = item.max_price || item.current_price || 0;
          return item;
        }).filter((it) => it.seller_stock_code || it.product_name);

        setUploadedData(parsed);
        toast.success(`${parsed.length} ürün yüklendi`);
      } catch (error) {
        toast.error('Excel dosyası okunamadı: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCampaignPriceChange = (item, value) => {
    const v = parseFloat(value) || 0;
    setUploadedData((prev) => prev.map((it) => (it === item ? { ...it, campaign_price: v } : it)));
  };
  const toggleSelect = (item) => {
    setUploadedData((prev) => prev.map((it) => (it === item ? { ...it, selected: !it.selected } : it)));
  };

  const handleSmartAutoSelect = () => {
    // Her eşleşen ürün için kampanya fiyatını max fiyata çek (indirimli komisyonla en yüksek kâr) ve kârlıysa seç
    let count = 0, skippedNoMatch = 0;
    const updated = uploadedData.map((item) => {
      if (!getMatchedProduct(item)) { skippedNoMatch++; return item; }
      const price = item.max_price || item.current_price || 0;
      if (price <= 0) return item;
      const { profit } = calculateProfit(price, item.discounted_commission, item);
      if (profit > 0) { count++; return { ...item, campaign_price: price, selected: true }; }
      return { ...item, campaign_price: price };
    });
    setUploadedData(updated);
    const parts = [];
    if (count > 0) parts.push(`✅ ${count} ürün seçildi (max fiyat + indirimli komisyon)`);
    if (skippedNoMatch > 0) parts.push(`⚠️ ${skippedNoMatch} ürün eşleşmedi`);
    if (count === 0) toast.warning(parts.join(' • ') || 'Kârlı ürün bulunamadı');
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
    const headerCol = {};
    let fillCol;
    for (let C = range.s.c; C <= range.e.c; C++) {
      const h = norm(worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })]?.v);
      if (h) headerCol[h] = C;
      if (h.startsWith('Kampanyanın uygulanacağı fiyat')) fillCol = C;
    }
    const skuCol = headerCol['Satıcı stok kodu'] ?? headerCol['Satıcı Stok Kodu'];
    if (fillCol === undefined) { toast.error('"Kampanyanın uygulanacağı fiyat" sütunu bulunamadı'); return; }
    let written = 0;
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const sku = String(worksheet[XLSX.utils.encode_cell({ r: R, c: skuCol })]?.v ?? '').trim();
      const item = uploadedData.find((i) => i.seller_stock_code === sku);
      if (item && item.selected && item.campaign_price > 0) {
        worksheet[XLSX.utils.encode_cell({ r: R, c: fillCol })] = { v: item.campaign_price, t: 'n' };
        written++;
      }
    }
    XLSX.writeFile(workbook, `hepsiburada-sepet-kampanyalari.xlsx`);
    toast.success(`${written} ürün için kampanya fiyatı yazıldı, Excel indirildi`);
  };

  const allCategories = [...new Set(uploadedData.map((it) => getMatchedProduct(it)?.category_name || it.category).filter(Boolean))].sort();

  const filteredData = uploadedData.filter((item) => {
    if (searchTerm && !item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) && !item.seller_stock_code?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
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

  const selectedCount = uploadedData.filter((i) => i.selected).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Sepet Kampanyaları</h1>
          <p className="text-muted-foreground mt-1">Hepsiburada sepet kampanyası Excel'ini yükleyin; indirimli komisyonla kârı görüp kampanya fiyatını belirleyin</p>
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
              <Button onClick={() => document.getElementById('hbBasketUpload').click()} disabled={!selectedPlatform} className="bg-gray-900 hover:bg-gray-800">
                <Upload className="mr-2 h-4 w-4" />{uploadedData.length > 0 ? 'Yeni Excel Yükle' : 'Excel Yükle'}
              </Button>
              <input id="hbBasketUpload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              {uploadedData.length > 0 && (
                <>
                  <Button onClick={handleSmartAutoSelect} className="bg-orange-500 hover:bg-orange-600 text-white gap-2"><Sparkles className="h-4 w-4" />Max Fiyatla Seç</Button>
                  <Button variant="outline" onClick={() => { setUploadedData([]); setOriginalExcelData(null); toast.success('Liste temizlendi'); }} className="text-rose-600 hover:bg-rose-50"><Trash2 className="mr-2 h-4 w-4" />Temizle</Button>
                  <Button variant="outline" onClick={() => setUploadedData(uploadedData.map((i) => ({ ...i, selected: false })))}>Seçimleri Kaldır</Button>
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
                  <Input placeholder="Ürün / stok kodu ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
              <CardHeader><CardTitle>Kârlılık Analizi ({filteredData.length} ürün)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-3 text-center font-semibold w-10">Seç</th>
                        <th className="p-3 text-left font-semibold min-w-[200px]">Ürün</th>
                        <th className="p-3 text-center font-semibold">Stok</th>
                        <th className="p-3 text-center font-semibold min-w-[160px]">Mevcut (komisyon yok indirimi)</th>
                        <th className="p-3 text-center font-semibold min-w-[120px]">Max Fiyat</th>
                        <th className="p-3 text-center font-semibold min-w-[210px]">Kampanya Fiyatı (indirimli komisyon)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((item, index) => {
                        const matchedProduct = getMatchedProduct(item);
                        const currentCalc = item.current_price ? calculateProfit(item.current_price, item.current_commission, item) : { profit: 0, profitRate: 0 };
                        const overMax = item.max_price > 0 && item.campaign_price > item.max_price;
                        const campCalc = item.campaign_price ? calculateProfit(item.campaign_price, item.discounted_commission, item) : { profit: 0, profitRate: 0 };
                        return (
                          <tr key={index} className={`border-b hover:bg-slate-50 ${item.selected ? 'bg-gray-50' : ''}`}>
                            <td className="p-3 text-center">
                              <input type="checkbox" checked={item.selected} onChange={() => toggleSelect(item)} className="h-4 w-4 cursor-pointer accent-gray-900" disabled={!matchedProduct} />
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{item.product_name}</div>
                              <div className="text-xs text-slate-500 font-mono">{item.seller_stock_code}</div>
                              {matchedProduct ? <div className="text-xs text-emerald-600">{matchedProduct.category_name || matchedProduct.name}</div> : <div className="text-xs text-rose-500">eşleşmedi</div>}
                            </td>
                            <td className="p-3 text-center">{item.stock}</td>
                            <td className="p-3">
                              <div className="text-center">
                                <div className="font-semibold text-slate-900">₺{(item.current_price || 0).toFixed(2)}</div>
                                <div className="text-[11px] text-slate-500 mb-1">Kom: {commLabel(item.current_commission)}</div>
                                {matchedProduct && <div className={`text-xs font-medium ${currentCalc.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₺{currentCalc.profit.toFixed(2)} (%{currentCalc.profitRate.toFixed(1)})</div>}
                              </div>
                            </td>
                            <td className="p-3 text-center font-semibold text-slate-700">₺{(item.max_price || 0).toFixed(2)}</td>
                            <td className="p-3">
                              <div className={`border rounded-lg p-2 ${item.selected ? 'border-gray-900 bg-white' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-1 mb-1">
                                  <Input type="number" step="0.01" value={item.campaign_price || ''} onChange={(e) => handleCampaignPriceChange(item, e.target.value)} placeholder="Fiyat" className="h-8 text-xs" />
                                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0" onClick={() => openDetailModal(item.campaign_price, item.discounted_commission, item)}><Info className="h-3 w-3" /></Button>
                                </div>
                                <div className="text-[11px] text-slate-500">Kom: {commLabel(item.discounted_commission)}</div>
                                {item.campaign_price > 0 && (
                                  <div className={`text-xs font-semibold ${campCalc.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{campCalc.profit > 0 ? '+' : ''}₺{campCalc.profit.toFixed(2)} (%{campCalc.profitRate.toFixed(1)})</div>
                                )}
                                {overMax && <Badge variant="outline" className="mt-1 text-[10px] text-rose-600 border-rose-300">Max fiyatı aşıyor!</Badge>}
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
              <p className="text-sm text-slate-400">Hepsiburada "Sepet Kampanyaları" Excel dosyasını yükleyin</p>
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
