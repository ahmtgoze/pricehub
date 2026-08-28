import React from 'react';

/**
 * Barem rozeti — bir fiyatta hangi kargo tarifesinin gecerli oldugunu gosterir.
 * calculateProfit(...) fonksiyonlari zaten baremUsed donduruyor; bu rozet
 * onu satirda gorunur kilar, boylece kaydetmeden once hangi baremle
 * hesaplandigi anlasilir.
 *
 * barem1/barem2 = fiyat baremi tarifesi, desi = desi tarifesi.
 */
const ETIKETLER = { barem1: 'B1', barem2: 'B2', desi: 'Desi' };

export default function BaremBadge({ barem, className = '' }) {
  const etiket = ETIKETLER[barem];
  if (!etiket) return null;
  return (
    <span
      title="Bu fiyatta geçerli kargo baremi"
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground ${className}`}
    >
      {etiket}
    </span>
  );
}
