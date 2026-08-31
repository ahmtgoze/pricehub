/**
 * Excel hucre stillerini OKUMA bicimden YAZMA bicimine cevirir.
 *
 * SORUN: kutuphane stilleri DUZ okuyor ama IC ICE yaziyor.
 *
 *   okurken :  { patternType: 'solid', fgColor: { rgb: 'ED7D31' } }
 *   yazarken:  { fill: { patternType: 'solid', fgColor: { rgb: 'ED7D31' } } }
 *
 * Cevrilmezse yazici stili taniyamaz ve sessizce atar; yuklenen sablonun
 * renkleri inen dosyada kaybolur.
 *
 * Yalnizca cevrilmesi gereken hucrelere dokunulur: stili zaten ic ice
 * olanlar (bizim elle verdiklerimiz) oldugu gibi birakilir.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/** Stil zaten yazma bicimindeyse cevrilmez. */
function yazmaBicimindeMi(stil) {
  return !!(stil.fill || stil.font || stil.border || stil.alignment || stil.numFmt);
}

/**
 * Tek bir stili cevirir.
 * @returns cevrilmis stil, ya da cevrilecek bir sey yoksa null
 */
export function stiliCevir(stil) {
  if (!stil || typeof stil !== 'object') return null;
  if (yazmaBicimindeMi(stil)) return stil;

  const yeni = {};

  // Dolgu — bu dosyalarda en sik ve en gorunur olan
  if (stil.patternType && stil.patternType !== 'none') {
    yeni.fill = { patternType: stil.patternType };
    if (stil.fgColor) yeni.fill.fgColor = stil.fgColor;
    if (stil.bgColor) yeni.fill.bgColor = stil.bgColor;
  }

  // Yazi tipi
  const yazi = {};
  if (stil.name) yazi.name = stil.name;
  if (stil.sz) yazi.sz = stil.sz;
  if (stil.bold) yazi.bold = true;
  if (stil.italic) yazi.italic = true;
  if (stil.underline) yazi.underline = true;
  if (stil.color) yazi.color = stil.color;
  if (Object.keys(yazi).length > 0) yeni.font = yazi;

  // Hizalama
  const hiza = {};
  if (stil.horizontal) hiza.horizontal = stil.horizontal;
  if (stil.vertical) hiza.vertical = stil.vertical;
  if (stil.wrapText) hiza.wrapText = true;
  if (Object.keys(hiza).length > 0) yeni.alignment = hiza;

  // Kenarlik
  const kenar = {};
  for (const yon of ['top', 'bottom', 'left', 'right']) {
    if (stil[yon]) kenar[yon] = stil[yon];
  }
  if (Object.keys(kenar).length > 0) yeni.border = kenar;

  return Object.keys(yeni).length > 0 ? yeni : null;
}

/**
 * Calisma kitabindaki tum hucre stillerini yazmaya hazirlar.
 * Kitabi YERINDE degistirir ve cevrilen hucre sayisini dondurur.
 */
export function stilleriYazmayaHazirla(kitap) {
  if (!kitap || !Array.isArray(kitap.SheetNames)) return 0;

  let cevrilen = 0;
  for (const sayfaAdi of kitap.SheetNames) {
    const sayfa = kitap.Sheets[sayfaAdi];
    if (!sayfa) continue;

    for (const adres of Object.keys(sayfa)) {
      if (adres.startsWith('!')) continue;      // sayfa ayarlari, hucre degil
      const hucre = sayfa[adres];
      if (!hucre || !hucre.s) continue;

      const cevrilmis = stiliCevir(hucre.s);
      if (cevrilmis && cevrilmis !== hucre.s) { hucre.s = cevrilmis; cevrilen++; }
      else if (!cevrilmis) delete hucre.s;       // bos stil yaziciyi mesgul etmesin
    }
  }
  return cevrilen;
}
