import { silinecekDosyalar, VARSAYILAN_GUN } from '../src/lib/eskiDosyaSuzgeci.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

const SIMDI = new Date('2026-09-03T12:00:00Z');
const dosya = (ad, gunOnce, ek = {}) => ({
  name: ad, id: 'x',
  created_at: new Date(SIMDI.getTime() - gunOnce * 86400000).toISOString(), ...ek,
});

console.log('\n=== 10 GUN SINIRI ===');
esit('11 gun once silinir', silinecekDosyalar([dosya('a.xlsx', 11)], 10, SIMDI), ['a.xlsx']);
esit('9 gun once kalir', silinecekDosyalar([dosya('b.xlsx', 9)], 10, SIMDI), []);
esit('tam 10 gun kalir', silinecekDosyalar([dosya('c.xlsx', 10)], 10, SIMDI), []);
esit('10 gun 1 saniye once silinir',
  silinecekDosyalar([dosya('d.xlsx', 10, { created_at: new Date(SIMDI.getTime() - 10 * 86400000 - 1000).toISOString() })], 10, SIMDI),
  ['d.xlsx']);
esit('varsayilan gun', VARSAYILAN_GUN, 10);

console.log('\n=== KARISIK LISTE ===');
{
  const liste = [dosya('eski1.xlsx', 30), dosya('yeni.xlsx', 1), dosya('eski2.xlsx', 45), dosya('bugun.xlsx', 0)];
  esit('yalnizca eskiler', silinecekDosyalar(liste, 10, SIMDI), ['eski1.xlsx', 'eski2.xlsx']);
  esit('sinir 60 gun olursa hicbiri', silinecekDosyalar(liste, 60, SIMDI), []);
  esit('sinir 0 gun olursa bugun harici', silinecekDosyalar(liste, 0, SIMDI).length, 3);
}

console.log('\n=== EMIN OLMADAN SILMEZ ===');
esit('tarihsiz dosya kalir', silinecekDosyalar([{ name: 'x.xlsx', id: 'x' }], 10, SIMDI), []);
esit('bozuk tarih kalir', silinecekDosyalar([{ name: 'x.xlsx', id: 'x', created_at: 'abc' }], 10, SIMDI), []);
esit('created_at yoksa updated_at kullanilir',
  silinecekDosyalar([{ name: 'y.xlsx', id: 'x', updated_at: new Date(SIMDI.getTime() - 20 * 86400000).toISOString() }], 10, SIMDI),
  ['y.xlsx']);
// Klasor girdisi (id null) dosya degildir
esit('klasor atlanir', silinecekDosyalar([{ name: 'klasor', id: null, created_at: dosya('z', 30).created_at }], 10, SIMDI), []);
esit('adsiz atlanir', silinecekDosyalar([{ id: 'x', created_at: dosya('z', 30).created_at }], 10, SIMDI), []);

console.log('\n=== UC DURUMLAR ===');
esit('bos liste', silinecekDosyalar([], 10, SIMDI), []);
esit('gecersiz girdi', silinecekDosyalar(null, 10, SIMDI), []);
esit('gecersiz gun', silinecekDosyalar([dosya('a.xlsx', 30)], 'abc', SIMDI), []);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
