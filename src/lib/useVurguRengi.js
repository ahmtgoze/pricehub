import { useCallback, useEffect, useState } from 'react';
import {
  VURGU_RENKLERI, VARSAYILAN_VURGU, renkBul,
  hexToHslDegiskeni, okunakliYaziRengi,
} from '@/lib/vurguRengi';

export { VURGU_RENKLERI, VARSAYILAN_VURGU };

/**
 * Vurgu rengi secimi.
 *
 * Tema anahtari gibi tarayicida (localStorage) saklanir — veritabanina
 * dokunmaz, hicbir kullanici verisini etkilemez.
 *
 * Varsayilan ("pricehub") secildiginde degisken HIC yazilmaz; boylece
 * index.css'in acik/koyu tema icin tanimladigi kendi --primary degeri
 * gecerli kalir (koyu temada beyaz, acik temada siyah).
 */
const ANAHTAR = 'pricehub-vurgu';

function oku() {
  try {
    const t = localStorage.getItem(ANAHTAR);
    return VURGU_RENKLERI.some(r => r.id === t) ? t : VARSAYILAN_VURGU;
  } catch {
    return VARSAYILAN_VURGU;
  }
}

function uygula(id) {
  const kok = document.documentElement;
  if (id === VARSAYILAN_VURGU) {
    kok.style.removeProperty('--primary');
    kok.style.removeProperty('--primary-foreground');
    kok.style.removeProperty('--ring');
    return;
  }
  const renk = renkBul(id);
  const hsl = hexToHslDegiskeni(renk.hex);
  if (!hsl) return;
  kok.style.setProperty('--primary', hsl);
  kok.style.setProperty('--primary-foreground', okunakliYaziRengi(renk.hex));
  kok.style.setProperty('--ring', hsl);
}

export function useVurguRengi() {
  const [vurgu, setVurguState] = useState(oku);

  useEffect(() => { uygula(vurgu); }, [vurgu]);

  const setVurgu = useCallback((yeni) => {
    if (!VURGU_RENKLERI.some(r => r.id === yeni)) return;
    try { localStorage.setItem(ANAHTAR, yeni); } catch { /* yoksay */ }
    setVurguState(yeni);
  }, []);

  return { vurgu, setVurgu };
}

/** Uygulama acilirken kayitli rengi hemen uygular (sekme atlamasi olmasin). */
export function vurguRenginiBaslat() {
  uygula(oku());
}
