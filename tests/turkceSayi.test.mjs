import { sayiyaCevir, sayiyaCevirVeya } from '../src/lib/turkceSayi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = Object.is(olan, beklenen) || JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n=== GERCEK DOSYADAKI DEGERLER (star-downloaded.xlsx) ===');
// parseFloat bunlari 480 / 428 / 488 yapiyordu
esit('480,17', sayiyaCevir('480,17'), 480.17);
esit('428,96', sayiyaCevir('428,96'), 428.96);
esit('488,18', sayiyaCevir('488,18'), 488.18);
esit('6624,53', sayiyaCevir('6624,53'), 6624.53);
esit('1715,71', sayiyaCevir('1715,71'), 1715.71);

console.log('\n=== BINLIK AYIRACI ===');
esit('1.234,56', sayiyaCevir('1.234,56'), 1234.56);
esit('6.624,53', sayiyaCevir('6.624,53'), 6624.53);
esit('1.234.567,89', sayiyaCevir('1.234.567,89'), 1234567.89);

console.log('\n=== ZATEN DOGRU OLANLAR ===');
esit('sayi', sayiyaCevir(480.17), 480.17);
esit('nokta ondalik', sayiyaCevir('480.17'), 480.17);
esit('tam sayi metni', sayiyaCevir('480'), 480);
esit('sifir', sayiyaCevir(0), 0);
esit('negatif', sayiyaCevir('-12,5'), -12.5);

console.log('\n=== PARA BIRIMI VE YUZDE ===');
esit('lira', sayiyaCevir('₺1.234,56'), 1234.56);
esit('yuzde', sayiyaCevir('%17,5'), 17.5);
esit('bosluklu', sayiyaCevir(' 480,17 '), 480.17);
esit('bolunmez bosluk', sayiyaCevir('1 234,56'), 1234.56);

console.log('\n=== COZULEMEYENLER ===');
esit('bos', sayiyaCevir(''), null);
esit('bosluk', sayiyaCevir('   '), null);
esit('null', sayiyaCevir(null), null);
esit('undefined', sayiyaCevir(undefined), null);
esit('metin', sayiyaCevir('abc'), null);
esit('NaN', sayiyaCevir(NaN), null);
esit('Infinity', sayiyaCevir(Infinity), null);
esit('yalniz para birimi', sayiyaCevir('₺'), null);

console.log('\n=== VARSAYILANLI ===');
esit('cozulur', sayiyaCevirVeya('480,17'), 480.17);
esit('cozulemez -> 0', sayiyaCevirVeya('abc'), 0);
esit('ozel varsayilan', sayiyaCevirVeya(null, -1), -1);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
