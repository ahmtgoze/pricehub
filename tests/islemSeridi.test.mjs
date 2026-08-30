import { yuzdeHesapla, seritGorunur, hesaplamaYuzdesi, yazmaYuzdesi } from '../src/lib/islemSeridi.js';

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

console.log('\n═══ IKI ASAMALI CUBUK ═══');
const PAY = 30;
esit('hesaplama basi',   hesaplamaYuzdesi(0, 453, PAY), 0);
esit('hesaplama ortasi', hesaplamaYuzdesi(226, 453, PAY), 15);
esit('hesaplama sonu',   hesaplamaYuzdesi(453, 453, PAY), PAY);
esit('yazma basi',       yazmaYuzdesi(0, 40, PAY), PAY);
esit('yazma sonu',       yazmaYuzdesi(40, 40, PAY), 100);
esit('yazacak sey yok',  yazmaYuzdesi(0, 0, PAY), 100);

// ASIL KURAL: cubuk asla geri gitmemeli. Onceki surumde hesaplama
// %100'e cikip yazma icin 0'dan basliyordu; kullanici bunu bozukluk
// olarak bildirdi.
const dizi = [];
for (let i = 0; i <= 453; i += 20) dizi.push(hesaplamaYuzdesi(i, 453, PAY));
dizi.push(hesaplamaYuzdesi(453, 453, PAY));
for (let y = 0; y <= 40; y++) dizi.push(yazmaYuzdesi(y, 40, PAY));
const geriGiden = dizi.findIndex((v, i) => i > 0 && v < dizi[i - 1]);
esit('cubuk hic geri gitmiyor', geriGiden, -1);
esit('0 ile baslar', dizi[0], 0);
esit('100 ile biter', dizi[dizi.length - 1], 100);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
