import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Download, Sparkles, Check, Info } from 'lucide-react';
import { calculatePriceBreakdown, findDesiShippingRate } from '@/components/PriceCalculationEngine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import PriceDetailModal from '@/components/modals/PriceDetailModal';

const Campaign = db.entities.Campaign;
let CampaignProduct;
try {
  CampaignProduct = db.entities.CampaignProduct;
} catch (e) {
  // Bu veri tipi uygulamanın veri katmanında henüz kayıtlı değil — çökmeyi önle.
  CampaignProduct = {
    filter: async () => [],
    bulkCreate: async () => [],
    update: async () => ({}),
    delete: async () => ({}),
  };
}
const Product = db.entities.Product;
const Platform = db.entities.Platform;
const Commission = db.entities.Commission;
const ShippingRate = db.entities.ShippingRate;
const MarketplaceProduct = db.entities.MarketplaceProduct;

const CAMPAIGN_TYPES = [
  { value: 'all_countries', label: 'Tüm Ülkeler' },
  { value: 'trendyol_plus', label: 'Trendyol Plus (Ek İndirim)' },
];

const emptyForm = {
  campaign_type: '',
  start_date: null,
  end_date: null,
  cart_amount: '',
  cart_condition: 'over',
  discount_type: 'percent',
  discount_amount: '',
  trendyol_coverage_rate: '',
};

export default function Campaigns() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const [managingCampaign, setManagingCampaign] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [uploadedData, setUploadedData] = useState([]);
  const [originalExcelData, setOriginalExcelData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [bulkMinProfitRate, setBulkMinProfitRate] = useState('');
  const [bulkMinProfitAmount, setBulkMinProfitAmount] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [detailModal, setDetailModal] = useState({ open: false, product: null, priceData: null, calculationDetails: null });

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', userEmail],
    queryFn: () => Campaign.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: () => Platform.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products', userEmail],
    queryFn: () => Product.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions', userEmail],
    queryFn: () => Commission.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  const { data: shippingRates = [] } = useQuery({
    queryKey: ['shippingRates'],
    queryFn: () => ShippingRate.list('-id', 10000),
    enabled: !!userEmail,
  });
  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => db.entities.Package.list(),
    enabled: !!userEmail,
  });
  const { data: settings = [] } = useQuery({
    queryKey: ['settings', userEmail],
    queryFn: () => db.entities.Settings.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  const { data: marketplaceProducts = [] } = useQuery({
    queryKey: ['marketplaceProducts', userEmail],
    queryFn: () => MarketplaceProduct.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  const { data: savedCampaignProducts = [] } = useQuery({
    queryKey: ['campaignProducts', userEmail],
    queryFn: () => CampaignProduct.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  // Ürün Komisyon Tarifesi (normal kampanyalar için komisyon kaynağı)
  const { data: priceRanges = [] } = useQuery({
    queryKey: ['trendyolPriceRanges', userEmail],
    queryFn: () => db.entities.TrendyolPriceRange.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  // Plus Ürün Komisyon Tarifesi (Plus kampanyaları için komisyon kaynağı)
  const { data: plusTariffs = [] } = useQuery({
    queryKey: ['plusProductCommissionTariffs', userEmail],
    queryFn: () => db.entities.PlusProductCommissionTariff.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  const uniquePlatforms = platforms.filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
  const trendyolPlatforms = uniquePlatforms
    .filter(p => p.platform_type === 'trendyol' && p.is_active !== false)
    .filter((p, idx, arr) => arr.findIndex(x => x.name === p.name) === idx);

  React.useEffect(() => {
    if (trendyolPlatforms.length >= 1 && !selectedPlatform) {
      setSelectedPlatform(trendyolPlatforms[0].name);
    }
  }, [trendyolPlatforms.length]);

  const isAllCountries = formData.campaign_type === 'all_countries';

  // ===================== KAMPANYA FORMU =====================
  const resetForm = () => { setFormData({ ...emptyForm }); setEditingId(null); };
  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (c) => {
    setEditingId(c.id);
    setFormData({
      campaign_type: c.campaign_type || '',
      start_date: c.start_date ? new Date(c.start_date) : null,
      end_date: c.end_date ? new Date(c.end_date) : null,
      cart_amount: c.cart_amount ?? '',
      cart_condition: c.cart_condition || 'over',
      discount_type: c.discount_type || 'percent',
      discount_amount: c.discount_amount ?? '',
      trendyol_coverage_rate: c.trendyol_coverage_rate ?? '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      campaign_type: type,
      cart_amount: type === 'all_countries' ? formData.cart_amount : '',
      cart_condition: type === 'all_countries' ? formData.cart_condition : 'over',
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.campaign_type) { toast.error('Lütfen kampanya türünü seçin'); return; }
    if (!formData.start_date || !formData.end_date) { toast.error('Lütfen tarih aralığını seçin'); return; }
    if (formData.discount_amount === '' || formData.discount_amount === null) { toast.error('Lütfen indirim tutarını/oranını girin'); return; }

    const payload = {
      campaign_type: formData.campaign_type,
      start_date: format(formData.start_date, 'yyyy-MM-dd'),
      end_date: format(formData.end_date, 'yyyy-MM-dd'),
      discount_type: formData.discount_type,
      discount_amount: Number(formData.discount_amount),
      cart_amount: (isAllCountries && formData.cart_amount !== '' && formData.cart_amount !== null) ? Number(formData.cart_amount) : null,
      cart_condition: (isAllCountries && formData.cart_amount !== '' && formData.cart_amount !== null) ? formData.cart_condition : null,
      trendyol_coverage_rate: (formData.trendyol_coverage_rate !== '' && formData.trendyol_coverage_rate !== null) ? Number(formData.trendyol_coverage_rate) : null,
      is_active: true,
    };
    try {
      if (editingId) { await Campaign.update(editingId, payload); toast.success('Kampanya güncellendi'); }
      else { await Campaign.create(payload); toast.success('Kampanya oluşturuldu'); }
      resetForm(); setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) { toast.error('İşlem başarısız: ' + (error?.message || 'Bilinmeyen hata')); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
    try {
      await Campaign.delete(id);
      toast.success('Kampanya silindi');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) { toast.error('Silme işlemi başarısız: ' + (error?.message || 'Bilinmeyen hata')); }
  };

  const getTypeLabel = (type) => (CAMPAIGN_TYPES.find(t => t.value === type)?.label) || (type || '-');
  const campaignTitle = (c) => {
    const disc = c.discount_type === 'percent' ? `%${c.discount_amount} indirim` : `${c.discount_amount} TL indirim`;
    const cart = (c.cart_amount !== null && c.cart_amount !== undefined && c.cart_amount !== '') ? ` · ${c.cart_amount} TL ${c.cart_condition === 'under' ? 'altı' : 'üzeri'}` : '';
    const cov = (Number(c.trendyol_coverage_rate) > 0) ? ` · %${c.trendyol_coverage_rate} Trendyol karşılamalı` : '';
    return `${getTypeLabel(c.campaign_type)}${cart} · ${disc}${cov}`;
  };
  const safeDate = (d) => { if (!d) return ''; try { return format(new Date(d), 'd MMM yyyy', { locale: tr }); } catch { return d; } };

  // ===================== ÜRÜN YÖNETİMİ =====================
  const openManager = (campaign) => {
    setManagingCampaign(campaign);
    setUploadedData([]);
    setOriginalExcelData(null);
    setSearchTerm(''); setFilterCategory('');
    const existing = savedCampaignProducts.filter(r => r.campaign_id === campaign.id);
    if (existing.length > 0) {
      setUploadedData(existing);
      const withExcel = existing.find(r => r.excel_file_url);
      if (withExcel) {
        fetch(withExcel.excel_file_url).then(r => r.arrayBuffer()).then(ab => {
          const wb = XLSX.read(new Uint8Array(ab), { type: 'array' });
          setOriginalExcelData({ workbook: wb, sheetName: wb.SheetNames[0] });
        }).catch(e => console.error('Excel restore hatası:', e));
      }
    }
  };
  const closeManager = () => { setManagingCampaign(null); setUploadedData([]); setOriginalExcelData(null); };

  const getVal = (row, exact, keywords = []) => {
    if (exact in row) return row[exact];
    const k = Object.keys(row).find(key => keywords.some(w => key.toLowerCase().trim().includes(w)));
    return k ? row[k] : '';
  };

  const getMatchedProduct = (item) => {
    if (item.matched_product_id) {
      const direct = products.find(p => p.id === item.matched_product_id);
      if (direct) return direct;
    }
    const mpRec = marketplaceProducts.find(mp => mp.platform_account === selectedPlatform && mp.barkod === item.barcode && mp.matched_product_id);
    if (mpRec) { const mp = products.find(p => p.id === mpRec.matched_product_id); if (mp) return mp; }
    if (item.stock_code) { const bysku = products.find(p => p.sku === item.stock_code); if (bysku) return bysku; }
    return null;
  };

  const getPackageCost = (packageId) => (packages.find(p => p.id === packageId)?.total_cost) || 0;

  const effectiveSellerPrice = (campaignPrice) => {
    const L = parseFloat(campaignPrice) || 0;
    if (L <= 0 || !managingCampaign) return 0;
    const d = parseFloat(managingCampaign.discount_amount) || 0;
    const cov = (parseFloat(managingCampaign.trendyol_coverage_rate) || 0) / 100;
    if (managingCampaign.discount_type === 'percent') {
      return L * (1 - (d / 100) * (1 - cov));
    }
    return L - d * (1 - cov);
  };

  const getCommissionRecord = (item) => {
    const matchedProduct = getMatchedProduct(item);
    if (!matchedProduct) return null;
    const ids = trendyolPlatforms.map(p => String(p.id));
    const names = trendyolPlatforms.map(p => (p.name || '').toLowerCase().trim());
    return commissions.find(c =>
      c.is_active !== false &&
      (ids.includes(String(c.platform_id)) || names.includes((c.platform_name || '').toLowerCase().trim())) &&
      ((matchedProduct.category_id && String(c.category_id) === String(matchedProduct.category_id)) ||
       (matchedProduct.category_name && (c.category_name || '').toLowerCase().trim() === (matchedProduct.category_name || '').toLowerCase().trim()))
    ) || null;
  };

  // Bir tarife tablosunda ürünün kaydını bul (seçimi olan + en güncel tercih edilir)
  const matchTariffRecord = (records, item) => {
    const matchedProduct = getMatchedProduct(item);
    const cands = records.filter(r =>
      (item.matched_product_id && r.matched_product_id === item.matched_product_id) ||
      (matchedProduct && r.matched_product_id === matchedProduct.id) ||
      (r.barcode && item.barcode && String(r.barcode) === String(item.barcode))
    );
    if (cands.length === 0) return null;
    const hasSel = (r) => ((r.selected_range && r.selected_range !== 'none') || (r.selected_type && r.selected_type !== 'none')) ? 1 : 0;
    return [...cands].sort((a, b) => {
      if (hasSel(a) !== hasSel(b)) return hasSel(b) - hasSel(a);
      return String(b.start_date || '').localeCompare(String(a.start_date || ''));
    })[0];
  };

  // Ürünün komisyon oranı — kampanya türüne göre ilgili tarife sayfasından çekilir
  const getProductCommissionRate = (item) => {
    const isPlus = managingCampaign?.campaign_type === 'trendyol_plus';
    if (isPlus) {
      const pr = matchTariffRecord(plusTariffs, item);
      if (pr) {
        const c = parseFloat(pr.plus_commission_offer) || parseFloat(pr.calculated_commission) || parseFloat(pr.current_commission) || 0;
        if (c > 0) return c;
      }
    } else {
      const tr = matchTariffRecord(priceRanges, item);
      if (tr) {
        let c = 0;
        if (tr.has_commission_tariff === 'Var' || tr.has_commission_tariff === 'true') {
          if (tr.selected_range === 'range_1') c = tr.commission_1;
          else if (tr.selected_range === 'range_2') c = tr.commission_2;
          else if (tr.selected_range === 'range_3') c = tr.commission_3;
          else if (tr.selected_range === 'range_4') c = tr.commission_4;
          else if (tr.selected_range === 'manual') c = tr.manual_commission;
        }
        if (!c) c = parseFloat(tr.current_commission) || 0;
        if (c > 0) return c;
      }
    }
    // yedek: kategori komisyonu (Komisyonlar tablosu)
    const commRec = getCommissionRecord(item);
    return parseFloat(commRec?.commission_rate) || parseFloat(item.current_commission) || 0;
  };

  const calculateProfit = (campaignPrice, item) => {
    try {
      const effPrice = effectiveSellerPrice(campaignPrice);
      if (!effPrice || effPrice <= 0) return { profit: 0, profitRate: 0, breakdown: null };
      const matchedProduct = getMatchedProduct(item);
      if (!matchedProduct) return { profit: 0, profitRate: 0, breakdown: null };
      const platform = uniquePlatforms.find(p => p.name === selectedPlatform);
      if (!platform) return { profit: 0, profitRate: 0, breakdown: null };

      const commissionRate = getProductCommissionRate(item);

      const platformShippingRates = shippingRates.filter(r =>
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
      const printingCost = matchedProduct.printing_cost || 0;
      const extraCost = matchedProduct.extra_cost || 0;

      let shippingCost = 0, shippingVatRate = 20, baremUsed = 'desi';
      const canUseBarem = !matchedProduct.special_shipping && !matchedProduct.multi_package;
      if (canUseBarem && effPrice > 0) {
        if (effPrice <= 149.99) {
          const r = platformShippingRates.find(x => x.rate_type === 'barem1');
          if (r) { shippingCost = r.price; shippingVatRate = r.vat_rate || 20; baremUsed = 'barem1'; }
        } else if (effPrice >= 150 && effPrice <= 299.99) {
          const r = platformShippingRates.find(x => x.rate_type === 'barem2');
          if (r) { shippingCost = r.price; shippingVatRate = r.vat_rate || 20; baremUsed = 'barem2'; }
        }
      }
      if (shippingCost === 0) {
        if (matchedProduct.multi_package && matchedProduct.packages) {
          try {
            const pp = typeof matchedProduct.packages === 'string' ? JSON.parse(matchedProduct.packages) : matchedProduct.packages;
            if (matchedProduct.special_shipping) {
              const rc = settings.find(s => s.setting_key === 'return_cost_per_package');
              const rcpp = rc ? parseFloat(rc.setting_value) : 180.096;
              for (const pkg of pp) { const dr = findDesiShippingRate(platformShippingRates, pkg.desi || 0); if (dr) { shippingCost += (dr.price * 2) + rcpp; shippingVatRate = dr.vat_rate || 20; } }
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
        salePriceInclVat: parseFloat(effPrice),
        productCost: parseFloat(matchedProduct.cost) || 0,
        productVatRate: parseFloat(matchedProduct.vat_rate) || 20,
        shippingCost: parseFloat(shippingCost) || 0,
        shippingVatRate: parseFloat(shippingVatRate) || 20,
        commissionRate: parseFloat(commissionRate) || 0,
        commissionVatRate: 20,
        platform,
        baremUsed,
        packagingCost: parseFloat(packagingCost) || 0,
        printingCost: parseFloat(printingCost) || 0,
        extraCost: parseFloat(extraCost) || 0,
        isSameDayDelivery: matchedProduct.same_day_delivery || false,
      });

      return {
        profit: parseFloat(breakdown.netProfit) || 0,
        profitRate: parseFloat(breakdown.profitRate) || 0,
        breakdown, matchedProduct, platform, baremUsed,
        commissionRate, effPrice,
      };
    } catch (e) {
      return { profit: 0, profitRate: 0, breakdown: null };
    }
  };

  const isBelowFloor = (item, campaignPrice) => {
    const commRec = getCommissionRecord(item);
    if (!commRec) return false;
    const toNum = (v) => (v != null && v !== '') ? Number(v) : null;
    const tRate = toNum(commRec.discounted_target_profit_rate);
    const tAmt = toNum(commRec.discounted_target_profit_amount);
    const mAmt = toNum(commRec.discounted_minimum_profit_amount);
    const { profit, profitRate } = calculateProfit(campaignPrice, item);
    if (mAmt != null && mAmt > 0 && profit < mAmt) return true;
    if (tRate != null && tRate > 0 && profitRate < tRate) return true;
    if (tAmt != null && tAmt > 0 && profit < tAmt) return true;
    return false;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!managingCampaign) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setOriginalExcelData({ workbook, sheetName });

        let excelFileUrl = null;
        try {
          const buf = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', bookSST: true });
          const blob = new Blob([new Uint8Array(buf)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const fileObj = new File([blob], file.name || 'kampanya.xlsx', { type: blob.type });
          const up = await db.integrations.Core.UploadFile({ file: fileObj });
          excelFileUrl = up.file_url;
        } catch (err) { console.error('Excel upload hatası:', err); }

        const parsed = jsonData.map(row => {
          const barcode = getVal(row, 'Barkod', ['barkod', 'barcode']) || '';
          const productName = getVal(row, 'Ürün Adı', ['ürün adı', 'ürün ismi', 'product name']) || '';
          const stockCode = getVal(row, 'Stok Kodu', ['stok kodu', 'sku']) || '';
          const maxPrice = parseFloat(getVal(row, 'Maksimum Girebileceğin Fiyat', ['maksimum', 'maks'])) || 0;
          const curPrice = parseFloat(getVal(row, 'Mevcut Satış Fiyatı', ['mevcut satış', 'mevcut fiyat'])) || 0;
          const existingL = parseFloat(getVal(row, 'Kampanyalı Satış Fiyatı', ['kampanyalı satış', 'kampanyalı fiyat'])) || 0;

          const mpRec = marketplaceProducts.find(mp => mp.platform_account === selectedPlatform && mp.barkod === barcode);
          let matched;
          if (mpRec?.matched_product_id) matched = products.find(p => p.id === mpRec.matched_product_id);
          if (!matched) matched = products.find(p => p.sku === stockCode || (productName && p.name?.toLowerCase().includes(productName.toLowerCase())));

          return {
            campaign_id: managingCampaign.id,
            platform_account: selectedPlatform,
            barcode,
            product_name: productName,
            product_code: getVal(row, 'Ürün Kodu', ['ürün kodu', 'product code']) || '',
            category: matched?.category_name || getVal(row, 'Kategori', ['kategori', 'category']) || '',
            brand: getVal(row, 'Marka', ['marka', 'brand']) || '',
            color: getVal(row, 'Renk', ['renk', 'color']) || '',
            size: getVal(row, 'Beden', ['beden', 'size']) || '',
            stock_code: stockCode,
            current_stock: parseFloat(getVal(row, 'Mevcut Stok', ['mevcut stok', 'stok'])) || 0,
            current_sale_price: curPrice,
            max_price: maxPrice,
            campaign_price: existingL > 0 ? existingL : maxPrice,
            commission_tariff: getVal(row, 'Ürün Komisyon Tarifesi', ['komisyon tarifesi']) || '',
            listing_id: getVal(row, 'ListingId', ['listingid', 'listing']) || '',
            selected_type: 'none',
            matched_product_id: matched?.id || null,
          };
        });

        const old = savedCampaignProducts.filter(r => r.campaign_id === managingCampaign.id && r.id);
        for (let i = 0; i < old.length; i += 30) {
          const batch = old.slice(i, i + 30);
          await Promise.all(batch.map(r => CampaignProduct.delete(r.id)));
          if (i + 30 < old.length) await new Promise(res => setTimeout(res, 150));
        }

        setUploadProgress({ current: 0, total: parsed.length });
        for (let i = 0; i < parsed.length; i += 30) {
          const batch = parsed.slice(i, i + 30);
          if (i === 0 && batch.length > 0 && excelFileUrl) batch[0].excel_file_url = excelFileUrl;
          await CampaignProduct.bulkCreate(batch);
          setUploadProgress({ current: Math.min(i + 30, parsed.length), total: parsed.length });
          if (i + 30 < parsed.length) await new Promise(res => setTimeout(res, 150));
        }

        setUploadedData(parsed);
        setUploadProgress({ current: 0, total: 0 });
        queryClient.invalidateQueries({ queryKey: ['campaignProducts'] });
        toast.success(`${parsed.length} ürün yüklendi`);
      } catch (error) {
        setUploadProgress({ current: 0, total: 0 });
        toast.error('Excel okunamadı: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePriceChange = (index, value) => {
    const updated = [...uploadedData];
    updated[index].campaign_price = value === '' ? '' : parseFloat(value);
    setUploadedData(updated);
  };

  const handleSelect = (index) => {
    const updated = [...uploadedData];
    updated[index].selected_type = updated[index].selected_type === 'campaign' ? 'none' : 'campaign';
    setUploadedData(updated);
  };

  const handleSmartAutoSelect = () => {
    let selectedCount = 0, skipNoProduct = 0, skipNoCommission = 0, skipBelow = 0;
    const updated = uploadedData.map(item => {
      if (item.selected_type === 'campaign') return item;
      const matched = getMatchedProduct(item);
      if (!matched) { skipNoProduct++; return item; }
      const commRec = getCommissionRecord(item);
      if (!commRec) { skipNoCommission++; return item; }
      const price = item.max_price || item.campaign_price;
      if (!price || price <= 0) return item;
      if (isBelowFloor(item, price)) { skipBelow++; return item; }
      selectedCount++;
      return { ...item, selected_type: 'campaign', campaign_price: price };
    });
    setUploadedData(updated);
    const parts = [];
    if (selectedCount > 0) parts.push(`✅ ${selectedCount} ürün seçildi (max fiyattan)`);
    if (skipNoProduct > 0) parts.push(`⚠️ ${skipNoProduct} sistem ürünüyle eşleşmedi`);
    if (skipNoCommission > 0) parts.push(`⚠️ ${skipNoCommission} komisyon/kâr tabanı yok`);
    if (skipBelow > 0) parts.push(`🔴 ${skipBelow} kâr tabanının altında`);
    if (selectedCount === 0) toast.warning(parts.join(' • ') || 'Uygun ürün bulunamadı');
    else toast.success(parts.join(' • '));
  };

  const handleBulkSelect = () => {
    const minRate = parseFloat(bulkMinProfitRate) || 0;
    const minAmount = parseFloat(bulkMinProfitAmount) || 0;
    const visible = new Set(sortedData.map(i => i.barcode));
    const updated = uploadedData.map(item => {
      if (!visible.has(item.barcode)) return item;
      const price = item.campaign_price || item.max_price;
      if (!price || price <= 0) return item;
      const { profit, profitRate } = calculateProfit(price, item);
      if (profitRate >= minRate && profit >= minAmount) return { ...item, selected_type: 'campaign', campaign_price: price };
      if (item.selected_type === 'campaign') return { ...item, selected_type: 'none' };
      return item;
    });
    setUploadedData(updated);
    toast.success('Toplu seçim yapıldı');
  };

  const openDetailModal = (item) => {
    const price = item.campaign_price || item.max_price;
    const calc = calculateProfit(price, item);
    const matchedProduct = calc.matchedProduct || getMatchedProduct(item);
    setDetailModal({
      open: true,
      product: matchedProduct,
      priceData: {
        sale_price: calc.effPrice || 0,
        net_profit: calc.profit,
        profit_rate: calc.profitRate,
        shipping_cost: calc.breakdown?.shippingCost || 0,
        packaging_cost: calc.breakdown?.packagingCost || 0,
        commission_amount: calc.breakdown?.commissionAmount || 0,
        withholding_amount: calc.breakdown?.withholdingAmount || 0,
        service_fee: calc.breakdown?.serviceFee || 0,
        net_vat: calc.breakdown?.netVat || 0,
        corporate_tax_amount: calc.breakdown?.corporateTaxAmount || 0,
        net_profit_before_tax: calc.breakdown?.netProfitBeforeTax || 0,
        barem_used: calc.baremUsed || 'none',
      },
      calculationDetails: {
        productCost: matchedProduct?.cost || 0,
        productVatRate: matchedProduct?.vat_rate || 20,
        commissionRate: calc.commissionRate || 0,
        corporateTaxRate: (calc.platform?.corporate_tax_rate ?? 25),
        packagingCost: calc.breakdown?.packagingCost || 0,
        printingCost: matchedProduct?.printing_cost || 0,
        extraCost: matchedProduct?.extra_cost || 0,
        shippingCost: calc.breakdown?.shippingCost || 0,
      },
    });
  };

  const handleSave = async () => {
    const selectedItems = uploadedData.filter(item => item.selected_type === 'campaign');
    if (selectedItems.length === 0) { toast.error('Lütfen en az bir ürün seçin'); return; }
    const cols = ['campaign_id','platform_account','barcode','product_name','product_code','category','brand','color','size','stock_code','current_stock','current_sale_price','max_price','campaign_price','commission_tariff','listing_id','selected_type','calculated_commission','calculated_profit','calculated_profit_rate','matched_product_id'];
    const clean = (item) => {
      const o = {};
      cols.forEach(c => { if (item[c] !== undefined) o[c] = item[c]; });
      const calc = calculateProfit(item.campaign_price, item);
      o.calculated_profit = calc.profit || 0;
      o.calculated_profit_rate = calc.profitRate || 0;
      o.calculated_commission = calc.commissionRate || 0;
      return o;
    };
    try {
      const all = uploadedData.filter(i => i.id);
      for (let i = 0; i < all.length; i += 30) {
        const batch = all.slice(i, i + 30);
        await Promise.all(batch.map(item => CampaignProduct.update(item.id, clean(item))));
        if (i + 30 < all.length) await new Promise(r => setTimeout(r, 150));
      }
      const news = uploadedData.filter(i => !i.id && i.selected_type === 'campaign');
      if (news.length > 0) await CampaignProduct.bulkCreate(news.map(clean));
      toast.success(`${selectedItems.length} ürün kaydedildi`);
      queryClient.invalidateQueries({ queryKey: ['campaignProducts'] });
    } catch (error) { toast.error('Kayıt hatası: ' + error.message); }
  };

  const handleDeleteExcel = async () => {
    const ids = new Set();
    uploadedData.forEach(i => { if (i.id) ids.add(i.id); });
    if (managingCampaign) savedCampaignProducts.filter(r => r.campaign_id === managingCampaign.id && r.id).forEach(r => ids.add(r.id));
    setUploadedData([]); setOriginalExcelData(null);
    toast.success('Excel silindi');
    try {
      const list = [...ids];
      for (let i = 0; i < list.length; i += 30) {
        const batch = list.slice(i, i + 30);
        await Promise.all(batch.map(id => CampaignProduct.delete(id)));
        if (i + 30 < list.length) await new Promise(r => setTimeout(r, 150));
      }
      queryClient.invalidateQueries({ queryKey: ['campaignProducts'] });
    } catch (e) { console.error('Silme hatası:', e); }
  };

  const handleExport = () => {
    if (uploadedData.length === 0) { toast.error('Yüklenmiş Excel bulunamadı'); return; }
    if (!originalExcelData) { toast.error('Orijinal Excel dosyası bulunamadı'); return; }
    const { workbook, sheetName } = originalExcelData;
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    let colL = -1, colBarkod = -1, colListing = -1;
    for (let C = range.s.c; C <= range.e.c; C++) {
      const h = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })]?.v;
      const hl = (h || '').toString().toLowerCase().trim();
      if (hl.includes('kampanyalı satış') || hl.includes('kampanyalı fiyat')) colL = C;
      if (hl === 'barkod') colBarkod = C;
      if (hl.includes('listingid') || hl === 'listing id') colListing = C;
    }
    if (colL === -1) { toast.error('Excelde "Kampanyalı Satış Fiyatı" sütunu bulunamadı'); return; }

    let written = 0;
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const barcode = colBarkod >= 0 ? worksheet[XLSX.utils.encode_cell({ r: R, c: colBarkod })]?.v : null;
      const listing = colListing >= 0 ? worksheet[XLSX.utils.encode_cell({ r: R, c: colListing })]?.v : null;
      const item = uploadedData.find(i =>
        (barcode != null && i.barcode && String(i.barcode) === String(barcode)) ||
        (listing != null && i.listing_id && String(i.listing_id) === String(listing))
      );
      if (item && item.selected_type === 'campaign' && item.campaign_price > 0) {
        worksheet[XLSX.utils.encode_cell({ r: R, c: colL })] = { v: Number(item.campaign_price), t: 'n', z: '0.00' };
        written++;
      }
    }
    if (written === 0) { toast.error('Seçili ürün yok'); return; }

    const slug = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const fileName = `kampanya-${slug(getTypeLabel(managingCampaign.campaign_type))}-${written}urun.xlsx`;
    XLSX.writeFile(workbook, fileName, { bookSST: true });
    toast.success(`${written} ürün için Excel indirildi`);
  };

  const filteredData = uploadedData.filter(item => {
    if (searchTerm && !item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory) { const mp = getMatchedProduct(item); if ((mp?.category_name || item.category) !== filterCategory) return false; }
    return true;
  });
  const sortedData = filteredData;
  const allCategories = [...new Set(uploadedData.map(item => getMatchedProduct(item)?.category_name || item.category).filter(Boolean))].sort();
  const selectedCount = uploadedData.filter(i => i.selected_type === 'campaign').length;

  // ===================== RENDER: ÜRÜN YÖNETİMİ =====================
  if (managingCampaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <Button variant="outline" onClick={closeManager} className="mb-4">← Kampanyalara Dön</Button>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Ürün Ekle — {getTypeLabel(managingCampaign.campaign_type)}</h1>
            <p className="text-slate-500 mt-1">{campaignTitle(managingCampaign)} · {safeDate(managingCampaign.start_date)} - {safeDate(managingCampaign.end_date)}</p>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  {trendyolPlatforms.length === 1 ? (
                    <div className="flex items-center h-10 px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium">{trendyolPlatforms[0]?.name}</div>
                  ) : (
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                      <SelectContent>{trendyolPlatforms.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Kampanya Excel'i (Trendyol'dan "Ürün Ekle" ile indirdiğin dosya)</Label>
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                </div>
              </div>
              {uploadProgress.total > 0 && (<p className="text-sm text-indigo-600">Yükleniyor: {uploadProgress.current}/{uploadProgress.total}</p>)}
            </CardContent>
          </Card>

          {uploadedData.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Input placeholder="Ürün ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-56" />
                <Select value={filterCategory || 'all'} onValueChange={(v) => setFilterCategory(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm kategoriler</SelectItem>
                    {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleSmartAutoSelect} className="bg-violet-600 hover:bg-violet-700"><Sparkles className="h-4 w-4 mr-1" />Akıllı Otomatik Seç</Button>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="min %" value={bulkMinProfitRate} onChange={(e) => setBulkMinProfitRate(e.target.value)} className="w-24" />
                  <Input type="number" placeholder="min TL" value={bulkMinProfitAmount} onChange={(e) => setBulkMinProfitAmount(e.target.value)} className="w-24" />
                  <Button variant="outline" onClick={handleBulkSelect}>Toplu Seç</Button>
                </div>
                <div className="flex-1" />
                <Badge className="bg-indigo-100 text-indigo-700">{selectedCount} seçili</Badge>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700"><Check className="h-4 w-4 mr-1" />Kaydet</Button>
                <Button onClick={handleExport} variant="outline"><Download className="h-4 w-4 mr-1" />Excel İndir</Button>
                <Button onClick={handleDeleteExcel} variant="outline" className="text-rose-600 hover:text-rose-700"><Trash2 className="h-4 w-4 mr-1" />Excel'i Sil</Button>
              </div>

              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr className="text-left text-slate-600">
                        <th className="p-3 w-10"></th>
                        <th className="p-3">Ürün</th>
                        <th className="p-3 text-right">Stok</th>
                        <th className="p-3 text-right">Mevcut Fiyat</th>
                        <th className="p-3 text-right">Max Girilebilir</th>
                        <th className="p-3 text-right">Kampanya Fiyatı</th>
                        <th className="p-3 text-right">Net Kâr</th>
                        <th className="p-3 text-right">Kâr %</th>
                        <th className="p-3 text-center">Detay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((item) => {
                        const realIndex = uploadedData.indexOf(item);
                        const matched = getMatchedProduct(item);
                        const calc = calculateProfit(item.campaign_price, item);
                        const below = item.campaign_price > 0 ? isBelowFloor(item, item.campaign_price) : false;
                        const overMax = item.max_price > 0 && parseFloat(item.campaign_price) > item.max_price;
                        const isSelected = item.selected_type === 'campaign';
                        return (
                          <tr key={item.id || realIndex} className={`border-b hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                            <td className="p-3"><input type="checkbox" checked={isSelected} onChange={() => handleSelect(realIndex)} className="h-4 w-4" /></td>
                            <td className="p-3">
                              <div className="font-medium text-slate-800">{item.product_name || '-'}</div>
                              <div className="text-xs text-slate-400">{item.barcode}{matched ? '' : ' · ⚠️ eşleşmedi'}</div>
                            </td>
                            <td className="p-3 text-right">{item.current_stock}</td>
                            <td className="p-3 text-right">{Number(item.current_sale_price).toFixed(2)} ₺</td>
                            <td className="p-3 text-right font-medium">{Number(item.max_price).toFixed(2)} ₺</td>
                            <td className="p-3 text-right">
                              <Input type="number" value={item.campaign_price} onChange={(e) => handlePriceChange(realIndex, e.target.value)}
                                className={`w-28 text-right ml-auto ${overMax ? 'border-rose-400' : ''}`} />
                              {overMax && <div className="text-[10px] text-rose-500 mt-1">Max'ı aşıyor!</div>}
                            </td>
                            <td className={`p-3 text-right font-semibold ${below ? 'text-rose-600' : 'text-emerald-600'}`}>{matched ? `${calc.profit.toFixed(2)} ₺` : '-'}</td>
                            <td className={`p-3 text-right font-semibold ${below ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {matched ? `%${calc.profitRate.toFixed(1)}` : '-'}
                              {below && <div className="text-[10px] text-rose-500">taban altı</div>}
                            </td>
                            <td className="p-3 text-center"><Button size="sm" variant="ghost" onClick={() => openDetailModal(item)} disabled={!matched}><Info className="h-4 w-4" /></Button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}

          {uploadedData.length === 0 && (
            <Card><CardContent className="p-12 text-center text-slate-500">Bu kampanya için Excel yükleyin.</CardContent></Card>
          )}
        </div>

        <PriceDetailModal
          open={detailModal.open}
          onClose={() => setDetailModal({ ...detailModal, open: false })}
          product={detailModal.product}
          priceData={detailModal.priceData}
          calculationDetails={detailModal.calculationDetails}
        />
      </div>
    );
  }

  // ===================== RENDER: KAMPANYA LİSTESİ + FORM =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Kampanyalar</h1>
            <p className="text-slate-500 mt-1">Kampanya oluşturun ve yönetin</p>
          </div>
          <Button onClick={() => (showForm ? (resetForm(), setShowForm(false)) : openNew())} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />Yeni Kampanya
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader><CardTitle>{editingId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Kampanya Türü *</Label>
                  <Select value={formData.campaign_type} onValueChange={handleTypeChange}>
                    <SelectTrigger><SelectValue placeholder="Kampanya türü seçin" /></SelectTrigger>
                    <SelectContent>{CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Tarih Aralığı *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date && formData.end_date ? (<>{format(formData.start_date, 'd MMM yyyy', { locale: tr })} - {format(formData.end_date, 'd MMM yyyy', { locale: tr })}</>) : 'Tarih aralığı seçin'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="range" selected={{ from: formData.start_date, to: formData.end_date }}
                          onSelect={(range) => setFormData({ ...formData, start_date: range?.from, end_date: range?.to })}
                          defaultMonth={formData.start_date || new Date()} numberOfMonths={2} locale={tr} />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {isAllCountries && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1 space-y-2">
                        <Label>Sepet Tutarı (TL)</Label>
                        <Input type="number" placeholder="Opsiyonel" value={formData.cart_amount}
                          onChange={(e) => setFormData({ ...formData, cart_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Koşul</Label>
                        <Select value={formData.cart_condition} onValueChange={(v) => setFormData({ ...formData, cart_condition: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="over">Üzeri</SelectItem><SelectItem value="under">Altı</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 -mt-2">Sepet şartı yoksa (örn. düz %20 indirim) boş bırakın.</p>
                  </>
                )}

                {formData.campaign_type && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>İndirim Tipi *</Label>
                      <Select value={formData.discount_type} onValueChange={(v) => setFormData({ ...formData, discount_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="percent">% İndirimi</SelectItem><SelectItem value="tl">TL İndirimi</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>İndirim {formData.discount_type === 'percent' ? 'Oranı (%)' : 'Tutarı (TL)'} *</Label>
                      <Input type="number" placeholder={formData.discount_type === 'percent' ? '20' : '50'} value={formData.discount_amount}
                        onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
                    </div>
                  </div>
                )}

                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Trendyol Karşılama Oranı (%)</Label>
                    <div className="relative">
                      <Input type="number" placeholder="Opsiyonel — örn. 40" value={formData.trendyol_coverage_rate}
                        onChange={(e) => setFormData({ ...formData, trendyol_coverage_rate: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                    </div>
                    <p className="text-xs text-slate-500">Boş bırakılırsa karşılama yok sayılır. Örn: %40 → indirimin %40'ını Trendyol karşılar, kalanı satıcı.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{editingId ? 'Güncelle' : 'Oluştur'}</Button>
                  <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>İptal</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {campaigns.map(campaign => (
            <Card key={campaign.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{campaignTitle(campaign)}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge className="bg-indigo-100 text-indigo-700">{getTypeLabel(campaign.campaign_type)}</Badge>
                      {campaign.discount_type === 'percent'
                        ? <Badge variant="outline">%{campaign.discount_amount} indirim</Badge>
                        : <Badge variant="outline">{campaign.discount_amount} TL indirim</Badge>}
                      {campaign.cart_amount ? <Badge variant="outline">{campaign.cart_amount} TL {campaign.cart_condition === 'under' ? 'altı' : 'üzeri'}</Badge> : null}
                      {Number(campaign.trendyol_coverage_rate) > 0 ? <Badge className="bg-amber-100 text-amber-700">%{campaign.trendyol_coverage_rate} karşılama</Badge> : null}
                      {campaign.is_active ? <Badge className="bg-green-100 text-green-700">Aktif</Badge> : <Badge className="bg-slate-200 text-slate-700">İnaktif</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 mt-3">{safeDate(campaign.start_date)} - {safeDate(campaign.end_date)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => openManager(campaign)}><Plus className="h-4 w-4 mr-1" />Ürün Ekle</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(campaign)}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(campaign.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {campaigns.length === 0 && !showForm && (
          <Card><CardContent className="p-12 text-center"><p className="text-slate-500">Henüz kampanya oluşturulmadı</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
