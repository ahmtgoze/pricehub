/**
 * Trendyol komisyon tarifesi dosyasindaki ZAMAN PENCERELERI.
 *
 * Trendyol dosyanin yapisini degistirdi: artik BIR dosyada birden fazla
 * zaman penceresi var ve her birinin kendi komisyon kademeleri:
 *
 *   Tarih aralığı (3 Gün) | 1.KOMİSYON | 2.KOMİSYON | 3.KOMİSYON | 4.KOMİSYON
 *   Tarih aralığı (4 Gün) | 1.KOMİSYON | 2.KOMİSYON | 3.KOMİSYON | 4.KOMİSYON
 *
 * BASLIKLAR AYNI. Excel okuyucusu tekrar eden basliklari "_1", "_2" diye
 * yeniden adlandiriyor. Sayfa yalnizca soneksiz olanlari okudugu icin IKINCI
 * pencere GORUNMUYORDU — 22 urunluk ornekte 4 gunluk pencere kademelere gore
 * 2,7-3,4 PUAN daha ucuz komisyon veriyordu ve bu hic degerlendirilemiyordu.
 *
 * Burasi pencereleri bulur ve secilen pencerenin komisyonlarini dondurur.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/** Bir pencerenin komisyon anahtarlari: 1.KOMİSYON, 1.KOMİSYON_1, ... */
const komisyonAnahtari = (sira, sonek) => `${sira}.KOMİSYON${sonek}`;

/**
 * Satirdaki zaman pencerelerini bulur.
 *
 * "Tarih aralığı (...)" basliklari sirayla taranir; ilki soneksiz komisyon
 * sutunlarina, ikincisi "_1" sonekli olanlara karsilik gelir.
 *
 * @param satir sheet_to_json'un urettigi tek satir nesnesi
 * @returns [{ ad, tarihAraligi, sonek }]
 */
export function pencereleriBul(satir) {
  if (!satir || typeof satir !== 'object') return [];

  const tarihAnahtarlari = Object.keys(satir).filter((k) =>
    k.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr').startsWith('tarih aralığı')
  );

  return tarihAnahtarlari.map((anahtar, sira) => {
    // Baslik "Tarih aralığı (3 Gün)" -> ad "3 Gün"
    const parantez = anahtar.match(/\(([^)]*)\)/);
    const sonek = sira === 0 ? '' : `_${sira}`;
    return {
      ad: parantez ? parantez[1].trim() : `Pencere ${sira + 1}`,
      tarihAraligi: String(satir[anahtar] ?? '').trim(),
      sonek,
    };
  }).filter((p) =>
    // Komisyon sutunlari gercekten var mi? Yoksa pencere sayilmaz.
    Object.prototype.hasOwnProperty.call(satir, komisyonAnahtari(1, p.sonek))
  );
}

/**
 * Secilen pencerenin dort kademe komisyonunu dondurur.
 *
 * @param satir  sheet_to_json satiri
 * @param sonek  pencereleriBul'un verdigi sonek ('' | '_1' | ...)
 * @returns [k1, k2, k3, k4] — okunamayan 0
 */
export function pencereKomisyonlari(satir, sonek = '') {
  const sayi = (d) => {
    const n = Number(String(d ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  return [1, 2, 3, 4].map((s) => sayi(satir?.[komisyonAnahtari(s, sonek)]));
}

/**
 * "1 Eylül 08.00-4 Eylül 07.59" metnini iki parcaya ayirir.
 * Yalnizca GOSTERIM icindir; tarih nesnesine cevrilmez, cunku yil yok.
 */
export function tarihAraliginiAyir(metin) {
  const m = String(metin ?? '').trim();
  if (!m) return { baslangic: '', bitis: '' };
  const parcalar = m.split('-').map((p) => p.trim());
  if (parcalar.length < 2) return { baslangic: m, bitis: '' };
  return { baslangic: parcalar[0], bitis: parcalar.slice(1).join('-') };
}
