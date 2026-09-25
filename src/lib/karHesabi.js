/**
 * "Verilen satış fiyatında kâr" — tek yerde.
 *
 * Promosyon sayfalarının hepsi bu çağrı dizisini kendi içinde tekrar ediyor
 * (Campaigns, FlashProducts, PlusProductCommissionTariff, HB sayfaları):
 * kargo = promosyonKargosu, kâr = calculatePriceBreakdown. Bu modül aynı diziyi
 * tek işlevde toplar; Trendyol panel eklentisinin hesap servisi bunu çağırır.
 * Sayfalar henüz buna bağlanmadı (ayrı iş); sayfa mantığıyla eşitliği
 * tests/karHesabi.test.mjs sürekli doğrular.
 *
 * Platform ayarları (is-kurallari.md §5): barem sınırları, stopaj, hizmet
 * bedeli ve POS yönetici şablonundan; kurumlar vergisi ve kargo firması
 * kullanıcının kendi kaydından gelir.
 */
import { calculatePriceBreakdown } from '../components/PriceCalculationEngine.jsx';
import { gecerliMaliyet } from './gecerliMaliyet.js';
import { promosyonKargosu, ciftKargoKurallari } from './kargoHesabi.js';

const SABLONDAN_ALINAN = [
  'has_withholding', 'withholding_rate',
  'has_service_fee', 'service_fee_type', 'service_fee_amount', 'service_fee_vat_rate', 'same_day_delivery_service_fee',
  'has_pos_service_fee', 'pos_service_fee_rate',
  'use_barem', 'barem_max_desi', 'barem1_min', 'barem1_max', 'barem2_min', 'barem2_max',
];
const SABLONLU_PLATFORMLAR = ['trendyol', 'hepsiburada'];

export function platformBirlestir(platform, sablonlar = []) {
  if (!SABLONLU_PLATFORMLAR.includes(platform?.platform_type)) return platform;
  const sablon = sablonlar.find((p) => p.platform_type === platform.platform_type);
  if (!sablon) return platform;
  const birlesik = { ...platform };
  for (const alan of SABLONDAN_ALINAN) birlesik[alan] = sablon[alan];
  return birlesik;
}

const sayi = (d) => (d === null || d === undefined || d === '' ? NaN : Number(d));

export function fiyattaKar({ urun, platform, sablonlar = [], fiyat, komisyonOrani, tarifeler = [], ayarlar = [], paketMaliyeti = 0 }) {
  const f = sayi(fiyat);
  const oran = sayi(komisyonOrani);
  if (!(f > 0) || !Number.isFinite(f) || !(oran >= 0 && oran <= 100)) return { durum: 'veri_gecersiz' };

  const maliyet = gecerliMaliyet(urun);
  if (!(maliyet > 0)) return { durum: 'maliyet_yok' };

  const platformHesap = platformBirlestir(platform, sablonlar);
  const platformTarifeleri = tarifeler.filter(
    (r) => r.is_active !== false && (r.platform_id === platform.id || r.platform_type === platform.platform_type),
  );
  const { shippingCost, shippingVatRate, baremUsed } = promosyonKargosu({
    platform: platformHesap, urun, fiyat: f, tarifeler: platformTarifeleri, kurallar: ciftKargoKurallari(ayarlar),
  });
  if (!(Number(shippingCost) > 0)) return { durum: 'kargo_tarifesi_yok' };

  const d = calculatePriceBreakdown({
    salePriceInclVat: f,
    productCost: maliyet,
    productVatRate: parseFloat(urun.vat_rate) || 20,
    shippingCost: parseFloat(shippingCost) || 0,
    shippingVatRate: parseFloat(shippingVatRate) || 20,
    commissionRate: oran,
    commissionVatRate: 20,
    platform: platformHesap,
    baremUsed,
    packagingCost: parseFloat(paketMaliyeti) || 0,
    printingCost: parseFloat(urun.printing_cost) || 0,
    extraCost: parseFloat(urun.extra_cost) || 0,
    isSameDayDelivery: urun.same_day_delivery || false,
  });

  return {
    durum: 'tamam',
    netKar: d.netProfit,
    vergiOncesiKar: d.netProfitBeforeTax,
    karOrani: d.profitRate,
    karMarji: (d.netProfit / f) * 100,
    baremUsed,
    kalemler: {
      satisKdvHaric: d.salePriceExclVat, maliyet: d.productCost, komisyon: d.commissionAmount, kargo: d.shippingCost,
      hizmetBedeli: d.serviceFee, stopaj: d.withholdingAmount, netKdv: d.netVat, kurumlarVergisi: d.corporateTaxAmount,
    },
  };
}
