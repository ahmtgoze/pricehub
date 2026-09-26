/**
 * Edge Function paketleyici: kar-hesapla için gerekli kaynak dosyalarını TEK dizine düzleştirir.
 * Neden: dağıtım aracı yalnız fonksiyon dizinindeki dosyaları alır; motor ve modüller src/ altında.
 * Tek doğru kaynak src/ kalır, paket her seferinde ondan üretilir (elle kopya yok).
 *
 * Kullanım: node scripts/fonksiyon-paketle.mjs <çıktı dizini>
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const cikti = process.argv[2];
if (!cikti) { console.error('Çıktı dizini gerekli'); process.exit(1); }

const fonksiyon = join(kok, 'supabase/functions/kar-hesapla');
const dosyalar = [
  ...['index.ts', 'kabuk.ts', 'veri.ts'].map((a) => [join(fonksiyon, a), a]),
  ...['karServisi.js', 'karHesabi.js', 'siparisKari.js', 'hedefKarSecimi.js', 'gecerliMaliyet.js', 'kargoHesabi.js', 'baremKurali.js'].map((a) => [join(kok, 'src/lib', a), a]),
  [join(kok, 'src/components/PriceCalculationEngine.jsx'), 'PriceCalculationEngine.js'],
];

const yaz = (metin) => metin
  .replaceAll("'../../../src/lib/karServisi.js'", "'./karServisi.js'")
  .replaceAll("'../components/PriceCalculationEngine.jsx'", "'./PriceCalculationEngine.js'")
  .replaceAll("'../lib/", "'./");

mkdirSync(cikti, { recursive: true });
const liste = [];
for (const [kaynak, ad] of dosyalar) {
  const icerik = yaz(readFileSync(kaynak, 'utf8'));
  writeFileSync(join(cikti, ad), icerik);
  liste.push({ name: ad, bayt: Buffer.byteLength(icerik) });
}
// Kalan göreli içe aktarma paketin dışına çıkmamalı
for (const { name } of liste) {
  const yanlis = [...readFileSync(join(cikti, name), 'utf8').matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)].map((m) => m[1]).filter((y) => !liste.some((l) => `./${l.name}` === y));
  if (yanlis.length) { console.error(`${name}: pakette olmayan içe aktarma: ${yanlis.join(', ')}`); process.exit(1); }
}
console.log(JSON.stringify(liste));
