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

/**
 * Hangi KAYNAK satirlarin korunacagini soyler.
 *
 * kampanyaSayfasiniKur satirlari yeniden kurar (duz degerler). Bu ise
 * satirin Excel'deki YERINI dondurur; boylece cagiran taraf hucreleri
 * orijinalinden OLDUGU GIBI tasiyabilir ve bicim/genislik korunur.
 *
 * @returns {
 *   tutulacak: [{ kaynakSatir, fiyat }],  kaynakSatir 0-tabanli (0 = baslik)
 *   silinen, fiyatSutunu, skuSutunu, hata
 * }
 */
export function satirPlani(aoa, secimler) {
  const tumSatirlar = Array.isArray(aoa) ? aoa : [];
  if (tumSatirlar.length === 0) {
    return { tutulacak: [], silinen: 0, fiyatSutunu: null, skuSutunu: null, hata: 'Excel sayfası boş' };
  }

  const { skuSutunu, fiyatSutunu } = sutunlariBul(tumSatirlar[0]);
  if (fiyatSutunu === null) {
    return { tutulacak: [], silinen: 0, fiyatSutunu: null, skuSutunu: null,
             hata: '"Kampanyanın uygulanacağı fiyat" sütunu bulunamadı' };
  }
  if (skuSutunu === null) {
    return { tutulacak: [], silinen: 0, fiyatSutunu, skuSutunu: null,
             hata: '"Satıcı stok kodu" sütunu bulunamadı' };
  }

  const secili = new Map();
  for (const sec of secimler || []) {
    const kod = sadelestir(sec?.seller_stock_code);
    const fiyat = Number(sec?.campaign_price);
    if (!kod || !sec?.selected) continue;
    if (!Number.isFinite(fiyat) || fiyat <= 0) continue;
    secili.set(kod, fiyat);
  }

  const tutulacak = [];
  let silinen = 0;

  for (let i = 1; i < tumSatirlar.length; i++) {
    const satir = tumSatirlar[i];
    const kod = sadelestir(satir?.[skuSutunu]);
    if (!kod && (satir || []).every((h) => sadelestir(h) === '')) continue;

    const fiyat = secili.get(kod);
    if (fiyat === undefined) { silinen++; continue; }
    tutulacak.push({ kaynakSatir: i, fiyat });
  }

  return { tutulacak, silinen, fiyatSutunu, skuSutunu, hata: null };
}

/**
 * Sutun genisliklerini icerige gore hesaplar.
 *
 * NICIN VAR: temiz bir dosya uretiyoruz (yuklenen dosyanin bicimi, renkleri,
 * aciklama balonlari ve gomulu resimleri tasinmiyor — tasinmaya calisildiginda
 * Excel dosyayi "bozuk" diye acmiyordu). Genislik verilmezse butun sutunlar
 * varsayilan dar genislikte gelir ve uzun urun adlari gorunmez.
 *
 * En uzun hucrenin karakter sayisi esas alinir; cok dar ve cok genis
 * uclar sinirlanir.
 */
export function otomatikGenislikler(satirlar, { enAz = 8, enCok = 60 } = {}) {
  const liste = Array.isArray(satirlar) ? satirlar : [];
  if (liste.length === 0) return [];

  const sutunSayisi = liste.reduce((en, s) => Math.max(en, (s || []).length), 0);
  const genislikler = [];

  for (let sutun = 0; sutun < sutunSayisi; sutun++) {
    let enUzun = 0;
    for (const satir of liste) {
      const deger = satir?.[sutun];
      if (deger === null || deger === undefined) continue;
      // Satir sonu iceren basliklarda en uzun PARCA belirleyicidir
      for (const parca of String(deger).split('\n')) {
        if (parca.length > enUzun) enUzun = parca.length;
      }
    }
    // +2: kenar boslugu, yoksa metin hucreye yapisik duruyor
    genislikler.push({ wch: Math.min(enCok, Math.max(enAz, enUzun + 2)) });
  }
  return genislikler;
}

/**
 * HB SKU sutununun basligi HB'nin sablonunda BOSTUR.
 *
 * Dosyayi acan kisi basliksiz bir sutun goruyor ve SKU'nun eksik oldugunu
 * saniyor. Bu fonksiyon o sutunu bulur ki disa aktarimda basligi
 * doldurulabilsin.
 *
 * Sutun, "Satıcı stok kodu"nun HEMEN SAGINDAKI bos baslikli sutundur.
 * Konum degil ILISKI esas alinir; HB sutun sirasini degistirirse de bulunur.
 *
 * @returns sutun indeksi, ya da boyle bir sutun yoksa null
 */
export function bosSkuSutunu(baslikSatiri) {
  const basliklar = (baslikSatiri || []).map(sadelestir);
  const stokKodu = basliklar.findIndex(
    (b) => b.toLocaleLowerCase('tr') === 'satıcı stok kodu'
  );
  if (stokKodu === -1) return null;

  const sonraki = stokKodu + 1;
  if (sonraki >= basliklar.length) return null;
  // Yalnizca GERCEKTEN bos olan baslik doldurulur; dolu basligin uzerine
  // yazmak sablonu bozar.
  return basliklar[sonraki] === '' ? sonraki : null;
}
