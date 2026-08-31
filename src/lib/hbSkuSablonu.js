/**
 * HepsiBurada "Kendi kampanyanı oluştur" SKU yukleme sablonu.
 *
 * HB, bes kampanya turunun HEPSI icin AYNI dosyayi veriyor (bes sablonun
 * SHA-256'si birebir ayni). Dosya yalnizca "hangi urunler dahil" listesidir;
 * indirim orani, alt limit, tavan, butce ve tarih HB'nin EKRANINDAN girilir.
 *
 * Yapisi:
 *   Sayfa 1 "Açıklama" : sutun tarifi (Excel Kolon Adi | Karsiligi | Ornek)
 *   Sayfa 2 "Skus"     : tek sutun, basligi "SKU"
 *
 * Import icermez — duz node ile test edilebilir.
 */

export const ACIKLAMA_SAYFASI = 'Açıklama';
export const SKU_SAYFASI = 'Skus';

/** Sablonun aciklama sayfasi — HB'nin verdigi dosyadan birebir. */
export const ACIKLAMA_SATIRLARI = [
  ['Excel Kolon Adı', 'Karşılığı', 'Örnek'],
  ['SKU', 'Kampanyaya dahil edilecek SKU bilgisini belirtir.', 'HBV000000012'],
];

/**
 * SKU sayfasinin satirlarini kurar: baslik + her urun icin bir SKU.
 *
 * Bos ve tekrar eden SKU'lar atilir: ayni SKU iki kez giderse HB tekrarli
 * kayit gorur, bos satir da sema hatasi cikarabilir.
 *
 * @param skular  ['HBCV000077XIZW', ...]
 * @returns { satirlar, yazilan, atlanan }
 */
export function skuSayfasi(skular) {
  const satirlar = [['SKU']];
  const gorulen = new Set();
  let atlanan = 0;

  for (const ham of skular || []) {
    const sku = String(ham ?? '').trim();
    if (!sku) { atlanan++; continue; }
    if (gorulen.has(sku)) { atlanan++; continue; }
    gorulen.add(sku);
    satirlar.push([sku]);
  }

  return { satirlar, yazilan: satirlar.length - 1, atlanan };
}
