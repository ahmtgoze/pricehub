/**
 * HepsiBurada Excel'inden gelen komisyon oranlarinin KDV'ye cevrilmesi.
 *
 * KURAL (is-kurallari.md bolum 2): fiyat motoru komisyon oranini KDV DAHIL
 * bekler. Motor icinde:
 *     komisyon = (satis / 1,20) x oran x 1,20 = satis x oran
 *
 * HepsiBurada ise oranlarini KDV HARIC verir. Panelde "%17" yazan komisyonun
 * kasadan cikan gercek karsiligi %20,4'tur (17 x 1,20).
 *
 * NEREDE GEREKLI: yalnizca oranin HB'nin EXCEL'inden okundugu yerlerde —
 * Sepet Kampanyalari ve Avantajli Teklifler. Sistemdeki `commissions`
 * tablosuna oranlar zaten ×1,20 yapilmis olarak (KDV dahil) giriliyor;
 * oradan okuyan sayfalarda (ornegin Kendi Kampanyan) bu cevrim YAPILMAZ,
 * yapilirsa KDV iki kez binmis olur.
 *
 * GECMIS: 2026-08-28'de etiketteki "(KDV'li %20,4)" gosterimi "komisyonlar
 * sisteme zaten KDV dahil giriliyor" gerekcesiyle kaldirilmisti. O gerekce
 * tablodan okuyan sayfalar icin dogru, Excel'den okuyanlar icin yanlisti.
 * Hesap da bastan beri ham orani kullaniyordu; komisyon eksik, kar oldugundan
 * yuksek cikiyordu.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/** HepsiBurada oranlarinin KDV'si. Sabit %20. */
export const HB_KOMISYON_KDV = 20;

/**
 * HB'nin verdigi KDV haric orani, motorun bekledigi KDV dahil orana cevirir.
 *
 *   17   -> 20,4
 *    9   -> 10,8
 *   12,5 -> 15
 *
 * Gecersiz/bos deger 0 doner: komisyonsuz urun hesaplanamaz, uydurma oran
 * uretmek yanlis kar gosterir.
 */
export function kdvDahilOran(hamOran) {
  const n = Number(hamOran);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * (1 + HB_KOMISYON_KDV / 100) * 100) / 100;
}

/**
 * KDV dahil orani, HB'nin panelde gosterdigi ham orana geri cevirir.
 * Yalnizca GOSTERIM icindir; hesapta kullanilmaz.
 *
 *   20,4 -> 17
 *   10,8 -> 9
 */
export function hamOrana(kdvDahilOranDegeri) {
  const n = Number(kdvDahilOranDegeri);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / (1 + HB_KOMISYON_KDV / 100)) * 100) / 100;
}

/**
 * Etiket metni. Girdi motorun kullandigi KDV DAHIL orandir.
 *
 * Hem gercek (KDV dahil) oran hem HB'nin panelde gosterdigi ham oran yazilir:
 * kullanici panelle karsilastirabilsin ve iki yonde de karisiklik olusmasin.
 * Ham oranin etiketten kaldirilmasi, bu hatanin aylarca gorunmez kalmasinin
 * sebebiydi.
 *
 *   20,4 -> "%20,4 (HB %17)"
 */
export function komisyonEtiketi(kdvDahilOranDegeri) {
  const n = Number(kdvDahilOranDegeri);
  if (!Number.isFinite(n) || n <= 0) return '%0';
  const yaz = (d) => String(d).replace('.', ',');
  return `%${yaz(Math.round(n * 100) / 100)} (HB %${yaz(hamOrana(n))})`;
}
