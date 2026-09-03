/**
 * Ayni fiyati Trendyol'a IKINCI KEZ gondermeyi engeller.
 *
 * Trendyol bir urune uyguladigi tarifeyi tekrar kabul etmiyor: ayni fiyat
 * yeniden gonderilince satir "Hatalı Fiyat Güncellemesi" olarak sayiliyor.
 * 3 Eylul 2026'da ikinci yuklemede 4 gunluk dosyanin 13 satirindan 12'si tam
 * bu yuzden hata verdi — oysa hepsi bir onceki yuklemede BASARIYLA
 * uygulanmisti. Gercekten degisen tek satir (KB.1) kabul edildi.
 *
 * Iki durumda satir yazilmaz:
 *   1. Fiyat, dosyadaki GUNCEL TSF ile ayni — yazmanin bir etkisi yok
 *   2. Ayni fiyat bu tarifede zaten gonderilmis
 *
 * Import icermez — duz node ile test edilebilir.
 */

/** Kurus farklarini yok sayarak karsilastirir. */
const ayniMi = (a, b) => {
  const x = Number(a), y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.abs(x - y) < 0.005;
};

/** Gonderim defterinde kullanilan anahtar. */
export function gonderimAnahtari(pencereAdi, barkod) {
  return `${pencereAdi ?? ''}|${barkod ?? ''}`;
}

/**
 * Bu satir dosyaya yazilmali mi?
 *
 * @param fiyat      yazilacak fiyat
 * @param guncelTsf  dosyadaki GUNCEL TSF
 * @param gonderilen bu tarifede daha once gonderilen fiyat (yoksa undefined)
 * @returns { yazilir, sebep }  sebep: 'yeni' | 'guncel-fiyatla-ayni' | 'zaten-gonderildi' | 'fiyat-yok'
 */
export function yazilmaliMi(fiyat, guncelTsf, gonderilen) {
  const f = Number(fiyat);
  if (!Number.isFinite(f) || f <= 0) return { yazilir: false, sebep: 'fiyat-yok' };
  if (ayniMi(f, guncelTsf)) return { yazilir: false, sebep: 'guncel-fiyatla-ayni' };
  if (gonderilen !== undefined && ayniMi(f, gonderilen)) {
    return { yazilir: false, sebep: 'zaten-gonderildi' };
  }
  return { yazilir: true, sebep: 'yeni' };
}

/** Yazilan satirlari deftere isler; yeni defteri dondurur (mevcut degismez). */
export function gonderimleriIsle(defter, pencereAdi, satirlar) {
  const yeni = { ...(defter || {}) };
  for (const s of satirlar || []) {
    if (!s || !s.barkod) continue;
    yeni[gonderimAnahtari(pencereAdi, s.barkod)] = Number(s.fiyat);
  }
  return yeni;
}

/** Deftere bakarak bu tarifede daha once gonderilen fiyati verir. */
export function gonderilenFiyat(defter, pencereAdi, barkod) {
  return defter?.[gonderimAnahtari(pencereAdi, barkod)];
}
