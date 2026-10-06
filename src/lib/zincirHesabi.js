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
import { musteriIndirimi, plusZincirliFiyat, kaydiKampanyayaCevir, kampanyaMetni, kuponMu, kuponIndirimi } from './trendyolKampanyaIndirimi.js';
import { aktifPencere } from './tarifeKaydiSecimi.js';
import { secimiOku } from './trendyolPencereSecimi.js';

export const KAYNAK = {
  TARIFE: 'Komisyon Tarifesi',
  AVANTAJLI: 'Avantajlı Etiket',
  FLAS: 'Flaş',
  PLUS_GIRILEN: 'Plus girilen',
  PLUS_TARIFE: 'Plus tarifesi',
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

/** Urunun secili+kayitli oldugu, bugun suren Genel (Plus disi, Turkiye) kampanyalar. */
export function genelKampanyalar(urun, kaynaklar, { bugun, haricKampanyaId = null } = {}) {
  const k = kaynaklar || {};
  const sonuc = [];
  for (const c of k.campaigns || []) {
    // Mikro Ihracat kampanyalari ayri bolge/musteri kitlesi icin; Turkiye
    // zincirine hic girmemeli (kendi yonetim ekraninda ekGenel ile ayrica
    // eklenir, bu tarama o ekrani etkilemez — bkz. haricKampanyaId).
    if (!c || c.campaign_type === 'trendyol_plus' || c.campaign_type === 'mikro_ihracat' || c.is_active === false || !surer(c, bugun)) continue;
    if (haricKampanyaId && c.id === haricKampanyaId) continue;
    const kayit = (k.campaignProducts || []).find((cp) => cp.campaign_id === c.id && cp.selected_type === 'campaign' && sayi(cp.campaign_price) > 0 && ayniUrun(urun, cp));
    if (!kayit) continue;
    const genel = kaydiKampanyayaCevir(c);
    sonuc.push({ kampanya: c, genel, ad: kampanyaMetni(genel), fiyat: sayi(kayit.campaign_price) });
  }
  return sonuc;
}

/**
 * Urun bugun suren Plus kampanyasinda secili mi? -> { oran, karsilama, kampanya, genel, hepsi } | null
 *
 * Urun birden fazla Plus kampanyasinda olabilir (Plus %5 + Plus %10, ya da
 * "Plus'a ozel 500 TL'ye 100 TL"). `hepsi` tumunu tasir; hangisinin
 * uygulanacagina zincirKur fiyata bakarak karar verir (en yuksek indirim).
 * Donen ana kayit en yuksek YUZDELI olandir (eski cagrilar `oran` okur).
 */
export function plusDurumu(urun, kaynaklar, { bugun } = {}) {
  const k = kaynaklar || {};
  const hepsi = [];
  for (const c of k.campaigns || []) {
    if (!c || c.campaign_type !== 'trendyol_plus' || c.is_active === false || !surer(c, bugun)) continue;
    const kayit = (k.campaignProducts || []).find((cp) => cp.campaign_id === c.id && cp.selected_type === 'campaign' && ayniUrun(urun, cp));
    if (!kayit) continue;
    const p = kaydiKampanyayaCevir(c);
    if (kuponMu(p)) continue;                 // kupon indirim degil; zincirin sonunda (bkz. plusKuponlari)
    hepsi.push({ oran: sayi(p.oran), karsilama: sayi(p.karsilama), kampanya: c, genel: p });
  }
  if (hepsi.length === 0) return null;
  const ana = hepsi.reduce((a, b) => (b.oran > a.oran ? b : a));
  return { ...ana, hepsi };
}

/**
 * Urunun secili oldugu, bugun suren Plus KUPON kampanyalari ("750 TL'ye
 * 100 TL Kupon"). Kupon yalniz Plus uyesine tanimlanir ve zincirin en
 * sonunda, kendi kuponlarinla yarisarak uygulanir (ayni urune tek kupon).
 */
export function plusKuponlari(urun, kaynaklar, { bugun, haricKampanyaId = null } = {}) {
  const k = kaynaklar || {};
  const sonuc = [];
  for (const c of k.campaigns || []) {
    if (!c || c.campaign_type !== 'trendyol_plus' || c.is_active === false || !surer(c, bugun)) continue;
    if (haricKampanyaId && c.id === haricKampanyaId) continue;
    const p = kaydiKampanyayaCevir(c);
    if (!kuponMu(p)) continue;
    if (!(k.campaignProducts || []).some((cp) => cp.campaign_id === c.id && cp.selected_type === 'campaign' && ayniUrun(urun, cp))) continue;
    sonuc.push(p);
  }
  return sonuc;
}

/** Plus indiriminin kisa adi: "Plus %5" ya da "Plus 500 TL'ye 100 TL İndirim". */
export function plusEtiketi(genel) {
  if (!genel) return 'Plus';
  return genel.tur === 'net_percent' || genel.tur === 'cart_percent' ? `Plus %${sayi(genel.oran)}` : `Plus ${kampanyaMetni(genel)}`;
}

/* ------------------------------------------------------------------ *
 * KENDI INDIRIMLERIM (Trendyol "Indirim Olustur" + "Kuponlar", 16 Eylul 2026)
 *   net            sira 1  — satis fiyatindan hemen; tamami saticidan
 *   kosullu_*      sira 2  — sepet kampanyalariyla YARISIR (en yuksek tek indirim)
 *   hedef_kitle=plus       — sira 2.5, Plus %5 ile yarisir (yuksek olan)
 *   indirim_kodu   sira 5  — Plus'tan sonra; tamami saticidan
 *   kupon          sira 6  — en son; satici payi = tutar x (1 - karsilama)
 * Sepet basina olanlar (TL) urune sepet payiyla dagilir (tam esik varsayimi).
 * ------------------------------------------------------------------ */
const kucukTr = (x) => String(x ?? '').toLocaleLowerCase('tr').trim();
const kurus = (n) => Math.round(n * 100) / 100;

function kapsamdaMi(urun, d) {
  const tur = d?.kapsam_turu || 'all';
  if (tur === 'all') return true;
  if (tur === 'urunler') {
    const l = (Array.isArray(d.kapsam_urunler) ? d.kapsam_urunler : []).map(String);
    return l.includes(String(urun?.barcode ?? '')) || l.includes(String(urun?.stock_code || urun?.seller_stock_code || ''));
  }
  if (tur === 'kategori') {
    const l = (Array.isArray(d.kapsam_kategoriler) ? d.kapsam_kategoriler : []).map(kucukTr);
    const k = [urun?.category, urun?.category_name, urun?.kategori].filter(Boolean).map(kucukTr);
    return k.some((x) => l.includes(x));
  }
  return true;
}

/** Urun icin bugun gecerli kendi indirimleri (kapsam ve tarih suzgecli). */
export function kendiIndirimleri(urun, kaynaklar, { bugun, platform } = {}) {
  return (kaynaklar?.ownDiscounts || []).filter((d) =>
    d && d.aktif !== false && surer(d, bugun) && platformUyar(d, platform) && (d.hedef_kitle || 'all') !== 'mikro' && kapsamdaMi(urun, d)
  );
}

/**
 * Bir kendi indiriminin URUNE dusen musteri indirimi (fiyat uzerinden).
 * TL indirim sepet basinadir; kosullu indirim ve kodda her urun adedi icin
 * en fazla bir kez, sepet alt limiti karsiladikca uygulanir (kupon tek sefer).
 * Urun basina ust sinir her ikisinde ayni: fiyat alt limitin altindaysa
 * fiyat/altLimit orani, ustundeyse tamami (sepet kampanyasiyla ayni model).
 * Yuzde kuponda tavan (maks_tutar) da ayni oranla dagilir.
 */
export function kendiIndirimTutari(d, fiyat) {
  const f = sayi(fiyat);
  if (f <= 0 || !d) return 0;
  const alt = sayi(d.alt_limit);
  const pay = alt > 0 && f < alt ? f / alt : 1;
  const tip = d.indirim_tipi || 'percent';
  if (tip === 'percent') {
    let ind = f * sayi(d.oran) / 100;
    if (sayi(d.maks_tutar) > 0) ind = Math.min(ind, sayi(d.maks_tutar) * pay);
    return kurus(Math.max(0, ind));
  }
  if (tip === 'tl') return kurus(Math.min(f, sayi(d.tutar) * pay));
  if (tip === 'xalyode') {
    const x = sayi(d.al_x), y = sayi(d.ode_y);
    if (x > 0 && y > 0 && y < x) return kurus(f * (x - y) / x);
  }
  return 0;
}

/** Kosullu kendi indirimini sepet kampanyasi nesnesine cevirir (musteriIndirimi ile ayni kurallar). */
function kosulluyuKampanyayaCevir(d) {
  const tip = d.indirim_tipi || 'percent';
  if (tip === 'xalyode') return { tur: 'buy_x_pay_y', alX: sayi(d.al_x), odeY: sayi(d.ode_y), oran: 0, tutar: 0, esik: 0, karsilama: 0 };
  if (tip === 'tl') return { tur: 'cart_tl', tutar: sayi(d.tutar), esik: sayi(d.alt_limit), oran: 0, karsilama: 0 };
  return { tur: d.tur === 'kosullu_tutar' ? 'cart_percent' : 'qty_percent', oran: sayi(d.oran), tutar: 0, esik: 0, karsilama: 0 };
}
const kendiAdi = (d) => {
  const tip = d.indirim_tipi || 'percent';
  const miktar = tip === 'tl' ? `${sayi(d.tutar)} TL` : tip === 'xalyode' ? `${sayi(d.al_x)} Al ${sayi(d.ode_y)} Öde` : `%${sayi(d.oran)}`;
  const on = { net: 'Net indirim', kosullu_tutar: 'Koşullu (tutar)', kosullu_adet: 'Koşullu (adet)', kosullu_xurun: 'Koşullu (X. ürün)', indirim_kodu: 'İndirim kodu', kupon: 'Kupon' }[d.tur] || d.tur;
  return `${on} ${miktar}${sayi(d.alt_limit) > 0 ? ` (alt limit ${sayi(d.alt_limit)} TL)` : ''}${d.ad ? ` · ${d.ad}` : ''}`;
};

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
export function zincirKur({ urun, kaynaklar, bugun = bugunMetni(), platform = null, aday = null, ekGenel = null, plus = undefined, ekKupon = null } = {}) {
  const haric = aday?.kaynak ? [aday.kaynak] : [];
  const adaylar = sira0Adaylari(urun, kaynaklar, { bugun, platform, haric });
  if (aday && sayi(aday.fiyat) > 0) adaylar.push({ kaynak: aday.kaynak, fiyat: sayi(aday.fiyat) });
  if (ekGenel && sayi(ekGenel.fiyat) > 0) adaylar.push({ kaynak: ekGenel.ad, fiyat: sayi(ekGenel.fiyat) });
  if (adaylar.length === 0) return null;
  let taban = adaylar.reduce((a, b) => (b.fiyat < a.fiyat ? b : a));

  const plusBilgi = plus === undefined ? plusDurumu(urun, kaynaklar, { bugun }) : plus;
  // Plus kupon kampanyalari: kayitli olanlar + bu ekranda denenen (ekKupon)
  const plusKuponAdaylari = plusKuponlari(urun, kaynaklar, { bugun, haricKampanyaId: ekKupon?.kampanyaId || null });
  if (ekKupon?.genel) plusKuponAdaylari.push(ekKupon.genel);
  const plusMusterisi = !!plusBilgi || plusKuponAdaylari.length > 0;
  // Plus Komisyon Tarifesi'ndeki Plus'a ozel fiyat, Plus musterisi icin SATIS
  // FIYATI olur (sira 0): sepet kampanyalari ve kuponlar bunun ustune biner.
  // Gercek sepet (16 Eyl 2026, Plus uyeli hesap, KCZ4555 x 2): 346,49 ->
  // "Fiyat Indirimi" 297,43 -> "Plus'a Ozel Fiyat" 283,83 -> 500'e 50 -> kuponlar.
  // Trendyol kurali: Plus'a ozel fiyata Plus %5 promosyonu uygulanmaz.
  let plusTarife = null;
  if (plusMusterisi) {
    const pt = plusTarifeFiyati(urun, kaynaklar, { bugun, platform });
    if (pt && pt.fiyat < taban.fiyat) { plusTarife = pt; taban = { kaynak: KAYNAK.PLUS_TARIFE, fiyat: pt.fiyat }; }
  }
  // Kendi indirimleri: Plus'a ozel olanlar yalniz Plus musterisinde
  const kendiler = kendiIndirimleri(urun, kaynaklar, { bugun, platform })
    .filter((d) => (d.hedef_kitle || 'all') !== 'plus' || plusMusterisi);
  // Plus'a ozel YUZDE indirimler asagida SIRA 2.5'te (Trendyol'un Plus %X'iyle yarisir, yuksek olan kazanir)
  // AYRICA degerlendiriliyor; burada (sira 1/2/5) tekrar sayilmasin diye haric tutuluyor. Plus'a ozel TL/adet
  // indirimler ("Net İndirim", "İndirim Kodu", "Koşullu İndirim" TL/adet tipinde) ise normal akisa, 'all'
  // hedefli olanlarla AYNI sirada girer — eskiden kendiOlan hepsini 'all' sanip Plus'a ozel olanlari (yuzde
  // olmayanlar dahil) SESSIZCE eliyordu, formda secilebiliyor ama hicbir hesaba katilmiyordu (1 Eki 2026,
  // kullanici: "üç türü de düzelt").
  const plusYuzdeMi = (d) => (d.hedef_kitle || 'all') === 'plus' && (d.indirim_tipi || 'percent') === 'percent';
  const kendiOlan = (t) => kendiler.filter((d) => d.tur === t && !plusYuzdeMi(d));

  // SIRA 1 — net indirim (ayni sirada en yuksegi)
  let net = null;
  for (const d of kendiOlan('net')) {
    const ind = kendiIndirimTutari(d, taban.fiyat);
    if (ind > 0 && (!net || ind > net.indirim)) net = { d, ad: kendiAdi(d), indirim: ind };
  }
  const sira1Fiyat = kurus(Math.max(0, taban.fiyat - (net ? net.indirim : 0)));

  // SIRA 2 — sepet kampanyalari + kosullu kendi indirimleri: en yuksek tek indirim
  const geneller = genelKampanyalar(urun, kaynaklar, { bugun, haricKampanyaId: ekGenel?.kampanyaId || null });
  if (ekGenel?.genel) geneller.push({ kampanya: { id: ekGenel.kampanyaId }, genel: ekGenel.genel, ad: ekGenel.ad, fiyat: sayi(ekGenel.fiyat) });
  for (const d of kendiler.filter((x) => (x.tur || '').startsWith('kosullu') && !plusYuzdeMi(x))) {
    geneller.push({ kampanya: { id: d.id, kendi: true }, genel: kosulluyuKampanyayaCevir(d), ad: kendiAdi(d), fiyat: 0, kendi: true });
  }
  let enIyi = null;
  for (const g of geneller) {
    const indirim = musteriIndirimi(sira1Fiyat, g.genel);
    const dahaKotu = enIyi && indirim === enIyi.indirim && sayi(g.genel.karsilama) < sayi(enIyi.genel.karsilama);
    if (indirim > 0 && (!enIyi || indirim > enIyi.indirim || dahaKotu)) enIyi = { ...g, indirim };
  }

  // SIRA 2.5 — Plus kampanyalari ile Plus'a ozel kendi indirimi (yuzde)
  // yarisir; o fiyatta EN YUKSEK indirimi veren tek biri uygulanir (esitse
  // karsilamasi dusuk olan: en kotu durum). Plus kampanyasi yuzde de olabilir
  // "500 TL'ye 100 TL" de (Plus Gunleri, 6 Eki 2026); ikisi de karsilamali
  // olabilir. Plus tarifesi taban olduysa Trendyol'un Plus kampanyasi
  // uygulanmaz; kendi Plus'a ozel yuzde indirimi yine de sayilir.
  const plusAdaylari = [];
  if (plusBilgi && !plusTarife) {
    for (const p of plusBilgi.hepsi || [plusBilgi]) {
      plusAdaylari.push(p.genel || { tur: 'net_percent', oran: sayi(p.oran), karsilama: sayi(p.karsilama), tutar: 0, esik: 0 });
    }
  }
  if (plusMusterisi) {
    for (const d of kendiler.filter(plusYuzdeMi)) plusAdaylari.push({ tur: 'net_percent', oran: sayi(d.oran), karsilama: 0, tutar: 0, esik: 0 });
  }
  const araFiyat = kurus(Math.max(0, sira1Fiyat - (enIyi ? enIyi.indirim : 0)));
  let plusKampanya = null, plusEnIyi = 0;
  for (const a of plusAdaylari) {
    const ind = musteriIndirimi(araFiyat, a);
    const dahaKotu = plusKampanya && ind === plusEnIyi && sayi(a.karsilama) < sayi(plusKampanya.karsilama);
    if (ind > 0 && (!plusKampanya || ind > plusEnIyi || dahaKotu)) { plusKampanya = a; plusEnIyi = ind; }
  }
  const plusOran = plusKampanya && (plusKampanya.tur === 'net_percent' || plusKampanya.tur === 'cart_percent') ? sayi(plusKampanya.oran) : 0;
  const z = plusZincirliFiyat(sira1Fiyat, enIyi ? enIyi.genel : null, plusKampanya);
  if (!z) return null;

  const sonuc = {
    taban, adaylar, net, genel: enIyi, plus: plusBilgi ? { ...plusBilgi, oran: plusOran, genel: plusKampanya, etiket: plusEtiketi(plusKampanya) } : null, plusTarife,
    genelIndirim: z.genelIndirim, plusIndirim: z.plusIndirim, saticiPayi: kurus(z.saticiPayi + (net ? net.indirim : 0)),
    musteriFiyat: z.musteriFiyat, saticiNet: z.saticiNet, komisyon: plusTarife ? plusTarife.komisyon : null, kod: null, kupon: null,
  };

  // SIRA 5 — indirim kodu (tamami satici), SIRA 6 — kupon (karsilama payi dusulur)
  let kalan = sonuc.musteriFiyat;
  let kod = null;
  for (const d of kendiOlan('indirim_kodu')) {
    const ind = kendiIndirimTutari(d, kalan);
    if (ind > 0 && (!kod || ind > kod.indirim)) kod = { d, ad: kendiAdi(d), indirim: ind };
  }
  if (kod) { kalan = kurus(kalan - kod.indirim); sonuc.saticiNet = kurus(sonuc.saticiNet - kod.indirim); sonuc.saticiPayi = kurus(sonuc.saticiPayi + kod.indirim); }
  let kupon = null;
  for (const d of kendiler.filter((x) => x.tur === 'kupon' && ((x.hedef_kitle || 'all') === 'all' || plusMusterisi))) {
    const ind = kendiIndirimTutari(d, kalan);
    if (ind > 0 && (!kupon || ind > kupon.indirim)) {
      const kars = Math.min(1, Math.max(0, sayi(d.karsilama) / 100));
      kupon = { d, ad: kendiAdi(d), indirim: ind, karsilama: sayi(d.karsilama), saticiPayi: kurus(ind * (1 - kars)) };
    }
  }
  for (const p of plusKuponAdaylari) {
    const ind = kuponIndirimi(kalan, p);
    if (ind > 0 && (!kupon || ind > kupon.indirim)) {
      const kars = Math.min(1, Math.max(0, sayi(p.karsilama) / 100));
      kupon = { d: null, plusKuponu: true, ad: `Plus ${kampanyaMetni(p)}`, indirim: ind, karsilama: sayi(p.karsilama), saticiPayi: kurus(ind * (1 - kars)) };
    }
  }
  if (kupon) { kalan = kurus(kalan - kupon.indirim); sonuc.saticiNet = kurus(sonuc.saticiNet - kupon.saticiPayi); sonuc.saticiPayi = kurus(sonuc.saticiPayi + kupon.saticiPayi); }
  sonuc.musteriFiyat = kurus(Math.max(0, kalan));
  sonuc.saticiNet = kurus(Math.max(0, sonuc.saticiNet));
  sonuc.kod = kod; sonuc.kupon = kupon;
  return sonuc;
}

/** Zincir adayin kendisinden farkli mi (gostermeye deger mi)? */
export function zincirFarkli(z, adayFiyat) {
  return !!z && Math.abs(z.saticiNet - sayi(adayFiyat)) > 0.005;
}
