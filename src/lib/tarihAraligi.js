/**
 * Tarih araligi suzmesi (Dashboard "Tarihe Gore Eklenen Urunler").
 *
 * Tuzak: new Date('2026-08-01') tarihi UTC gece yarisi olarak cozer,
 * ama .setHours(23,59,...) YEREL saate gore calisir. Turkiye UTC+3
 * oldugundan baslangic gercekte 03:00'a kayiyor ve o gun 00:00-03:00
 * arasinda eklenen urunler listeden dusuyordu.
 *
 * Bu yuzden iki ucu da acikca yerel saate gore kuruyoruz.
 * Import icermez — duz node ile test edilebilir.
 */

/** 'YYYY-MM-DD' -> o gunun YEREL 00:00:00.000 tarihi (gecersizse null) */
export function gunBasi(metin) {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(metin || '').trim());
  if (!p) return null;
  const t = new Date(Number(p[1]), Number(p[2]) - 1, Number(p[3]), 0, 0, 0, 0);
  // 2026-02-30 gibi tasan tarihleri ele
  if (t.getMonth() !== Number(p[2]) - 1 || t.getDate() !== Number(p[3])) return null;
  return t;
}

/** 'YYYY-MM-DD' -> o gunun YEREL 23:59:59.999 tarihi (gecersizse null) */
export function gunSonu(metin) {
  const t = gunBasi(metin);
  if (!t) return null;
  t.setHours(23, 59, 59, 999);
  return t;
}

/**
 * urunler: [{ created_date }]
 * Donen: araliga giren urunler, en yeniden eskiye sirali.
 * Tarihlerden biri gecersizse bos liste doner (yanlis liste gostermektense).
 */
export function tariheGoreSuz(urunler, baslangic, bitis) {
  const bas = gunBasi(baslangic);
  const bit = gunSonu(bitis);
  if (!bas || !bit || bas > bit) return [];

  return (urunler || [])
    .filter((u) => {
      if (!u?.created_date) return false;
      const t = new Date(u.created_date);
      if (Number.isNaN(t.getTime())) return false;
      return t >= bas && t <= bit;
    })
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}
