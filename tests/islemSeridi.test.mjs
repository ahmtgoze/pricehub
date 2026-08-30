import { yuzdeHesapla, seritGorunur } from '../src/lib/islemSeridi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n═══ YUZDE ═══');
esit('yarisi',            yuzdeHesapla(34, 68), 50);
esit('tamami',            yuzdeHesapla(68, 68), 100);
esit('basi',              yuzdeHesapla(0, 68), 0);
esit('ekrandaki ornek',   yuzdeHesapla(222, 326), 68);
esit('total 0 -> belirsiz', yuzdeHesapla(5, 0), null);
esit('total yok -> belirsiz', yuzdeHesapla(5, undefined), null);
// Tasma korumasi: sunucudan gelen sayac toplami gecerse %120 yazmasin.
esit('tasma 100 ile sinirli', yuzdeHesapla(80, 68), 100);
esit('negatif current -> 0', yuzdeHesapla(-3, 68), 0);
esit('metin gelirse', yuzdeHesapla('34', '68'), 50);

console.log('\n═══ SERIT GORUNURLUGU ═══');
const gorev = { id: 'x', name: 'Fiyatlar', current: 1, total: 2 };
esit('islem yok -> gizli',            seritGorunur(null, false), false);
esit('islem var, pencere kapali -> gorunur', seritGorunur(gorev, false), true);
// Ayni bilgi iki yerde tekrar etmesin.
esit('islem var, pencere acik -> gizli',     seritGorunur(gorev, true), false);
esit('islem yok, pencere acik -> gizli',     seritGorunur(null, true), false);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
