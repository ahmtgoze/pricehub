/**
 * Paketleri desi araligina gore urunlere otomatik atama.
 *
 * Paketin kendi ayarindaki desi_min / desi_max okunur; araliga giren
 * urunlere o paket atanir ve paketleme maliyeti fiyata girer.
 *
 * KURAL: baska bir pakete ELLE atanmis urunun uzerine YAZILMAZ. Otomatik
 * atama, elle verilmis karari sessizce bozmamali; boyle urunler "cakisan"
 * olarak ayrica raporlanir ve kullanici gorup karar verir.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/** Sayiya cevirir; bos/gecersiz ise null. */
const sayi = (d) => {
  if (d === null || d === undefined || d === '') return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
};

/** Paketin desi araligi tanimli mi? */
export function araligiVar(paket) {
  return sayi(paket?.desi_min) !== null && sayi(paket?.desi_max) !== null;
}

/** Urunun desisi paketin araligina giriyor mu? (iki uc de dahil) */
export function araliktaMi(urun, paket) {
  if (!araligiVar(paket)) return false;
  const d = sayi(urun?.desi);
  if (d === null) return false;
  return d >= sayi(paket.desi_min) && d <= sayi(paket.desi_max);
}

/**
 * Otomatik atama plani. Hicbir sey yazmaz, yalnizca ne olacagini soyler.
 *
 * Doner:
 *   atanacak  — paketi olmayan, araliga giren urunler
 *   zatenBu   — bu paket zaten atanmis urunler (islem yok)
 *   cakisan   — araliga giriyor ama BASKA pakete atanmis urunler (dokunulmaz)
 */
export function otomatikAtamaPlani(urunler, paket) {
  const bos = { atanacak: [], zatenBu: [], cakisan: [] };
  if (!araligiVar(paket)) return bos;

  for (const u of urunler || []) {
    if (u?.is_active === false) continue;
    if (!araliktaMi(u, paket)) continue;

    if (!u.package_id) bos.atanacak.push(u);
    else if (u.package_id === paket.id) bos.zatenBu.push(u);
    else bos.cakisan.push(u);
  }
  return bos;
}

/** Bir pakete atanmis urunler (listede gosterilir, buradan cikarilabilir). */
export function paketeAtananlar(urunler, paketId) {
  if (!paketId) return [];
  return (urunler || []).filter((u) => u?.package_id === paketId);
}

/** Paketin kalemlerinden toplam maliyet. */
export function paketMaliyeti(paketKalemleri, paketId) {
  if (!paketId) return 0;
  return (paketKalemleri || [])
    .filter((k) => k?.package_id === paketId && k.is_active !== false)
    .reduce((t, k) => t + (sayi(k.cost) ?? 0), 0);
}
