/**
 * Trendyol "Kampanyalar" sayfasinin fiyat modeli.
 *
 * Trendyol'un Katilabilecegim Kampanyalar ekraninda (partner.trendyol.com/
 * promotions/campaigns/available) her kampanyanin "Indirim Detayi" su bes
 * kaliptan biridir (3 Eylul 2026 ekran kaydindan cikarildi):
 *
 *   net_percent   "Net %15 İndirim"              urun fiyati dogrudan %15 iner
 *   cart_percent  "Sepette %40 İndirim"          sepette %40; urun basina etkisi ayni
 *   cart_tl       "500 TL'ye 100 TL İndirim"     sepet 500 TL'yi bulunca 100 TL iner
 *   buy_x_pay_y   "3 Al 2 Öde"                   3 urunun parasi 2 urun
 *   qty_percent   "2 Adet ve Üzeri %15 İndirim"  2+ alana tum adetler %15
 *
 * Ek alanlar (ayni ekrandan):
 *   karsilama  "% 40 Trendyol Karşılamalı" — indirimin bu kadari Trendyol'dan
 *              cikar, kalani saticidan. Kar hesabi SATICININ payini dusurur.
 *   (Fiyat Kurali alt/ust sinir alani 5 Eyl 2026'da kaldirildi: kullanici
 *   karari — urun eleme kurali tutulmaz; Excel'deki Maksimum Girebilecegin
 *   Fiyat yeterli.)
 *
 * SEPET INDIRIMI URUNE NASIL DAGILIR (cart_tl)?
 *   Kullanici (3 Eylul 2026): "kampanyaya katilan urunlerin tamami dahil,
 *   siparis verilen kampanya urunlerinin TOPLAM tutari uzerinden indirim
 *   olur." Trendyol indirimi siparisteki urunlere tutarlari ORANINDA
 *   dagitir. En kotu durum sepetin tam esikte olmasidir:
 *     indirim orani = tutar / esik      (500 TL'ye 100 TL -> %20)
 *     urun indirimi = fiyat x tutar / esik
 *   Urun fiyati esigi tek basina geciyorsa indirimin tamami o urunden iner.
 *   Kar en kotu duruma gore gosterilir; sepet esigi astikca gercek indirim
 *   bundan kucuk olur.
 *
 * Mikro Ihracat grubu secilebilir ama ozel modeli (ulke bazli komisyon ve
 * kargo) henuz yok; kullanici karari: en son yapilacak.
 *
 * Import icermez — duz node ile test edilebilir.
 */

const sayi = (d) => {
  if (d === null || d === undefined || d === '') return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
};

const kurusa = (n) => Math.round(n * 100) / 100;

/** Formda ve kartta gosterilen indirim turleri (Trendyol'un sirasi). */
export const INDIRIM_TURLERI = [
  { value: 'net_percent', label: 'Net % İndirim', ornek: 'Net %15 İndirim' },
  { value: 'cart_percent', label: 'Sepette % İndirim', ornek: 'Sepette %40 İndirim' },
  { value: 'cart_tl', label: "X TL'ye Y TL İndirim", ornek: "500 TL'ye 100 TL İndirim" },
  { value: 'buy_x_pay_y', label: 'X Al Y Öde', ornek: '3 Al 2 Öde' },
  { value: 'qty_percent', label: 'N Adet ve Üzeri % İndirim', ornek: '2 Adet ve Üzeri %15 İndirim' },
];

/** Trendyol'un "Katılım Koşulu" secenekleri. */
// Katilim kosulu (buybox / minimum fiyat) sistemde tutulmaz: Trendyol bunu
// zaten uygulayip Excel'deki "Maksimum Girebileceğin Fiyat" sutununa yazar
// (5 Eyl 2026 kontrolu: genel kampanyalarda 144/146 satirda max < mevcut).

/**
 * Kampanya gruplari — kullanici karari: UC cesit var.
 * "Okul Ihtiyaclari" gibi donemsel basliklar ayri grup DEGIL, genel kampanya.
 * Mikro Ihracat'in ulke/komisyon/kargo modeli henuz yapilmadi; grup olarak
 * secilebilir, hesap simdilik genel kampanya gibi.
 */
export const KAMPANYA_GRUPLARI = [
  { value: 'all_countries', label: 'Genel Kampanyalar' },
  { value: 'trendyol_plus', label: 'Trendyol Plus (Ek İndirim)' },
  { value: 'mikro_ihracat', label: 'Mikro İhracat' },
];

const yuzdeliMi = (tur) => tur === 'net_percent' || tur === 'cart_percent' || tur === 'qty_percent';

/**
 * Sepet indiriminden urune dusen pay (0-1), cart_tl.
 * Esik yoksa veya fiyat esigi tek basina geciyorsa 1 (tamami).
 */
export function sepetPayi(fiyat, esik) {
  const f = sayi(fiyat) ?? 0;
  const e = sayi(esik) ?? 0;
  if (f <= 0) return 0;
  if (e <= 0 || f >= e) return 1;
  return f / e;
}

/**
 * Musterinin URUN BASINA gordugu indirim (Trendyol karsilamasi dusulmeden).
 * Parametreler gecersizse 0.
 */
export function musteriIndirimi(fiyat, kampanya) {
  const f = sayi(fiyat);
  if (f === null || f <= 0 || !kampanya) return 0;
  const oran = sayi(kampanya.oran) ?? 0;
  const tutar = sayi(kampanya.tutar) ?? 0;

  switch (kampanya.tur) {
    case 'net_percent':
    case 'cart_percent':
    case 'qty_percent':
      return oran > 0 ? kurusa(f * oran / 100) : 0;
    case 'cart_tl': {
      if (tutar <= 0) return 0;
      return kurusa(Math.min(f, tutar * sepetPayi(f, kampanya.esik)));
    }
    case 'buy_x_pay_y': {
      const alX = sayi(kampanya.alX) ?? 0;
      const odeY = sayi(kampanya.odeY) ?? 0;
      if (alX <= 0 || odeY <= 0 || odeY >= alX) return 0;
      return kurusa(f * (alX - odeY) / alX);
    }
    default:
      return 0;
  }
}

/**
 * MUSTERININ odedigi birim fiyat (Trendyol karsilamasi dahil tum indirim
 * dusulmus). Trendyol teyidi (4 Eylul 2026): "Komisyon, kampanyali
 * (indirimli) satis fiyati uzerinden hesaplanir" — yani bu tutardan, satici
 * fiyatindan degil. Karsilama varsa satici fiyati bundan yuksektir.
 */
export function musteriFiyati(fiyat, kampanya) {
  const f = sayi(fiyat);
  if (f === null || f <= 0) return 0;
  return kurusa(Math.max(0, f - musteriIndirimi(f, kampanya)));
}

/**
 * Kampanya uygulandiginda SATICININ eline gecen birim fiyat.
 * Indirimin Trendyol'un karsiladigi kismi saticidan cikmaz.
 *
 * @param fiyat     kampanyali satis fiyati (Excel'e yazilan)
 * @param kampanya  { tur, oran, tutar, esik, alX, odeY, minAdet, karsilama }
 */
export function kampanyaFiyati(fiyat, kampanya) {
  const f = sayi(fiyat);
  if (f === null || f <= 0) return 0;
  const indirim = musteriIndirimi(f, kampanya);
  if (indirim <= 0) return kurusa(f);
  const k = Math.min(1, Math.max(0, (sayi(kampanya?.karsilama) ?? 0) / 100));
  return kurusa(Math.max(0, f - indirim * (1 - k)));
}

/**
 * kampanyaFiyati'nin tersi: hedeflenen SATICI fiyatini veren kampanya
 * fiyati. Barem onerisi (etkin fiyati barem esigine cekmek) icin gerekli.
 */
export function kampanyaFiyatiTersi(hedefEtkin, kampanya) {
  const h = sayi(hedefEtkin);
  if (h === null || h <= 0) return 0;
  if (!kampanya) return kurusa(h);
  const k = Math.min(1, Math.max(0, (sayi(kampanya.karsilama) ?? 0) / 100));
  const oran = sayi(kampanya.oran) ?? 0;

  if (yuzdeliMi(kampanya.tur)) {
    if (oran <= 0) return kurusa(h);
    const kat = 1 - (oran / 100) * (1 - k);
    return kat > 0 ? kurusa(h / kat) : 0;
  }
  if (kampanya.tur === 'buy_x_pay_y') {
    const alX = sayi(kampanya.alX) ?? 0;
    const odeY = sayi(kampanya.odeY) ?? 0;
    if (alX <= 0 || odeY <= 0 || odeY >= alX) return kurusa(h);
    const kat = 1 - ((alX - odeY) / alX) * (1 - k);
    return kat > 0 ? kurusa(h / kat) : 0;
  }
  if (kampanya.tur === 'cart_tl') {
    const tutar = sayi(kampanya.tutar) ?? 0;
    const esik = sayi(kampanya.esik) ?? 0;
    if (tutar <= 0) return kurusa(h);
    const saticiPayi = tutar * (1 - k);
    // Esigi gecen fiyat: L = h + pay. Gecmeyen: L - L x pay/esik = h
    const ustte = h + saticiPayi;
    if (esik <= 0 || ustte >= esik) return kurusa(ustte);
    const kat = 1 - saticiPayi / esik;
    return kat > 0 ? kurusa(h / kat) : 0;
  }
  return kurusa(h);
}

/**
 * Trendyol'un "Ürün Ekle" ile indirilen kampanya Excel'inin DOSYA ADINDAN
 * kampanya bilgilerini cikarir. Dosyanin icinde kampanya bilgisi yoktur;
 * yalnizca ad tasir. Ornekler:
 *   2000-tl-uzeri-150-tl-indirim-30-trendyol-karsilamali-mobilya-..._2026-09-03_20-02_tr-TR_part_1.xlsx
 *   okula-donus-kategorilerinde-1000-tl-uzeri-150-tl-indirim_2026-09-03_20-02_tr-TR_part_1.xlsx
 *   trendyol-plus-musterilerine-ozel-ek-5-indirim_2026-09-03_20-03_tr-TR_part_1.xlsx
 * Tarih dosya adinda yoktur (sondaki tarih indirme anidir) — kullanici girer.
 * Hicbir sey cikarilamazsa null.
 */
export function dosyaAdindanKampanya(dosyaAdi) {
  if (!dosyaAdi || typeof dosyaAdi !== 'string') return null;
  let slug = dosyaAdi.split(/[\\/]/).pop().toLowerCase().replace(/\.xlsx?$/i, '');
  slug = slug.replace(/_\d{4}-\d{2}-\d{2}.*$/, '').replace(/_part_\d+$/, '');
  if (!slug) return null;

  const tip = slug.includes('trendyol-plus') ? 'trendyol_plus'
    : (slug.includes('mikro-ihracat') || slug.includes('yurt-disi')) ? 'mikro_ihracat'
    : 'all_countries';

  const sonuc = {
    campaign_type: tip,
    campaign_name: slug.replace(/-/g, ' ').replace(/^./, (c) => c.toLocaleUpperCase('tr-TR')),
    discount_kind: null, discount_amount: null, threshold_amount: null, trendyol_coverage_rate: null,
  };

  const karsilama = slug.match(/(\d+)-trendyol-karsilamali/);
  if (karsilama) sonuc.trendyol_coverage_rate = Number(karsilama[1]);

  const sepet = slug.match(/(\d+)-tl-uzeri-(\d+)-tl-indirim/);
  const yuzde = slug.match(/(?:^|-)(?:ek-)?(\d+)-indirim(?:-|$)/);
  if (sepet) {
    sonuc.discount_kind = 'cart_tl';
    sonuc.threshold_amount = Number(sepet[1]);
    sonuc.discount_amount = Number(sepet[2]);
  } else if (yuzde) {
    sonuc.discount_kind = 'net_percent';
    sonuc.discount_amount = Number(yuzde[1]);
  }
  return sonuc;
}

const duz = (n) => {
  const v = sayi(n);
  if (v === null) return '';
  return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
};

/** Trendyol'un "İndirim Detayı" metni: "Sepette %40 İndirim" gibi. */
export function kampanyaMetni(kampanya) {
  if (!kampanya) return '';
  switch (kampanya.tur) {
    case 'net_percent': return `Net %${duz(kampanya.oran)} İndirim`;
    case 'cart_percent': return `Sepette %${duz(kampanya.oran)} İndirim`;
    case 'cart_tl': {
      const esik = sayi(kampanya.esik) ?? 0;
      return esik > 0
        ? `${duz(esik)} TL'ye ${duz(kampanya.tutar)} TL İndirim`
        : `${duz(kampanya.tutar)} TL İndirim`;
    }
    case 'buy_x_pay_y': return `${duz(kampanya.alX)} Al ${duz(kampanya.odeY)} Öde`;
    case 'qty_percent': return `${duz(kampanya.minAdet)} Adet ve Üzeri %${duz(kampanya.oran)} İndirim`;
    default: return '';
  }
}

/**
 * Veritabani satirini (campaigns tablosu) kampanya nesnesine cevirir.
 *
 * ESKI KAYIT UYUMU: `discount_kind` eklenmeden once kaydedilen kampanyalar
 * yalnizca discount_type (percent | tl), discount_amount, cart_amount ve
 * cart_condition (over | under) tasir. Bunlar su sekilde okunur:
 *   percent            -> net_percent (oran = discount_amount)
 *   tl                 -> cart_tl     (tutar = discount_amount,
 *                                      esik = cart_condition 'over' ise cart_amount)
 *   cart_amount + over/under, tl disinda -> yok sayilir (fiyat kurali kaldirildi)
 * Boylece eski kampanyalarin kar hesabi degismez.
 */
export function kaydiKampanyayaCevir(row) {
  if (!row) return null;
  const eskiTur = row.discount_type === 'tl' ? 'cart_tl' : 'net_percent';
  const tur = row.discount_kind || eskiTur;
  const miktar = sayi(row.discount_amount) ?? 0;
  const yuzdeli = yuzdeliMi(tur);

  const sepet = sayi(row.cart_amount);
  let esik = sayi(row.threshold_amount);
  if (sepet !== null && sepet > 0 && tur === 'cart_tl' && esik === null && row.cart_condition !== 'under') esik = sepet;

  return {
    tur,
    oran: yuzdeli ? miktar : 0,
    tutar: tur === 'cart_tl' ? miktar : 0,
    esik: esik ?? 0,
    alX: sayi(row.buy_x) ?? 0,
    odeY: sayi(row.pay_y) ?? 0,
    minAdet: sayi(row.min_qty) ?? 0,
    karsilama: sayi(row.trendyol_coverage_rate) ?? 0,
  };
}
