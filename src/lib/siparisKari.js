/**
 * Gerçekleşen sipariş kârı (Trendyol Sipariş Kayıtları → "Ürünleri Göster").
 *
 * Girdi Trendyol'un `order-detail` cevabıdır: her SATIR bir ADET (adedi 2 olan ürün
 * iki satır gelir); komisyon satır bazında gerçektir; kargo ve platform hizmet bedeli
 * SİPARİŞ toplamıdır (paket/gönderi başına kesilir) ve satırlara satış tutarı oranında
 * dağıtılır. Kâr hesabı PriceHub motoruyla yapılır (`calculatePriceBreakdown`), gerçek
 * tutarlar verilerek: komisyon oranı tutardan türetilir, hizmet bedeli sabit tutar olarak
 * verilir, stopaj/net KDV/kurumlar vergisi motorun kurallarıdır.
 *
 * Emin olunmayan durumda RAKAM YOK: iptal/iade içeren sipariş, eşleşmeyen ürün,
 * maliyeti olmayan ürün. Henüz kargo/hizmet bedeli kesilmemiş (yeni) siparişte kesintiler
 * PriceHub kurallarıyla TAHMİN edilir ve "tahmini" işaretlenir (tek paket varsayımı).
 */
import { calculatePriceBreakdown, calculateServiceFee } from '../components/PriceCalculationEngine.jsx';
import { gecerliMaliyet } from './gecerliMaliyet.js';
import { promosyonKargosu, ciftKargoKurallari } from './kargoHesabi.js';
import { platformBirlestir } from './karHesabi.js';

const HESAPLANIR = ['teslim', 'yeni'];
const sayi = (d) => (typeof d === 'number' && Number.isFinite(d) ? d : NaN);

export function siparisKari({ satirlar, siparis, platform, sablonlar = [], tarifeler = [], ayarlar = [] }) {
  if (!Array.isArray(satirlar) || satirlar.length === 0 || !siparis) return { durum: 'veri_gecersiz' };
  const kargo0 = sayi(siparis.kargo), hizmet0 = sayi(siparis.hizmet), ceza = sayi(siparis.ceza ?? 0), iadeKargo = sayi(siparis.iadeKargo ?? 0);
  if (![kargo0, hizmet0, ceza, iadeKargo].every((x) => x >= 0)) return { durum: 'veri_gecersiz' };
  for (const s of satirlar) {
    const satis = sayi(s.satis), indirim = sayi(s.indirim ?? 0), kom = sayi(s.komisyonTutari);
    if (!(satis > 0) || !(indirim >= 0) || !(kom >= 0) || indirim >= satis) return { durum: 'veri_gecersiz' };
  }
  if (satirlar.some((s) => !HESAPLANIR.includes(s.durum))) return { durum: 'iade_iptal' };

  const netSatis = satirlar.map((s) => s.satis - (s.indirim ?? 0));
  const toplamSatis = netSatis.reduce((a, b) => a + b, 0);
  const platformHesap = platformBirlestir(platform, sablonlar);

  const eksik = satirlar.map((s) => (!s.urun ? 'eslesmedi' : gecerliMaliyet(s.urun) > 0 ? null : 'maliyet_yok'));
  const tahmini = kargo0 === 0 && hizmet0 === 0;

  let kargo = kargo0, hizmet = hizmet0;
  if (tahmini) {
    if (eksik.some(Boolean)) return { durum: eksik.includes('eslesmedi') ? 'eslesmedi' : 'maliyet_yok', satirlar: satirlar.map((s, i) => ({ id: s.id, durum: eksik[i] ?? 'tamam' })) };
    const desi = satirlar.reduce((a, s) => a + (Number(s.urun.desi) || 0), 0);
    const gunIci = satirlar.every((s) => s.urun.same_day_delivery);
    const tarife = tarifeler.filter((r) => r.is_active !== false && (r.platform_id === platform.id || r.platform_type === platform.platform_type));
    const k = promosyonKargosu({ platform: platformHesap, urun: { desi, same_day_delivery: gunIci }, fiyat: toplamSatis, tarifeler: tarife, kurallar: ciftKargoKurallari(ayarlar) });
    if (!(Number(k.shippingCost) > 0)) return { durum: 'kargo_tarifesi_yok' };
    kargo = Number(k.shippingCost);
    hizmet = calculateServiceFee(platformHesap, toplamSatis, gunIci).amount;
  }

  const sonuclar = satirlar.map((s, i) => {
    if (eksik[i]) return { id: s.id, durum: eksik[i] };
    const pay = netSatis[i] / toplamSatis;
    const kargoPayi = kargo * pay, hizmetPayi = hizmet * pay;
    const d = calculatePriceBreakdown({
      salePriceInclVat: netSatis[i],
      productCost: gecerliMaliyet(s.urun),
      productVatRate: parseFloat(s.urun.vat_rate) || 20,
      shippingCost: kargoPayi,
      shippingVatRate: 20,
      commissionRate: (s.komisyonTutari / netSatis[i]) * 100,
      commissionVatRate: 20,
      platform: { ...platformHesap, has_service_fee: true, service_fee_type: 'fixed_per_order', service_fee_amount: hizmetPayi, service_fee_vat_rate: 20, has_same_day_delivery: false },
      baremUsed: 'gerceklesen',
      printingCost: parseFloat(s.urun.printing_cost) || 0,
      extraCost: parseFloat(s.urun.extra_cost) || 0,
      isSameDayDelivery: false,
    });
    return {
      id: s.id, durum: 'tamam', satis: netSatis[i], netKar: d.netProfit, vergiOncesiKar: d.netProfitBeforeTax,
      karOrani: d.profitRate, karMarji: (d.netProfit / netSatis[i]) * 100, kargoPayi, hizmetPayi,
      kalemler: {
        satisKdvHaric: d.salePriceExclVat, maliyet: d.productCost, komisyon: d.commissionAmount, kargo: d.shippingCost,
        hizmetBedeli: d.serviceFee, stopaj: d.withholdingAmount, netKdv: d.netVat, kurumlarVergisi: d.corporateTaxAmount,
      },
    };
  });

  const digerKesinti = ceza + iadeKargo;
  const hepsiTamam = sonuclar.every((r) => r.durum === 'tamam');
  const kesintiler = { kargo, hizmet, ceza, iadeKargo };
  if (!hepsiTamam) return { durum: sonuclar.find((r) => r.durum !== 'tamam').durum, satirlar: sonuclar, kesintiler };

  const topla = (f) => sonuclar.reduce((a, r) => a + f(r), 0);
  const maliyet = topla((r) => r.kalemler.maliyet);
  const netKar = topla((r) => r.netKar) - digerKesinti;
  return {
    durum: tahmini ? 'tahmini' : 'tamam',
    satirlar: sonuclar,
    kesintiler,
    toplam: {
      satis: toplamSatis, netKar, vergiOncesiKar: topla((r) => r.vergiOncesiKar) - digerKesinti,
      karOrani: (netKar / maliyet) * 100, karMarji: (netKar / toplamSatis) * 100, maliyet, digerKesinti,
    },
  };
}
