import { fiyatTarifeyeUygunMu, tarifeUstSiniri, sinirAsanlar, kademeFiyati } from '../src/lib/trendyolTarifeKurali.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n=== GERCEK VAKA (3 Eylul 2026 yuklemesi) ===');
// Reddedilen ucu
esit('KPBŞ2 741,70 > 726,13', fiyatTarifeyeUygunMu(741.70, 726.13), false);
esit('KB.1 118,24 > 110,19', fiyatTarifeyeUygunMu(118.24, 110.19), false);
esit('TBE2 140,69 > 132,04', fiyatTarifeyeUygunMu(140.69, 132.04), false);
// Kabul edilenler
esit('KPBŞ1 488,17 < 492,57', fiyatTarifeyeUygunMu(488.17, 492.57), true);
esit('KCL3037 275,95 < 276,44', fiyatTarifeyeUygunMu(275.95, 276.44), true);
esit('TBE2 4 gunluk 129,28 < 132,04', fiyatTarifeyeUygunMu(129.28, 132.04), true);

console.log('\n=== SINIR ===');
esit('esit fiyat kabul', fiyatTarifeyeUygunMu(100, 100), true);
esit('bir kurus ustu reddedilir', fiyatTarifeyeUygunMu(100.01, 100), false);
esit('bir kurus alti kabul', fiyatTarifeyeUygunMu(99.99, 100), true);

console.log('\n=== ESAS FIYAT BILINMIYORSA ENGELLEME ===');
// Yanlis veri yuzunden gecerli secimi kapatmak daha kotu
esit('esas 0', fiyatTarifeyeUygunMu(500, 0), true);
esit('esas bos', fiyatTarifeyeUygunMu(500, ''), true);
esit('esas null', fiyatTarifeyeUygunMu(500, null), true);
esit('esas metin', fiyatTarifeyeUygunMu(500, 'abc'), true);

console.log('\n=== GECERSIZ FIYAT ===');
esit('fiyat 0', fiyatTarifeyeUygunMu(0, 100), false);
esit('fiyat negatif', fiyatTarifeyeUygunMu(-5, 100), false);
esit('fiyat bos', fiyatTarifeyeUygunMu('', 100), false);
esit('fiyat metin', fiyatTarifeyeUygunMu('abc', 100), false);

console.log('\n=== UST SINIR ===');
esit('okunur', tarifeUstSiniri({ current_base_price: 726.13 }), 726.13);
esit('sifir -> null', tarifeUstSiniri({ current_base_price: 0 }), null);
esit('yok -> null', tarifeUstSiniri({}), null);
esit('urun yok', tarifeUstSiniri(null), null);

console.log('\n=== SINIR ASANLAR LISTESI ===');
{
  const urunler = [
    { barcode: 'KPBŞ2', product_name: 'Buzlu', current_base_price: 726.13, secili: 741.70 },
    { barcode: 'KPBŞ1', product_name: 'Seffaf', current_base_price: 492.57, secili: 488.17 },
    { barcode: 'KB.1', product_name: 'Balonlu', current_base_price: 110.19, secili: 118.24 },
    { barcode: 'BOS', product_name: 'Secimsiz', current_base_price: 100, secili: 0 },
  ];
  const r = sinirAsanlar(urunler, (u) => u.secili);
  esit('iki urun asiyor', r.map((x) => x.barkod), ['KPBŞ2', 'KB.1']);
  esit('sinir bilgisi', r[0], { barkod: 'KPBŞ2', ad: 'Buzlu', fiyat: 741.7, sinir: 726.13 });
  esit('bos liste', sinirAsanlar([], (u) => u.secili), []);
  esit('gecersiz girdi', sinirAsanlar(null, (u) => u), []);
  esit('fonksiyonsuz', sinirAsanlar(urunler, null), []);
}

console.log('\n=== KADEME FIYATI ESAS FIYATA CEKILIR ===');
// KB.1: 3. kademe "118,24 ve alti", alt sinir 103,94, esas 110,19
esit('tavan cekilir, kademe korunur', kademeFiyati(118.24, 103.94, 110.19), 110.19);
// TBE2: 2. kademe "140,69 ve alti", alt sinir 129,29, esas 132,04
esit('TBE2 2. kademe', kademeFiyati(140.69, 129.29, 132.04), 132.04);
// KPBŞ2: 2. kademe "741,70 ve alti", alt sinir 671,18, esas 726,13
esit('KPBŞ2 2. kademe', kademeFiyati(741.70, 671.18, 726.13), 726.13);
// Esas fiyat tavanin ustundeyse dokunulmaz
esit('cekmeye gerek yok', kademeFiyati(488.17, 441.76, 492.57), 488.17);

console.log('\n=== CEKILEN FIYAT ALT SINIRIN ALTINA DUSERSE ===');
// esas 100, kademe "118,24 ve alti" ama alt sinir 103,94 -> fiyat ALT kademeye ait
esit('kademe kullanilamaz', kademeFiyati(118.24, 103.94, 100), null);
esit('tam alt sinirda kabul', kademeFiyati(118.24, 103.94, 103.94), 103.94);
// 4. kademenin alt siniri yok
esit('4. kademe her zaman cekilebilir', kademeFiyati(103.93, 0, 90), 90);

console.log('\n=== 1. KADEME "X VE USTU" ===');
esit('esas alti ise kullanilir', kademeFiyati(317.41, 0, 535.79, true), 317.41);
esit('esas ustunde ise kullanilamaz', kademeFiyati(129.01, 0, 110.19, true), null);

console.log('\n=== ESAS FIYAT BILINMIYORSA ESKI DAVRANIS ===');
esit('esas 0', kademeFiyati(118.24, 103.94, 0), 118.24);
esit('esas yok', kademeFiyati(118.24, 103.94, null), 118.24);

console.log('\n=== GECERSIZ ===');
esit('ust fiyat 0', kademeFiyati(0, 10, 100), null);
esit('ust fiyat yok', kademeFiyati(null, 10, 100), null);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
