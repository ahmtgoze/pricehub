import { useCallback, useEffect, useState } from 'react';

/**
 * Acik / koyu tema anahtari.
 *
 * Tercih tarayicida (localStorage) saklanir — veritabanina dokunmaz, bu yuzden
 * hicbir kullanici verisini etkilemez. index.css'teki `.dark` token'lari zaten
 * hazir oldugu icin sinifi <html> uzerine koymak yeterli.
 *
 * Degerler: 'acik' | 'koyu' | 'sistem'
 */
const ANAHTAR = 'pricehub-tema';
const GECERLI = ['acik', 'koyu', 'sistem'];

function oku() {
  try {
    const t = localStorage.getItem(ANAHTAR);
    return GECERLI.includes(t) ? t : 'acik';
  } catch {
    return 'acik';
  }
}

function sistemKoyuMu() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function uygula(tema) {
  const koyu = tema === 'koyu' || (tema === 'sistem' && sistemKoyuMu());
  document.documentElement.classList.toggle('dark', koyu);
}

export function useTheme() {
  const [tema, setTemaState] = useState(oku);

  useEffect(() => { uygula(tema); }, [tema]);

  // Sistem temasi degisirse ('sistem' secilmisse) canli takip et
  useEffect(() => {
    if (tema !== 'sistem') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => uygula('sistem');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [tema]);

  const setTema = useCallback((yeni) => {
    if (!GECERLI.includes(yeni)) return;
    try { localStorage.setItem(ANAHTAR, yeni); } catch { /* yoksay */ }
    setTemaState(yeni);
  }, []);

  const koyuMu = tema === 'koyu' || (tema === 'sistem' && sistemKoyuMu());
  const degistir = useCallback(() => {
    setTema(koyuMu ? 'acik' : 'koyu');
  }, [koyuMu, setTema]);

  return { tema, setTema, degistir, koyuMu };
}
