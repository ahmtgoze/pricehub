/**
 * Butun birim testlerini bulur ve sirayla calistirir.
 *
 * NICIN VAR: package.json'daki "test" betigi dosyalari ELLE sayiyordu
 * (`node a.test.mjs && node b.test.mjs && ...`). Yeni bir test dosyasi
 * eklendiginde listeye yazilmayi unutmak yetiyordu: test yesil gorunuyor
 * ama o dosya HIC calismiyordu. Iki test dosyasi tam da boyle atlandi.
 *
 * Artik tests/*.test.mjs kendiliginden bulunur; listeye ekleme yok.
 *
 * Bir dosya duserse cikis kodu 1 olur ve kalanlar yine de calisir —
 * tek hata butun raporu gizlemesin, hepsini bir kerede gorelim.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const klasor = dirname(fileURLToPath(import.meta.url));

const dosyalar = readdirSync(klasor)
  .filter((d) => d.endsWith('.test.mjs'))
  .sort();

if (dosyalar.length === 0) {
  console.error('HIC TEST DOSYASI BULUNAMADI — tests/*.test.mjs bekleniyordu');
  process.exit(1);
}

const dusenler = [];

for (const dosya of dosyalar) {
  const sonuc = spawnSync(process.execPath, [join(klasor, dosya)], { stdio: 'inherit' });
  if (sonuc.status !== 0) dusenler.push(dosya);
}

console.log(`\n${'═'.repeat(46)}`);
console.log(`TOPLAM ${dosyalar.length} TEST DOSYASI`);

if (dusenler.length === 0) {
  console.log('TUMU GECTI ✓');
  process.exit(0);
}

console.log(`DUSEN ${dusenler.length}:`);
dusenler.forEach((d) => console.log(`  ✗ ${d}`));
process.exit(1);
