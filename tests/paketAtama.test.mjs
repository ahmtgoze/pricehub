import { araligiVar, araliktaMi, otomatikAtamaPlani, paketeAtananlar, paketMaliyeti }
  from '../src/lib/paketAtama.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

const paket = { id: 'p1', desi_min: 2, desi_max: 5 };

console.log('\n═══ DESI ARALIGI ═══');
esit('araligi tanimli', araligiVar(paket), true);
esit('min yoksa aralik yok', araligiVar({ desi_max: 5 }), false);
esit('bos metin aralik sayilmaz', araligiVar({ desi_min: '', desi_max: 5 }), false);
// Iki uc de DAHIL: 2 ve 5 desi urunler de bu pakete girer.
esit('alt sinir dahil', araliktaMi({ desi: 2 }, paket), true);
esit('ust sinir dahil', araliktaMi({ desi: 5 }, paket), true);
esit('altinda kalan', araliktaMi({ desi: 1.9 }, paket), false);
esit('ustunde kalan', araliktaMi({ desi: 5.1 }, paket), false);
esit('desisi yok', araliktaMi({ desi: null }, paket), false);
esit('desi metin gelirse', araliktaMi({ desi: '3' }, paket), true);

console.log('\n═══ OTOMATIK ATAMA PLANI ═══');
{
  const urunler = [
    { id: 'a', desi: 3, package_id: null },        // atanacak
    { id: 'b', desi: 4, package_id: '' },          // atanacak (bos metin)
    { id: 'c', desi: 3, package_id: 'p1' },        // zaten bu paket
    { id: 'd', desi: 3, package_id: 'p2' },        // BASKA pakete elle atanmis
    { id: 'e', desi: 9, package_id: null },        // aralik disi
    { id: 'f', desi: 3, package_id: null, is_active: false }, // pasif urun
  ];
  const plan = otomatikAtamaPlani(urunler, paket);
  esit('atanacaklar', plan.atanacak.map(u => u.id), ['a', 'b']);
  esit('zaten bu pakette', plan.zatenBu.map(u => u.id), ['c']);
  // ASIL KURAL: elle verilmis karar sessizce ezilmemeli.
  esit('baska pakete atanmis ezilmez', plan.cakisan.map(u => u.id), ['d']);
  esit('pasif urun atanmaz', plan.atanacak.some(u => u.id === 'f'), false);
  esit('aralik disi atanmaz', plan.atanacak.some(u => u.id === 'e'), false);
}
esit('araligi olmayan paket hicbir sey atamaz',
  otomatikAtamaPlani([{ id: 'a', desi: 3 }], { id: 'p1' }).atanacak.length, 0);
esit('urun listesi bos', otomatikAtamaPlani([], paket).atanacak.length, 0);
esit('urun listesi null', otomatikAtamaPlani(null, paket).atanacak.length, 0);

console.log('\n═══ ATANANLAR ve MALIYET ═══');
{
  const urunler = [{ id: 'a', package_id: 'p1' }, { id: 'b', package_id: 'p2' }, { id: 'c' }];
  esit('pakete atananlar', paketeAtananlar(urunler, 'p1').map(u => u.id), ['a']);
  esit('paket id yoksa bos', paketeAtananlar(urunler, null), []);
}
{
  const kalemler = [
    { package_id: 'p1', cost: 3 },
    { package_id: 'p1', cost: 2.5 },
    { package_id: 'p1', cost: 10, is_active: false },   // pasif sayilmaz
    { package_id: 'p2', cost: 99 },
  ];
  esit('paket maliyeti', paketMaliyeti(kalemler, 'p1'), 5.5);
  esit('paket id yoksa 0', paketMaliyeti(kalemler, null), 0);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
