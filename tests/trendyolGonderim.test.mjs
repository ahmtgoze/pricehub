import { yazilmaliMi, gonderimleriIsle, gonderilenFiyat, gonderimAnahtari } from '../src/lib/trendyolGonderim.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n=== GERCEK VAKA (3 Eylul ikinci yukleme) ===');
// 4 gunluk dosyada 12 satir ayni fiyatla tekrar gonderildi ve hepsi hata verdi
esit('ayni fiyat ikinci kez yazilmaz',
  yazilmaliMi(441.75, 518.49, 441.75), { yazilir: false, sebep: 'zaten-gonderildi' });
// Gercekten degisen tek satir kabul edildi
esit('degisen fiyat yazilir',
  yazilmaliMi(110.19, 115.99, 118.24), { yazilir: true, sebep: 'yeni' });

console.log('\n=== GUNCEL FIYATLA AYNI ===');
esit('etkisiz yazim atlanir',
  yazilmaliMi(115.99, 115.99, undefined), { yazilir: false, sebep: 'guncel-fiyatla-ayni' });
esit('kurus farki ayni sayilir', yazilmaliMi(115.991, 115.99, undefined).yazilir, false);
esit('bir kurus fark yazilir', yazilmaliMi(115.98, 115.99, undefined).yazilir, true);

console.log('\n=== ILK GONDERIM ===');
esit('defterde yoksa yazilir', yazilmaliMi(441.75, 518.49, undefined), { yazilir: true, sebep: 'yeni' });

console.log('\n=== GECERSIZ FIYAT ===');
esit('sifir', yazilmaliMi(0, 100, undefined), { yazilir: false, sebep: 'fiyat-yok' });
esit('negatif', yazilmaliMi(-1, 100, undefined), { yazilir: false, sebep: 'fiyat-yok' });
esit('metin', yazilmaliMi('abc', 100, undefined), { yazilir: false, sebep: 'fiyat-yok' });
esit('guncel tsf yoksa yazilir', yazilmaliMi(100, null, undefined), { yazilir: true, sebep: 'yeni' });

console.log('\n=== DEFTER ===');
{
  let d = {};
  d = gonderimleriIsle(d, '3 Gün', [{ barkod: 'KPBŞ1', fiyat: 488.17 }, { barkod: 'TBE2', fiyat: 132.04 }]);
  esit('islendi', gonderilenFiyat(d, '3 Gün', 'KPBŞ1'), 488.17);
  // Tarifeler AYRI: ayni urun 4 gunlukte hala gonderilmemis sayilir
  esit('diger tarife etkilenmez', gonderilenFiyat(d, '4 Gün', 'KPBŞ1'), undefined);
  d = gonderimleriIsle(d, '4 Gün', [{ barkod: 'KPBŞ1', fiyat: 441.75 }]);
  esit('iki tarife ayri tutulur',
    [gonderilenFiyat(d, '3 Gün', 'KPBŞ1'), gonderilenFiyat(d, '4 Gün', 'KPBŞ1')], [488.17, 441.75]);
  // Yeni fiyat eskisinin uzerine yazilir
  d = gonderimleriIsle(d, '3 Gün', [{ barkod: 'KPBŞ1', fiyat: 480 }]);
  esit('guncellenir', gonderilenFiyat(d, '3 Gün', 'KPBŞ1'), 480);
  esit('anahtar', gonderimAnahtari('3 Gün', 'KPBŞ1'), '3 Gün|KPBŞ1');
  esit('barkodsuz atlanir', Object.keys(gonderimleriIsle({}, '3 Gün', [{ fiyat: 1 }])).length, 0);
  esit('bos liste', gonderimleriIsle({ a: 1 }, '3 Gün', []), { a: 1 });
  esit('gecersiz girdi', gonderimleriIsle(null, '3 Gün', null), {});
  esit('bos defter', gonderilenFiyat(null, '3 Gün', 'X'), undefined);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
