/**
 * Trendyol PLUS urun komisyon tarifesi dosyasindaki ZAMAN PENCERELERI.
 *
 * Dosya yapisi (sayfa: TyPlusÜrünleri):
 *   Tarih Aralığı (3 Gün) | Plus Komisyon Teklifi
 *   Tarih Aralığı (4 Gün) | Plus Komisyon Teklifi     <- BASLIK AYNI
 *
 * Basliklar ayni oldugu icin Excel okuyucusu ikincisini "_1" diye yeniden
 * adlandiriyor. Sayfa yalnizca soneksiz olani okudugu icin IKINCI PENCERE
 * GORUNMUYORDU. Gercek dosyada (22 urun) 4 gunluk pencere ortalama 3,60
 * PUAN daha ucuz komisyon veriyor (en az 3,1 en fazla 4,1) ve bu avantaj
 * hic degerlendirilemiyordu.
 *
 * "Tarife Seçimi" hucresine yazilacak metni dosya KENDISI veriyor:
 *   3 Gün Tarih Aralığı -> "3 Günlük Fiyat (1 Eylül 08.00-4 Eylül 07.59)"
 *   4 Gün Tarih Aralığı -> "4 Günlük Fiyat (4 Eylül 08.00-8 Eylül 07.59)"
 *   7 Gün Tarih Aralığı -> "7 Günlük Fiyat"
 * Metni kendimiz KURMUYORUZ; satirin kendi hucresi aynen kopyalanir. Tarih
 * araliginin parantez icinde olmasi zorunlu — yalnizca "4 Günlük Fiyat"
 * yazmak kabul edilen ciktiya uymuyor.
 *
 * Import icermez — duz node ile test edilebilir.
 */

const KOMISYON_BASLIGI = 'Plus Komisyon Teklifi';

const sayi = (d) => {
  const n = Number(String(d ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Satirdaki pencereleri bulur.
 * @returns [{ ad, tarihAraligi, sonek, secimMetni }]
 */
export function plusPencereleriBul(satir) {
  if (!satir || typeof satir !== 'object') return [];

  const tarihAnahtarlari = Object.keys(satir).filter((k) =>
    k.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr').startsWith('tarih aralığı')
  );

  return tarihAnahtarlari
    .map((anahtar, sira) => {
      const parantez = anahtar.match(/\(([^)]*)\)/);
      const ad = parantez ? parantez[1].trim() : `Pencere ${sira + 1}`;
      const sonek = sira === 0 ? '' : `_${sira}`;
      return {
        ad,
        tarihAraligi: String(satir[anahtar] ?? '').trim(),
        sonek,
        // "Tarife Seçimi"ne yazilacak metin, satirin kendi hucresinden
        secimMetni: secimMetniniBul(satir, ad),
      };
    })
    .filter((p) => Object.prototype.hasOwnProperty.call(satir, `${KOMISYON_BASLIGI}${p.sonek}`));
}

/**
 * "3 Gün Tarih Aralığı" gibi sutundan "Tarife Seçimi" metnini okur.
 * Bulunamazsa null — uydurma deger yazmaktansa sutunu bos birakmak dogrudur.
 */
export function secimMetniniBul(satir, pencereAdi) {
  if (!satir || !pencereAdi) return null;
  const gun = String(pencereAdi).match(/(\d+)/);
  if (!gun) return null;
  const hedef = `${gun[1]} gün tarih aralığı`;
  const anahtar = Object.keys(satir).find(
    (k) => k.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr') === hedef
  );
  const deger = anahtar ? String(satir[anahtar] ?? '').trim() : '';
  return deger || null;
}

/** Secilen pencerenin Plus komisyon teklifi. */
export function plusKomisyonu(satir, sonek = '') {
  return sayi(satir?.[`${KOMISYON_BASLIGI}${sonek}`]);
}

/**
 * Satirdaki tum pencereleri haritalar.
 * @returns { '3 Gün': { komisyon, tarihAraligi, secimMetni }, '4 Gün': {...} }
 */
export function plusPencereHaritasi(satir, pencereler) {
  if (!satir || !Array.isArray(pencereler)) return {};
  const harita = {};
  for (const p of pencereler) {
    if (!p?.ad) continue;
    harita[p.ad] = {
      komisyon: plusKomisyonu(satir, p.sonek),
      tarihAraligi: p.tarihAraligi,
      secimMetni: p.secimMetni,
    };
  }
  return harita;
}

/** Secilen pencereyi urune uygular. */
export function plusPencereUygula(urun, pencereAdi) {
  if (!urun || !pencereAdi) return urun;
  const p = urun.plus_pencereleri?.[pencereAdi];
  if (!p || !(p.komisyon > 0)) return urun;
  return {
    ...urun,
    plus_commission_offer: p.komisyon,
    tarife_penceresi: pencereAdi,
    tarife_secim_metni: p.secimMetni || null,
  };
}

/** Urunun secebilecegi pencere adlari. */
export function plusPencereAdlari(urun) {
  const h = urun?.plus_pencereleri;
  return h && typeof h === 'object' ? Object.keys(h) : [];
}
