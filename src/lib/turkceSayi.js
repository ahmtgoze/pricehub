/**
 * Turkce bicimli sayilari cozer.
 *
 * Trendyol'un "Yıldızlı Ürün Etiketleri" dosyasinda fiyatlar METIN olarak ve
 * VIRGULLU geliyor: "480,17". parseFloat bunu 480 yapiyor — kurus kayboluyor.
 * Daha kotusu ALT sinirlarda: "428,96" -> 428 ve 428, bir ALT kademenin
 * bandina dusuyor ("2 YILDIZ ÜST FİYAT" 428,95). Yani ekranda gosterilen
 * komisyonla gercekte alinacak komisyon farkli oluyordu.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/**
 * @returns sayi, veya cozulemezse null
 *
 * Kurallar:
 *   "480,17"      -> 480.17     virgul ondalik
 *   "1.234,56"    -> 1234.56    nokta binlik, virgul ondalik
 *   "480.17"      -> 480.17     yalniz nokta varsa ondalik sayilir
 *   "₺1.234,56"   -> 1234.56    para birimi ve bosluk atilir
 *   "%17,5"       -> 17.5
 *   480.17        -> 480.17     zaten sayiysa oldugu gibi
 */
export function sayiyaCevir(deger) {
  if (typeof deger === 'number') return Number.isFinite(deger) ? deger : null;
  if (deger === null || deger === undefined) return null;

  let m = String(deger).trim();
  if (!m) return null;

  // Para birimi, yuzde, bosluk ve binlik ayiraci olarak kullanilan bosluklar
  m = m.replace(/[₺$€£%\s ]/g, '');
  if (!m) return null;

  const noktaVar = m.includes('.');
  const virgulVar = m.includes(',');

  if (noktaVar && virgulVar) {
    // "1.234,56" — nokta binlik, virgul ondalik
    m = m.replace(/\./g, '').replace(',', '.');
  } else if (virgulVar) {
    // "480,17" — tek ondalik ayirac
    m = m.replace(',', '.');
  }
  // Yalniz nokta varsa dokunulmaz: "480.17" zaten dogru

  const n = Number(m);
  return Number.isFinite(n) ? n : null;
}

/** Cozulemeyen deger icin varsayilan dondurur (genelde 0). */
export function sayiyaCevirVeya(deger, varsayilan = 0) {
  const n = sayiyaCevir(deger);
  return n === null ? varsayilan : n;
}
