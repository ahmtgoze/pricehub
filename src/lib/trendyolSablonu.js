/**
 * Trendyol "Price_And_Stock_Update" sablonu.
 *
 * Trendyol panelinde "Ürün → Toplu Ürün İşlemleri" ekrani dosyayi KENDI
 * sablonuna gore okur. Onceki surum "Fiyatlar" adli bir sayfaya farkli
 * basliklar yaziyordu ve panel dosyayi kabul etmiyordu.
 *
 * Sablonun birebir yapisi (Trendyol'un indirilen bos dosyasindan alindi):
 *   Sayfa 1: "Güncelleme Bilgileri"
 *     A1 Barkod · B1 Trendyol Satış Fiyatı (TSF) (KDV Dahil) · C1 Ürün Stok Adedi
 *     E1:T1 birlesik hucrede aciklama notu
 *   Sayfa 2: "Dropdown Kaynağı" (panelin bekledigi referans listesi)
 *
 * Import icermez — duz node ile test edilebilir.
 */

export const TRENDYOL_SAYFA = 'Güncelleme Bilgileri';
export const TRENDYOL_DROPDOWN_SAYFA = 'Dropdown Kaynağı';

export const TRENDYOL_BASLIKLAR = [
  'Barkod',
  'Trendyol Satış Fiyatı (TSF) (KDV Dahil)',
  'Ürün Stok Adedi',
];

/** Sablondaki E1 notu — birebir korunur. */
export const TRENDYOL_NOT =
  'NOT: \n' +
  '1) Güncellenmek istenen ürüne ait "Barkod" bilgisi zorunludur.\n' +
  '2) "Trendyol Satış Fiyatı" ve "Ürün Stok Adeti" bilgilerinden sadece ' +
  'değiştirilmek istenenlerin doldurulması yeterlidir.';

/** Sablonun ikinci sayfasi. Panel bu sayfayi bekliyor. */
export const TRENDYOL_DROPDOWN = [
  ['Kadın ', 'Bebek', 0],
  ['Erkek ', 'Çocuk', 1],
  ['Bebek', 'Genç', 8],
  ['Kız Çocuk', 'Yetişkin', 18],
  ['Erkek Çocuk', null, null],
  ['Unisex', null, null],
];

/**
 * Fiyat satirlarini sablon duzenine cevirir.
 *
 * STOK VARSAYILAN OLARAK BOS. Sablonun kendi notu "yalnizca degistirilmek
 * istenenleri doldurun" diyor. Buradaki stok, pazaryeri listesi yuklendigi
 * andaki fotograftir; geri yazilirsa o tarihten sonra satilan ya da eklenen
 * gercek stok ESKI degere doner. Kullanici bilerek isterse stokAktar ile
 * acabilir — o zaman listeyi yeni yukledigine emin olmali.
 *
 * Barkodu olmayan satir atlanir: barkod zorunlu, olmadan satir islenmez.
 */
export function trendyolSatirlari(fiyatlar, { stokAktar = false } = {}) {
  return (fiyatlar || [])
    .filter((f) => f && f.barkod != null && String(f.barkod).trim() !== '')
    .map((f) => [
      String(f.barkod).trim(),
      yuvarla(f.system_price),
      stokAktar ? (tamSayi(f.stock_quantity) ?? null) : null,
    ]);
}

/** Stok adedi: negatif ve gecersiz degerler yazilmaz. */
function tamSayi(deger) {
  const n = Number(deger);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

/** Kurusa yuvarlar; gecersizse null (hucre bos kalir). */
function yuvarla(deger) {
  const n = Number(deger);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Barkodu olmadigi icin atlanan satirlar — kullaniciya bildirmek icin. */
export function barkodsuzlar(fiyatlar) {
  return (fiyatlar || []).filter(
    (f) => !f || f.barkod == null || String(f.barkod).trim() === ''
  );
}
