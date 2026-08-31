/**
 * HepsiBurada "Kendi kampanyanı oluştur" kampanyalarinin fiyat modeli.
 *
 * HB'nin ekraninda bes tur var. Ikisi SEPET tutarina, ucu URUNE ozeldir.
 * Her birinin kar uzerindeki etkisi farkli hesaplanir; onceki surum
 * hepsini "indirimi her urune uygula" diye isliyordu ve urune ozel
 * turlerde kari ciddi sekilde DUSUK gosteriyordu.
 *
 * SEPET TUTARINA OZEL
 *   Indirim, sepet "alisveris alt limiti"ne ULASTIGINDA aktif olur
 *   (HB'nin kendi metni). Alt limitin altindaki fiyatlarda indirim YOK.
 *
 *   cart_percent : indirim = min(fiyat x oran/100, tavan)
 *                  Tavan = "Sepette maksimum indirim tutari"; HB ekraninda
 *                  zorunlu alan. Orn. %15 ama en fazla 100 TL.
 *   cart_tl      : indirim = tutar
 *
 * URUNE OZEL
 *   Indirim sepetteki TEK bir uruне uygulanir, hepsine degil. Etkin birim
 *   fiyat, N urunun ortalamasidir.
 *
 *   nth_percent  : "2. urune %50" -> 1. urun tam, 2. urun yarim
 *                  ortalama = fiyat x (1 - oran/100 / N)
 *   nth_tl       : "3. urunde 20 TL indirim" -> yalnizca 3. urunden 20 TL
 *                  iner (kullanici teyit etti). 200 TL'lik urun icin:
 *                  200 + 200 + 180 = 580 -> birim ortalama 193,33
 *                  ortalama = fiyat - tutar / N
 *   buy_x_pay_y  : X al Y ode -> ortalama = fiyat x Y / X
 *
 * Import icermez — duz node ile test edilebilir.
 */

const sayi = (d) => {
  if (d === null || d === undefined || d === '') return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
};

const kurusa = (n) => Math.round(n * 100) / 100;

/**
 * Kampanya uygulandiginda musterinin urun basina odedigi etkin fiyat.
 *
 * @param fiyat     kampanyasiz satis fiyati
 * @param kampanya  { tur, oran, tutar, altLimit, tavan, kacinci, alX, odeY }
 * @returns etkin fiyat (kampanya uygulanamiyorsa fiyatin kendisi)
 */
export function kampanyaFiyati(fiyat, kampanya) {
  const f = sayi(fiyat);
  if (f === null || f <= 0) return 0;
  if (!kampanya || !kampanya.tur) return f;

  const oran = sayi(kampanya.oran) ?? 0;
  const tutar = sayi(kampanya.tutar) ?? 0;
  const altLimit = sayi(kampanya.altLimit) ?? 0;
  const tavan = sayi(kampanya.tavan) ?? 0;
  const kacinci = sayi(kampanya.kacinci) ?? 0;

  switch (kampanya.tur) {
    case 'cart_percent': {
      if (oran <= 0) return f;
      // Alt limite ULASILMADIYSA indirim yok
      if (f < altLimit) return f;
      let indirim = f * oran / 100;
      // Tavan varsa indirim onu asamaz
      if (tavan > 0) indirim = Math.min(indirim, tavan);
      return kurusa(Math.max(0, f - indirim));
    }

    case 'cart_tl': {
      if (tutar <= 0) return f;
      if (f < altLimit) return f;
      return kurusa(Math.max(0, f - tutar));
    }

    case 'nth_percent': {
      // Indirim yalnizca N. urune uygulanir; N bilinmeden ortalama cikmaz
      if (oran <= 0 || kacinci < 2) return f;
      return kurusa(Math.max(0, f * (1 - (oran / 100) / kacinci)));
    }

    case 'nth_tl': {
      if (tutar <= 0 || kacinci < 2) return f;
      return kurusa(Math.max(0, f - tutar / kacinci));
    }

    case 'buy_x_pay_y': {
      const alX = sayi(kampanya.alX) ?? 0;
      const odeY = sayi(kampanya.odeY) ?? 0;
      if (alX <= 0 || odeY <= 0 || odeY >= alX) return f;
      return kurusa(Math.max(0, f * odeY / alX));
    }

    default:
      return f;
  }
}

/** Kampanyanin bu fiyatta gecerli olup olmadigi (alt limit kontrolu). */
export function altLimitiGeciyorMu(fiyat, kampanya) {
  if (!kampanya || (kampanya.tur !== 'cart_percent' && kampanya.tur !== 'cart_tl')) return true;
  const f = sayi(fiyat) ?? 0;
  const altLimit = sayi(kampanya.altLimit) ?? 0;
  return f >= altLimit;
}

/** HB ekranindaki alisveris alt limiti secenekleri (sabit liste). */
export const ALT_LIMIT_SECENEKLERI = [
  0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800,
  850, 900, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 20000,
];
