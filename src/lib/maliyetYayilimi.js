/**
 * Maliyet degisiminin bagli urunlere yayilmasi.
 *
 * Iki tur bag var:
 *   Eslestirme (match_group_id) — ayni urunun farkli rengi/kodu.
 *                                 Maliyetleri HER ZAMAN esittir.
 *   Adet zinciri (chain_group_id) — ayni urunun farkli adetli paketi.
 *                                   Birim maliyetleri esittir.
 *
 * ONCEKI DAVRANIS TEK ADIMDI: Lila 100 duzenlenince Beyaz 100 (eslestirme)
 * ve Lila 500/1000 (zincir) guncelleniyor, ama Beyaz 500 guncellenmiyordu —
 * iki adim uzakta kaliyordu. Bu, ayni urunun renkleri arasinda kalici
 * maliyet farki birakiyordu.
 *
 * COZUM: tek bir ORAN, baglantilar boyunca GECISLI yayilir.
 *   oran = yeniMaliyet / eskiMaliyet
 *   ulasilan her urun: maliyet x oran
 *
 * Ayni oran her iki bag turu icin de dogru sonucu verir:
 *   - Esit maliyetler esit kalir (eslestirme kurali korunur)
 *   - Birim maliyetler sabit kalir (zincir kurali korunur)
 *
 * Import icermez — duz node ile test edilebilir.
 */

const sayi = (d) => {
  if (d === null || d === undefined || d === '') return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
};

/**
 * Bir urunden baslayarak eslestirme ve zincir baglari uzerinden ulasilan
 * TUM urunleri dondurur (baslangic urunu haric).
 */
export function bagliUrunler(urunler, kokId) {
  const liste = urunler || [];
  const haritaId = new Map(liste.map((u) => [u.id, u]));
  const kok = haritaId.get(kokId);
  if (!kok) return [];

  // Grup -> uyeler dizini (her seferinde tum listeyi taramamak icin)
  const eslestirme = new Map();
  const zincir = new Map();
  for (const u of liste) {
    if (u.match_group_id) {
      if (!eslestirme.has(u.match_group_id)) eslestirme.set(u.match_group_id, []);
      eslestirme.get(u.match_group_id).push(u);
    }
    if (u.chain_group_id) {
      if (!zincir.has(u.chain_group_id)) zincir.set(u.chain_group_id, []);
      zincir.get(u.chain_group_id).push(u);
    }
  }

  const gorulen = new Set([kokId]);
  const sira = [kok];
  const sonuc = [];

  while (sira.length) {
    const su = sira.shift();
    const komsular = [
      ...(su.match_group_id ? eslestirme.get(su.match_group_id) || [] : []),
      ...(su.chain_group_id ? zincir.get(su.chain_group_id) || [] : []),
    ];
    for (const k of komsular) {
      if (gorulen.has(k.id)) continue;     // dongulere karsi
      gorulen.add(k.id);
      sonuc.push(k);
      sira.push(k);
    }
  }
  return sonuc;
}

/**
 * Maliyet degisiminin planini cikarir. Hicbir sey yazmaz.
 *
 * @param urunler      tum urunler
 * @param kokId        duzenlenen urunun id'si
 * @param eskiMaliyet  duzenlemeden ONCEKI maliyet
 * @param yeniMaliyet  yeni maliyet
 * @returns [{ id, sku, eskiMaliyet, yeniMaliyet }]
 */
export function yayilimPlani(urunler, kokId, eskiMaliyet, yeniMaliyet) {
  const eski = sayi(eskiMaliyet);
  const yeni = sayi(yeniMaliyet);

  // Eski maliyet 0/bilinmiyorsa oran hesaplanamaz. Boyle bir durumda
  // yayilim yapmak butun bagli urunleri 0'a cekerdi.
  if (!eski || eski <= 0 || yeni === null || yeni < 0) return [];
  if (eski === yeni) return [];

  const oran = yeni / eski;

  return bagliUrunler(urunler, kokId)
    .map((u) => {
      const mevcut = sayi(u.cost) ?? 0;
      return {
        id: u.id,
        sku: u.sku,
        eskiMaliyet: mevcut,
        yeniMaliyet: Math.round(mevcut * oran * 100) / 100,
      };
    })
    .filter((d) => d.eskiMaliyet !== d.yeniMaliyet);
}
