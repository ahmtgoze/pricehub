/**
 * Vurgu rengi — tasarim prototipindeki "Gorunum ve Tema" bolumunun renk secimi.
 *
 * index.css tema degiskenlerini HSL bilesenleri olarak tutuyor ("240 3% 11.8%"
 * gibi, hsl() sarmalayicisi olmadan). Bu yuzden secilen hex rengi ayni bicime
 * cevirmemiz gerekiyor.
 *
 * Import icermez — duz node ile test edilebilir.
 */

export const VURGU_RENKLERI = [
  { id: 'pricehub', ad: 'PriceHub', hex: '#1d1d1f' },
  { id: 'mavi', ad: 'Mavi', hex: '#0071e3' },
  { id: 'mor', ad: 'Mor', hex: '#7B2D9B' },
  { id: 'yesil', ad: 'Yeşil', hex: '#0a7d33' },
  { id: 'turuncu', ad: 'Turuncu', hex: '#F27A1B' },
  { id: 'kirmizi', ad: 'Kırmızı', hex: '#d70015' },
  { id: 'pembe', ad: 'Pembe', hex: '#d6336c' },
  { id: 'turkuaz', ad: 'Turkuaz', hex: '#0d9488' },
  { id: 'gri', ad: 'Gri', hex: '#6e6e73' },
];

export const VARSAYILAN_VURGU = 'pricehub';

/** '#0071e3' -> { r, g, b } (0-255). Gecersizse null. */
export function hexCoz(hex) {
  const t = String(hex || '').trim().replace(/^#/, '');
  const tam = t.length === 3 ? t.split('').map(c => c + c).join('') : t;
  if (!/^[0-9a-fA-F]{6}$/.test(tam)) return null;
  return {
    r: parseInt(tam.slice(0, 2), 16),
    g: parseInt(tam.slice(2, 4), 16),
    b: parseInt(tam.slice(4, 6), 16),
  };
}

/**
 * hex -> index.css'in bekledigi "H S% L%" metni. Gecersizse null.
 * Ondalikli degerler tek basamaga yuvarlanir; "0 0% 100%" gibi cikar.
 */
export function hexToHslDegiskeni(hex) {
  const rgb = hexCoz(hex);
  if (!rgb) return null;

  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const enBuyuk = Math.max(r, g, b);
  const enKucuk = Math.min(r, g, b);
  const l = (enBuyuk + enKucuk) / 2;
  const fark = enBuyuk - enKucuk;

  let h = 0;
  let s = 0;
  if (fark !== 0) {
    s = fark / (1 - Math.abs(2 * l - 1));
    if (enBuyuk === r) h = ((g - b) / fark) % 6;
    else if (enBuyuk === g) h = (b - r) / fark + 2;
    else h = (r - g) / fark + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const yuvarla = (n) => Math.round(n * 10) / 10;
  return `${yuvarla(h)} ${yuvarla(s * 100)}% ${yuvarla(l * 100)}%`;
}

/** Rengin uzerine beyaz mi siyah mi yazilmali (WCAG bagil parlaklik). */
export function okunakliYaziRengi(hex) {
  const rgb = hexCoz(hex);
  if (!rgb) return '0 0% 100%';
  const kanal = (v) => {
    const o = v / 255;
    return o <= 0.03928 ? o / 12.92 : Math.pow((o + 0.055) / 1.055, 2.4);
  };
  const parlaklik = 0.2126 * kanal(rgb.r) + 0.7152 * kanal(rgb.g) + 0.0722 * kanal(rgb.b);
  // Beyaz yaziya karsi kontrast 4.5'in altina duserse siyah yaziya gec
  const beyazKontrast = 1.05 / (parlaklik + 0.05);
  return beyazKontrast >= 4.5 ? '0 0% 100%' : '240 3% 11.8%';
}

/** id -> renk tanimi; bilinmeyen id varsayilana duser. */
export function renkBul(id) {
  return VURGU_RENKLERI.find(r => r.id === id)
    || VURGU_RENKLERI.find(r => r.id === VARSAYILAN_VURGU);
}
