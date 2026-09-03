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
 * Siralama: once tarihi ortusen kayitlar, sonra SECIM YAPILMIS olanlar
 * (satici o tarifeyi gercekten uygulamis demektir), sonra en yeni kayit.
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

/** Kayitta secim yapilmis mi? */
function secimVar(kayit) {
  const s = kayit?.selected_range;
  return !!s && s !== 'none';
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

  const puan = (k) => {
    let p = 0;
    if (tarihlerOrtusuyorMu(baslangic, bitis, k.start_date, k.end_date)) p += 4;
    if (secimVar(k)) p += 2;
    return p;
  };
  const zaman = (k) => gun(k?.updated_date || k?.created_at) ?? 0;

  return [...adaylar].sort((a, b) => (puan(b) - puan(a)) || (zaman(b) - zaman(a)))[0] || null;
}

/**
 * Fiyatin tarife kademelerinden hangisine girdigini bulup komisyonunu verir.
 * @returns komisyon orani, veya bulunamazsa null
 */
export function kademeKomisyonu(kayit, fiyat) {
  const f = Number(fiyat);
  if (!kayit || !Number.isFinite(f) || f <= 0) return null;
  const s = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

  const k1min = s(kayit.price_range_1_min);
  const k2min = s(kayit.price_range_2_min), k2max = s(kayit.price_range_2_max);
  const k3min = s(kayit.price_range_3_min), k3max = s(kayit.price_range_3_max);
  const k4max = s(kayit.price_range_4_max);

  let komisyon = null;
  if (k1min !== null && f >= k1min) komisyon = s(kayit.commission_1);
  else if (k2min !== null && k2max !== null && f >= k2min && f <= k2max) komisyon = s(kayit.commission_2);
  else if (k3min !== null && k3max !== null && f >= k3min && f <= k3max) komisyon = s(kayit.commission_3);
  else if (k4max !== null && f <= k4max) komisyon = s(kayit.commission_4);

  return komisyon !== null && komisyon > 0 ? komisyon : null;
}
