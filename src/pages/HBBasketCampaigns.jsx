import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Filter, AlertCircle, Info, Trash2, Sparkles, Calendar as CalendarIcon, Save } from 'lucide-react';
import { calculatePriceBreakdown, findDesiShippingRate } from '@/components/PriceCalculationEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import PriceDetailModal from '@/components/modals/PriceDetailModal';
import { baremSec, baremTarifesiSec } from '@/lib/baremKurali';
import { kampanyaSayfasiniKur, otomatikGenislikler, bosSkuSutunu, SKU_BASLIGI } from '@/lib/hbSepetDisaAktarim';
import { kdvDahilOran, komisyonEtiketi } from '@/lib/hbKomisyon';
import { havuzdaCalistir, tekrarDene } from '@/lib/istekHavuzu';
import { aciklamalardanIndirim, indirimliFiyat, indirimEtiketi } from '@/lib/hbSepetIndirimi';
import { hedefleriCoz, hedefVarMi, hedefTutuyorMu, komisyonBul } from '@/lib/hedefKarSecimi';
import { gecerliMaliyet } from '@/lib/gecerliMaliyet';

const Product = db.entities.Product;
const Platform = db.entities.Platform;
const Commission = db.entities.Commission;
const ShippingRate = db.entities.ShippingRate;
const MarketplaceProduct = db.entities.MarketplaceProduct;
const BasketEntity = db.entities.HBBasketCampaign;

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
// Oranlar HB'nin Excel'inden HAM (KDV haric) geliyor ve okundugu anda
// kdvDahilOran ile cevriliyor; buradaki deger artik KDV dahildir.
// Etikette HB'nin panelde gosterdigi ham oran da parantezde yazilir.
// Ayrinti ve gecmis: src/lib/hbKomisyon.js
const commLabel = komisyonEtiketi;

export default function HBBasketCampaigns() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [uploadedData, setUploadedData] = useState([]);
  const [originalExcelData, setOriginalExcelData] = useState(null);
  // Kampanya donemi. HB kampanyalari belirli tarih araliginda gecerlidir;
  // secimler bu aralik anahtariyla saklanir (Plus Tarifesi ile ayni desen).
  const [dateRangeValue, setDateRangeValue] = useState({ from: undefined, to: undefined });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  // Musterinin sepette aldigi indirim (satici karsilar). Komisyon
  // indiriminden ayridir; kar bu indirimli tutardan hesaplanir.
  const [kampanyaIndirimi, setKampanyaIndirimi] = useState(null);
  // Sayfa uzerinden verilen ek alt sinirlar. Komisyon kaydindaki hedeflerin
  // USTUNE biner; ikisi de saglanmadan urun secilmez.
  const [minKarOrani, setMinKarOrani] = useState('');
  const [minKarTutari, setMinKarTutari] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [detailModal, setDetailModal] = useState({ open: false, product: null, priceData: null, calculationDetails: null });

  React.useEffect(() => {
    db.auth.me().then((user) => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: platforms = [], isFetched: platformlarYuklendi } = useQuery({ queryKey: ['platforms', userEmail], queryFn: () => Platform.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: products = [] } = useQuery({ queryKey: ['products', userEmail], queryFn: () => Product.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: commissions = [] } = useQuery({ queryKey: ['commissions', userEmail], queryFn: () => Commission.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: shippingRates = [] } = useQuery({ queryKey: ['shippingRates'], queryFn: () => ShippingRate.list('-id', 10000), enabled: !!userEmail });
  const { data: packages = [] } = useQuery({ queryKey: ['packages'], queryFn: () => db.entities.Package.list(), enabled: !!userEmail });
  const { data: settings = [] } = useQuery({ queryKey: ['settings', userEmail], queryFn: () => db.entities.Settings.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: marketplaceProducts = [] } = useQuery({ queryKey: ['marketplaceProducts', userEmail], queryFn: () => MarketplaceProduct.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: kayitliKampanyalar = [] } = useQuery({
    queryKey: ['hbBasketCampaigns', userEmail],
    queryFn: () => BasketEntity.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  // Secili donemin 'yyyy-MM-dd' metinleri. Aralik tamamlanmadan null.
  const donem = React.useMemo(() => {
    if (!dateRangeValue?.from || !dateRangeValue?.to) return null;
    return {
      baslangic: format(dateRangeValue.from, 'yyyy-MM-dd'),
      bitis: format(dateRangeValue.to, 'yyyy-MM-dd'),
    };
  }, [dateRangeValue?.from, dateRangeValue?.to]);

  const donemHazir = !!(selectedPlatform && donem);

  // Son secilen donem tarayicida hatirlanir. Kullanici baska sayfaya gidip
  // dondugunde tarih araligini tekrar secmek zorunda kalmasin; aralik
  // dolunca asagidaki etki kayitli calismayi da geri yukler.
  const DONEM_ANAHTARI = 'hbSepetSonDonem';

  React.useEffect(() => {
    try {
      const ham = window.localStorage.getItem(DONEM_ANAHTARI);
      if (!ham) return;
      const kayit = JSON.parse(ham);
      const bas = kayit?.from ? new Date(kayit.from) : null;
      const bit = kayit?.to ? new Date(kayit.to) : null;
      if (!bas || !bit || Number.isNaN(bas.getTime()) || Number.isNaN(bit.getTime())) return;
      setDateRangeValue({ from: bas, to: bit });
    } catch {
      // Gizli sekmede/depolama kapaliyken erisim hata atabilir; sayfa
      // hatirlamadan da calismali.
    }
  }, []);

  React.useEffect(() => {
    if (!donem) return;
    try {
      window.localStorage.setItem(DONEM_ANAHTARI, JSON.stringify({
        from: dateRangeValue.from.toISOString(),
        to: dateRangeValue.to.toISOString(),
      }));
    } catch {
      // Hatirlayamamak islevi bozmaz.
    }
  }, [donem?.baslangic, donem?.bitis]);

  // Donem secilince o donemin kayitli calismasi geri yuklenir; Excel'i
  // yeniden yuklemeye gerek kalmaz.
  React.useEffect(() => {
    if (!donemHazir) return;
    const donemKayitlari = kayitliKampanyalar.filter(
      (r) => r.platform_account === selectedPlatform &&
             r.start_date === donem.baslangic && r.end_date === donem.bitis
    );
    if (donemKayitlari.length === 0) return;

    setUploadedData(donemKayitlari.map((r) => ({ ...r, selected: !!r.selected })));

    // Indirim de geri yuklenmeli; yoksa kar yanlis (yuksek) gorunur.
    const indirimli = donemKayitlari.find((r) => r.campaign_discount_type);
    setKampanyaIndirimi(indirimli
      ? { tur: indirimli.campaign_discount_type,
          deger: Number(indirimli.campaign_discount_value) || 0,
          ham: indirimli.campaign_discount_raw || '' }
      : null);

    // Disa aktarim HB'nin sablonuna yazdigi icin kaynak dosya da gerekli.
    const excelli = donemKayitlari.find((r) => r.excel_file_url);
    if (!excelli) return;
    fetch(excelli.excel_file_url)
      .then((r) => r.arrayBuffer())
      .then((ab) => {
        const baytlar = new Uint8Array(ab);
        const wb = XLSX.read(baytlar, { type: 'array' });
        const sn = wb.SheetNames.find((n) => norm(n) === 'Listelerim') || wb.SheetNames[0];
        setOriginalExcelData({ workbook: wb, sheetName: sn, bytes: baytlar });
      })
      .catch((e) => console.error('Excel geri yuklenemedi:', e));
  }, [kayitliKampanyalar, selectedPlatform, donem?.baslangic, donem?.bitis]);


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
      // Barem kurallari ortak modulde (src/lib/baremKurali.js): sinirlar
      // platform kaydindan okunur, desi tavani ve use_barem kontrol edilir.
      // Once bu sayfaya sabit yazilmisti ve HepsiBurada'da Trendyol'un
      // bantlari uygulaniyordu.
      const secilenBarem = baremSec(platform, matchedProduct, price, matchedProduct?.desi);
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
        productCost: gecerliMaliyet(matchedProduct),
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

  // Bir donemin kayitlarini yeniler: once o donemin eskileri silinir,
  // sonra yeni satirlar yazilir. Kopya kalmaz.
  const donemeYaz = async (satirlar) => {
    const eskiler = kayitliKampanyalar.filter(
      (r) => r.platform_account === selectedPlatform &&
             r.start_date === donem.baslangic && r.end_date === donem.bitis
    );
    await havuzdaCalistir(eskiler, 16, (r) => tekrarDene(() => BasketEntity.delete(r.id)));

    const yazilacak = satirlar.map((it) => ({
      platform_account: selectedPlatform,
      start_date: donem.baslangic,
      end_date: donem.bitis,
      product_name: it.product_name || '',
      brand: it.brand || '',
      seller_stock_code: it.seller_stock_code || '',
      hb_sku: it.hb_sku || '',
      barcode: it.barcode || '',
      category: it.category || '',
      stock: it.stock || 0,
      max_price: it.max_price || 0,
      current_price: it.current_price || 0,
      current_commission: it.current_commission || 0,
      discounted_commission: it.discounted_commission || 0,
      campaign_price: it.campaign_price || 0,
      selected: !!it.selected,
      matched_product_id: it.matched_product_id || null,
      excel_file_url: it.excel_file_url || null,
      campaign_discount_type: it.campaign_discount_type || null,
      campaign_discount_value: it.campaign_discount_value || 0,
      campaign_discount_raw: it.campaign_discount_raw || null,
    }));

    const { basarisiz } = await havuzdaCalistir(
      yazilacak, 16, (kayit) => tekrarDene(() => BasketEntity.create(kayit))
    );
    queryClient.invalidateQueries({ queryKey: ['hbBasketCampaigns'] });
    return { toplam: yazilacak.length, basarisiz: basarisiz.length };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedPlatform) { toast.error('Lütfen önce platform seçin'); return; }
    if (!donem) { toast.error('Lütfen kampanyanın tarih aralığını seçin'); return; }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        // Ham bayt dizisi saklanir: disa aktarim yuklenen dosyanin
        // KENDISINI acip duzenler, kopyasindan yeniden uretmez.
        const hamBaytlar = new Uint8Array(event.target.result);
        const workbook = XLSX.read(hamBaytlar, { type: 'array' });
        let sheetName = workbook.SheetNames.find((n) => norm(n) === 'Listelerim');
        if (!sheetName) {
          sheetName = workbook.SheetNames.find((n) => {
            const r = XLSX.utils.sheet_to_json(workbook.Sheets[n], { header: 1, defval: '' })[0] || [];
            return r.map(norm).some((h) => h.startsWith('Kampanyanın uygulanacağı fiyat'));
          }) || workbook.SheetNames[workbook.SheetNames.length - 1];
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setOriginalExcelData({ workbook, sheetName, bytes: hamBaytlar });

        // Musteri indirimi "Açıklamalar" sayfasindaki "Kampanyanın İndirimi"
        // satirinda duruyor (orn. "Sepette %15 İndirim"). Kar bundan etkilenir.
        const aciklamaSayfasi = workbook.SheetNames.find((n) => norm(n).startsWith('Açıklama'));
        const indirim = aciklamaSayfasi
          ? aciklamalardanIndirim(XLSX.utils.sheet_to_json(workbook.Sheets[aciklamaSayfasi], { header: 1, defval: '' }))
          : null;
        setKampanyaIndirimi(indirim);

        // Kaynak dosya depoya alinir. Donem sonra tekrar acildiginda disa
        // aktarim HB'nin KENDI sablonuna yazmak zorunda; satirlardan yeniden
        // kurmak sablonu birebir korumaz.
        let excelUrl = null;
        try {
          const tampon = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', bookSST: true });
          const blob = new Blob([new Uint8Array(tampon)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const dosya = new File([blob], file.name || 'sepet-kampanyasi.xlsx', { type: blob.type });
          excelUrl = (await db.integrations.Core.UploadFile({ file: dosya })).file_url;
        } catch (yuklemeHatasi) {
          // Depoya yazilamazsa sayfa yine calisir; yalnizca donem geri
          // yuklendiginde Excel'i tekrar secmek gerekir.
          console.error('Excel depoya yuklenemedi:', yuklemeHatasi);
        }

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
            current_commission: kdvDahilOran(parsePercent(row['Güncel Komisyon Oranı'])),
            discounted_commission: kdvDahilOran(parsePercent(row['İndirimli Komisyon Oranı'])),
            campaign_price: 0,
            selected: false,
            platform_account: selectedPlatform,
            start_date: donem.baslangic,
            end_date: donem.bitis,
            excel_file_url: excelUrl,
            campaign_discount_type: indirim?.tur || null,
            campaign_discount_value: indirim?.deger || 0,
            campaign_discount_raw: indirim?.ham || null,
          };
          const matched = getMatchedProduct(item);
          item.matched_product_id = matched?.id || null;
          // Varsayılan kampanya fiyatı = girilebilecek max fiyat (satıcı için en yüksek, en kârlı)
          item.campaign_price = item.max_price || item.current_price || 0;
          return item;
        }).filter((it) => it.seller_stock_code || it.product_name);

        setUploadedData(parsed);

        // KENDILIGINDEN KAYDEDILIR. Aksi halde kullanici sayfadan ayrilinca
        // yukledigi her sey kayboluyordu; donem secilince geri gelmesi de
        // kayda bagli.
        setKaydediliyor(true);
        try {
          const { toplam, basarisiz } = await donemeYaz(parsed);
          if (basarisiz > 0) toast.warning(`${parsed.length} ürün yüklendi · ${basarisiz} kayıt yazılamadı`);
          else toast.success(`${toplam} ürün yüklendi ve ${donem.baslangic} – ${donem.bitis} dönemine kaydedildi`);
        } catch (kayitHatasi) {
          toast.warning(`${parsed.length} ürün yüklendi ama kaydedilemedi: ${kayitHatasi?.message || kayitHatasi}`);
        } finally {
          setKaydediliyor(false);
        }
      } catch (error) {
        toast.error('Excel dosyası okunamadı: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCampaignPriceChange = (item, value) => {
    const v = parseFloat(value) || 0;
    setUploadedData((prev) => prev.map((it) => (it === item ? { ...it, campaign_price: v } : it)));
  };
  const toggleSelect = (item) => {
    setUploadedData((prev) => prev.map((it) => (it === item ? { ...it, selected: !it.selected } : it)));
  };

  // Musterinin gercekte odedigi tutar. Kar bundan hesaplanir; girilen
  // fiyattan hesaplamak kari oldugundan yuksek gosterir.
  const odenecekFiyat = (fiyat) => indirimliFiyat(fiyat, kampanyaIndirimi);

  const kampanyaKari = (fiyat, item) =>
    calculateProfit(odenecekFiyat(fiyat), item.discounted_commission, item);

  // Fiyat yine girilebilecek MAX fiyattir; secim olcusu ise Komisyonlar
  // sayfasindaki INDIRIMLI hedeflerdir (is-kurallari "Akilli Otomatik Sec").
  // Onceki hal "kar sifirin ustundeyse sec" diyordu; %1 karla kampanyaya
  // girmek anlamli degil, ustelik komisyon KDV'si ve sepet indirimi
  // duzeltildikten sonra marjlar iyice daraldi.
  const handleSmartAutoSelect = () => {
    const sayac = { secilen: 0, eslesmeyen: 0, hedefsiz: 0, tutmayan: 0, zatenSecili: 0, fiyatsiz: 0 };
    const ekOran = parseFloat(minKarOrani) || 0;
    const ekTutar = parseFloat(minKarTutari) || 0;

    const guncel = uploadedData.map((item) => {
      // Elle yapilmis secim korunur; "Secimleri Kaldir" ile sifirlanabilir.
      if (item.selected) { sayac.zatenSecili++; return item; }

      const urun = getMatchedProduct(item);
      if (!urun) { sayac.eslesmeyen++; return item; }

      const fiyat = item.max_price || item.current_price || 0;
      if (fiyat <= 0) { sayac.fiyatsiz++; return item; }

      const hedefler = hedefleriCoz(komisyonBul(commissions, hbPlatforms, urun));
      if (!hedefVarMi(hedefler)) { sayac.hedefsiz++; return { ...item, campaign_price: fiyat }; }

      const { profit, profitRate } = kampanyaKari(fiyat, item);
      const { uygun } = hedefTutuyorMu(profit, profitRate, hedefler);

      // Sayfadaki ek alt sinirlar
      const ekUygun = (ekOran <= 0 || profitRate >= ekOran) && (ekTutar <= 0 || profit >= ekTutar);

      if (uygun && ekUygun) { sayac.secilen++; return { ...item, campaign_price: fiyat, selected: true }; }
      sayac.tutmayan++;
      return { ...item, campaign_price: fiyat };
    });

    setUploadedData(guncel);

    const parcalar = [];
    if (sayac.secilen > 0) parcalar.push(`✅ ${sayac.secilen} ürün seçildi`);
    if (sayac.zatenSecili > 0) parcalar.push(`${sayac.zatenSecili} zaten seçili`);
    if (sayac.tutmayan > 0) parcalar.push(`${sayac.tutmayan} hedef kârı tutmadı`);
    if (sayac.hedefsiz > 0) parcalar.push(`⚠️ ${sayac.hedefsiz} üründe indirimli hedef tanımlı değil`);
    if (sayac.eslesmeyen > 0) parcalar.push(`⚠️ ${sayac.eslesmeyen} ürün eşleşmedi`);
    if (sayac.fiyatsiz > 0) parcalar.push(`⚠️ ${sayac.fiyatsiz} üründe fiyat yok`);

    if (sayac.secilen === 0) toast.warning(parcalar.join(' • ') || 'Hedefi tutan ürün bulunamadı');
    else toast.success(parcalar.join(' • '));
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
        productCost: gecerliMaliyet(matchedProduct),
        productVatRate: matchedProduct?.vat_rate || 20,
        commissionRate,
        packagingCost: calc.breakdown?.packagingCost || 0,
        printingCost: matchedProduct?.printing_cost || 0,
        extraCost: matchedProduct?.extra_cost || 0,
        shippingCost: calc.breakdown?.shippingCost || 0,
        posServiceFee: calc.breakdown?.posServiceFee || 0,
      },
    });
  };

  // Secimleri elle kaydetme. Yukleme zaten kendiliginden kaydediyor; bu
  // buton fiyat/secim degisikliklerini yazmak icin.
  const handleSaveSelections = async () => {
    if (!donemHazir) { toast.error('Platform ve tarih aralığı seçin'); return; }
    if (uploadedData.length === 0) { toast.error('Kaydedilecek liste yok'); return; }
    setKaydediliyor(true);
    try {
      const { toplam, basarisiz } = await donemeYaz(uploadedData);
      if (basarisiz > 0) toast.error(`${toplam - basarisiz} kayıt yazıldı, ${basarisiz} tanesi başarısız`);
      else toast.success(`${toplam} ürün ${donem.baslangic} – ${donem.bitis} dönemine kaydedildi`);
    } catch (hata) {
      toast.error('Kaydetme sırasında hata: ' + (hata?.message || hata));
    } finally {
      setKaydediliyor(false);
    }
  };

  // Temizle yalnizca ekrani bosaltmaz; o donemin KAYITLARINI da siler.
  // Aksi halde sayfadan cikip donunce temizlenen liste geri geliyordu.
  const handleClear = async () => {
    setUploadedData([]);
    setOriginalExcelData(null);
    setKampanyaIndirimi(null);
    if (!donemHazir) { toast.success('Liste temizlendi'); return; }

    const eskiler = kayitliKampanyalar.filter(
      (r) => r.platform_account === selectedPlatform &&
             r.start_date === donem.baslangic && r.end_date === donem.bitis
    );
    if (eskiler.length === 0) { toast.success('Liste temizlendi'); return; }

    setKaydediliyor(true);
    try {
      await havuzdaCalistir(eskiler, 16, (r) => tekrarDene(() => BasketEntity.delete(r.id)));
      queryClient.invalidateQueries({ queryKey: ['hbBasketCampaigns'] });
      toast.success(`Liste ve ${donem.baslangic} – ${donem.bitis} dönemine ait ${eskiler.length} kayıt silindi`);
    } catch (hata) {
      toast.error('Kayıtlar silinemedi: ' + (hata?.message || hata));
    } finally {
      setKaydediliyor(false);
    }
  };

  // Disa aktarim: kampanyaya girecek urunlerden TEMIZ bir dosya uretir.
  //
  // NICIN TEMIZ: once yuklenen dosyanin kendisi duzenlenip veriliyordu ki
  // bicim korunsun. Ama HB'nin dosyasinda gomulu resim, aciklama balonlari
  // ve VML cizimleri var; kutuphane bunlari yazarken referanslari tutarsiz
  // birakiyor ve Excel dosyayi "icinde sorun var" diye aciyordu. Renk/bicim
  // kurtarilamadigi gibi dosya da bozuluyordu.
  //
  // Artik yalnizca DEGERLER yazilir: iki sayfa (urun listesi + Açıklamalar),
  // dogru basliklar, dogru sutun sirasi ve icerige gore otomatik sutun
  // genisligi. Panel dosyayi bu haliyle sorunsuz okur.
  const handleExport = () => {
    if (uploadedData.length === 0 || !originalExcelData?.bytes) {
      toast.error('Yüklenmiş Excel bulunamadı'); return;
    }
    const { bytes, sheetName } = originalExcelData;

    const kaynak = XLSX.read(bytes, { type: 'array' });
    const listeSayfasi = kaynak.Sheets[sheetName];
    if (!listeSayfasi) { toast.error(`"${sheetName}" sayfası dosyada bulunamadı`); return; }

    const aoa = XLSX.utils.sheet_to_json(listeSayfasi, { header: 1, defval: '' });
    const { satirlar, yazilan, silinen, hata } = kampanyaSayfasiniKur(aoa, uploadedData);
    if (hata) { toast.error(hata); return; }
    if (yazilan === 0) { toast.error('Kampanyaya girecek ürün seçilmedi; dosya oluşturulmadı'); return; }

    const kitap = XLSX.utils.book_new();

    // 1. sayfa: HB'nin aciklama sayfasi (varsa) — degerleriyle tasinir
    const aciklamaAdi = kaynak.SheetNames.find((n) => norm(n).startsWith('Açıklama'));
    if (aciklamaAdi) {
      const aciklamaAoa = XLSX.utils.sheet_to_json(kaynak.Sheets[aciklamaAdi], { header: 1, defval: '' });
      const aciklamaSayfasi = XLSX.utils.aoa_to_sheet(aciklamaAoa);
      aciklamaSayfasi['!cols'] = otomatikGenislikler(aciklamaAoa);
      XLSX.utils.book_append_sheet(kitap, aciklamaSayfasi, aciklamaAdi);
    }

    // SKU basligi geri yazilir. Sablonda bu baslik ZENGIN METIN oldugu icin
    // Excel kutuphanesi okuyamiyor ve bos geliyor; bos birakilinca panel
    // dosyayi "Sema hatasi" ile reddediyor. Ayrinti: src/lib/hbSepetDisaAktarim.js
    const skuSutunu = bosSkuSutunu(satirlar[0]);
    if (skuSutunu !== null) satirlar[0][skuSutunu] = SKU_BASLIGI;

    // 2. sayfa: kampanyaya alinan urunler
    const urunSayfasi = XLSX.utils.aoa_to_sheet(satirlar);
    urunSayfasi['!cols'] = otomatikGenislikler(satirlar);
    XLSX.utils.book_append_sheet(kitap, urunSayfasi, sheetName);

    XLSX.writeFile(kitap, 'hepsiburada-sepet-kampanyalari.xlsx');
    toast.success(
      `${yazilan} ürün kampanyaya alındı` +
      (silinen > 0 ? ` · ${silinen} ürün dosyadan çıkarıldı` : '') +
      ' · Excel indirildi'
    );
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
      <div className="ph-page mx-auto">
        <div className="mb-8">
          <h1 className="ph-title">Sepet Kampanyaları</h1>
          <p className="text-muted-foreground mt-1">Hepsiburada sepet kampanyası Excel'ini yükleyin; indirimli komisyonla kârı görüp kampanya fiyatını belirleyin</p>
        </div>

        {/* Uyari platform sorgusu cozulmeden gosterilirse sayfa acilirken
            bir an cakip kayboluyordu; artik veri geldikten sonra kalici. */}
        {platformlarYuklendi && !hasHepsiburada && (
          <div className="mb-6 flex items-start gap-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
            <div>
              <h3 className="font-semibold text-amber-900 text-base mb-1">Hepsiburada Platformu Aktif Değil</h3>
              <p className="text-amber-800 text-sm leading-relaxed">Bu sayfayı kullanabilmek için önce <strong>Platformlar</strong> bölümünden Hepsiburada platformunu aktive etmeniz gerekir.</p>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader><CardTitle>Platform, Dönem ve Dosya</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform *</Label>
                {hbPlatforms.length === 1 ? (
                  <div className="flex items-center h-10 px-3 border border-border rounded-xl bg-secondary text-sm font-medium">{hbPlatforms[0].name}</div>
                ) : (
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger><SelectValue placeholder="Platform seçin" /></SelectTrigger>
                    <SelectContent>{hbPlatforms.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Kampanya Tarih Aralığı *</Label>
                <Popover open={calendarOpen} onOpenChange={(open) => { if (open) setDateRangeValue({ from: undefined, to: undefined }); setCalendarOpen(open); }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRangeValue?.from ? (dateRangeValue.to ? (<>{format(dateRangeValue.from, 'd MMM yyyy', { locale: tr })} - {format(dateRangeValue.to, 'd MMM yyyy', { locale: tr })}</>) : format(dateRangeValue.from, 'd MMM yyyy', { locale: tr })) : <span>Başlangıç ve bitiş tarihi seçin</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={dateRangeValue} onSelect={(range) => { setDateRangeValue(range || { from: undefined, to: undefined }); if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) setCalendarOpen(false); }} defaultMonth={new Date()} numberOfMonths={2} locale={tr} classNames={{ day_today: "bg-primary font-bold text-primary-foreground" }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {uploadedData.length > 0 && (
              kampanyaIndirimi?.tur ? (
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-3">
                  <Info className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                    <strong>{indirimEtiketi(kampanyaIndirimi)}</strong> — müşteri girdiğiniz fiyatı değil,
                    indirimli tutarı öder. Kâr bu tutardan hesaplanıyor.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                    Kampanya indirimi okunamadı{kampanyaIndirimi?.ham ? ` ("${kampanyaIndirimi.ham}")` : ''} —
                    kâr, girdiğiniz fiyattan hesaplanıyor. Sepette indirim varsa gerçek kâr daha düşük olacaktır.
                  </p>
                </div>
              )
            )}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => document.getElementById('hbBasketUpload').click()} disabled={!donemHazir} className="bg-primary hover:bg-black dark:hover:bg-white/90">
                <Upload className="mr-2 h-4 w-4" />{uploadedData.length > 0 ? 'Yeni Excel Yükle' : 'Excel Yükle'}
              </Button>
              <input id="hbBasketUpload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              {uploadedData.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Min Kâr Oranı (%)" value={minKarOrani} onChange={(e) => setMinKarOrani(e.target.value)} className="h-10 w-40" />
                    <Input type="number" placeholder="Min Kâr Tutarı (₺)" value={minKarTutari} onChange={(e) => setMinKarTutari(e.target.value)} className="h-10 w-40" />
                    <Button onClick={handleSmartAutoSelect} className="bg-primary hover:bg-black dark:hover:bg-white/90 text-primary-foreground gap-2"><Sparkles className="h-4 w-4" />Akıllı Otomatik Seç</Button>
                  </div>
                  <Button variant="outline" onClick={handleClear} disabled={kaydediliyor} className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-950/30"><Trash2 className="mr-2 h-4 w-4" />Temizle</Button>
                  <Button variant="outline" onClick={() => setUploadedData(uploadedData.map((i) => ({ ...i, selected: false })))}>Seçimleri Kaldır</Button>
                  <Button variant="outline" onClick={handleSaveSelections} disabled={kaydediliyor}><Save className="mr-2 h-4 w-4" />{kaydediliyor ? 'Kaydediliyor...' : 'Seçimleri Kaydet'}</Button>
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
                    <thead className="bg-secondary border-b">
                      <tr>
                        <th className="p-3 text-center font-semibold w-10">Seç</th>
                        <th className="p-3 text-left font-semibold min-w-[200px]">Ürün</th>
                        <th className="p-3 text-center font-semibold">Stok</th>
                        <th className="p-3 text-center font-semibold min-w-[160px]">Mevcut Satış Fiyatı</th>
                        <th className="p-3 text-center font-semibold min-w-[150px]">Kampanyaya Dahil Edilebilecek Maksimum Fiyat</th>
                        <th className="p-3 text-center font-semibold min-w-[210px]">Kampanyalı Fiyat</th>
                        <th className="p-3 text-center font-semibold min-w-[150px]">Müşterinin Ödediği Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((item, index) => {
                        const matchedProduct = getMatchedProduct(item);
                        const currentCalc = item.current_price ? calculateProfit(item.current_price, item.current_commission, item) : { profit: 0, profitRate: 0 };
                        const overMax = item.max_price > 0 && item.campaign_price > item.max_price;
                        const campCalc = item.campaign_price ? kampanyaKari(item.campaign_price, item) : { profit: 0, profitRate: 0 };
                        return (
                          <tr key={index} className={`border-b hover:bg-secondary ${item.selected ? 'bg-secondary' : ''}`}>
                            <td className="p-3 text-center">
                              <input type="checkbox" checked={item.selected} onChange={() => toggleSelect(item)} className="h-4 w-4 cursor-pointer accent-gray-900" disabled={!matchedProduct} />
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-foreground">{item.product_name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{item.seller_stock_code}</div>
                              {matchedProduct ? <div className="text-xs text-emerald-600">{matchedProduct.category_name || matchedProduct.name}</div> : <div className="text-xs text-rose-500">eşleşmedi</div>}
                            </td>
                            <td className="p-3 text-center">{item.stock}</td>
                            <td className="p-3">
                              <div className="text-center">
                                <div className="font-semibold text-foreground">₺{(item.current_price || 0).toFixed(2)}</div>
                                <div className="text-[11px] text-muted-foreground mb-1">Kom: {commLabel(item.current_commission)}</div>
                                {matchedProduct && <div className={`text-xs font-medium ${currentCalc.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₺{currentCalc.profit.toFixed(2)} (%{currentCalc.profitRate.toFixed(1)})</div>}
                              </div>
                            </td>
                            <td className="p-3 text-center font-semibold text-muted-foreground">₺{(item.max_price || 0).toFixed(2)}</td>
                            <td className="p-3">
                              <Input type="number" step="0.01" value={item.campaign_price || ''} onChange={(e) => handleCampaignPriceChange(item, e.target.value)} placeholder="Fiyat" className={`h-8 text-xs ${item.selected ? 'border-primary' : ''}`} />
                              {overMax && <Badge variant="outline" className="mt-1 text-[10px] text-rose-600 border-rose-300">Maksimum fiyatı aşıyor!</Badge>}
                            </td>
                            <td className="p-3 text-center">
                              {item.campaign_price > 0 ? (
                                <>
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-semibold text-foreground">₺{odenecekFiyat(item.campaign_price).toFixed(2)}</span>
                                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0" onClick={() => openDetailModal(odenecekFiyat(item.campaign_price), item.discounted_commission, item)}><Info className="h-3 w-3" /></Button>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {kampanyaIndirimi?.tur ? indirimEtiketi(kampanyaIndirimi) : 'indirim yok'}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">Kom: {commLabel(item.discounted_commission)}</div>
                                  <div className={`text-xs font-semibold ${campCalc.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{campCalc.profit > 0 ? '+' : ''}₺{campCalc.profit.toFixed(2)} (%{campCalc.profitRate.toFixed(1)})</div>
                                </>
                              ) : (
                                <div className="text-muted-foreground">
                                  <div>-</div>
                                  <div className="text-[11px]">Kom: {commLabel(item.discounted_commission)}</div>
                                </div>
                              )}
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
              <Upload className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Henüz dosya yüklenmedi</p>
              <p className="text-sm text-muted-foreground/70">Hepsiburada "Sepet Kampanyaları" Excel dosyasını yükleyin</p>
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
