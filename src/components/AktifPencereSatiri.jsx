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
 *
 * Avantajli / Flas / Kampanya sayfalarinda komisyon o gun gecerli pencerenin
 * oranidir; kullanici pencere degisince ciktiyi yeniden indirir. Hangi
 * pencerede oldugunu gormesi icin. Tarife kaydi yoksa hicbir sey cizmez.
 */
export default function AktifPencereSatiri({ ozet }) {
  if (!ozet?.pencere) return null;
  const aralik = [tarih(ozet.baslangic), tarih(ozet.bitis)].filter(Boolean).join(' – ');
  return (
    <p className="text-xs text-muted-foreground mt-1">
      Bugün geçerli tarife penceresi: <span className="font-semibold text-foreground">{ozet.pencere}</span>
      {aralik ? ` (${aralik})` : ''} — komisyon bu pencerenin oranıyla hesaplanır; pencere değişince Excel'i yeniden indir.
    </p>
  );
}
