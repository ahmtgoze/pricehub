// Dashboard widget yerlesimi testi — hesaplaWidgetDuzeni saf fonksiyonu.
// Calistirma: npm test
import { hesaplaWidgetDuzeni, spanDuzelt } from '../src/lib/widgetDuzeni.js';

let gecen = 0, kalan = 0;
const esit = (ad, bulunan, beklenen) => {
  const a = JSON.stringify(bulunan), b = JSON.stringify(beklenen);
  if (a === b) { gecen++; console.log(`  ✓ ${ad}`); }
  else { kalan++; console.log(`  ✗ ${ad}\n      beklenen: ${b}\n      bulunan : ${a}`); }
};

const tanimlar = [
  { id: 'ozet', sabit: true },                        // ust ozet kutulari
  { id: 'kar-ozeti', varsayilanSpan: 1 },
  { id: 'kar-dagilimi', varsayilanSpan: 2 },
  { id: 'platform-ozeti', varsayilanSpan: 3 },
  { id: 'tarihe-gore', varsayilanSpan: 1 },
  { id: 'listelenmeyen', varsayilanSpan: 1 },
];
const idler = (r) => r.gorunenWidgetlar.map(w => w.id);
const spanlar = (r) => r.gorunenWidgetlar.map(w => w.span);

console.log('\n1) Tercih yokken sira ve varsayilan boyutlar korunur');
{
  const r = hesaplaWidgetDuzeni(tanimlar, {});
  esit('sira ozgun', idler(r), ['ozet', 'kar-ozeti', 'kar-dagilimi', 'platform-ozeti', 'tarihe-gore', 'listelenmeyen']);
  esit('varsayilan span"ler', spanlar(r), [3, 1, 2, 3, 1, 1]);
}

console.log('\n2) Widget gizlenebilir');
{
  const r = hesaplaWidgetDuzeni(tanimlar, { hidden: ['kar-dagilimi'] });
  esit('kar-dagilimi gizlendi', idler(r), ['ozet', 'kar-ozeti', 'platform-ozeti', 'tarihe-gore', 'listelenmeyen']);
  esit('gizli sayaci', r.gizliSayisi, 1);
}

console.log('\n3) Sabit widget gizlenemez ve tasinmaz');
{
  const r = hesaplaWidgetDuzeni(tanimlar, { hidden: ['ozet'], order: ['kar-ozeti', 'ozet'] });
  esit('ozet yine duruyor', idler(r).includes('ozet'), true);
  esit('ozet hep basta', idler(r)[0], 'ozet');
  esit('ozet yonetilebilir listesinde yok', r.yonetilebilir.some(w => w.id === 'ozet'), false);
}

console.log('\n4) Siralama uygulanir');
{
  const r = hesaplaWidgetDuzeni(tanimlar, { order: ['listelenmeyen', 'kar-ozeti', 'kar-dagilimi', 'platform-ozeti', 'tarihe-gore'] });
  esit('listelenmeyen basa gecti (sabitten sonra)',
    idler(r), ['ozet', 'listelenmeyen', 'kar-ozeti', 'kar-dagilimi', 'platform-ozeti', 'tarihe-gore']);
}

console.log('\n5) Boyut degistirilebilir ve 1..3 araligina kirpilir');
{
  const r = hesaplaWidgetDuzeni(tanimlar, { spans: { 'kar-ozeti': 3, 'kar-dagilimi': 1 } });
  const bul = (id) => r.gorunenWidgetlar.find(w => w.id === id).span;
  esit('kar-ozeti 3 oldu', bul('kar-ozeti'), 3);
  esit('kar-dagilimi 1 oldu', bul('kar-dagilimi'), 1);
}
{
  const r = hesaplaWidgetDuzeni(tanimlar, { spans: { 'kar-ozeti': 99, 'tarihe-gore': -5 } });
  const bul = (id) => r.gorunenWidgetlar.find(w => w.id === id).span;
  esit('99 -> 3', bul('kar-ozeti'), 3);
  esit('-5 -> 1', bul('tarihe-gore'), 1);
}
esit('spanDuzelt bozuk deger -> varsayilan', spanDuzelt('abc', 2), 2);
esit('spanDuzelt 2.4 -> 2', spanDuzelt(2.4), 2);

console.log('\n6) Sonradan eklenen widget kaybolmaz');
{
  const yeni = [...tanimlar, { id: 'yeni-kutu', varsayilanSpan: 1 }];
  const r = hesaplaWidgetDuzeni(yeni, { order: ['kar-ozeti', 'kar-dagilimi', 'platform-ozeti', 'tarihe-gore', 'listelenmeyen'] });
  esit('yeni-kutu listede', idler(r).includes('yeni-kutu'), true);
}

console.log('\n7) Sifirlama: bos prefs ilk hale dondurur');
{
  const bozuk = { order: ['listelenmeyen'], hidden: ['kar-ozeti'], spans: { 'kar-dagilimi': 1 } };
  const oncesi = hesaplaWidgetDuzeni(tanimlar, bozuk);
  const sonrasi = hesaplaWidgetDuzeni(tanimlar, {});
  esit('once farkli', idler(oncesi).length !== idler(sonrasi).length, true);
  esit('sifirlayinca ozgun', idler(sonrasi),
    ['ozet', 'kar-ozeti', 'kar-dagilimi', 'platform-ozeti', 'tarihe-gore', 'listelenmeyen']);
}

console.log(`\n───────────────\nGECEN: ${gecen}   KALAN: ${kalan}\n`);
process.exit(kalan === 0 ? 0 : 1);
