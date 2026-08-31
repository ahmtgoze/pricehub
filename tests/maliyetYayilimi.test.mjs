import { bagliUrunler, yayilimPlani } from '../src/lib/maliyetYayilimi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

// Gercek kurulum: 4 renk x 3 adet.
// Eslestirme = ayni adetteki renkler · Zincir = ayni rengin adetleri
const renkler = ['LP', 'BZ', 'V', 'BJ'];
const adetler = [100, 500, 1000];
const urunler = [];
for (const r of renkler) {
  for (const a of adetler) {
    urunler.push({
      id: `${r}-${a}`, sku: `CZ${r}-1825-${a}`,
      cost: a * 0.54, unit_quantity: a,
      match_group_id: `esl-${a}`,      // ayni adet, farkli renk
      chain_group_id: `zin-${r}`,      // ayni renk, farkli adet
    });
  }
}

console.log('\n═══ GECISLI YAYILIM ═══');
{
  const bagli = bagliUrunler(urunler, 'LP-100').map(u => u.id).sort();
  // ASIL KURAL: Beyaz 500 iki adim uzakta (LP-100 → BZ-100 → BZ-500).
  // Onceki surum bunu KACIRIYORDU.
  esit('12 urunun 11i baglantili', bagli.length, 11);
  esit('iki adim uzaktaki de dahil', bagli.includes('BZ-500'), true);
  esit('uc adim uzaktaki de dahil', bagli.includes('BJ-1000'), true);
  esit('kendisi listede degil', bagli.includes('LP-100'), false);
}

console.log('\n═══ ORAN KORUNUYOR ═══');
{
  // 54 → 55.20 (%2.22 artis)
  const plan = yayilimPlani(urunler, 'LP-100', 54, 55.2);
  esit('11 urun guncellenir', plan.length, 11);

  const bul = (id) => plan.find(p => p.id === id);
  // Eslestirme kurali: ayni adetteki renkler ESIT kalmali
  esit('Beyaz 100 esit kalir', bul('BZ-100').yeniMaliyet, 55.2);
  esit('Visne 100 esit kalir', bul('V-100').yeniMaliyet, 55.2);
  // Zincir kurali: birim maliyet sabit kalmali
  esit('Lila 500 orantili', bul('LP-500').yeniMaliyet, 276);
  esit('Lila 1000 orantili', bul('LP-1000').yeniMaliyet, 552);
  // Iki adim uzaktaki de ayni birim maliyete gelir
  esit('Beyaz 500 de guncellenir', bul('BZ-500').yeniMaliyet, 276);
  esit('Bej 1000 de guncellenir', bul('BJ-1000').yeniMaliyet, 552);

  const birimler = [...new Set(plan.map(p => {
    const u = urunler.find(x => x.id === p.id);
    return Math.round(p.yeniMaliyet / u.unit_quantity * 10000) / 10000;
  }))];
  esit('tum birim maliyetler ayni', birimler, [0.552]);
}

console.log('\n═══ GUVENLIK KURALLARI ═══');
// Eski maliyet 0 ise oran yok; yayilim yapilirsa hepsi 0'a duserdi.
esit('eski maliyet 0 -> yayilim yok', yayilimPlani(urunler, 'LP-100', 0, 55.2), []);
esit('eski maliyet yok -> yayilim yok', yayilimPlani(urunler, 'LP-100', null, 55.2), []);
esit('maliyet degismediyse yayilim yok', yayilimPlani(urunler, 'LP-100', 54, 54), []);
esit('bilinmeyen urun', yayilimPlani(urunler, 'YOK', 54, 55.2), []);
esit('bos liste', bagliUrunler([], 'LP-100'), []);
esit('null liste', bagliUrunler(null, 'LP-100'), []);

console.log('\n═══ BAGSIZ URUN ═══');
{
  const tek = [{ id: 'a', sku: 'A', cost: 100 }];
  esit('grubu olmayan urun yalniz', bagliUrunler(tek, 'a'), []);
  esit('yayilim bos', yayilimPlani(tek, 'a', 100, 120), []);
}

console.log('\n═══ DONGU KORUMASI ═══');
{
  // Ayni urun hem eslestirme hem zincirle geri baglanirsa sonsuz donmemeli
  const d = [
    { id: '1', sku: 'A', cost: 10, match_group_id: 'm', chain_group_id: 'z' },
    { id: '2', sku: 'B', cost: 10, match_group_id: 'm', chain_group_id: 'z' },
  ];
  esit('dongude takilmaz', bagliUrunler(d, '1').map(u => u.id), ['2']);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
