/**
 * HepsiBurada "Kendi kampanyanı oluştur" ekraninin KABUL KURALLARI.
 *
 * Bu alanlar kari etkilemez; kampanyanin panelde kabul edilip edilmeyecegini
 * belirler. Burada dogrulanmalari, HB'de formu doldurup en sonda reddedilmek
 * yerine daha planlarken uyarilmayi saglar.
 *
 * Kurallar HB'nin kendi "Kullanim Kosullari" kutusundan alindi:
 *   - Kampanya suresi en fazla 92 gun
 *   - Baslangic en erken 30 dakika sonrasi, en gec 92 gun sonrasi
 *   - Butce en az 1.000 TL, en fazla 10.000.000 TL
 *   - Indirim yuzdesi en az %2, en fazla %99
 *   - Maksimum siparis adedi en az 20, en fazla 100.000
 *   - Indirim kodu YALNIZCA sepet tutarina ozel turlerde sorulur
 *
 * Import icermez — duz node ile test edilebilir.
 */

export const EN_FAZLA_GUN = 92;
export const BASLANGIC_EN_ERKEN_DAKIKA = 30;
export const BUTCE_EN_AZ = 1000;
export const BUTCE_EN_COK = 10000000;
export const ORAN_EN_AZ = 2;
export const ORAN_EN_COK = 99;
export const SIPARIS_EN_AZ = 20;
export const SIPARIS_EN_COK = 100000;

/** Sepet tutarina ozel turler — indirim kodu yalnizca bunlarda cikar. */
export const SEPET_TURLERI = ['cart_percent', 'cart_tl'];

/** Indirim kodu alani bu tur icin gosterilir mi? */
export function indirimKoduSorulurMu(tur) {
  return SEPET_TURLERI.includes(tur);
}

const sayi = (d) => {
  if (d === null || d === undefined || d === '') return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
};

/** Iki tarih arasindaki GUN farki (ayni gun = 1 gun). */
export function gunFarki(baslangic, bitis) {
  if (!baslangic || !bitis) return null;
  const b = new Date(baslangic), s = new Date(bitis);
  if (Number.isNaN(b.getTime()) || Number.isNaN(s.getTime())) return null;
  const gun = 24 * 60 * 60 * 1000;
  // Gun basina yuvarlanir; saat farki gun sayisini kaydirmasin
  const bg = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  const sg = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
  return Math.round((sg - bg) / gun) + 1;
}

/**
 * Kampanyayi HB kurallarina gore denetler.
 *
 * @param kampanya { tur, oran, butce, maksSiparis, baslangic, bitis, indirimKodu, indirimKoduIstiyor }
 * @param simdi    testlerde sabitlenebilsin diye disaridan verilir
 * @returns [{ alan, mesaj }] — bos dizi: kural ihlali yok
 */
export function kampanyayiDenetle(kampanya, simdi = new Date()) {
  const uyarilar = [];
  const k = kampanya || {};

  // Sure
  const gun = gunFarki(k.baslangic, k.bitis);
  if (gun !== null) {
    if (gun < 1) {
      uyarilar.push({ alan: 'tarih', mesaj: 'Bitiş tarihi başlangıçtan önce olamaz.' });
    } else if (gun > EN_FAZLA_GUN) {
      uyarilar.push({ alan: 'tarih', mesaj: `Kampanya en fazla ${EN_FAZLA_GUN} gün sürebilir (şu an ${gun} gün).` });
    }
  }

  if (k.baslangic) {
    const bas = new Date(k.baslangic);
    if (!Number.isNaN(bas.getTime())) {
      const enErken = new Date(simdi.getTime() + BASLANGIC_EN_ERKEN_DAKIKA * 60 * 1000);
      // Gun bazinda kiyas: bugunden onceki bir gun secilemez
      const basGun = new Date(bas.getFullYear(), bas.getMonth(), bas.getDate());
      const bugun = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
      if (basGun < bugun) {
        uyarilar.push({ alan: 'tarih', mesaj: 'Başlangıç tarihi geçmişte olamaz.' });
      }
      const enGec = new Date(simdi.getTime() + EN_FAZLA_GUN * 24 * 60 * 60 * 1000);
      if (bas > enGec) {
        uyarilar.push({ alan: 'tarih', mesaj: `Başlangıç en geç ${EN_FAZLA_GUN} gün sonrası olabilir.` });
      }
      void enErken;   // dakika hassasiyeti UI'da yok; gun bazinda denetleniyor
    }
  }

  // Butce
  const butce = sayi(k.butce);
  if (butce !== null) {
    if (butce < BUTCE_EN_AZ) {
      uyarilar.push({ alan: 'butce', mesaj: `Kampanya bütçesi en az ${BUTCE_EN_AZ.toLocaleString('tr-TR')} ₺ olmalı.` });
    } else if (butce > BUTCE_EN_COK) {
      uyarilar.push({ alan: 'butce', mesaj: `Kampanya bütçesi en fazla ${BUTCE_EN_COK.toLocaleString('tr-TR')} ₺ olabilir.` });
    }
  }

  // Indirim orani — yalnizca yuzde turlerinde
  const oran = sayi(k.oran);
  if (oran !== null && (k.tur === 'cart_percent' || k.tur === 'nth_percent')) {
    if (oran < ORAN_EN_AZ || oran > ORAN_EN_COK) {
      uyarilar.push({ alan: 'oran', mesaj: `İndirim oranı %${ORAN_EN_AZ} ile %${ORAN_EN_COK} arasında olmalı.` });
    }
  }

  // Maksimum siparis adedi
  const siparis = sayi(k.maksSiparis);
  if (siparis !== null) {
    if (siparis < SIPARIS_EN_AZ || siparis > SIPARIS_EN_COK) {
      uyarilar.push({ alan: 'siparis', mesaj: `Maksimum sipariş adedi ${SIPARIS_EN_AZ} ile ${SIPARIS_EN_COK.toLocaleString('tr-TR')} arasında olmalı.` });
    }
  }

  // Indirim kodu
  if (k.indirimKoduIstiyor) {
    if (!indirimKoduSorulurMu(k.tur)) {
      uyarilar.push({ alan: 'kod', mesaj: 'İndirim kodu yalnızca sepet tutarına özel kampanyalarda verilebilir.' });
    } else if (!String(k.indirimKodu ?? '').trim()) {
      uyarilar.push({ alan: 'kod', mesaj: 'İndirim kodu boş bırakılamaz.' });
    }
  }

  return uyarilar;
}
