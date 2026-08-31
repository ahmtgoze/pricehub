/**
 * Hesaba girecek GERCEK urun maliyeti.
 *
 * KURAL: urun bir referans uruneye baglıysa (ozellige gore ya da olcuye gore)
 * ve BAZ MALIYET kendi maliyetinden YUKSEKSE, baz maliyet kullanilir.
 * Baz maliyet daha kucukse urunun KENDI maliyeti gecerlidir.
 *
 *     gecerli = (referansli && bazMaliyet > maliyet) ? bazMaliyet : maliyet
 *
 * NICIN VAR: bu kural fiyat motorunun ana yolunda (calculatePriceBreakdown'i
 * cagiran toplu hesap) zaten uygulaniyordu, ama PROMOSYON SAYFALARININ hepsi
 * kendi kar hesabini yapiyor ve dogrudan `product.cost` okuyordu. Referansli
 * urunlerde maliyet oldugundan DUSUK aliniyor, kar oldugundan YUKSEK
 * gorunuyordu. Yedi sayfa birden etkileniyordu:
 *   Sepet Kampanyalari · Avantajli Teklifler · Kendi Kampanyan · Flas Urunler
 *   Avantajli Urun Etiketi · Plus Tarifesi · Kampanyalar
 *
 * NICIN "referansli" sarti var: referansi olmayan bir urunde base_cost eski
 * bir kayittan kalmis olabilir; onu maliyet yerine kullanmak uydurma olurdu.
 *
 * TUZAK: Supabase numeric alanlari METIN olarak dondurebiliyor. "3420" >
 * "640.42" metin karsilastirmasi yanlis sonuc verir; ikisi de sayiya
 * cevrilmeden karsilastirilmamali.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/**
 * @param urun { cost, base_cost, ref_product_id, ref_product_id_size }
 * @returns hesaba girecek maliyet (sayi)
 */
export function gecerliMaliyet(urun) {
  if (!urun) return 0;

  const maliyet = Number(urun.cost) || 0;
  const bazMaliyet = Number(urun.base_cost) || 0;
  const referansli = !!(urun.ref_product_id || urun.ref_product_id_size);

  return (referansli && bazMaliyet > maliyet) ? bazMaliyet : maliyet;
}
