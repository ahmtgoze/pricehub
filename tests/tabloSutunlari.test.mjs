// Sutun mantigi testi — hesaplaGorunenKolonlar saf fonksiyonu.
// Calistirma: npm test
import { hesaplaGorunenKolonlar, kolonAnahtari } from '../src/lib/tabloSutunlari.js';

let gecen = 0, kalan = 0;
const esit = (ad, bulunan, beklenen) => {
  const a = JSON.stringify(bulunan), b = JSON.stringify(beklenen);
  if (a === b) { gecen++; console.log(`  ✓ ${ad}`); }
  else { kalan++; console.log(`  ✗ ${ad}\n      beklenen: ${b}\n      bulunan : ${a}`); }
};

// Temsili sutun kumesi: secim kutusu (sistem) + normal + ek sutunlar
const kolonlar = [
  { id: '__select', header: 'sec' },
  { id: 'sku', header: 'SKU' },
  { id: 'name', header: 'Ürün Adı' },
  { id: 'cost', header: 'Maliyet' },
  { id: 'islemler', header: 'İşlemler' },          // anahtarli ama normal
  { id: 'barcode', header: 'Barkod', optional: true },
  { id: 'notes', header: 'Notlar', optional: true },
];
const adlar = (r) => r.gorunenKolonlar.map(c => c.id);

console.log('\n1) Tercih yokken sira ve icerik birebir korunur');
{
  const r = hesaplaGorunenKolonlar(kolonlar, {});
  esit('ek sutunlar gizli, digerleri ozgun sirada',
    adlar(r), ['__select', 'sku', 'name', 'cost', 'islemler']);
}

console.log('\n2) Ek sutun yalnizca acilinca gorunur');
{
  const r = hesaplaGorunenKolonlar(kolonlar, { shown: ['barcode'] });
  esit('barcode acildi, notes kapali',
    adlar(r), ['__select', 'sku', 'name', 'cost', 'islemler', 'barcode']);
}
{
  const r = hesaplaGorunenKolonlar(kolonlar, { shown: ['barcode', 'notes'] });
  esit('ikisi de acildi', adlar(r),
    ['__select', 'sku', 'name', 'cost', 'islemler', 'barcode', 'notes']);
}

console.log('\n3) Normal sutun gizlenebilir, ek sutun hidden ile kapanmaz');
{
  const r = hesaplaGorunenKolonlar(kolonlar, { hidden: ['cost'] });
  esit('cost gizlendi', adlar(r), ['__select', 'sku', 'name', 'islemler']);
}
{
  // hidden'a yazilsa bile ek sutun zaten shown'da olmadigi icin gorunmez
  const r = hesaplaGorunenKolonlar(kolonlar, { hidden: ['barcode'] });
  esit('ek sutun hidden ile de gorunmez', adlar(r), ['__select', 'sku', 'name', 'cost', 'islemler']);
}

console.log('\n4) Sistem sutunu (secim kutusu) gizlenemez');
{
  const r = hesaplaGorunenKolonlar(kolonlar, { hidden: ['__select'] });
  esit('__select yine duruyor', adlar(r).includes('__select'), true);
  esit('__select yonetilebilir listesinde yok',
    r.yonetilebilir.some(c => c.id === '__select'), false);
}

console.log('\n5) Siralama uygulanir, sistem sutunu yerini korur');
{
  const r = hesaplaGorunenKolonlar(kolonlar, { order: ['__sys_0', 'cost', 'sku', 'name', 'islemler'] });
  esit('cost basa alindi (secim kutusundan sonra)',
    adlar(r), ['__select', 'cost', 'sku', 'name', 'islemler']);
}

console.log('\n6) Sabitleme sola alir ve isaretler (secim kutusundan SONRA)');
{
  const r = hesaplaGorunenKolonlar(kolonlar, { pinned: ['name'] });
  // Secim kutusu her zaman ilk; sabitlenen sutun ondan hemen sonra gelir.
  esit('name secimden sonra basa gecti', adlar(r), ['__select', 'name', 'sku', 'cost', 'islemler']);
  const n = r.gorunenKolonlar.find(c => c.id === 'name');
  esit('__pinned isareti var', n.__pinned, true);
  esit('sabit sutuna varsayilan genislik verildi', n.width, '160px');
}

console.log('\n7) Genislik uygulanir');
{
  const r = hesaplaGorunenKolonlar(kolonlar, { widths: { name: 240 } });
  const n = r.gorunenKolonlar.find(c => c.id === 'name');
  esit('name 240px', n.width, '240px');
}

console.log('\n8) Bilinmeyen/yeni sutun kayitli sirada yoksa ozgun yerinde kalir');
{
  const yeni = [...kolonlar, { id: 'yeni_alan', header: 'Yeni' }];
  const r = hesaplaGorunenKolonlar(yeni, { order: ['__sys_0', 'name', 'sku', 'cost', 'islemler'] });
  esit('yeni_alan listede', adlar(r).includes('yeni_alan'), true);
}

console.log('\n9) pageKey yoksa (aktif=false) hicbir sey degismez');
{
  const r = hesaplaGorunenKolonlar(kolonlar, { hidden: ['cost'], shown: ['barcode'] }, false);
  esit('cikti girdiyle ayni', r.gorunenKolonlar.length, kolonlar.length);
}

console.log('\n11) Satir secim kutusu HER ZAMAN en solda');
{
  // Kayitli sira secim sutununu sona atsa bile en basa gelmeli
  const r = hesaplaGorunenKolonlar(kolonlar, { order: ['sku', 'name', 'cost', 'islemler', '__select'] });
  esit('siralama secim sutununu kaydiramaz', adlar(r)[0], '__select');
}
{
  // Baska bir sutun sabitlense bile secim sutunu onun de solunda kalir
  const r = hesaplaGorunenKolonlar(kolonlar, { pinned: ['name'] });
  esit('sabitlenen sutun bile secimin sagina duser', adlar(r), ['__select', 'name', 'sku', 'cost', 'islemler']);
}
{
  // Kimliksiz (sentetik) sutunlar varken de kural gecerli
  const kimliksiz = [
    { header: 'Tarife Tipi', accessor: 'rate_type' },
    { id: '__select', header: 'sec' },
    { header: 'Platform', accessor: 'platform_name' },
  ];
  const r = hesaplaGorunenKolonlar(kimliksiz, {});
  esit('ikinci sirada tanimlansa bile basa alinir',
    r.gorunenKolonlar.map(c => c.id ?? c.accessor), ['__select', 'rate_type', 'platform_name']);
}

console.log('\n10) kolonAnahtari kurallari');
esit('__select sistem sayilir', kolonAnahtari({ id: '__select' }), null);
esit('anahtarsiz sistem sayilir', kolonAnahtari({ header: 'x' }), null);
esit('accessor anahtar olur', kolonAnahtari({ accessor: 'sku' }), 'sku');
esit('id accessor"dan onceliklidir', kolonAnahtari({ id: 'a', accessor: 'b' }), 'a');

console.log(`\n───────────────\nGECEN: ${gecen}   KALAN: ${kalan}\n`);
process.exit(kalan === 0 ? 0 : 1);
