/**
 * Bir urunun HANGI komisyon tarifesi kaydinin kullanilacagini secer.
 *
 * "Avantajlı Ürün Etiketi" sayfasi, KOMİSYON TARİFESİ "Var" olan urunlerde
 * komisyonu tarife kaydindan okuyor. Onceki surum su sekilde ariyordu:
 *
 *   trendyolPriceRanges.find(pr => pr.barcode === ... && pr.platform_account === ...)
 *
 * Iki acigi vardi:
 *   1. TARIH suzgeci yok — Haziran'dan kalma bir kayit da eslesebiliyordu
 *   2. PENCERE suzgeci yok — Trendyol artik bir dosyada 3 gunluk ve 4 gunluk
 *      iki pencere veriyor ve komisyonlari FARKLI (4 gunluk 2,7-3,4 puan
 *      daha ucuz). Iki kayit da kayitliyken hangisinin geldigi rastgeleydi;
 *      yanlis komisyonla kar hesaplanabiliyordu.
 *
 * Siralama: once tarihi ortusen kayitlar, sonra en yeni kayit.
 *
 * DIKKAT: Komisyon Tarifesi sayfasinda o urunun SECILI olup olmamasina
 * BAKILMAZ. Tarifenin aralaklari urunun kendi ozelligi; sayfada 20 urunden
 * 10'unu secip yuklemek, avantajli urun etiketindeki komisyonu degistirmez.
 *
 * Import icermez — duz node ile test edilebilir.
 */

const gun = (d) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
};

/** Iki tarih araligi ortusuyor mu? Sinirlar bilinmiyorsa ortusur sayilir. */
export function tarihlerOrtusuyorMu(aBas, aBit, bBas, bBit) {
  const a1 = gun(aBas), a2 = gun(aBit), b1 = gun(bBas), b2 = gun(bBit);
  if (a1 === null || a2 === null || b1 === null || b2 === null) return true;
  return a1 <= b2 && b1 <= a2;
}

/**
 * @param kayitlar trendyol_price_ranges kayitlari
 * @param olcut { barkod, platform, baslangic, bitis }
 * @returns en uygun kayit, yoksa null
 */
export function tarifeKaydiSec(kayitlar, olcut) {
  if (!Array.isArray(kayitlar) || !olcut) return null;
  const { barkod, platform, baslangic, bitis } = olcut;
  if (!barkod) return null;

  const adaylar = kayitlar.filter((k) =>
    String(k?.barcode ?? '') === String(barkod) &&
    (!platform || k?.platform_account === platform)
  );
  if (adaylar.length === 0) return null;

  const puan = (k) => (tarihlerOrtusuyorMu(baslangic, bitis, k.start_date, k.end_date) ? 1 : 0);
  const zaman = (k) => gun(k?.updated_date || k?.created_at) ?? 0;

  return [...adaylar].sort((a, b) => (puan(b) - puan(a)) || (zaman(b) - zaman(a)))[0] || null;
}

/**
 * Kaydin 7 GUNLUK kademe komisyonlari [k1..k4].
 *
 * Kullanici karari (3 Eylul 2026): "7 gunluk (3/4 gun en yuksegi) diye bir
 * sey yok; 7 gunluk olarak tut sadece." Bu yuzden burada hesap YAPILMAZ:
 * kaydin pencere haritasinda "7 Gün" anahtari varsa o okunur; yoksa
 * commission_1..4 sutunlari (eski kayitlar) kullanilir.
 */
export function yediGunKademeKomisyonlari(kayit) {
  const s = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const sutun = [s(kayit?.commission_1), s(kayit?.commission_2), s(kayit?.commission_3), s(kayit?.commission_4)];
  const harita = kayit?.pencere_komisyonlari;
  if (!harita || typeof harita !== 'object') return sutun;
  const anahtar = Object.keys(harita).find((ad) => /^\s*7\s*g/i.test(String(ad)));
  const k = anahtar ? harita[anahtar] : null;
  if (!Array.isArray(k) || k.length !== 4 || !k.some((x) => s(x) > 0)) return sutun;
  return k.map(s);
}

/**
 * Fiyatin tarife kademelerinden hangisine girdigini bulup komisyonunu verir.
 * Komisyon kaydin 7 GUNLUK degeridir (yediGunKademeKomisyonlari).
 * @returns komisyon orani, veya bulunamazsa null
 */
export function kademeKomisyonu(kayit, fiyat) {
  const f = Number(fiyat);
  if (!kayit || !Number.isFinite(f) || f <= 0) return null;
  const s = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  const [c1, c2, c3, c4] = yediGunKademeKomisyonlari(kayit);

  const k1min = s(kayit.price_range_1_min);
  const k2min = s(kayit.price_range_2_min), k2max = s(kayit.price_range_2_max);
  const k3min = s(kayit.price_range_3_min), k3max = s(kayit.price_range_3_max);
  const k4max = s(kayit.price_range_4_max);

  let komisyon = null;
  if (k1min !== null && f >= k1min) komisyon = c1;
  else if (k2min !== null && k2max !== null && f >= k2min && f <= k2max) komisyon = c2;
  else if (k3min !== null && k3max !== null && f >= k3min && f <= k3max) komisyon = c3;
  else if (k4max !== null && f <= k4max) komisyon = c4;

  return komisyon !== null && komisyon > 0 ? komisyon : null;
}

/**
 * Urun icin gecerli 7 GUNLUK tarife komisyonu.
 *
 * Kampanya / etiket donemiyle ORTUSEN en guncel tarife kaydi secilir
 * (tarifeKaydiSec) ve fiyatin girdigi kademenin 7 gunluk orani dondurulur.
 * Kayitlar arasinda "en yuksek" ARANMAZ (kullanici karari).
 *
 * @returns komisyon orani, veya uygun kayit yoksa null
 */
export function yediGunTarifeKomisyonu(kayitlar, olcut, fiyat) {
  if (!Array.isArray(kayitlar) || !olcut?.barkod) return null;
  const { barkod, platform, baslangic, bitis } = olcut;
  const ortusenler = kayitlar.filter((k) =>
    String(k?.barcode ?? '') === String(barkod) &&
    (!platform || k?.platform_account === platform) &&
    tarihlerOrtusuyorMu(baslangic, bitis, k?.start_date, k?.end_date)
  );
  const zaman = (k) => gun(k?.updated_date || k?.created_at) ?? 0;
  const sirali = [...ortusenler].sort((a, b) => zaman(b) - zaman(a));
  for (const k of sirali) {
    const oran = kademeKomisyonu(k, fiyat);
    if (oran !== null) return oran;
  }
  return null;
}
