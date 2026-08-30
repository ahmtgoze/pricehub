/**
 * Islem seridinin saf mantigi — React'siz, dogrudan node ile test edilebilir.
 *
 * Serit ile ilerleme penceresi AYNI ANDA gorunmemeli: ikisi de ayni bilgiyi
 * gosterdigi icin tekrar olur. Karar tek yerde tutuluyor ki iki bilesen
 * birbirinden ayrilmasin.
 */

/** Tamamlanma yuzdesi. Toplam bilinmiyorsa null (belirsiz durum). */
export function yuzdeHesapla(current, total) {
  const c = Number(current);
  const t = Number(total);
  if (!Number.isFinite(t) || t <= 0) return null;
  if (!Number.isFinite(c) || c <= 0) return 0;
  return Math.min(100, Math.round((c / t) * 100));
}

/** Ust bardaki serit gorunsun mu? */
export function seritGorunur(task, panelAcik) {
  return !!task && !panelAcik;
}
