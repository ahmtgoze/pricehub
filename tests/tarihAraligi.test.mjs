import { gunBasi, gunSonu, tariheGoreSuz } from '../src/lib/tarihAraligi.js';

let gecen = 0, kalan = 0;
const esit = (ad, bulunan, beklenen) => {
  const a = JSON.stringify(bulunan), b = JSON.stringify(beklenen);
  if (a === b) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}\n     bulunan : ${a}\n     beklenen: ${b}`); }
};

// --- gunBasi / gunSonu yerel saate gore olmali ---
esit('1 gunBasi yerel gece yarisi', (() => { const t = gunBasi('2026-08-01');
  return [t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes()]; })(),
  [2026, 7, 1, 0, 0]);

esit('2 gunSonu yerel 23:59:59.999', (() => { const t = gunSonu('2026-08-01');
  return [t.getDate(), t.getHours(), t.getMinutes(), t.getSeconds(), t.getMilliseconds()]; })(),
  [1, 23, 59, 59, 999]);

esit('3 gecersiz bicim null', [gunBasi('01.08.2026'), gunBasi('2026-8-1'), gunBasi(''), gunBasi(null)],
  [null, null, null, null]);
esit('4 tasan tarih null', [gunBasi('2026-02-30'), gunBasi('2026-13-01')], [null, null]);
esit('5 arti bir gun degil', gunBasi('2026-03-01').getDate(), 1);

// --- asil hata: gunun ilk saatlerinde eklenen urun dusmemeli ---
const gunIcinde = (g, saat) => new Date(2026, 7, g, saat, 30, 0).toISOString();
esit('6 baslangic gununun 01:00 urunu araliga girer', tariheGoreSuz(
  [{ id: 'a', created_date: gunIcinde(1, 1) }], '2026-08-01', '2026-08-01').map(u => u.id), ['a']);

esit('7 baslangic gununun 00:05 urunu araliga girer', tariheGoreSuz(
  [{ id: 'a', created_date: new Date(2026, 7, 1, 0, 5).toISOString() }],
  '2026-08-01', '2026-08-01').map(u => u.id), ['a']);

esit('8 bitis gununun 23:50 urunu araliga girer', tariheGoreSuz(
  [{ id: 'a', created_date: gunIcinde(3, 23) }], '2026-08-01', '2026-08-03').map(u => u.id), ['a']);

esit('9 bir gun oncesi disarida', tariheGoreSuz(
  [{ id: 'a', created_date: gunIcinde(1, 12) }], '2026-08-02', '2026-08-03'), []);

esit('10 bir gun sonrasi disarida', tariheGoreSuz(
  [{ id: 'a', created_date: gunIcinde(4, 12) }], '2026-08-01', '2026-08-03'), []);

// --- siralama ve dayaniklilik ---
esit('11 en yeniden eskiye siralar', tariheGoreSuz([
  { id: 'eski', created_date: gunIcinde(1, 9) },
  { id: 'yeni', created_date: gunIcinde(3, 9) },
  { id: 'orta', created_date: gunIcinde(2, 9) },
], '2026-08-01', '2026-08-03').map(u => u.id), ['yeni', 'orta', 'eski']);

esit('12 tarihi olmayan urun atlanir', tariheGoreSuz([
  { id: 'a', created_date: null }, { id: 'b' }, { id: 'c', created_date: gunIcinde(2, 9) },
], '2026-08-01', '2026-08-03').map(u => u.id), ['c']);

esit('13 bozuk tarih atlanir', tariheGoreSuz(
  [{ id: 'a', created_date: 'abc' }], '2026-08-01', '2026-08-03'), []);

esit('14 bos/null liste', [tariheGoreSuz([], '2026-08-01', '2026-08-03'), tariheGoreSuz(null, '2026-08-01', '2026-08-03')], [[], []]);
esit('15 gecersiz tarihte bos liste', tariheGoreSuz(
  [{ id: 'a', created_date: gunIcinde(2, 9) }], '', '2026-08-03'), []);
esit('16 ters aralikta bos liste', tariheGoreSuz(
  [{ id: 'a', created_date: gunIcinde(2, 9) }], '2026-08-05', '2026-08-01'), []);
esit('17 tek gunluk aralik calisir', tariheGoreSuz(
  [{ id: 'a', created_date: gunIcinde(2, 12) }], '2026-08-02', '2026-08-02').map(u => u.id), ['a']);

console.log(`GECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
