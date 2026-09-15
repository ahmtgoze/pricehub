/**
 * ZINCIR HESABI — promosyon ve kampanya cakismalarinda musterinin gercekten
 * odedigi fiyat ve saticiya kalan.
 *
 * Kullanici (15 Eylul 2026): "etkilesim ve trafik icin hepsine girecegim,
 * ama cakismalardan dolayi indirimli hedef karin (minimum tutar, oran,
 * tutar) altina dusmesini istemiyorum. Bir yildir ugrastigim sey bu."
 *
 * Trendyol kurali (Satici Bilgi Merkezi + destek hatti teyidi, 15 Eylul):
 *   sira 0  fiyati degistirenler (Komisyon Tarifesi, Avantajli Etiket, Flas,
 *           kampanyaya yazilan fiyat): birbirine eklenmez, o an TEK satis
 *           fiyati olur — en kotu durum en dusugu
 *   sira 2  sepet kampanyalari: o satis fiyatinin USTUNE iner; birden
 *           fazlaysa yalniz en yuksek indirim
 *   sira 2.5 Plus'a ozel ek indirim: kalanin ustune, tamami saticidan
 *   istisna: Plus Komisyon Tarifesi'nde Plus'a ozel fiyat seciliyse Plus
 *           musterisi o fiyati oder, Plus %5 uygulanmaz (dusugu alinir)
 *
 * Bu modul her sayfanin kendi adayini ("bu kademeyi secsem?") digerlerinin
 * KAYITLI secimleriyle birlestirir. Sayfalar ciktidaki saticiNet'i kendi
 * kar motoruna verir; hedef bu kara gore kontrol edilir.
 */
import { musteriIndirimi, plusZincirliFiyat, kaydiKampanyayaCevir, kampanyaMetni } from './trendyolKampanyaIndirimi.js';
import { aktifPencere } from './tarifeKaydiSecimi.js';
import { secimiOku } from './trendyolPencereSecimi.js';

export const KAYNAK = {
  TARIFE: 'Komisyon Tarifesi',
  AVANTAJLI: 'Avantajlı Etiket',
  FLAS: 'Flaş',
  PLUS_GIRILEN: 'Plus girilen',
};

const p2 = (n) => String(n).padStart(2, '0');
/** Yerel gun 'yyyy-mm-dd' (Excel tarihleriyle ayni bicim). */
export function bugunMetni(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

const ayniUrun = (urun, r) => {
  if (!urun || !r) return false;
  if (urun.barcode && r.barcode && String(r.barcode) === String(urun.barcode)) return true;
  const kod = urun.stock_code || urun.seller_stock_code;
  if (kod && String(r.stock_code || r.seller_stock_code || '') === String(kod)) return true;
  return false;
};
const surer = (r, bugun) => String(r?.start_date || '').slice(0, 10) <= bugun && String(r?.end_date || '').slice(0, 10) >= bugun;
const platformUyar = (r, platform) => !r?.platform_account || !platform || r.platform_account === platform;
const sayi = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** Kayittaki secili fiyat (kademe ya da manuel); yoksa 0. */
const seciliFiyat = (r, alan, secimAlani = 'selected_price') => {
  const secim = r?.[alan];
  if (!secim || secim === 'none') return 0;
  return secim === 'manual' ? sayi(r.manual_price) : sayi(r[secimAlani]);
};

/**
 * Sira 0 adaylari: urunun bugun gecerli KAYITLI fiyatlari.
 * @param haric  bu sayfanin kendi kaynagi (adayla degistirilecegi icin atlanir)
 */
export function sira0Adaylari(urun, kaynaklar, { bugun, platform, haric = [] } = {}) {
  const k = kaynaklar || {};
  const adaylar = [];
  const ekle = (kaynak, fiyat) => { if (fiyat > 0 && !haric.includes(kaynak)) adaylar.push({ kaynak, fiyat }); };

  for (const r of k.priceRanges || []) {
    if (!ayniUrun(urun, r) || !platformUyar(r, platform) || !surer(r, bugun)) continue;
    const pen = aktifPencere(r);
    const sec = pen ? secimiOku(r, pen) : null;
    let f = 0;
    if (sec && sec.kademe !== 'none') f = sayi(sec.fiyat) || sayi(sec.manuel);
    else f = seciliFiyat(r, 'selected_range');
    ekle(KAYNAK.TARIFE, f);
  }
  for (const r of k.advantageTags || []) {
    if (!ayniUrun(urun, r) || !platformUyar(r, platform) || !surer(r, bugun)) continue;
    ekle(KAYNAK.AVANTAJLI, seciliFiyat(r, 'selected_range'));
  }
  for (const r of k.flashProducts || []) {
    if (!ayniUrun(urun, r) || !platformUyar(r, platform) || !surer(r, bugun)) continue;
    ekle(KAYNAK.FLAS, seciliFiyat(r, 'selected_type'));
  }
  for (const g of genelKampanyalar(urun, kaynaklar, { bugun })) {
    ekle(g.ad, g.fiyat);
  }
  return adaylar;
}

/** Urunun secili+kayitli oldugu, bugun suren Genel (Plus disi) kampanyalar. */
export function genelKampanyalar(urun, kaynaklar, { bugun, haricKampanyaId = null } = {}) {
  const k = kaynaklar || {};
  const sonuc = [];
  for (const c of k.campaigns || []) {
    if (!c || c.campaign_type === 'trendyol_plus' || c.is_active === false || !surer(c, bugun)) continue;
    if (haricKampanyaId && c.id === haricKampanyaId) continue;
    const kayit = (k.campaignProducts || []).find((cp) => cp.campaign_id === c.id && cp.selected_type === 'campaign' && sayi(cp.campaign_price) > 0 && ayniUrun(urun, cp));
    if (!kayit) continue;
    const genel = kaydiKampanyayaCevir(c);
    sonuc.push({ kampanya: c, genel, ad: kampanyaMetni(genel), fiyat: sayi(kayit.campaign_price) });
  }
  return sonuc;
}

/** Urun bugun suren Plus kampanyasinda secili mi? -> { oran, karsilama } | null */
export function plusDurumu(urun, kaynaklar, { bugun } = {}) {
  const k = kaynaklar || {};
  for (const c of k.campaigns || []) {
    if (!c || c.campaign_type !== 'trendyol_plus' || c.is_active === false || !surer(c, bugun)) continue;
    const kayit = (k.campaignProducts || []).find((cp) => cp.campaign_id === c.id && cp.selected_type === 'campaign' && ayniUrun(urun, cp));
    if (!kayit) continue;
    const p = kaydiKampanyayaCevir(c);
    return { oran: sayi(p.oran), karsilama: sayi(p.karsilama), kampanya: c };
  }
  return null;
}

/** Plus Komisyon Tarifesi'nde secili Plus'a ozel fiyat -> { fiyat, komisyon } | null */
export function plusTarifeFiyati(urun, kaynaklar, { bugun, platform } = {}) {
  const k = kaynaklar || {};
  let en = null;
  for (const r of k.plusTariffs || []) {
    if (!ayniUrun(urun, r) || !platformUyar(r, platform) || !surer(r, bugun)) continue;
    const fiyatlar = [];
    const f0 = seciliFiyat(r, 'selected_type');
    if (f0 > 0) fiyatlar.push(f0);
    for (const sec of Object.values(r.secimler || {})) { if (sec && sec.kademe && sec.kademe !== 'none') fiyatlar.push(sayi(sec.fiyat) || sayi(sec.manuel)); }
    const f = Math.min(...fiyatlar.filter((x) => x > 0));
    if (!Number.isFinite(f) || f <= 0) continue;
    const komisyon = sayi(r.plus_commission_offer) || sayi(r.calculated_commission) || sayi(r.current_commission) || null;
    if (!en || f < en.fiyat) en = { fiyat: f, komisyon };
  }
  return en;
}

/**
 * Zinciri kurar.
 * @param aday        bu sayfanin adayi { kaynak, fiyat } (kendi kaydi yerine gecer)
 * @param ekGenel     Genel kampanya sayfasindaysa: { kampanyaId, genel, ad, fiyat } — bu kampanyanin
 *                    indirimi zincire girer, yazilan fiyat sira 0 adayi olur
 * @param plus        Plus sayfasindaysa: { oran, karsilama } (kayda bakilmaz); yoksa kayittan bulunur
 * @returns null (fiyat yok) | { taban, adaylar, genel, plus, plusTarife, genelIndirim, plusIndirim,
 *           saticiPayi, musteriFiyat, saticiNet, komisyon (Plus tarifesi kazandiysa) }
 */
export function zincirKur({ urun, kaynaklar, bugun = bugunMetni(), platform = null, aday = null, ekGenel = null, plus = undefined } = {}) {
  const haric = aday?.kaynak ? [aday.kaynak] : [];
  const adaylar = sira0Adaylari(urun, kaynaklar, { bugun, platform, haric });
  if (aday && sayi(aday.fiyat) > 0) adaylar.push({ kaynak: aday.kaynak, fiyat: sayi(aday.fiyat) });
  if (ekGenel && sayi(ekGenel.fiyat) > 0) adaylar.push({ kaynak: ekGenel.ad, fiyat: sayi(ekGenel.fiyat) });
  if (adaylar.length === 0) return null;
  const taban = adaylar.reduce((a, b) => (b.fiyat < a.fiyat ? b : a));

  const geneller = genelKampanyalar(urun, kaynaklar, { bugun, haricKampanyaId: ekGenel?.kampanyaId || null });
  if (ekGenel?.genel) geneller.push({ kampanya: { id: ekGenel.kampanyaId }, genel: ekGenel.genel, ad: ekGenel.ad, fiyat: sayi(ekGenel.fiyat) });
  let enIyi = null;
  for (const g of geneller) {
    const indirim = musteriIndirimi(taban.fiyat, g.genel);
    const dahaKotu = enIyi && indirim === enIyi.indirim && sayi(g.genel.karsilama) < sayi(enIyi.genel.karsilama);
    if (indirim > 0 && (!enIyi || indirim > enIyi.indirim || dahaKotu)) enIyi = { ...g, indirim };
  }

  const plusBilgi = plus === undefined ? plusDurumu(urun, kaynaklar, { bugun }) : plus;
  const plusKampanya = plusBilgi ? { tur: 'net_percent', oran: plusBilgi.oran, karsilama: plusBilgi.karsilama || 0, tutar: 0 } : null;
  const z = plusZincirliFiyat(taban.fiyat, enIyi ? enIyi.genel : null, plusKampanya);
  if (!z) return null;

  const sonuc = {
    taban, adaylar, genel: enIyi, plus: plusBilgi, plusTarife: null,
    genelIndirim: z.genelIndirim, plusIndirim: z.plusIndirim, saticiPayi: z.saticiPayi,
    musteriFiyat: z.musteriFiyat, saticiNet: z.saticiNet, komisyon: null,
  };
  if (plusBilgi) {
    const pt = plusTarifeFiyati(urun, kaynaklar, { bugun, platform });
    if (pt && pt.fiyat < z.musteriFiyat) {
      return { ...sonuc, plusTarife: pt, genelIndirim: 0, plusIndirim: 0, saticiPayi: 0, musteriFiyat: pt.fiyat, saticiNet: pt.fiyat, komisyon: pt.komisyon };
    }
  }
  return sonuc;
}

/** Zincir adayin kendisinden farkli mi (gostermeye deger mi)? */
export function zincirFarkli(z, adayFiyat) {
  return !!z && Math.abs(z.saticiNet - sayi(adayFiyat)) > 0.005;
}
