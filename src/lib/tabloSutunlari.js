/**
 * tabloSutunlari.js — tablo sutun mantiginin SAF cekirdegi.
 *
 * Bilerek hicbir sey import etmiyor (React, veri katmani yok): boylece
 * dogrudan node ile test edilebiliyor. React tarafi useTableColumns.js'te.
 */

export const SABIT_GENISLIK = 160; // sabitlenmis sutun icin varsayilan px
// Asgari genislik: bundan dar yapilamaz. Daralinca metin kirpilmaz,
// alt satira kayar (DataTable'daki whitespace-normal + break-words).
export const ASGARI_GENISLIK = 90;
export const AZAMI_GENISLIK = 600;

/**
 * Sutun kimligi. null donerse sutun "sistem sutunu"dur: gizlenemez,
 * sabitlenemez, panelde listelenmez — ama siradaki yerini korur.
 * Satir secim kutusu (__select) bilerek sistem sutunu sayilir; gizlenmesi
 * toplu islemleri kullanilamaz hale getirirdi.
 */
/** Satir secim kutusu sutunu mu? Bu sutun her zaman en solda durur. */
export const secimSutunuMu = (col) =>
  String(col?.id ?? col?.accessor ?? '').startsWith('__select');

export const kolonAnahtari = (col) => {
  const k = col?.id ?? col?.accessor ?? null;
  if (k == null) return null;
  return String(k).startsWith('__select') ? null : k;
};

// shown: yalnizca "ek sutunlar" (optional: true) icin — bunlar varsayilanda
// gizlidir, kullanici acikca acarsa bu listeye girer.
export const BOS = { hidden: [], order: [], widths: {}, pinned: [], shown: [] };

/**
 * SAF FONKSIYON — React'tan bagimsiz, dogrudan test edilebilir.
 * Sutun listesini kullanici tercihlerine gore duzenler.
 *
 * Kurallar:
 *  - Tercih yoksa cikti girdiyle BIREBIR ayni sirada olur.
 *  - Sistem sutunlari (anahtarsiz, ornegin secim kutusu) gizlenemez/sabitlenemez
 *    ama siradaki yerlerini korur.
 *  - optional: true olan "ek sutunlar" yalnizca prefs.shown icindeyse gorunur.
 *  - prefs.hidden'daki normal sutunlar gizlenir.
 *  - prefs.pinned'dekiler en sola alinir.
 */
export function hesaplaGorunenKolonlar(columns, prefs, aktif = true) {
  const p = { ...BOS, ...(prefs || {}) };
  const anahtarli = columns.map((c, i) => {
    const gercek = kolonAnahtari(c);
    return { col: c, key: gercek ?? `__sys_${i}`, yonetilir: gercek != null };
  });
  const yonetilebilir = anahtarli.filter(x => x.yonetilir).map(x => x.col);
  if (!aktif) return { gorunenKolonlar: columns, yonetilebilir };

  const varsayilanSira = anahtarli.map(x => x.key);
  const sira = p.order.length ? p.order : varsayilanSira;

  const sirali = [...anahtarli].sort((a, b) => {
    const ia = sira.indexOf(a.key);
    const ib = sira.indexOf(b.key);
    if (ia === -1 && ib === -1) return varsayilanSira.indexOf(a.key) - varsayilanSira.indexOf(b.key);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const sabitler = sirali.filter(x => x.yonetilir && p.pinned.includes(x.key));
  const digerleri = sirali.filter(x => !(x.yonetilir && p.pinned.includes(x.key)));

  // Satir secim kutusu HER ZAMAN en solda kalir — siralamadan, sabitlemeden
  // ve ok tuslariyla tasimadan etkilenmez. Toplu islemler icin referans nokta.
  const secim = sirali.filter(x => secimSutunuMu(x.col));
  const secimDisi = [...sabitler, ...digerleri].filter(x => !secimSutunuMu(x.col));

  const gorunenKolonlar = [...secim, ...secimDisi]
    .filter(x => {
      if (!x.yonetilir) return true;
      if (x.col.optional) return p.shown.includes(x.key);
      return !p.hidden.includes(x.key);
    })
    .map(({ col, key, yonetilir }) => {
      const genislik = yonetilir ? p.widths[key] : null;
      const sabit = yonetilir && p.pinned.includes(key);
      return {
        ...col,
        width: genislik ? `${genislik}px` : (sabit ? `${SABIT_GENISLIK}px` : col.width),
        __pinned: sabit,
        __key: yonetilir ? key : null,
      };
    });

  return { gorunenKolonlar, yonetilebilir };
}
