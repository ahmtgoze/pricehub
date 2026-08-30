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

/**
 * Iki asamali islemde tek parca yuzde.
 *
 * Fiyat hesaplama once tarayicida hesaplar (hizli), sonra veritabanina
 * yazar (yavas, her kayit bir ag istegi). Ikisi ayri gorev olarak
 * gosterilince cubuk %100'e gelip 0'a dusuyor ve BOZUK gorunuyordu.
 * Burasi ikisini tek bir 0-100 araligina oturtur; deger asla geri gitmez.
 *
 * pay — hesaplama asamasinin kapladigi yuzde (kalani yazma asamasidir)
 */
export function hesaplamaYuzdesi(islenen, toplam, pay = 30) {
  if (!Number.isFinite(toplam) || toplam <= 0) return 0;
  const oran = Math.min(1, Math.max(0, islenen / toplam));
  return Math.round(oran * pay);
}

export function yazmaYuzdesi(yazilan, toplam, pay = 30) {
  if (!Number.isFinite(toplam) || toplam <= 0) return 100;
  const oran = Math.min(1, Math.max(0, yazilan / toplam));
  return pay + Math.round(oran * (100 - pay));
}
