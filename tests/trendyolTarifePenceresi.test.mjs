import { pencereleriBul, pencereKomisyonlari, tarihAraliginiAyir }
  from '../src/lib/trendyolTarifePenceresi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

// Trendyol'un GERCEK dosyasindan alinan satir yapisi (298954-01-09-2026)
const SATIR = {
  'ÜRÜN İSMİ': "Cepli Gri Kargo Poşeti 35x45 5 Cm 100'lü",
  'BARKOD': '8681511336912',
  'Tarih aralığı (3 Gün)': '1 Eylül 08.00-4 Eylül 07.59',
  '1.KOMİSYON': 20, '2.KOMİSYON': 19.4, '3.KOMİSYON': 18.5, '4.KOMİSYON': 17.1,
  'Tarih aralığı (4 Gün)': '4 Eylül 08.00-8 Eylül 07.59',
  '1.KOMİSYON_1': 20, '2.KOMİSYON_1': 16.7, '3.KOMİSYON_1': 15.6, '4.KOMİSYON_1': 13.9,
  'KOMİSYONA ESAS FİYAT': 535.79,
  'GÜNCEL KOMİSYON': 20,
  'GÜNCEL TSF': 563.99,
};

console.log('\n=== GERCEK DOSYA: IKI PENCERE BULUNUR ===');
{
  const p = pencereleriBul(SATIR);
  esit('iki pencere', p.length, 2);
  esit('adlar', p.map((x) => x.ad), ['3 Gün', '4 Gün']);
  esit('sonekler', p.map((x) => x.sonek), ['', '_1']);
  esit('tarih araliklari', p.map((x) => x.tarihAraligi),
    ['1 Eylül 08.00-4 Eylül 07.59', '4 Eylül 08.00-8 Eylül 07.59']);
}

console.log('\n=== KOMISYONLAR DOGRU PENCEREDEN OKUNUR ===');
// Onceki hata tam buradaydi: ikinci pencere hic okunmuyordu
esit('3 gunluk', pencereKomisyonlari(SATIR, ''), [20, 19.4, 18.5, 17.1]);
esit('4 gunluk', pencereKomisyonlari(SATIR, '_1'), [20, 16.7, 15.6, 13.9]);
esit('varsayilan ilk pencere', pencereKomisyonlari(SATIR), [20, 19.4, 18.5, 17.1]);

console.log('\n=== TEK PENCERELI ESKI DOSYA ===');
{
  // Trendyol'un onceki bicimi bozulmamali
  const eski = { 'Tarih aralığı (3 Gün)': '1-4 Eylül', '1.KOMİSYON': 20, '2.KOMİSYON': 18, '3.KOMİSYON': 16, '4.KOMİSYON': 14 };
  const p = pencereleriBul(eski);
  esit('tek pencere', p.length, 1);
  esit('soneksiz', p[0].sonek, '');
  esit('komisyonlar', pencereKomisyonlari(eski, ''), [20, 18, 16, 14]);
}

console.log('\n=== UC PENCERE OLURSA ===');
{
  const uc = {
    'Tarih aralığı (3 Gün)': 'a', '1.KOMİSYON': 20, '2.KOMİSYON': 19, '3.KOMİSYON': 18, '4.KOMİSYON': 17,
    'Tarih aralığı (4 Gün)': 'b', '1.KOMİSYON_1': 20, '2.KOMİSYON_1': 17, '3.KOMİSYON_1': 16, '4.KOMİSYON_1': 15,
    'Tarih aralığı (7 Gün)': 'c', '1.KOMİSYON_2': 20, '2.KOMİSYON_2': 15, '3.KOMİSYON_2': 14, '4.KOMİSYON_2': 13,
  };
  esit('uc pencere', pencereleriBul(uc).map((x) => x.sonek), ['', '_1', '_2']);
  esit('ucuncunun komisyonlari', pencereKomisyonlari(uc, '_2'), [20, 15, 14, 13]);
}

console.log('\n=== KOMISYON SUTUNU OLMAYAN BASLIK PENCERE SAYILMAZ ===');
{
  // Tarih basligi var ama komisyon sutunu yoksa gecerli pencere degildir
  const bozuk = { 'Tarih aralığı (3 Gün)': 'a', '1.KOMİSYON': 20, 'Tarih aralığı (9 Gün)': 'b' };
  esit('yalnizca gecerli olan', pencereleriBul(bozuk).length, 1);
}

console.log('\n=== GECERSIZ GIRDI ===');
esit('bos satir', pencereleriBul({}), []);
esit('null', pencereleriBul(null), []);
esit('metin', pencereleriBul('abc'), []);
esit('komisyon okunamazsa 0', pencereKomisyonlari({}, ''), [0, 0, 0, 0]);
esit('virgullu sayi', pencereKomisyonlari({ '1.KOMİSYON': '19,4' }, ''), [19.4, 0, 0, 0]);

console.log('\n=== TARIH ARALIGI AYIRMA ===');
esit('normal', tarihAraliginiAyir('1 Eylül 08.00-4 Eylül 07.59'),
  { baslangic: '1 Eylül 08.00', bitis: '4 Eylül 07.59' });
esit('bos', tarihAraliginiAyir(''), { baslangic: '', bitis: '' });
esit('tire yoksa', tarihAraliginiAyir('1 Eylül'), { baslangic: '1 Eylül', bitis: '' });

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
