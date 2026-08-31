/**
 * Hedef kara gore urun secimi.
 *
 * Komisyonlar sayfasindaki INDIRIMLI hedefler esas alinir (normal hedefler
 * degil): indirimli hedef kar ORANI, indirimli hedef kar TUTARI ve indirimli
 * MINIMUM kar tutari. Kurallar is-kurallari.md "Akilli Otomatik Sec"
 * bolumunden birebir alinmistir.
 *
 * NICIN AYRI DOSYA: ayni mantik Plus Tarifesi ve Avantajli Urun Etiketi
 * sayfalarinda kopyalanmis durumda. Sepet Kampanyalari'na da eklerken ucuncu
 * kopyayi cikarmak yerine test edilebilir tek yere yaziyoruz.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/** Bos, null veya 0 => hedef TANIMSIZ. Yoksa 0 hedefi her kosulu saglardi. */
const tanimli = (deger) => {
  if (deger === null || deger === undefined || deger === '') return null;
  const n = Number(deger);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Komisyon kaydindan indirimli hedefleri cozer.
 * @returns { oran, tutar, minimum } — tanimsizlar null
 */
export function hedefleriCoz(komisyon) {
  return {
    oran: tanimli(komisyon?.discounted_target_profit_rate),
    tutar: tanimli(komisyon?.discounted_target_profit_amount),
    minimum: tanimli(komisyon?.discounted_minimum_profit_amount),
  };
}

/** Hic hedef tanimli mi? Oran ve tutarin ikisi de yoksa urun ATLANIR. */
export function hedefVarMi(hedefler) {
  return !!(hedefler && (hedefler.oran !== null || hedefler.tutar !== null));
}

/**
 * Urunun kategori + platform komisyon kaydini bulur.
 *
 * Eslestirme once kategori KIMLIGI, olmazsa kategori ADI uzerinden yapilir;
 * platform tarafinda da kimlik veya ad kabul edilir (sayfalarda ikisi de
 * kullaniliyor).
 */
export function komisyonBul(komisyonlar, platformlar, urun) {
  if (!urun) return null;
  const kimlikler = (platformlar || []).map((p) => String(p.id));
  const adlar = (platformlar || []).map((p) => (p.name || '').toLocaleLowerCase('tr').trim());

  return (komisyonlar || []).find((c) =>
    c.is_active !== false &&
    (kimlikler.includes(String(c.platform_id)) ||
     adlar.includes((c.platform_name || '').toLocaleLowerCase('tr').trim())) &&
    ((urun.category_id && String(c.category_id) === String(urun.category_id)) ||
     (urun.category_name &&
      (c.category_name || '').toLocaleLowerCase('tr').trim() ===
      (urun.category_name || '').toLocaleLowerCase('tr').trim()))
  ) || null;
}

/**
 * Kar hedefleri saglIyor mu?
 *
 * SIKI KONTROL: tanimli olan TUM hedefler birden saglanmalidir. Biri tutup
 * digeri tutmuyorsa urun secilmez.
 *
 * @returns { uygun, sebep } — sebep: 'minimum' | 'oran' | 'tutar' | null
 */
export function hedefTutuyorMu(kar, karOrani, hedefler) {
  const h = hedefler || {};
  const k = Number(kar);
  const ko = Number(karOrani);
  if (!Number.isFinite(k) || !Number.isFinite(ko)) return { uygun: false, sebep: 'minimum' };

  if (h.minimum !== null && h.minimum !== undefined && k < h.minimum) {
    return { uygun: false, sebep: 'minimum' };
  }
  if (h.oran !== null && h.oran !== undefined && ko < h.oran) {
    return { uygun: false, sebep: 'oran' };
  }
  if (h.tutar !== null && h.tutar !== undefined && k < h.tutar) {
    return { uygun: false, sebep: 'tutar' };
  }
  return { uygun: true, sebep: null };
}
