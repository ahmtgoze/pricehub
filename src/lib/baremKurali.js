/**
 * Barem secim kurali — promosyon sayfalari icin TEK kaynak.
 *
 * Neden ayri modul: bu mantik sekiz promosyon sayfasina ayri ayri
 * kopyalanmisti ve uc yerde YANLIS sinirlar kullaniliyordu (HepsiBurada
 * sayfalari Trendyol'un 149,99 / 299,99 bantlarini uyguluyordu; oysa
 * HepsiBurada'nin bantlari 199,99 / 399,99). Ayrica hicbiri platformun
 * desi tavanini (barem_max_desi) ve use_barem anahtarini kontrol
 * etmiyordu — ana fiyat motoru ikisini de kontrol ediyor.
 *
 * Sinirlar platform kaydindan okunur; sayfaya sabit yazilmaz.
 * Import icermez — duz node ile test edilebilir.
 */

const sayi = (v) => {
  // Number(null) === 0 ve Number('') === 0 oldugu icin once eleme sart;
  // aksi halde tanimsiz bir sinir "0" sayilip baremi tamamen kapatiyor.
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Barem bu urun/platform icin devreye girebilir mi?
 * Ana motordaki (calculateProductPrice) kosullarin aynisi.
 */
export function baremKullanilabilir(platform, urun, toplamDesi) {
  if (!platform || !urun) return false;
  if (platform.platform_type === 'website') return false;   // web sitesinde barem yok
  if (!platform.use_barem) return false;
  if (urun.special_shipping) return false;
  if (urun.multi_package) return false;

  // Desi tavani: motor bunu kontrol ediyor, promosyon sayfalari etmiyordu
  const tavan = sayi(platform.barem_max_desi) ?? 5;
  const desi = sayi(toplamDesi) ?? 0;
  return desi <= tavan;
}

/**
 * Fiyat hangi barem bandina duser? 'barem1' | 'barem2' | null
 * Sinirlar platform kaydindan; tanimli degilse barem uygulanmaz.
 */
export function baremBandi(platform, fiyat) {
  const f = sayi(fiyat);
  if (f === null || f <= 0) return null;

  const b1min = sayi(platform?.barem1_min);
  const b1max = sayi(platform?.barem1_max);
  const b2min = sayi(platform?.barem2_min);
  const b2max = sayi(platform?.barem2_max);

  if (b1min !== null && b1max !== null && f >= b1min && f <= b1max) return 'barem1';
  if (b2min !== null && b2max !== null && f >= b2min && f <= b2max) return 'barem2';
  return null;
}

/** Ikisini birlestirir: uygulanacak barem tipi ya da null. */
export function baremSec(platform, urun, fiyat, toplamDesi) {
  if (!baremKullanilabilir(platform, urun, toplamDesi)) return null;
  return baremBandi(platform, fiyat);
}

/**
 * Barem onerisi icin: bir ust banda gecmek adina denenecek fiyatlar.
 * Ornegin fiyat 350 ise, 299,99'a (barem2 tavani) cekmek onerilebilir.
 * Buyukten kucuge sirali dondurulur.
 */
export function baremTavanFiyatlari(platform) {
  const tavanlar = [sayi(platform?.barem2_max), sayi(platform?.barem1_max)]
    .filter((v) => v !== null && v > 0);
  return [...new Set(tavanlar)].sort((a, b) => b - a);
}
