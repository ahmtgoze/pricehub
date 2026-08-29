/**
 * Unutulmus is kontrolu — main'e girmemis dal var mi?
 *
 * NICIN VAR: fix/tarife-ice-aktarma-eslestirme dalinda Agustos'ta yazilan
 * "Excel yuklemesinde satirlar yanlis firmaya yaziliyor" duzeltmesi main'e
 * hic alinmadi. Hata aylarca canlida durdu; ancak dallara elle bakarken
 * fark edildi. Bu kontrol o tesadufu ortadan kaldirir.
 *
 * Uyarir, DURDURMAZ: acik bir dalda calisiyor olmak normaldir. Amac
 * gorunur kilmak, is akisini kesmek degil.
 *
 * KULLANIM
 *   npm run dallar   → tek basina
 *   npm run kontrol  → digerleriyle birlikte
 */

import { execSync } from 'node:child_process';

const ANA = 'main';

const calistir = (komut) => {
  try {
    return execSync(komut, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

/**
 * Sessiz basarisizliga kapali surum. calistir() hatayi yutup '' donduruyor;
 * dal listesi icin bu "hersey temiz" gibi gorunur — kontrolun tam da
 * onlemeye calistigi durum. Burada hata gurultu cikarir.
 */
const calistirZorunlu = (komut) =>
  execSync(komut, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

if (!calistir('git rev-parse --git-dir')) {
  console.log('Git deposu degil — dal kontrolu atlandi.');
  process.exit(0);
}

if (!calistir(`git rev-parse --verify ${ANA}`)) {
  console.log(`"${ANA}" dali bulunamadi — dal kontrolu atlandi.`);
  process.exit(0);
}

const suanki = calistir('git rev-parse --abbrev-ref HEAD');

// %(refname:short) tirnaksiz birakilirsa kabuk parantezde patlar.
let dallar;
try {
  dallar = calistirZorunlu(`git branch --no-merged ${ANA} --format='%(refname:short)'`)
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => d !== ANA);
} catch (hata) {
  console.error('\nDal listesi alinamadi — kontrol yapilamadi:');
  console.error(String(hata.stderr || hata.message).trim());
  process.exit(1);
}

console.log(`\nUnutulmus is kontrolu — "${ANA}" dalina girmemis dallar\n${'─'.repeat(74)}`);

if (!dallar.length) {
  console.log('  Yok. Butun dallar main icinde.\n');
  process.exit(0);
}

for (const dal of dallar) {
  const adet = calistir(`git rev-list --count ${ANA}..${dal}`) || '?';
  const son = calistir(`git log -1 --format=%ad --date=short ${dal}`);
  const konu = calistir(`git log -1 --format=%s ${dal}`);
  const uzerinde = dal === suanki ? '  ← su an buradasin' : '';
  console.log(`  • ${dal}${uzerinde}`);
  console.log(`    ${adet} commit · son: ${son} · ${konu}`);
}

console.log(`\n  ${dallar.length} dal main disinda duruyor.`);
console.log('  Uzerinde calismiyorsan ya main\'e al ya da sil:');
console.log(`    git branch -d <dal>   (yerel)`);
console.log(`    git push origin --delete <dal>   (GitHub)\n`);

// Uyari niteliginde: cikis kodu 0, kontrol zincirini kesmez.
process.exit(0);
