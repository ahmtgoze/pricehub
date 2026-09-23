/**
 * Kargo tutari — fiyat motoru ve tum promosyon sayfalari BU modulu kullanir.
 *
 * Cift Kargo isaretli urun (kisisellestirilebilir poset) uretime gidip doner:
 * depo→uretim ve depo→musteri desi tarifesinden; uretim→depo donusu ise
 * Ayarlar'daki desi araligina gore:
 *   sabit → 2 × tarife + girilen tutar
 *   ayni  → 3 × tarife (donus de ayni fiyat)
 *   aralik yoksa → 2 × tarife
 *
 * Import'suz saf modullere dayanir — duz node ile test edilebilir.
 */
import { baremSec, baremTarifesiSec } from './baremKurali.js';

export const CIFT_KARGO_ANAHTARI = 'cift_kargo_kurallari';

/** Desiye esit/buyuk en kucuk desi tarifesi; ustundeyse tarife YOK (null). */
export function desiTarifesiBul(tarifeler, desi) {
  return (tarifeler || [])
    .filter((r) => r.rate_type === 'desi' && r.is_active !== false && r.desi != null)
    .sort((a, b) => a.desi - b.desi)
    .find((r) => desi <= r.desi) || null;
}

export function ciftKargoKurallari(ayarlar) {
  const kayit = (ayarlar || []).find((a) => a.setting_key === CIFT_KARGO_ANAHTARI);
  try {
    const liste = JSON.parse(kayit?.setting_value || '[]');
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

/** Kurallari dogrular; hata metni ya da null. */
export function kuralHatasi(kurallar) {
  const s = [...kurallar].sort((a, b) => a.min - b.min);
  for (const [i, k] of s.entries()) {
    if (!(k.min >= 0) || !(k.max >= k.min)) return `${k.min}–${k.max} desi aralığı geçersiz.`;
    if (k.yontem === 'sabit' && !(k.tutar >= 0)) return `${k.min}–${k.max} desi için sabit tutar girilmeli.`;
    if (i > 0 && k.min <= s[i - 1].max) return `${s[i - 1].min}–${s[i - 1].max} ile ${k.min}–${k.max} desi aralıkları çakışıyor.`;
  }
  return null;
}

/** Tek paketin kargosu. yol = tarifedeki tek yon fiyati. */
export function ciftKargo(urun, yol, desi, kurallar) {
  if (!urun?.double_shipping) return { tutar: yol, yontem: null };
  const k = (kurallar || []).find((x) => desi >= x.min && desi <= x.max);
  if (k?.yontem === 'ayni') return { tutar: yol * 3, yontem: 'ayni', yol, aralik: k };
  if (k?.yontem === 'sabit') return { tutar: yol * 2 + Number(k.tutar), yontem: 'sabit', yol, sabit: Number(k.tutar), aralik: k };
  return { tutar: yol * 2, yontem: 'iki', yol };
}

export function paketler(urun) {
  if (!urun?.multi_package || !urun.packages) return null;
  try {
    const p = typeof urun.packages === 'string' ? JSON.parse(urun.packages) : urun.packages;
    return Array.isArray(p) && p.length ? p : null;
  } catch {
    return null;
  }
}

/** Promosyon sayfalari: verilen satis fiyatinda barem, yoksa desi (paket paket). */
export function promosyonKargosu({ platform, urun, fiyat, tarifeler, kurallar }) {
  const barem = baremSec(platform, urun, fiyat, urun?.desi);
  const bt = barem && baremTarifesiSec(tarifeler, barem, urun?.same_day_delivery || false);
  if (bt?.price) {
    return { shippingCost: ciftKargo(urun, bt.price, urun.desi || 0, kurallar).tutar, shippingVatRate: bt.vat_rate || 20, baremUsed: barem };
  }
  let shippingCost = 0, shippingVatRate = 20;
  for (const p of paketler(urun) || [{ desi: urun?.desi }]) {
    const t = desiTarifesiBul(tarifeler, p.desi || 0);
    if (!t) continue;
    shippingCost += ciftKargo(urun, t.price, p.desi || 0, kurallar).tutar;
    shippingVatRate = t.vat_rate || 20;
  }
  return { shippingCost, shippingVatRate, baremUsed: 'desi' };
}
