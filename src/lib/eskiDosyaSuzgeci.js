/**
 * Depoda hangi Excel'lerin silinecegini secer.
 *
 * Promosyon sayfalarina yuklenen dosyalar "excel-files" kovasinda tutuluyor.
 * Donem gectikten sonra bunlari saklamanin faydasi yok; Trendyol zaten taze
 * dosya istiyor ve eski dosyayla calismak bugun bize saatler kaybettirdi.
 *
 * NOT: Supabase storage.objects'ten SQL ile silmeye izin vermiyor
 * ("Direct deletion from storage tables is not allowed"). Bu yuzden dosyalar
 * uygulama tarafindan Storage API ile siliniyor; kayitlardaki olu
 * baglantilari (excel_file_url) ise her gun cron temizliyor.
 *
 * Import icermez — duz node ile test edilebilir.
 */

export const VARSAYILAN_GUN = 10;

const zaman = (d) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
};

/**
 * @param liste  Storage list() ciktisi: [{ name, created_at, updated_at }]
 * @param gun    kac gunden eski silinecek
 * @param simdi  testlerde sabitlenebilsin diye
 * @returns silinecek dosya adlari
 */
export function silinecekDosyalar(liste, gun = VARSAYILAN_GUN, simdi = new Date()) {
  if (!Array.isArray(liste)) return [];
  const sinir = simdi.getTime() - Number(gun) * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(sinir)) return [];

  return liste
    .filter((d) => {
      if (!d || !d.name) return false;
      // Klasor girdilerinde id bos gelir; dosya degildir
      if (d.id === null || d.id === undefined) return false;
      const t = zaman(d.created_at) ?? zaman(d.updated_at);
      // Tarihi okunamayan dosya SILINMEZ; emin olmadan silmek yerine kalsin
      if (t === null) return false;
      return t < sinir;
    })
    .map((d) => d.name);
}
