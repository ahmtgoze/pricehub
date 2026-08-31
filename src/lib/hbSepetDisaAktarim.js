/**
 * HepsiBurada "Sepet Kampanyaları" Excel'ini disa aktarma kurallari.
 *
 * KURAL: Disa aktarilan dosyada YALNIZCA kampanyaya girecek urunler kalir.
 * Kampanyaya dahil edilmeyen urunlerin satiri dosyadan SILINIR.
 *
 * NICIN: Onceki surum butun satirlari birakiyor, yalnizca secili olanlarin
 * "Kampanyanin uygulanacagi fiyat" hucresini dolduruyordu. Fiyati bos kalan
 * satirlar dosyada durdugu icin panele kampanyaya girmeyecek urunler de
 * gonderilmis oluyordu. Satirin silinmesi, o urunun kampanya disinda
 * kaldiginin tek net ifadesidir.
 *
 * HB'nin sablonuna sutun EKLENMEZ, sutun sirasi DEGISMEZ, baslik satiri
 * oldugu gibi korunur — panel dosyayi kendi sablonuna gore okuyor.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/** Basliklardaki fazla bosluklari sadelestirir. */
export const sadelestir = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * Baslik satirindan gerekli sutunlarin yerini bulur.
 *
 * @param baslikSatiri Excel'in ilk satiri (dizi)
 * @returns { skuSutunu, fiyatSutunu } — bulunamayan null doner
 */
export function sutunlariBul(baslikSatiri) {
  const basliklar = (baslikSatiri || []).map(sadelestir);
  let skuSutunu = null;
  let fiyatSutunu = null;

  for (let i = 0; i < basliklar.length; i++) {
    const b = basliklar[i];
    // HB dosyasinda basligin yazimi degisebiliyor (bazen bas harfler buyuk)
    if (skuSutunu === null && b.toLocaleLowerCase('tr') === 'satıcı stok kodu') skuSutunu = i;
    // Baslik uzun: "Kampanyanın uygulanacağı fiyat (Bu fiyat ekran uzerinden...)"
    if (fiyatSutunu === null && b.startsWith('Kampanyanın uygulanacağı fiyat')) fiyatSutunu = i;
  }
  return { skuSutunu, fiyatSutunu };
}

/**
 * Disa aktarilacak sayfayi kurar.
 *
 * @param aoa       Excel sayfasinin tamami: [baslikSatiri, ...veriSatirlari]
 * @param secimler  [{ seller_stock_code, campaign_price, selected }]
 * @returns {
 *   satirlar,   yeni sayfanin tamami (baslik + yalnizca secili urunler)
 *   yazilan,    kampanya fiyati yazilan urun sayisi
 *   silinen,    dosyadan cikarilan satir sayisi
 *   hata        sutun bulunamadiysa aciklama, yoksa null
 * }
 */
export function kampanyaSayfasiniKur(aoa, secimler) {
  const tumSatirlar = Array.isArray(aoa) ? aoa : [];
  if (tumSatirlar.length === 0) {
    return { satirlar: [], yazilan: 0, silinen: 0, hata: 'Excel sayfası boş' };
  }

  const baslik = tumSatirlar[0];
  const { skuSutunu, fiyatSutunu } = sutunlariBul(baslik);

  if (fiyatSutunu === null) {
    return { satirlar: [], yazilan: 0, silinen: 0,
             hata: '"Kampanyanın uygulanacağı fiyat" sütunu bulunamadı' };
  }
  if (skuSutunu === null) {
    return { satirlar: [], yazilan: 0, silinen: 0,
             hata: '"Satıcı stok kodu" sütunu bulunamadı' };
  }

  // Secili ve gecerli fiyati olan urunler, stok koduna gore dizinlenir.
  const secili = new Map();
  for (const s of secimler || []) {
    const kod = sadelestir(s?.seller_stock_code);
    const fiyat = Number(s?.campaign_price);
    if (!kod || !s?.selected) continue;
    if (!Number.isFinite(fiyat) || fiyat <= 0) continue;
    secili.set(kod, fiyat);
  }

  const satirlar = [baslik];
  let yazilan = 0;
  let silinen = 0;

  for (let i = 1; i < tumSatirlar.length; i++) {
    const satir = tumSatirlar[i];
    const kod = sadelestir(satir?.[skuSutunu]);

    // Tamamen bos satirlar sessizce atlanir (silinen sayilmaz).
    if (!kod && (satir || []).every((h) => sadelestir(h) === '')) continue;

    const fiyat = secili.get(kod);
    if (fiyat === undefined) { silinen++; continue; }

    // Sutun sirasi korunur; yalnizca fiyat hucresi doldurulur.
    const yeni = [...satir];
    while (yeni.length <= fiyatSutunu) yeni.push('');
    yeni[fiyatSutunu] = fiyat;
    satirlar.push(yeni);
    yazilan++;
  }

  return { satirlar, yazilan, silinen, hata: null };
}
