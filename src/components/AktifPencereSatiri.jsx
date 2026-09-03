import React from 'react';

const TR = { timeZone: 'Europe/Istanbul' };
const tarih = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.toLocaleDateString('tr-TR', { ...TR, day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('tr-TR', { ...TR, hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * "Bugün geçerli tarife penceresi: 4 Gün (4 Eyl 08:00 – 8 Eyl 07:59)"
 * veya tarife bitmisse "Tarife dönemi bitti (8 Eyl 07:59) — yeni tarife
 * Excel'ini yükleyin; o zamana kadar kategori komisyonu kullanılır."
 *
 * Avantajli / Flas / Kampanya sayfalarinda komisyon o gun gecerli pencerenin
 * oranidir; kullanici pencere degisince ciktiyi yeniden indirir. Tarife
 * kaydi hic yoksa hicbir sey cizmez.
 */
export default function AktifPencereSatiri({ ozet }) {
  if (!ozet) return null;
  if (ozet.bitti) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
        Tarife dönemi bitti{ozet.bitis ? ` (${tarih(ozet.bitis)})` : ''} — Trendyol'dan yeni tarife Excel'ini indirip Komisyon Tarifesi'ne yükleyin; o zamana kadar kategori komisyonu kullanılır.
      </p>
    );
  }
  if (!ozet.pencere) return null;
  const aralik = [tarih(ozet.baslangic), tarih(ozet.bitis)].filter(Boolean).join(' – ');
  return (
    <p className="text-xs text-muted-foreground mt-1">
      Bugün geçerli tarife penceresi: <span className="font-semibold text-foreground">{ozet.pencere}</span>
      {aralik ? ` (${aralik})` : ''} — komisyon bu pencerenin oranıyla hesaplanır; pencere değişince Excel'i yeniden indir.
    </p>
  );
}
