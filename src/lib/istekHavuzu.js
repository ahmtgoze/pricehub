/**
 * Sinirli es zamanlilikla istek calistirma.
 *
 * NICIN VAR: fiyat kaydederken ~900 guncelleme yapiliyor. Iki uc nokta da
 * kotu:
 *   - Hepsini birden gondermek (Promise.all): tarayici/Supabase bu kadar
 *     es zamanli baglantiyi kaldiramiyor ve "TypeError: Failed to fetch"
 *     ile dusuyor. Canlida 86. istekte patladi.
 *   - Obekler halinde gondermek: her obegin EN YAVAS istegi beklenir,
 *     turlar arasinda bosluk olusur; 900 kayit belirgin sekilde uzar.
 *
 * Havuz ikisinin arasi: sabit sayida istek SUREKLI akista tutulur. Biri
 * bitince sirdaki hemen baslar, bosluk olmaz.
 *
 * Ayrica gecici ag hatalarinda tekrar dener — tek bir kopma yuzunden
 * butun hesaplama cope gitmesin.
 */

/** Kisa bekleme (test edilebilir olsun diye disari alinmadi). */
const bekle = (ms) => new Promise((c) => setTimeout(c, ms));

/**
 * isler dizisini en fazla `esZamanli` tanesi ayni anda calisacak sekilde isler.
 *
 * @param isler      islenecek ogeler
 * @param esZamanli  ayni anda kac istek (varsayilan 8)
 * @param calistir   async (oge, sira) => void
 * @param bitince    her oge bittiginde cagrilir (ilerleme icin), hatada da
 * @returns { basarili, basarisiz: [{ oge, hata }] }
 */
export async function havuzdaCalistir(isler, esZamanli, calistir, bitince) {
  const liste = Array.isArray(isler) ? isler : [];
  if (liste.length === 0) return { basarili: 0, basarisiz: [] };

  const sinir = Math.max(1, Math.min(esZamanli || 8, liste.length));
  const basarisiz = [];
  let basarili = 0;
  let sonraki = 0;

  const isci = async () => {
    while (sonraki < liste.length) {
      const sira = sonraki++;
      try {
        await calistir(liste[sira], sira);
        basarili++;
      } catch (hata) {
        basarisiz.push({ oge: liste[sira], hata });
      }
      bitince?.();
    }
  };

  await Promise.all(Array.from({ length: sinir }, isci));
  return { basarili, basarisiz };
}

/**
 * Gecici hatalarda tekrar dener.
 *
 * "Failed to fetch" cogunlukla geciciDIR (baglanti doygunlugu, kisa kopma).
 * Ilk denemede pes edilirse o urunun fiyati sessizce kaydedilmemis olur.
 */
export async function tekrarDene(islem, deneme = 3, taban = 300) {
  let sonHata;
  for (let i = 1; i <= deneme; i++) {
    try {
      return await islem();
    } catch (hata) {
      sonHata = hata;
      if (i < deneme) await bekle(taban * i);
    }
  }
  throw sonHata;
}
