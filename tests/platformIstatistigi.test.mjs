import { hesaplaPlatformIstatistigi, detayCoz } from '../src/lib/platformIstatistigi.js';

let gecen = 0, kalan = 0;
const esit = (ad, bulunan, beklenen) => {
  const a = JSON.stringify(bulunan), b = JSON.stringify(beklenen);
  if (a === b) { gecen++; }
  else { kalan++; console.log(`  ✗ ${ad}\n     bulunan : ${a}\n     beklenen: ${b}`); }
};

const detay = (oran) => JSON.stringify({ commissionRate: oran, productCost: 10 });

// --- detayCoz ---
esit('1 JSON metnini cozer', detayCoz(detay(19.5))?.commissionRate, 19.5);
esit('2 nesneyi oldugu gibi dondurur', detayCoz({ commissionRate: 7 })?.commissionRate, 7);
esit('3 cift kodlanmis metni cozer', detayCoz(JSON.stringify(detay(21)))?.commissionRate, 21);
esit('4 bozuk JSON null doner', detayCoz('{bozuk'), null);
esit('5 null/undefined null doner', [detayCoz(null), detayCoz(undefined)], [null, null]);
esit('6 sayi null doner', detayCoz(42), null);

// --- adet ---
esit('7 bos liste bos sonuc', hesaplaPlatformIstatistigi([]), {});
esit('8 null liste bos sonuc', hesaplaPlatformIstatistigi(null), {});
esit('9 platform basina sayar', hesaplaPlatformIstatistigi([
  { platform_name: 'Trendyol', calculation_details: detay(20) },
  { platform_name: 'Trendyol', calculation_details: detay(20) },
  { platform_name: 'HepsiBurada', calculation_details: detay(19) },
]), { trendyol: { adet: 2, ortalamaKomisyon: 20 }, hepsiburada: { adet: 1, ortalamaKomisyon: 19 } });

esit('10 platform adi kucuk harfe iner', Object.keys(hesaplaPlatformIstatistigi([
  { platform_name: 'WEB Sitesi', calculation_details: detay(0) },
])), ['web sitesi']);

esit('11 farkli buyuk-kucuk harf ayni platform sayilir', hesaplaPlatformIstatistigi([
  { platform_name: 'Trendyol', calculation_details: detay(10) },
  { platform_name: 'trendyol', calculation_details: detay(20) },
]), { trendyol: { adet: 2, ortalamaKomisyon: 15 } });

esit('12 bosluklu ad kirpilir', Object.keys(hesaplaPlatformIstatistigi([
  { platform_name: '  Trendyol  ', calculation_details: detay(5) },
])), ['trendyol']);

esit('13 adsiz satir atlanir', hesaplaPlatformIstatistigi([
  { platform_name: '', calculation_details: detay(5) },
  { calculation_details: detay(5) },
  { platform_name: null, calculation_details: detay(5) },
]), {});

// --- ortalama ---
esit('14 ortalama dogru hesaplanir', hesaplaPlatformIstatistigi([
  { platform_name: 'T', calculation_details: detay(10) },
  { platform_name: 'T', calculation_details: detay(20) },
  { platform_name: 'T', calculation_details: detay(30) },
]).t.ortalamaKomisyon, 20);

esit('15 komisyonu okunamayan kayit adede girer ortalamaya girmez', hesaplaPlatformIstatistigi([
  { platform_name: 'T', calculation_details: detay(10) },
  { platform_name: 'T', calculation_details: '{bozuk' },
  { platform_name: 'T', calculation_details: null },
]), { t: { adet: 3, ortalamaKomisyon: 10 } });

esit('16 hic komisyon yoksa null (sifir degil)', hesaplaPlatformIstatistigi([
  { platform_name: 'T', calculation_details: null },
]), { t: { adet: 1, ortalamaKomisyon: null } });

esit('17 komisyon 0 gecerli deger, null degil', hesaplaPlatformIstatistigi([
  { platform_name: 'Web', calculation_details: detay(0) },
]), { web: { adet: 1, ortalamaKomisyon: 0 } });

esit('18 metin komisyon sayiya cevrilir', hesaplaPlatformIstatistigi([
  { platform_name: 'T', calculation_details: JSON.stringify({ commissionRate: '19.5' }) },
]), { t: { adet: 1, ortalamaKomisyon: 19.5 } });

esit('19 NaN/null komisyon ortalamaya girmez', hesaplaPlatformIstatistigi([
  { platform_name: 'T', calculation_details: JSON.stringify({ commissionRate: null }) },
  { platform_name: 'T', calculation_details: JSON.stringify({ commissionRate: 'abc' }) },
  { platform_name: 'T', calculation_details: detay(8) },
]), { t: { adet: 3, ortalamaKomisyon: 8 } });

esit('20 commissionRate alani hic yoksa', hesaplaPlatformIstatistigi([
  { platform_name: 'T', calculation_details: JSON.stringify({ productCost: 5 }) },
]), { t: { adet: 1, ortalamaKomisyon: null } });

// Gercek veriden olculen degerler (SQL ile dogrulandi):
// Trendyol %19,5 · HepsiBurada %19,2 · Web Sitesi %13,3
esit('21 gercek veri sekli: karisik platformlar', (() => {
  const s = hesaplaPlatformIstatistigi([
    { platform_name: 'Trendyol', calculation_details: detay(19) },
    { platform_name: 'Trendyol', calculation_details: detay(20) },
    { platform_name: 'HepsiBurada', calculation_details: detay(19.2) },
    { platform_name: 'Web Sitesi', calculation_details: detay(13.3) },
  ]);
  return [s.trendyol.adet, s.trendyol.ortalamaKomisyon, s.hepsiburada.ortalamaKomisyon, s['web sitesi'].ortalamaKomisyon];
})(), [2, 19.5, 19.2, 13.3]);

console.log(`GECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
