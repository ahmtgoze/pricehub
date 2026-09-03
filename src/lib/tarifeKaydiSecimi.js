/**
 * Bir urunun HANGI komisyon tarifesi kaydinin ve HANGI PENCERESININ
 * kullanilacagini secer.
 *
 * Trendyol'un tarife dosyasi bir satirda iki zaman penceresi tasir:
 *   Tarih aralığı (3 Gün) "1 Eylül 08.00-4 Eylül 07.59" | 1-4.KOMİSYON
 *   Tarih aralığı (4 Gün) "4 Eylül 08.00-8 Eylül 07.59" | 1-4.KOMİSYON
 * Fiyat kademeleri (mavi kutu) ortak; komisyonlar pencereye gore farkli.
 *
 * KULLANICI KARARI (4 Eylul 2026): Avantajli Urun Etiketi, Flas Urunler ve
 * Kampanyalar'da komisyon, O GUN GECERLI OLAN pencerenin oranidir: ilk 3
 * gun 3 gunluk, sonraki 4 gun 4 gunluk. Ortalama ya da "en yuksek" YOK.
 * Kullanici her pencere degisiminde ciktiyi yeniden indirir; "sonuc %100
 * dogru olur". Aylik kampanyada bu her hafta yeni tarife dosyasiyla surer.
 *
 * Pencere tarihleri kayitta `pencere_tarihleri` olarak saklanir:
 *   { "3 Gün": { baslangic: ISO, bitis: ISO }, "4 Gün": {...} }
 * Eski kayitlarda bu alan yok; o zaman commission_1..4 sutunlari
 * (kaydederken ekranda acik olan pencere) kullanilir.
 *
 * Import icermez — duz node ile test edilebilir.
 */

const gun = (d) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
};

const sayi = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/** Iki tarih araligi ortusuyor mu? Sinirlar bilinmiyorsa ortusur sayilir. */
export function tarihlerOrtusuyorMu(aBas, aBit, bBas, bBit) {
  const a1 = gun(aBas), a2 = gun(aBit), b1 = gun(bBas), b2 = gun(bBit);
  if (a1 === null || a2 === null || b1 === null || b2 === null) return true;
  return a1 <= b2 && b1 <= a2;
}

/* ------------------------------------------------------------------ *
 * PENCERE TARIHLERI
 * ------------------------------------------------------------------ */

const AYLAR = {
  ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5, haziran: 6,
  temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9, ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12,
};

const iki = (n) => String(n).padStart(2, '0');

/** "4 Eylül 07.59" -> { gun: 4, ay: 9, saat: 7, dakika: 59} veya null */
function parcaCoz(metin) {
  const m = String(metin ?? '').trim().toLocaleLowerCase('tr')
    .match(/^(\d{1,2})\s+([a-zçğıöşü]+)(?:\s+(\d{1,2})[.:](\d{2}))?$/i);
  if (!m) return null;
  const ay = AYLAR[m[2]];
  if (!ay) return null;
  return { gun: Number(m[1]), ay, saat: m[3] != null ? Number(m[3]) : 0, dakika: m[4] != null ? Number(m[4]) : 0 };
}

/**
 * "1 Eylül 08.00-4 Eylül 07.59" metnini ISO tarihlere cevirir.
 * Yil metinde yok; kaydin baslangic yilindan alinir. Aralik->Ocak gecisinde
 * bitis bir sonraki yila kayar. Saat dilimi Turkiye (+03:00).
 *
 * @returns { baslangic, bitis } (ISO) veya null
 */
export function pencereTarihiCoz(metin, yil) {
  if (yil === null || yil === undefined || yil === '' || !metin) return null;
  const y = Number(yil);
  if (!Number.isFinite(y)) return null;
  const parcalar = String(metin).split('-').map((p) => p.trim());
  if (parcalar.length !== 2) return null;
  const a = parcaCoz(parcalar[0]);
  const b = parcaCoz(parcalar[1]);
  if (!a || !b) return null;
  const yilB = b.ay < a.ay ? y + 1 : y;
  const iso = (p, yy) => `${yy}-${iki(p.ay)}-${iki(p.gun)}T${iki(p.saat)}:${iki(p.dakika)}:00+03:00`;
  return { baslangic: iso(a, y), bitis: iso(b, yilB) };
}

/**
 * Dosyadan okunan pencereleri kayda yazilacak tarih haritasina cevirir.
 * @param pencereler pencereleriBul ciktisi [{ ad, tarihAraligi }]
 * @param kayitBaslangici kaydin start_date'i (yil buradan)
 */
export function pencereTarihleri(pencereler, kayitBaslangici) {
  const t = gun(kayitBaslangici);
  const yil = t === null ? new Date().getFullYear() : new Date(t).getFullYear();
  const harita = {};
  for (const p of pencereler || []) {
    if (!p?.ad) continue;
    const c = pencereTarihiCoz(p.tarihAraligi, yil);
    if (c) harita[p.ad] = c;
  }
  return harita;
}

/**
 * Verilen anda hangi pencere gecerli?
 * Hicbiri kapsamiyorsa: an tum pencerelerden onceyse ILK, sonraysa SON
 * pencere (kullanici pencere degisiminden az once/sonra da calisabilir).
 * Kayitta pencere tarihi yoksa null.
 *
 * @returns pencere adi veya null
 */
export function aktifPencere(kayit, an = new Date()) {
  const h = kayit?.pencere_tarihleri;
  if (!h || typeof h !== 'object') return null;
  const t = gun(an);
  if (t === null) return null;
  const liste = Object.entries(h)
    .map(([ad, p]) => ({ ad, bas: gun(p?.baslangic), bit: gun(p?.bitis) }))
    .filter((p) => p.bas !== null && p.bit !== null)
    .sort((a, b) => a.bas - b.bas);
  if (liste.length === 0) return null;
  const icinde = liste.find((p) => t >= p.bas && t <= p.bit);
  if (icinde) return icinde.ad;
  if (t < liste[0].bas) return liste[0].ad;
  return liste[liste.length - 1].ad;
}

/* ------------------------------------------------------------------ *
 * KOMISYON
 * ------------------------------------------------------------------ */

/**
 * Kaydin verilen penceredeki kademe komisyonlari [k1..k4].
 * Pencere verilmemis ya da haritada yoksa commission_1..4 sutunlari.
 */
export function kademeKomisyonlari(kayit, pencereAdi = null) {
  const s = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const sutun = [s(kayit?.commission_1), s(kayit?.commission_2), s(kayit?.commission_3), s(kayit?.commission_4)];
  const k = pencereAdi ? kayit?.pencere_komisyonlari?.[pencereAdi] : null;
  if (!Array.isArray(k) || k.length !== 4 || !k.some((x) => s(x) > 0)) return sutun;
  return k.map(s);
}

/**
 * Fiyatin tarife kademelerinden hangisine girdigini bulup komisyonunu verir.
 * @param pencereAdi hangi pencerenin oranlari (null -> sutunlar)
 * @returns komisyon orani, veya bulunamazsa null
 */
export function kademeKomisyonu(kayit, fiyat, pencereAdi = null) {
  const f = Number(fiyat);
  if (!kayit || !Number.isFinite(f) || f <= 0) return null;
  const [c1, c2, c3, c4] = kademeKomisyonlari(kayit, pencereAdi);

  const k1min = sayi(kayit.price_range_1_min);
  const k2min = sayi(kayit.price_range_2_min), k2max = sayi(kayit.price_range_2_max);
  const k3min = sayi(kayit.price_range_3_min), k3max = sayi(kayit.price_range_3_max);
  const k4max = sayi(kayit.price_range_4_max);

  let komisyon = null;
  if (k1min !== null && f >= k1min) komisyon = c1;
  else if (k2min !== null && k2max !== null && f >= k2min && f <= k2max) komisyon = c2;
  else if (k3min !== null && k3max !== null && f >= k3min && f <= k3max) komisyon = c3;
  else if (k4max !== null && f <= k4max) komisyon = c4;

  return komisyon !== null && komisyon > 0 ? komisyon : null;
}

/**
 * @param kayitlar trendyol_price_ranges kayitlari
 * @param olcut { barkod, platform, baslangic, bitis }
 * @returns donemle ortusen en guncel kayit, yoksa null
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
 * Urun icin O AN gecerli tarife komisyonu.
 *
 * Donemle ortusen en guncel kayitlar sirayla denenir; kaydin `an`daki
 * penceresi bulunur (aktifPencere) ve fiyatin girdigi kademenin o
 * penceredeki orani dondurulur.
 *
 * @param olcut { barkod, platform, baslangic, bitis, an }  an: varsayilan simdi
 * @returns { oran, pencere, kayit } — uygun kayit yoksa { oran: null, pencere: null, kayit: null }
 */
export function tarifeKomisyonu(kayitlar, olcut, fiyat) {
  const bos = { oran: null, pencere: null, kayit: null };
  if (!Array.isArray(kayitlar) || !olcut?.barkod) return bos;
  const { barkod, platform, baslangic, bitis } = olcut;
  const an = olcut.an ?? new Date();
  const ortusenler = kayitlar.filter((k) =>
    String(k?.barcode ?? '') === String(barkod) &&
    (!platform || k?.platform_account === platform) &&
    tarihlerOrtusuyorMu(baslangic, bitis, k?.start_date, k?.end_date)
  );
  const zaman = (k) => gun(k?.updated_date || k?.created_at) ?? 0;
  const sirali = [...ortusenler].sort((a, b) => zaman(b) - zaman(a));
  for (const k of sirali) {
    const pencere = aktifPencere(k, an);
    const oran = kademeKomisyonu(k, fiyat, pencere);
    if (oran !== null) return { oran, pencere, kayit: k };
  }
  return bos;
}

/**
 * Ekranda gostermek icin: platformdaki en guncel tarife kaydina gore su an
 * hangi pencere gecerli ve tarihleri ne?
 * @returns { pencere, baslangic, bitis } veya null
 */
export function aktifPencereOzeti(kayitlar, platform, an = new Date()) {
  if (!Array.isArray(kayitlar)) return null;
  const zaman = (k) => gun(k?.updated_date || k?.created_at) ?? 0;
  const adaylar = kayitlar
    .filter((k) => (!platform || k?.platform_account === platform) && k?.pencere_tarihleri && typeof k.pencere_tarihleri === 'object')
    .sort((a, b) => zaman(b) - zaman(a));
  for (const k of adaylar) {
    const ad = aktifPencere(k, an);
    if (!ad) continue;
    const p = k.pencere_tarihleri[ad] || {};
    return { pencere: ad, baslangic: p.baslangic || null, bitis: p.bitis || null };
  }
  return null;
}
