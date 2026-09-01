/**
 * Trendyol tarife dosyasinda URUN BASINA zaman penceresi secimi.
 *
 * Dosyada iki pencere var (ornek: 3 Gun = 1-4 Eylul, 4 Gun = 4-8 Eylul).
 * ONEMLI YAPI: fiyat limitleri (1./2./3./4. Fiyat Alt/Ust) IKI PENCEREDE
 * ORTAK; yalnizca KOMISYONLAR farkli. Yani ayni fiyat, pencereye gore
 * farkli komisyon ve farkli kar demek. 4 gunluk pencere tipik olarak
 * 2-3 puan daha ucuz komisyon veriyor.
 *
 * Dosyanin "Tarife Secimi" sutunu SATIR BAZLI oldugu icin bir urun 3 gunluk,
 * baska bir urun 4 gunluk pencereye yazilabilir ve hepsi TEK dosyada
 * indirilebilir. Sayfa onceden tum sayfa icin tek pencere okuyordu; ikinci
 * pencereye gecmek icin Excel'i yeniden yuklemek gerekiyordu ve iki pencere
 * ayni dosyada birlestirilemiyordu.
 *
 * Burasi her satir icin TUM pencerelerin komisyonlarini saklar ve secilen
 * pencerenin komisyonlarini urune uygular.
 *
 * Yalnizca saf lib import eder — duz node ile test edilebilir.
 */

import { pencereKomisyonlari } from './trendyolTarifePenceresi.js';

/** Komisyonu okunamayan pencere icin donen deger. */
const BOS = [0, 0, 0, 0];

/**
 * Bir Excel satirindaki TUM pencerelerin komisyonlarini haritalar.
 *
 * @param satir     sheet_to_json satiri
 * @param pencereler pencereleriBul(...) ciktisi
 * @returns { '3 Gün': [k1,k2,k3,k4], '4 Gün': [...] }
 */
export function komisyonHaritasi(satir, pencereler) {
  if (!satir || !Array.isArray(pencereler)) return {};
  const harita = {};
  for (const p of pencereler) {
    if (!p || !p.ad) continue;
    harita[p.ad] = pencereKomisyonlari(satir, p.sonek);
  }
  return harita;
}

/** Haritadan bir pencerenin komisyonlarini alir; yoksa [0,0,0,0]. */
export function pencereKomisyonlariniAl(harita, pencereAdi) {
  const k = harita?.[pencereAdi];
  return Array.isArray(k) && k.length === 4 ? k : [...BOS];
}

/**
 * Secilen pencerenin komisyonlarini urune uygular.
 *
 * FIYAT SECIMI KORUNUR: limitler iki pencerede ayni oldugu icin secili
 * kademe gecerliligini yitirmez; yalnizca komisyon — dolayisiyla kar —
 * degisir. Secimi silmek kullaniciyi bos yere yeniden secmeye zorlardi.
 */
export function pencereUygula(urun, pencereAdi) {
  if (!urun || !pencereAdi) return urun;
  const k = pencereKomisyonlariniAl(urun.pencere_komisyonlari, pencereAdi);
  return {
    ...urun,
    tarife_penceresi: pencereAdi,
    commission_1: k[0],
    commission_2: k[1],
    commission_3: k[2],
    commission_4: k[3],
  };
}

/** Bir urunun secebilecegi pencere adlari. */
export function pencereAdlari(urun) {
  const h = urun?.pencere_komisyonlari;
  return h && typeof h === 'object' ? Object.keys(h) : [];
}

/**
 * Bir kademede pencereler arasindaki komisyon farki.
 * Kullaniciya "4 gunluk 2,7 puan daha ucuz" diye gostermek icin.
 *
 * @returns [{ ad, komisyon }] — kademe komisyonuna gore ARTAN sirali
 */
export function kademeKarsilastir(urun, kademeNo) {
  const sira = Number(kademeNo);
  if (!urun || !(sira >= 1 && sira <= 4)) return [];
  return pencereAdlari(urun)
    .map((ad) => ({ ad, komisyon: pencereKomisyonlariniAl(urun.pencere_komisyonlari, ad)[sira - 1] }))
    .filter((x) => x.komisyon > 0)
    .sort((a, b) => a.komisyon - b.komisyon);
}
