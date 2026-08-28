/**
 * Platform kartlarindaki "Fiyat kaydi" ve "Ortalama komisyon" hesabi.
 *
 * Neden ayri dosya: bu mantik iki tuzak iceriyor ve test edilebilir olmali.
 *   1. Komisyon orani ust seviye commission_rate sutununda DEGIL (o sutun
 *      dolduruluyor gorunse de 0), fiyat kaydinin calculation_details
 *      alaninda duruyor.
 *   2. calculation_details veritabaninda JSON METNI olarak saklaniyor
 *      (cift kodlanmis), yani once JSON.parse gerekiyor.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/** calculation_details hem metin hem nesne gelebilir; ikisini de kaldir. */
export function detayCoz(detay) {
  if (!detay) return null;
  if (typeof detay === 'object') return detay;
  if (typeof detay !== 'string') return null;
  try {
    const cozulmus = JSON.parse(detay);
    // Cift kodlanmis olabilir: JSON.parse bir kez daha metin dondurebilir
    return typeof cozulmus === 'string' ? detayCoz(cozulmus) : cozulmus;
  } catch {
    return null;
  }
}

/**
 * satirlar: [{ platform_name, calculation_details }]
 * Donen: { 'trendyol': { adet, ortalamaKomisyon|null }, ... }
 * Anahtarlar kucuk harfe cevrilmis platform adidir.
 */
export function hesaplaPlatformIstatistigi(satirlar) {
  const toplam = {};

  for (const satir of satirlar || []) {
    const ad = (satir?.platform_name || '').trim().toLowerCase();
    if (!ad) continue;

    const kutu = toplam[ad] || (toplam[ad] = { adet: 0, _top: 0, _n: 0 });
    kutu.adet += 1;

    // Number(null) === 0 ve Number('') === 0 oldugu icin once eleme sart;
    // aksi halde komisyonu bos olan kayit "%0" sayilip ortalamayi dusurur.
    const ham = detayCoz(satir.calculation_details)?.commissionRate;
    const oran = (ham === null || ham === undefined || ham === '') ? NaN : Number(ham);
    // Komisyonu okunamayan kayit ortalamayi bozmasin diye sayilmaz;
    // ama fiyat kaydi adedine yine de dahildir.
    if (Number.isFinite(oran)) {
      kutu._top += oran;
      kutu._n += 1;
    }
  }

  const sonuc = {};
  for (const [ad, k] of Object.entries(toplam)) {
    sonuc[ad] = {
      adet: k.adet,
      ortalamaKomisyon: k._n > 0 ? k._top / k._n : null,
    };
  }
  return sonuc;
}
