import { bagliUrunler, yayilimPlani, bazMaliyetPlani } from '../src/lib/maliyetYayilimi.js';

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


console.log('\n═══ REFERANS -> BAZ MALIYET ═══');
{
  // Cepsiz posetin maliyeti degisti; cepli poset onu OLCUYE gore referans
  // aliyor. Onceki surum bagimlinin baz maliyetini hic guncellemiyordu.
  const urunler = [
    { id: 'cepsiz', sku: 'CZ-100', cost: 100, base_cost: 0 },
    { id: 'cepli',  sku: 'CP-100', cost: 80, base_cost: 110,
      ref_product_id_size: 'cepsiz', size_cost_addon: 20 },   // ref x 1.20
  ];
  const p = bazMaliyetPlani(urunler, ['cepsiz']);
  esit('bagimli yeniden hesaplanir', p.length, 1);
  esit('yeni baz = 100 x 1.20', p[0].yeniBaz, 120);
  esit('eski baz raporlanir', p[0].eskiBaz, 110);

  // Referansi degismeyen urun rahatsiz edilmez
  esit('ilgisiz degisim tetiklemez', bazMaliyetPlani(urunler, ['baska']).length, 0);
  esit('bos degisim listesi', bazMaliyetPlani(urunler, []).length, 0);
}
{
  // Ozellige gore, uc ek turu
  const kok = { id: 'r', sku: 'R', cost: 200, base_cost: 0 };
  const yap = (ek) => bazMaliyetPlani([kok, { id: 'x', sku: 'X', cost: 0, base_cost: 0,
    ref_product_id: 'r', ...ek }], ['r'])[0]?.yeniBaz;
  esit('total_tl', yap({ cost_addon_type: 'total_tl', cost_addon: 50 }), 250);
  esit('total_pct', yap({ cost_addon_type: 'total_pct', cost_addon: 10 }), 220);
  // (200/100 + 1) x 100 = 300
  esit('unit_tl', yap({ cost_addon_type: 'unit_tl', cost_addon: 1, ref_product_qty: 100 }), 300);
}
{
  // Iki aday varsa YUKSEK olan; sonra urunun kendi maliyetiyle kiyas
  const urunler = [
    { id: 'a', sku: 'A', cost: 100, base_cost: 0 },
    { id: 'b', sku: 'B', cost: 100, base_cost: 0 },
    { id: 'c', sku: 'C', cost: 400, base_cost: 0,
      ref_product_id: 'a', cost_addon_type: 'total_tl', cost_addon: 50,   // 150
      ref_product_id_size: 'b', size_cost_addon: 100 },                   // 200
  ];
  // 200 aday kazanir ama urunun kendi maliyeti 400 daha yuksek
  esit('kendi maliyetinin altina inmez', bazMaliyetPlani(urunler, ['a'])[0]?.yeniBaz, 400);
}


console.log('\n═══ KURUSAT KAYMASI ═══');
{
  // Onceki surum oranla carpip her adimda yuvarliyordu; tekrarlanan
  // guncellemelerde ayni zincirde 164,7300 / 164,7350 / 164,7358 gibi
  // kaymalar birikmisti. Birim maliyetten hesap bunu bitirir.
  const zincir = [
    { id: 'a', sku: 'A-1',  cost: 164.73,  unit_quantity: 1,  chain_group_id: 'z' },
    { id: 'b', sku: 'A-6',  cost: 988.41,  unit_quantity: 6,  chain_group_id: 'z' },
    { id: 'c', sku: 'A-24', cost: 3953.66, unit_quantity: 24, chain_group_id: 'z' },
  ];
  const plan = yayilimPlani(zincir, 'a', 164.73, 170);
  const birimler = plan.map(d => {
    const u = zincir.find(x => x.id === d.id);
    return Math.round(d.yeniMaliyet / u.unit_quantity * 10000) / 10000;
  });
  esit('tum birimler kokle ayni', [...new Set(birimler)], [170]);
  esit('6li = 1020', plan.find(d => d.id === 'b').yeniMaliyet, 1020);
  esit('24lu = 4080', plan.find(d => d.id === 'c').yeniMaliyet, 4080);

  // Ust uste yayilim kayma biriktirmemeli
  let liste = zincir.map(u => ({ ...u }));
  for (const yeniM of [170, 171, 172, 173]) {
    const p2 = yayilimPlani(liste, 'a', liste[0].cost, yeniM);
    liste = liste.map(u => {
      const d = p2.find(x => x.id === u.id);
      return u.id === 'a' ? { ...u, cost: yeniM } : (d ? { ...u, cost: d.yeniMaliyet } : u);
    });
  }
  const sonBirimler = [...new Set(liste.map(u =>
    Math.round(u.cost / u.unit_quantity * 10000) / 10000))];
  esit('dort tur sonra hala tek birim', sonBirimler, [173]);
}
{
  // Adet bilinmiyorsa oran yedegi calismali
  const u = [
    { id: 'a', sku: 'A', cost: 100, chain_group_id: 'z' },
    { id: 'b', sku: 'B', cost: 50,  chain_group_id: 'z' },
  ];
  esit('adet yoksa oranla', yayilimPlani(u, 'a', 100, 200)[0].yeniMaliyet, 100);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
