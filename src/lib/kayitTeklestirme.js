/**
 * Kaydedilmis promosyon kayitlarini urun basina TEKLESTIRIR.
 *
 * SORUN: Sayfalar kayitli listeyi "platform + baslangic + bitis" ile
 * suzuyor. Ayni donem icin BIRDEN FAZLA kayit seti olabiliyor — ornegin
 * Komisyon Tarifesi'nde ayni tarih araligina hem 3 gunluk hem 4 gunluk
 * pencere yuklendiginde:
 *
 *   1-8 Eylul / 3 Gün : 10 kayit, 10'u SECILI
 *   1-8 Eylul / 4 Gün : 12 kayit, secim yok
 *
 * Ikisi birden yukleniyordu: 22 satir, ayni barkodlar iki kez, biri secili
 * biri degil. Kullaniciya secimler SIFIRLANMIS gibi gorunuyordu.
 *
 * Tercih sirasi: SECIMI olan kayit > pencere secimleri (secimler) dolu olan
 * > en son guncellenen.
 *
 * Import icermez — duz node ile test edilebilir.
 */

const zaman = (k) => {
  const t = new Date(k?.updated_date || k?.created_at || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** Kayitta secim yapilmis mi? Sayfalara gore alan adi degisiyor. */
export function secimYapilmis(kayit) {
  const alanlar = [kayit?.selected_range, kayit?.selected_type];
  if (alanlar.some((s) => s && s !== 'none')) return true;
  // Manuel fiyat da bir secimdir
  return Number(kayit?.manual_price) > 0;
}

/** Pencere basina secim kutusu dolu mu? */
function pencereSecimiVar(kayit) {
  const s = kayit?.secimler;
  return !!s && typeof s === 'object' && Object.keys(s).length > 0;
}

/**
 * Ayni urunun birden fazla kaydindan EN IYISINI secer.
 * Puan: secim var (+4), pencere secimleri dolu (+2), sonra guncellik.
 */
export function enIyiKayit(kayitlar) {
  if (!Array.isArray(kayitlar) || kayitlar.length === 0) return null;
  const puan = (k) => (secimYapilmis(k) ? 4 : 0) + (pencereSecimiVar(k) ? 2 : 0);
  return [...kayitlar].sort((a, b) => (puan(b) - puan(a)) || (zaman(b) - zaman(a)))[0];
}

/**
 * Listeyi urun basina teklestirir. Sira KORUNUR: her urun ilk gorundugu
 * yerde kalir, boylece tablo siralamasi degismez.
 *
 * @param kayitlar kayit listesi
 * @param anahtar  urunu belirleyen alan (varsayilan 'barcode')
 */
export function kayitlariTeklestir(kayitlar, anahtar = 'barcode') {
  if (!Array.isArray(kayitlar)) return [];
  const gruplar = new Map();
  const sira = [];
  for (const k of kayitlar) {
    const kimlik = String(k?.[anahtar] ?? '');
    // Kimligi olmayan kayit teklestirilemez; oldugu gibi kalir
    if (!kimlik) { sira.push({ tek: k }); continue; }
    if (!gruplar.has(kimlik)) { gruplar.set(kimlik, []); sira.push({ kimlik }); }
    gruplar.get(kimlik).push(k);
  }
  return sira.map((s) => (s.tek !== undefined ? s.tek : enIyiKayit(gruplar.get(s.kimlik))));
}

/** Kac kayit ayiklandi? Kullaniciya bildirmek icin. */
export function ayiklananSayisi(kayitlar, anahtar = 'barcode') {
  if (!Array.isArray(kayitlar)) return 0;
  return kayitlar.length - kayitlariTeklestir(kayitlar, anahtar).length;
}
