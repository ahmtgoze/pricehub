/**
 * HepsiBurada sepet kampanyasindaki MUSTERI INDIRIMI.
 *
 * Kampanya iki ayri sey verir, karistirilmamali:
 *
 *   1) Komisyon indirimi — HB'nin bizden aldigi oran duser (orn. %17 -> %9).
 *      Bu bizim LEHIMIZE.
 *   2) Sepet indirimi   — musteri sepette daha az oder (orn. "Sepette %15
 *      Indirim"). Bunu SATICI karsilar; kasaya giren tutar duser.
 *
 * Onceki hesap yalnizca (1)'i goruyordu: kar, girilen fiyat uzerinden
 * hesaplaniyordu. Oysa musteri o fiyati odemiyor. %15'lik bir kampanyada
 * kar ciddi sekilde OLDUGUNDAN YUKSEK cikiyordu.
 *
 * Bilgi, HB'nin Excel'indeki "Açıklamalar" sayfasinda duruyor:
 *
 *     EK BİLGİLER
 *     Kampanyanın İndirimi | Sepette %15 İndirim
 *
 * Import icermez — duz node ile test edilebilir.
 */

const sadelestir = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Satir basligi "Kampanyanın İndirimi" mi? (buyuk/kucuk ve bosluk esnek) */
function indirimSatiriMi(hucre) {
  return sadelestir(hucre).toLocaleLowerCase('tr').startsWith('kampanyanın indirimi');
}

/**
 * "Sepette %15 İndirim" gibi bir metinden indirimi cozer.
 *
 * @returns { tur: 'yuzde'|'tutar', deger } | null (cozulemezse)
 */
export function indirimiCoz(metin) {
  const m = sadelestir(metin);
  if (!m) return null;

  // Once YUZDE: "%15", "15%", "yüzde 15"
  const yuzde = m.match(/%\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*%/);
  if (yuzde) {
    const ham = yuzde[1] ?? yuzde[2];
    const d = Number(String(ham).replace(',', '.'));
    if (Number.isFinite(d) && d > 0 && d < 100) return { tur: 'yuzde', deger: d };
    return null;
  }

  // Sonra TUTAR: "50 TL", "50₺"
  const tutar = m.match(/(\d+(?:[.,]\d+)?)\s*(?:tl|₺)/i);
  if (tutar) {
    const d = Number(String(tutar[1]).replace(',', '.'));
    if (Number.isFinite(d) && d > 0) return { tur: 'tutar', deger: d };
  }

  return null;
}

/**
 * "Açıklamalar" sayfasindan kampanya indirimini bulur.
 *
 * @param aciklamaSatirlari sayfanin tamami: [[A,B,C], ...]
 * @returns { tur, deger, ham } | null
 */
export function aciklamalardanIndirim(aciklamaSatirlari) {
  for (const satir of aciklamaSatirlari || []) {
    if (!Array.isArray(satir) || satir.length === 0) continue;
    if (!indirimSatiriMi(satir[0])) continue;

    // Aciklama B sutununda; bazi dosyalarda kayabildigi icin sagdaki
    // hucrelerin hepsine bakilir.
    for (let i = 1; i < satir.length; i++) {
      const cozum = indirimiCoz(satir[i]);
      if (cozum) return { ...cozum, ham: sadelestir(satir[i]) };
    }
    // Basligi bulduk ama degeri cozemedik — uydurmak yerine ham metni don
    return { tur: null, deger: 0, ham: sadelestir(satir[1]) };
  }
  return null;
}

/**
 * Musterinin gercekte odedigi fiyat — kar bu tutardan hesaplanir.
 *
 * Indirim yoksa/gecersizse girilen fiyat aynen doner: bilinmeyen bir
 * indirimi tahmin etmek yanlis kar gosterir.
 */
export function indirimliFiyat(fiyat, indirim) {
  const f = Number(fiyat);
  if (!Number.isFinite(f) || f <= 0) return 0;
  if (!indirim || !indirim.tur) return f;

  const d = Number(indirim.deger);
  if (!Number.isFinite(d) || d <= 0) return f;

  const sonuc = indirim.tur === 'yuzde' ? f * (1 - d / 100) : f - d;
  // Indirim fiyati asarsa 0'in altina inilmez
  return Math.max(0, Math.round(sonuc * 100) / 100);
}

/** Kullaniciya gosterilecek kisa metin. */
export function indirimEtiketi(indirim) {
  if (!indirim || !indirim.tur) return 'Kampanya indirimi yok';
  const yaz = (d) => String(d).replace('.', ',');
  return indirim.tur === 'yuzde'
    ? `Sepette %${yaz(indirim.deger)} indirim`
    : `Sepette ${yaz(indirim.deger)} ₺ indirim`;
}
