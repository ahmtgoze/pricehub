/**
 * Trendyol tarifesinin YAZILI OLMAYAN kabul kurali.
 *
 * Yeni fiyat, urunun "KOMİSYONA ESAS FİYAT" degerini GECEMEZ. Gecerse Trendyol
 * satiri sessizce reddediyor: toplu yukleme raporunda "Hatalı Fiyat
 * Güncellemesi" olarak sayiliyor ama sebebi yazmiyor.
 *
 * 3 Eylul 2026'da gercek yuklemede birebir dogrulandi:
 *   3 gunluk dosya : 11 satir, esas fiyati asan 3 urun -> 3 hata
 *   4 gunluk dosya : 13 satir, esas fiyati asan 1 urun -> 1 hata
 *   (KPBŞ2 741,70 > 726,13 · KB.1 118,24 > 110,19 · TBE2 140,69 > 132,04)
 *
 * Mantikli: tarife bir indirim programi, fiyat YUKSELTMEYE izin vermiyor.
 *
 * Import icermez — duz node ile test edilebilir.
 */

const sayi = (d) => {
  if (d === null || d === undefined || d === '') return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
};

/**
 * Fiyat tarifeye yazilabilir mi?
 *
 * Esas fiyat bilinmiyorsa (0 veya bos) ENGELLENMEZ: yanlis veri yuzunden
 * gecerli bir secimi kapatmak, birkac satirin reddedilmesinden daha kotu.
 */
export function fiyatTarifeyeUygunMu(fiyat, komisyonaEsasFiyat) {
  const f = sayi(fiyat);
  const esas = sayi(komisyonaEsasFiyat);
  if (f === null || f <= 0) return false;
  if (esas === null || esas <= 0) return true;
  return f <= esas;
}

/** Urunun tarifeye yazilabilecegi en yuksek fiyat; bilinmiyorsa null. */
export function tarifeUstSiniri(urun) {
  const esas = sayi(urun?.current_base_price);
  return esas !== null && esas > 0 ? esas : null;
}

/**
 * Secili fiyati esas fiyati asan urunler.
 * Disa aktarmadan once uyarmak icin.
 *
 * @param urunler  [{ barcode, product_name, current_base_price }]
 * @param fiyatAl  (urun) => secili fiyat
 */
export function sinirAsanlar(urunler, fiyatAl) {
  if (!Array.isArray(urunler) || typeof fiyatAl !== 'function') return [];
  const liste = [];
  for (const u of urunler) {
    const fiyat = sayi(fiyatAl(u));
    if (fiyat === null || fiyat <= 0) continue;
    const sinir = tarifeUstSiniri(u);
    if (sinir !== null && fiyat > sinir) {
      liste.push({ barkod: u.barcode, ad: u.product_name, fiyat, sinir });
    }
  }
  return liste;
}

/**
 * Bir kademeye yazilabilecek EN YUKSEK gecerli fiyat.
 *
 * Kademe bir ARALIKTIR ("118,24 ve alti"), tek fiyat degil. En yuksek fiyati
 * yazmak dogru — o kademedeki en karli fiyat odur — ama fiyat "KOMİSYONA ESAS
 * FİYAT"i gecemez. Geciyorsa tavan esas fiyata cekilir; kademe degismedigi
 * surece komisyon AYNI kalir.
 *
 *   KB.1: 3. kademe "118,24 ve alti", esas 110,19
 *     onceki : 118,24 -> Trendyol REDDEDIYOR
 *     simdi  : 110,19 -> kabul, komisyon yine %17,5
 *
 * Cekilen fiyat kademenin ALT sinirinin altina duserse o kademe kullanilamaz:
 * fiyat artik ALT kademeye aittir ve oradaki komisyonla hesaplanmalidir.
 *
 * @param ustFiyat  kademenin tavani (1. kademede "ve ustu" degeri)
 * @param altSinir  kademenin taban degeri; 4. kademede 0
 * @param esasFiyat KOMİSYONA ESAS FİYAT
 * @param ilkKademe 1. kademe mi ("X ve ustu")
 * @returns yazilacak fiyat, veya kademe kullanilamiyorsa null
 */
export function kademeFiyati(ustFiyat, altSinir, esasFiyat, ilkKademe = false) {
  const ust = sayi(ustFiyat);
  const alt = sayi(altSinir) ?? 0;
  const esas = sayi(esasFiyat);
  if (ust === null || ust <= 0) return null;
  // Esas fiyat bilinmiyorsa eski davranis: kademenin kendi fiyati
  if (esas === null || esas <= 0) return ust;

  // 1. kademe "X ve ustu" — dusurulemez, X'in altina inince kademe degisir
  if (ilkKademe) return ust <= esas ? ust : null;

  const cekilmis = Math.min(ust, esas);
  // Alt sinirin altina dustuyse fiyat ALT kademeye ait; burada kullanilamaz
  if (alt > 0 && cekilmis < alt) return null;
  return cekilmis;
}
