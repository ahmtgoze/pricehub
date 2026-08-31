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

  // Kokun BIRIM maliyeti. Bagli urunler mumkunse bundan hesaplanir.
  //
  // NICIN ORAN DEGIL: oranla carpip her adimda 2 haneye yuvarlamak kayma
  // biriktiriyordu. Ayni zincirde su hale gelmisti:
  //   164,7300 · 164,7350 · 164,7358
  // Birim maliyetten hesaplamak bu kaymayi tamamen ortadan kaldirir ve
  // zincirin birim maliyetlerini birebir esitler.
  const kok = (urunler || []).find((u) => u.id === kokId);
  const kokAdet = sayi(kok?.unit_quantity) ?? 0;
  const kokBirim = kokAdet > 0 ? yeni / kokAdet : null;

  return bagliUrunler(urunler, kokId)
    .map((u) => {
      const mevcut = sayi(u.cost) ?? 0;
      const adet = sayi(u.unit_quantity) ?? 0;

      // Adet bilinmiyorsa oran yedegi kullanilir.
      const hesap = (kokBirim !== null && adet > 0)
        ? kokBirim * adet
        : mevcut * oran;

      return {
        id: u.id,
        sku: u.sku,
        eskiMaliyet: mevcut,
        yeniMaliyet: Math.round(hesap * 100) / 100,
      };
    })
    .filter((d) => d.eskiMaliyet !== d.yeniMaliyet);
}


/**
 * Referans urunlerin baz maliyetini yeniden hesaplar.
 *
 * NICIN VAR: baz maliyet yalnizca urunun KENDISI kaydedilirken
 * hesaplaniyordu. Referans alinan urunun maliyeti degistiginde bagimli
 * urunun baz maliyeti ESKI degerde kaliyordu — ornegin cepsiz poseti
 * referans alan cepli posette. Fiyat, aylar oncesinin maliyetinden
 * uretilmeye devam ederdi.
 *
 * ProductModal'daki hesabin ayni kurallari:
 *   ozellige gore: total_tl → ref + ek
 *                  total_pct → ref x (1 + ek/100)
 *                  unit_tl  → (ref/adet + ek) x adet
 *   olcuye gore:   ref x (1 + yuzde/100)
 *   iki aday varsa YUKSEK olan, sonra urunun kendi maliyetiyle kiyas.
 *
 * @param urunler       guncel maliyetleriyle tum urunler
 * @param degisenIdler  maliyeti degisen urunlerin id'leri
 * @returns [{ id, sku, eskiBaz, yeniBaz }]
 */
export function bazMaliyetPlani(urunler, degisenIdler) {
  const liste = urunler || [];
  const degisen = new Set(degisenIdler || []);
  if (degisen.size === 0) return [];

  const harita = new Map(liste.map((u) => [u.id, u]));

  // Referans alinan urunun maliyeti: o da referansliysa BAZ maliyeti gecerli
  const refMaliyeti = (ref) => {
    if (!ref) return null;
    const baz = sayi(ref.base_cost) ?? 0;
    if (ref.ref_product_id && baz > 0) return baz;
    return sayi(ref.cost) ?? 0;
  };

  const sonuc = [];
  for (const u of liste) {
    const ozellikRef = u.ref_product_id ? harita.get(u.ref_product_id) : null;
    const olcuRef = u.ref_product_id_size ? harita.get(u.ref_product_id_size) : null;
    if (!ozellikRef && !olcuRef) continue;

    // Yalnizca referansi DEGISEN urunler yeniden hesaplanir
    const etkilendi =
      (ozellikRef && degisen.has(ozellikRef.id)) ||
      (olcuRef && degisen.has(olcuRef.id));
    if (!etkilendi) continue;

    const adaylar = [];

    if (ozellikRef) {
      const r = refMaliyeti(ozellikRef);
      const ek = sayi(u.cost_addon) ?? 0;
      if (u.cost_addon_type === 'total_pct') adaylar.push(r * (1 + ek / 100));
      else if (u.cost_addon_type === 'unit_tl') {
        const adet = sayi(u.ref_product_qty) || 1;
        adaylar.push((r / adet + ek) * adet);
      } else adaylar.push(r + ek);
    }

    if (olcuRef) {
      const r = refMaliyeti(olcuRef);
      const yuzde = sayi(u.size_cost_addon) ?? 0;
      if (r) adaylar.push(r * (1 + yuzde / 100));
    }

    if (adaylar.length === 0) continue;

    const secilen = Math.max(...adaylar);
    const yeniBaz = Math.round(Math.max(secilen, sayi(u.cost) ?? 0) * 100) / 100;
    const eskiBaz = sayi(u.base_cost) ?? 0;

    if (Math.abs(yeniBaz - eskiBaz) >= 0.005) {
      sonuc.push({ id: u.id, sku: u.sku, eskiBaz, yeniBaz });
    }
  }
  return sonuc;
}
