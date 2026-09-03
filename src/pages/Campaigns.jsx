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
import BaremBadge from '@/components/ui/BaremBadge';
import { baremSec, baremTavanFiyatlari, baremTarifesiSec } from '@/lib/baremKurali';
import { gecerliMaliyet } from '@/lib/gecerliMaliyet';
import { enYuksekTarifeKomisyonu } from '@/lib/tarifeKaydiSecimi';
import {
  INDIRIM_TURLERI, KATILIM_KOSULLARI, KAMPANYA_GRUPLARI,
  kampanyaFiyati, kampanyaFiyatiTersi, fiyatKuralinaUyuyorMu,
  kampanyaMetni, fiyatKuraliMetni, kaydiKampanyayaCevir,
} from '@/lib/trendyolKampanyaIndirimi';

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

// Kampanya gruplari ve indirim turleri Trendyol'un Katilabilecegim
// Kampanyalar ekranindan alindi; tanimlar ve fiyat matematigi
// src/lib/trendyolKampanyaIndirimi.js icinde (test edilebilir).
const CAMPAIGN_TYPES = KAMPANYA_GRUPLARI;
const YUZDELI = (tur) => tur === 'net_percent' || tur === 'cart_percent' || tur === 'qty_percent';

const emptyForm = {
  campaign_type: '',
  campaign_name: '',
  start_date: null,
  end_date: null,
  discount_kind: 'net_percent',
  discount_amount: '',
  threshold_amount: '',
  buy_x: '',
  pay_y: '',
  min_qty: '',
  price_rule_min: '',
  price_rule_max: '',
  participation_condition: 'none',
  trendyol_coverage_rate: '',
};

/** Form alanlarini fiyat modelinin bekledigi kampanya nesnesine cevirir. */
const formuKampanyayaCevir = (f) => ({
  tur: f.discount_kind,
  oran: YUZDELI(f.discount_kind) ? (Number(f.discount_amount) || 0) : 0,
  tutar: f.discount_kind === 'cart_tl' ? (Number(f.discount_amount) || 0) : 0,
  esik: Number(f.threshold_amount) || 0,
  alX: Number(f.buy_x) || 0,
  odeY: Number(f.pay_y) || 0,
  minAdet: Number(f.min_qty) || 0,
  karsilama: Number(f.trendyol_coverage_rate) || 0,
  kuralMin: Number(f.price_rule_min) || 0,
  kuralMax: Number(f.price_rule_max) || 0,
});

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
  const [siraSecimi, setSiraSecimi] = useState('default');
  const [bulkMinProfitRate, setBulkMinProfitRate] = useState('');
  const [bulkMinProfitAmount, setBulkMinProfitAmount] = useState('');
  // Ust sinir: bos birakilirsa sinir yok. Min-max araligi disindaki urunler secilmez.
  const [bulkMaxProfitRate, setBulkMaxProfitRate] = useState('');
  const [bulkMaxProfitAmount, setBulkMaxProfitAmount] = useState('');
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

  // ===================== KAMPANYA FORMU =====================
  const resetForm = () => { setFormData({ ...emptyForm }); setEditingId(null); };
  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (c) => {
    setEditingId(c.id);
    // Eski kayitlar (discount_type/cart_*) da ayni ceviriciden gecer
    const k = kaydiKampanyayaCevir(c);
    const veya = (v) => (v > 0 ? v : '');
    setFormData({
      campaign_type: c.campaign_type || '',
      campaign_name: c.campaign_name || '',
      start_date: c.start_date ? new Date(c.start_date) : null,
      end_date: c.end_date ? new Date(c.end_date) : null,
      discount_kind: k.tur,
      discount_amount: veya(k.tur === 'cart_tl' ? k.tutar : k.oran),
      threshold_amount: veya(k.esik),
      buy_x: veya(k.alX),
      pay_y: veya(k.odeY),
      min_qty: veya(k.minAdet),
      price_rule_min: veya(k.kuralMin),
      price_rule_max: veya(k.kuralMax),
      participation_condition: k.katilim || 'none',
      trendyol_coverage_rate: c.trendyol_coverage_rate ?? '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleTypeChange = (type) => setFormData({ ...formData, campaign_type: type });
  const alan = (ad) => (e) => setFormData({ ...formData, [ad]: e.target.value === '' ? '' : parseFloat(e.target.value) });
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.campaign_type) { toast.error('Lütfen kampanya türünü seçin'); return; }
    if (!formData.start_date || !formData.end_date) { toast.error('Lütfen tarih aralığını seçin'); return; }
    const tur = formData.discount_kind;
    const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
    if (tur === 'buy_x_pay_y') {
      if (!(n(formData.buy_x) > 0) || !(n(formData.pay_y) > 0)) { toast.error('"X Al Y Öde" için al ve öde adetlerini girin'); return; }
      if (n(formData.pay_y) >= n(formData.buy_x)) { toast.error('Öde adedi al adedinden küçük olmalı (örn. 3 Al 2 Öde)'); return; }
    } else if (!(n(formData.discount_amount) > 0)) {
      toast.error(tur === 'cart_tl' ? 'Lütfen indirim tutarını (TL) girin' : 'Lütfen indirim oranını (%) girin'); return;
    }
    if (tur === 'qty_percent' && !(n(formData.min_qty) >= 2)) { toast.error('Minimum adet en az 2 olmalı (örn. 2 Adet ve Üzeri)'); return; }
    if (n(formData.price_rule_min) > 0 && n(formData.price_rule_max) > 0 && n(formData.price_rule_min) > n(formData.price_rule_max)) {
      toast.error('Fiyat kuralında alt sınır üst sınırdan büyük olamaz'); return;
    }

    const payload = {
      campaign_type: formData.campaign_type,
      campaign_name: (formData.campaign_name || '').trim() || null,
      start_date: format(formData.start_date, 'yyyy-MM-dd'),
      end_date: format(formData.end_date, 'yyyy-MM-dd'),
      discount_kind: tur,
      // Eski alanlar diger ekranlarla uyum icin dolduruluyor; sepet
      // alanlari yeni kayitta kullanilmaz (esik/fiyat kurali ayri sutunda)
      discount_type: tur === 'cart_tl' ? 'tl' : 'percent',
      discount_amount: tur === 'buy_x_pay_y' ? 0 : Number(formData.discount_amount),
      threshold_amount: tur === 'cart_tl' ? n(formData.threshold_amount) : null,
      buy_x: tur === 'buy_x_pay_y' ? n(formData.buy_x) : null,
      pay_y: tur === 'buy_x_pay_y' ? n(formData.pay_y) : null,
      min_qty: tur === 'qty_percent' ? n(formData.min_qty) : null,
      price_rule_min: n(formData.price_rule_min),
      price_rule_max: n(formData.price_rule_max),
      participation_condition: formData.participation_condition === 'none' ? null : formData.participation_condition,
      cart_amount: null,
      cart_condition: null,
      trendyol_coverage_rate: n(formData.trendyol_coverage_rate),
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
    const k = kaydiKampanyayaCevir(c);
    const parcalar = [c.campaign_name || getTypeLabel(c.campaign_type), kampanyaMetni(k), fiyatKuraliMetni(k)];
    if (k.karsilama > 0) parcalar.push(`%${k.karsilama} Trendyol karşılamalı`);
    return parcalar.filter(Boolean).join(' · ');
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

  /**
   * Barem onerisi: kampanya fiyatinin etkin karsiligi desi tarifesine
   * dusuyorsa, etkin fiyati barem esigine cekecek kampanya fiyatini onerir.
   * Yalnizca ekranda gosterilir; Excel sablonuna dahil degildir.
   */
  const renderBaremOnerisi = (item, realIndex) => {
    const mevcutFiyat = parseFloat(item.campaign_price) || 0;
    if (!mevcutFiyat) return <span className="text-muted-foreground/70 text-xs">-</span>;

    const mevcut = calculateProfit(mevcutFiyat, item);
    if (!mevcut.breakdown) return <span className="text-muted-foreground/70 text-xs">-</span>;
    if (mevcut.baremUsed === 'barem1' || mevcut.baremUsed === 'barem2') {
      return <span className="text-muted-foreground/70 text-xs">-</span>;
    }

    const maks = parseFloat(item.max_price) || 0;
    let oneri = null;
    for (const [hedefEtkin, ad, tip] of [[BAREM2_UST, 'Barem 2', 'barem2'], [BAREM1_UST, 'Barem 1', 'barem1']]) {
      const aday = etkinFiyatIcinKampanyaFiyati(hedefEtkin);
      if (!aday || aday <= 0) continue;
      if (aday >= mevcutFiyat) continue;          // fiyati dusurerek bareme inilir
      if (maks > 0 && aday > maks) continue;      // max girilebilir asilmasin
      const c = calculateProfit(aday, item);
      if (c.baremUsed !== tip) continue;
      if (c.profitRate <= mevcut.profitRate) continue;
      if (!oneri || c.profitRate > oneri.profitRate) {
        oneri = { fiyat: aday, profit: c.profit, profitRate: c.profitRate, ad };
      }
    }

    if (!oneri) return <span className="text-muted-foreground/70 text-xs">-</span>;
    const karArtisi = oneri.profitRate - mevcut.profitRate;

    return (
      <div className="border border-border rounded-lg p-2 bg-secondary text-left">
        <div className="text-xs font-semibold text-foreground mb-1">{oneri.ad} Önerisi</div>
        <div className="text-xs text-muted-foreground">Fiyat: ₺{oneri.fiyat.toFixed(2)}</div>
        <div className="text-xs font-semibold text-green-600 mt-1">
          +₺{oneri.profit.toFixed(2)} (%{oneri.profitRate.toFixed(1)})
        </div>
        <div className="text-xs font-medium text-foreground mt-1">+%{karArtisi.toFixed(1)} kâr artışı</div>
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-2 h-7 text-xs"
          onClick={() => handlePriceChange(realIndex, oneri.fiyat.toFixed(2))}
        >
          Uygula
        </Button>
      </div>
    );
  };

  // Saticinin eline gecen birim fiyat: indirim turune gore hesaplanir,
  // Trendyol'un karsiladigi pay saticidan dusulmez.
  const effectiveSellerPrice = (campaignPrice) =>
    (aktifKampanya ? kampanyaFiyati(campaignPrice, aktifKampanya) : 0);

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
  const getProductCommissionRate = (item, fiyat = 0) => {
    const isPlus = managingCampaign?.campaign_type === 'trendyol_plus';
    if (isPlus) {
      const pr = matchTariffRecord(plusTariffs, item);
      if (pr) {
        const c = parseFloat(pr.plus_commission_offer) || parseFloat(pr.calculated_commission) || parseFloat(pr.current_commission) || 0;
        if (c > 0) return c;
      }
    } else {
      // Once Komisyon Tarifesi'nin 7 GUNLUK verisi: kampanya donemiyle
      // ortusen kayitta, fiyatin girdigi kademenin pencereler arasi EN
      // YUKSEK komisyonu (Avantajli Urun Etiketi / Flas Urunler ile ayni).
      if (item.barcode && fiyat > 0) {
        const yediGun = enYuksekTarifeKomisyonu(priceRanges, {
          barkod: item.barcode,
          platform: selectedPlatform,
          baslangic: managingCampaign?.start_date,
          bitis: managingCampaign?.end_date,
        }, fiyat);
        if (yediGun) return yediGun;
      }
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

  // Barem esikleri platform kaydindan okunur (sayfaya sabit yazilmazdi).
  const seciliPlatformKaydi = trendyolPlatforms.find(p => p.name === selectedPlatform) || trendyolPlatforms[0];
  const [BAREM2_UST, BAREM1_UST] = baremTavanFiyatlari(seciliPlatformKaydi);

  /**
   * effectiveSellerPrice'in tersi: hedeflenen ETKIN fiyati veren kampanya
   * fiyatini bulur. Barem esikleri etkin fiyata gore degerlendirildigi icin
   * oneri fiyatini dogru hesaplamak adina gerekli.
   */
  // Acik kampanyanin fiyat modeli (tur, oran, esik, karsilama, fiyat kurali)
  const aktifKampanya = managingCampaign ? kaydiKampanyayaCevir(managingCampaign) : null;
  const etkinFiyatIcinKampanyaFiyati = (hedefEtkin) =>
    (aktifKampanya ? kampanyaFiyatiTersi(hedefEtkin, aktifKampanya) : 0);

  const calculateProfit = (campaignPrice, item) => {
    try {
      const effPrice = effectiveSellerPrice(campaignPrice);
      if (!effPrice || effPrice <= 0) return { profit: 0, profitRate: 0, breakdown: null };
      const matchedProduct = getMatchedProduct(item);
      if (!matchedProduct) return { profit: 0, profitRate: 0, breakdown: null };
      const platform = uniquePlatforms.find(p => p.name === selectedPlatform);
      if (!platform) return { profit: 0, profitRate: 0, breakdown: null };

      const commissionRate = getProductCommissionRate(item, parseFloat(campaignPrice) || 0);

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
      // Barem kurallari ortak modulde (src/lib/baremKurali.js): sinirlar
      // platform kaydindan okunur, desi tavani ve use_barem kontrol edilir.
      // Once bu sayfaya sabit yazilmisti ve HepsiBurada'da Trendyol'un
      // bantlari uygulaniyordu.
      const secilenBarem = baremSec(platform, matchedProduct, effPrice, matchedProduct?.desi);
      if (secilenBarem) {
        const baremRate = baremTarifesiSec(platformShippingRates, secilenBarem, matchedProduct?.same_day_delivery || false);
        if (baremRate) {
          shippingCost = baremRate.price;
          shippingVatRate = baremRate.vat_rate || 20;
          baremUsed = secilenBarem;
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
        productCost: gecerliMaliyet(matchedProduct),
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
    let selectedCount = 0, skipNoProduct = 0, skipNoCommission = 0, skipBelow = 0, skipKural = 0;
    const updated = uploadedData.map(item => {
      if (item.selected_type === 'campaign') return item;
      const matched = getMatchedProduct(item);
      if (!matched) { skipNoProduct++; return item; }
      const commRec = getCommissionRecord(item);
      if (!commRec) { skipNoCommission++; return item; }
      const price = item.max_price || item.campaign_price;
      if (!price || price <= 0) return item;
      // Trendyol'un "Fiyat Kuralı" disindaki urun kampanyaya giremez
      if (aktifKampanya && !fiyatKuralinaUyuyorMu(price, aktifKampanya)) { skipKural++; return item; }
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
    if (skipKural > 0) parts.push(`⚠️ ${skipKural} fiyat kuralı dışında`);
    if (selectedCount === 0) toast.warning(parts.join(' • ') || 'Uygun ürün bulunamadı');
    else toast.success(parts.join(' • '));
  };

  const handleBulkSelect = () => {
    const minRate = parseFloat(bulkMinProfitRate) || 0;
    const minAmount = parseFloat(bulkMinProfitAmount) || 0;
    const maxRate = bulkMaxProfitRate !== '' ? parseFloat(bulkMaxProfitRate) : Infinity;
    const maxAmount = bulkMaxProfitAmount !== '' ? parseFloat(bulkMaxProfitAmount) : Infinity;
    const araliktaMi = (oran, tutar) =>
      oran >= minRate && tutar >= minAmount &&
      oran <= (Number.isNaN(maxRate) ? Infinity : maxRate) &&
      tutar <= (Number.isNaN(maxAmount) ? Infinity : maxAmount);
    const visible = new Set(sortedData.map(i => i.barcode));
    const updated = uploadedData.map(item => {
      if (!visible.has(item.barcode)) return item;
      const price = item.campaign_price || item.max_price;
      if (!price || price <= 0) return item;
      const { profit, profitRate } = calculateProfit(price, item);
      if (araliktaMi(profitRate, profit)) return { ...item, selected_type: 'campaign', campaign_price: price };
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
        productCost: gecerliMaliyet(matchedProduct),
        productVatRate: matchedProduct?.vat_rate || 20,
        commissionRate: calc.commissionRate || 0,
        corporateTaxRate: (calc.platform?.corporate_tax_rate ?? 25),
        packagingCost: calc.breakdown?.packagingCost || 0,
        printingCost: matchedProduct?.printing_cost || 0,
        extraCost: matchedProduct?.extra_cost || 0,
        shippingCost: calc.breakdown?.shippingCost || 0,
        posServiceFee: calc.breakdown?.posServiceFee || 0,
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
  // Siralama: kar orani fiyat motorunu calistirdigi icin anahtar her
  // karsilastirmada degil, satir basina BIR KEZ hesaplanip sirasi bulunuyor.
  const sortedData = React.useMemo(() => {
    if (siraSecimi === 'default') return filteredData;

    const anahtarli = filteredData.map(item => {
      let anahtar;
      if (siraSecimi.startsWith('name')) {
        anahtar = (item.product_name || '').toLocaleLowerCase('tr');
      } else if (siraSecimi.startsWith('price')) {
        anahtar = Number(item.campaign_price || item.max_price || 0);
      } else {
        anahtar = Number(calculateProfit(item.campaign_price || item.max_price, item)?.profitRate ?? 0);
      }
      return { item, anahtar };
    });

    const artan = siraSecimi.endsWith('asc');
    anahtarli.sort((a, b) => {
      if (typeof a.anahtar === 'string') {
        return artan ? a.anahtar.localeCompare(b.anahtar, 'tr') : b.anahtar.localeCompare(a.anahtar, 'tr');
      }
      return artan ? a.anahtar - b.anahtar : b.anahtar - a.anahtar;
    });
    return anahtarli.map(x => x.item);
    // calculateProfit her renderda yeniden tanimlaniyor; bagimliliga
    // eklemek sonsuz yeniden hesaba yol acar, veri + secim yeterli.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, siraSecimi]);
  const allCategories = [...new Set(uploadedData.map(item => getMatchedProduct(item)?.category_name || item.category).filter(Boolean))].sort();
  const selectedCount = uploadedData.filter(i => i.selected_type === 'campaign').length;

  // ===================== RENDER: ÜRÜN YÖNETİMİ =====================
  if (managingCampaign) {
    return (
      <div className="min-h-screen bg-secondary">
        <div className="ph-page mx-auto">
          <Button variant="outline" onClick={closeManager} className="mb-4">← Kampanyalara Dön</Button>
          <div className="mb-6">
            <h1 className="ph-title">Ürün Ekle — {getTypeLabel(managingCampaign.campaign_type)}</h1>
            <p className="text-muted-foreground mt-1">{campaignTitle(managingCampaign)} · {safeDate(managingCampaign.start_date)} - {safeDate(managingCampaign.end_date)}</p>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  {trendyolPlatforms.length === 1 ? (
                    <div className="flex items-center h-10 px-3 border border-border rounded-xl bg-secondary text-sm font-medium">{trendyolPlatforms[0]?.name}</div>
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
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-border" />
                </div>
              </div>
              {uploadProgress.total > 0 && (<p className="text-sm text-muted-foreground">Yükleniyor: {uploadProgress.current}/{uploadProgress.total}</p>)}
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
                <Select value={siraSecimi} onValueChange={setSiraSecimi}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Sırala" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Varsayılan</SelectItem>
                    <SelectItem value="rate_desc">Kâr oranı: yüksek → düşük</SelectItem>
                    <SelectItem value="rate_asc">Kâr oranı: düşük → yüksek</SelectItem>
                    <SelectItem value="price_desc">Kampanya fiyatı: yüksek → düşük</SelectItem>
                    <SelectItem value="price_asc">Kampanya fiyatı: düşük → yüksek</SelectItem>
                    <SelectItem value="name_asc">Ürün adı: A → Z</SelectItem>
                    <SelectItem value="name_desc">Ürün adı: Z → A</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSmartAutoSelect} className="bg-primary hover:bg-black dark:hover:bg-white/90"><Sparkles className="h-4 w-4 mr-1" />Akıllı Otomatik Seç</Button>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="min %" value={bulkMinProfitRate} onChange={(e) => setBulkMinProfitRate(e.target.value)} className="w-24" />
                  <Input type="number" placeholder="min TL" value={bulkMinProfitAmount} onChange={(e) => setBulkMinProfitAmount(e.target.value)} className="w-24" />
                  <Input type="number" placeholder="maks %" value={bulkMaxProfitRate} onChange={(e) => setBulkMaxProfitRate(e.target.value)} className="w-24" />
                  <Input type="number" placeholder="maks TL" value={bulkMaxProfitAmount} onChange={(e) => setBulkMaxProfitAmount(e.target.value)} className="w-24" />
                  <Button variant="outline" onClick={handleBulkSelect}>Toplu Seç</Button>
                </div>
                <div className="flex-1" />
                <Badge className="bg-primary text-primary-foreground">{selectedCount} seçili</Badge>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700"><Check className="h-4 w-4 mr-1" />Kaydet</Button>
                <Button onClick={handleExport} variant="outline"><Download className="h-4 w-4 mr-1" />Excel İndir</Button>
                <Button onClick={handleDeleteExcel} variant="outline" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4 mr-1" />Excel'i Sil</Button>
              </div>

              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary border-b">
                      <tr className="text-left text-muted-foreground">
                        <th className="p-3 w-10"></th>
                        <th className="p-3">Ürün</th>
                        <th className="p-3 text-right">Stok</th>
                        <th className="p-3 text-right">Mevcut Fiyat</th>
                        <th className="p-3 text-right">Max Girilebilir</th>
                        <th className="p-3 text-right">Kampanya Fiyatı</th>
                        <th className="p-3 text-right">Net Kâr</th>
                        <th className="p-3 text-right">Kâr %</th>
                        <th className="p-3 text-center min-w-[150px]">Barem Önerisi</th>
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
                          <tr key={item.id || realIndex} className={`border-b hover:bg-secondary ${isSelected ? 'bg-secondary' : ''}`}>
                            <td className="p-3"><input type="checkbox" checked={isSelected} onChange={() => handleSelect(realIndex)} className="h-4 w-4" /></td>
                            <td className="p-3">
                              <div className="font-medium text-foreground">{item.product_name || '-'}</div>
                              <div className="text-xs text-muted-foreground/70">{item.barcode}{matched ? '' : ' · ⚠️ eşleşmedi'}</div>
                            </td>
                            <td className="p-3 text-right">{item.current_stock}</td>
                            <td className="p-3 text-right">{Number(item.current_sale_price).toFixed(2)} ₺</td>
                            <td className="p-3 text-right font-medium">{Number(item.max_price).toFixed(2)} ₺</td>
                            <td className="p-3 text-right">
                              <Input type="number" value={item.campaign_price} onChange={(e) => handlePriceChange(realIndex, e.target.value)}
                                className={`w-28 text-right ml-auto ${overMax ? 'border-red-400' : ''}`} />
                              {overMax && <div className="text-[10px] text-red-500 mt-1">Max'ı aşıyor!</div>}
                            </td>
                            <td className={`p-3 text-right font-semibold ${below ? 'text-red-600' : 'text-green-600'}`}>{matched ? `${calc.profit.toFixed(2)} ₺` : '-'}</td>
                            <td className={`p-3 text-right font-semibold ${below ? 'text-red-600' : 'text-green-600'}`}>
                              {matched ? `%${calc.profitRate.toFixed(1)}` : '-'}
                              {matched && <BaremBadge barem={calc.baremUsed} className="ml-1" />}
                              {below && <div className="text-[10px] text-red-500">taban altı</div>}
                            </td>
                            <td className="p-3 text-center">{matched ? renderBaremOnerisi(item, realIndex) : <span className="text-muted-foreground/70 text-xs">-</span>}</td>
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
            <Card><CardContent className="p-12 text-center text-muted-foreground">Bu kampanya için Excel yükleyin.</CardContent></Card>
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
    <div className="min-h-screen bg-secondary">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="ph-title">Kampanyalar</h1>
            <p className="text-muted-foreground mt-1">Kampanya oluşturun ve yönetin</p>
          </div>
          <Button onClick={() => (showForm ? (resetForm(), setShowForm(false)) : openNew())} className="bg-primary hover:bg-black dark:hover:bg-white/90">
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

                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Kampanya Adı</Label>
                    <Input placeholder="Opsiyonel — Trendyol'daki adı, örn. Hobi Ürünlerinde 300 TL üzeri 40 TL indirim" value={formData.campaign_name}
                      onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })} />
                  </div>
                )}

                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>İndirim Türü *</Label>
                    <Select value={formData.discount_kind} onValueChange={(v) => setFormData({ ...formData, discount_kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INDIRIM_TURLERI.map(t => <SelectItem key={t.value} value={t.value}>{t.label} <span className="text-muted-foreground">— {t.ornek}</span></SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.campaign_type && YUZDELI(formData.discount_kind) && (
                  <div className="grid grid-cols-2 gap-4">
                    {formData.discount_kind === 'qty_percent' && (
                      <div className="space-y-2">
                        <Label>Minimum Adet *</Label>
                        <Input type="number" min="2" placeholder="2" value={formData.min_qty} onChange={alan('min_qty')} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>İndirim Oranı (%) *</Label>
                      <Input type="number" placeholder="15" value={formData.discount_amount} onChange={alan('discount_amount')} />
                    </div>
                  </div>
                )}

                {formData.campaign_type && formData.discount_kind === 'cart_tl' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Sepet Eşiği (TL)</Label>
                        <Input type="number" placeholder="500" value={formData.threshold_amount} onChange={alan('threshold_amount')} />
                      </div>
                      <div className="space-y-2">
                        <Label>İndirim Tutarı (TL) *</Label>
                        <Input type="number" placeholder="100" value={formData.discount_amount} onChange={alan('discount_amount')} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">Ürün eşiğin altındaysa müşteri eşiğe ulaşmak için birden fazla alır; indirim adetlere bölünerek hesaplanır.</p>
                  </>
                )}

                {formData.campaign_type && formData.discount_kind === 'buy_x_pay_y' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Al (adet) *</Label>
                      <Input type="number" min="2" placeholder="3" value={formData.buy_x} onChange={alan('buy_x')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Öde (adet) *</Label>
                      <Input type="number" min="1" placeholder="2" value={formData.pay_y} onChange={alan('pay_y')} />
                    </div>
                  </div>
                )}

                {formData.campaign_type && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fiyat Kuralı — Alt Sınır (TL)</Label>
                        <Input type="number" placeholder="Opsiyonel — örn. 100" value={formData.price_rule_min} onChange={alan('price_rule_min')} />
                      </div>
                      <div className="space-y-2">
                        <Label>Fiyat Kuralı — Üst Sınır (TL)</Label>
                        <Input type="number" placeholder="Opsiyonel — örn. 700" value={formData.price_rule_max} onChange={alan('price_rule_max')} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">Trendyol'un "Fiyat Kuralı" satırı: "100 TL ve üzeri ürünler", "10 TL ve 700 TL arası ürünler". Aralık dışındaki ürünler otomatik seçimde atlanır.</p>
                  </>
                )}

                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Katılım Koşulu</Label>
                    <Select value={formData.participation_condition} onValueChange={(v) => setFormData({ ...formData, participation_condition: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Belirtilmemiş</SelectItem>
                        {KATILIM_KOSULLARI.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Bilgi amaçlı; Trendyol'un Excel'indeki "girilebilecek max fiyat" bu koşulu zaten uygular.</p>
                  </div>
                )}

                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Trendyol Karşılama Oranı (%)</Label>
                    <div className="relative">
                      <Input type="number" placeholder="Opsiyonel — örn. 40" value={formData.trendyol_coverage_rate}
                        onChange={(e) => setFormData({ ...formData, trendyol_coverage_rate: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Boş bırakılırsa karşılama yok sayılır. Örn: %40 → indirimin %40'ını Trendyol karşılar, kalanı satıcı.</p>
                  </div>
                )}

                {formData.campaign_type && kampanyaMetni(formuKampanyayaCevir(formData)) && (
                  <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
                    <span className="text-muted-foreground">İndirim Detayı: </span>
                    <span className="font-medium">{kampanyaMetni(formuKampanyayaCevir(formData))}</span>
                    {fiyatKuraliMetni(formuKampanyayaCevir(formData)) && <span className="text-muted-foreground"> · Fiyat Kuralı: {fiyatKuraliMetni(formuKampanyayaCevir(formData))}</span>}
                    {Number(formData.trendyol_coverage_rate) > 0 && <span className="text-muted-foreground"> · %{formData.trendyol_coverage_rate} Trendyol Karşılamalı</span>}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" className="bg-primary hover:bg-black dark:hover:bg-white/90">{editingId ? 'Güncelle' : 'Oluştur'}</Button>
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
                    <h3 className="text-lg font-semibold text-foreground">{campaignTitle(campaign)}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge className="bg-secondary text-muted-foreground">{getTypeLabel(campaign.campaign_type)}</Badge>
                      <Badge variant="outline">{kampanyaMetni(kaydiKampanyayaCevir(campaign))}</Badge>
                      {fiyatKuraliMetni(kaydiKampanyayaCevir(campaign)) ? <Badge variant="outline">{fiyatKuraliMetni(kaydiKampanyayaCevir(campaign))}</Badge> : null}
                      {campaign.participation_condition ? <Badge variant="outline">{KATILIM_KOSULLARI.find(x => x.value === campaign.participation_condition)?.label || campaign.participation_condition}</Badge> : null}
                      {Number(campaign.trendyol_coverage_rate) > 0 ? <Badge className="bg-amber-100 text-amber-700">%{campaign.trendyol_coverage_rate} karşılama</Badge> : null}
                      {campaign.is_active ? <Badge className="bg-green-100 text-green-700">Aktif</Badge> : <Badge className="bg-border text-muted-foreground">İnaktif</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">{safeDate(campaign.start_date)} - {safeDate(campaign.end_date)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="bg-primary hover:bg-black dark:hover:bg-white/90" onClick={() => openManager(campaign)}><Plus className="h-4 w-4 mr-1" />Ürün Ekle</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(campaign)}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(campaign.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {campaigns.length === 0 && !showForm && (
          <Card><CardContent className="p-12 text-center"><p className="text-muted-foreground">Henüz kampanya oluşturulmadı</p></CardContent></Card>
        )}
      </div>
    </div>
  );
}
