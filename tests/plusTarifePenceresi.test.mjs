import { plusPencereleriBul, secimMetniniBul, plusKomisyonu, plusPencereHaritasi, plusPencereUygula, plusPencereAdlari }
  from '../src/lib/plusTarifePenceresi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

// commission_plus-downloaded.xlsx dosyasindan GERCEK satir (KCL3545)
const SATIR = {
  'Ürün İsmi': 'Etiket Plastik Kargo Poşeti Cepli 35x45x5 Cm 1pk 50 Adet',
  'Barkod': 'KCL3545',
  'Plus Fiyat Üst Limiti': 184.48,
  'Tarih Aralığı (3 Gün)': '1 Eylül 08.00-4 Eylül 07.59',
  'Plus Komisyon Teklifi': 10.1,
  'Tarih Aralığı (4 Gün)': '4 Eylül 08.00-8 Eylül 07.59',
  'Plus Komisyon Teklifi_1': 6.6,
  '3 Gün Tarih Aralığı': '3 Günlük Fiyat (1 Eylül 08.00-4 Eylül 07.59)',
  '4 Gün Tarih Aralığı': '4 Günlük Fiyat (4 Eylül 08.00-8 Eylül 07.59)',
  '7 Gün Tarih Aralığı': '7 Günlük Fiyat',
};

console.log('\n=== IKI PENCERE BULUNUR ===');
{
  const p = plusPencereleriBul(SATIR);
  esit('iki pencere', p.length, 2);
  esit('adlar', p.map((x) => x.ad), ['3 Gün', '4 Gün']);
  esit('sonekler', p.map((x) => x.sonek), ['', '_1']);
  esit('tarih araliklari', p.map((x) => x.tarihAraligi),
    ['1 Eylül 08.00-4 Eylül 07.59', '4 Eylül 08.00-8 Eylül 07.59']);
}

console.log('\n=== KOMISYONLAR DOGRU PENCEREDEN ===');
// Onceki hata tam buradaydi: ikinci pencere hic okunmuyordu
esit('3 gunluk', plusKomisyonu(SATIR, ''), 10.1);
esit('4 gunluk', plusKomisyonu(SATIR, '_1'), 6.6);
esit('4 gunluk 3,5 puan ucuz', Number((10.1 - 6.6).toFixed(1)), 3.5);
esit('okunamayan 0', plusKomisyonu({}, ''), 0);
esit('virgullu sayi', plusKomisyonu({ 'Plus Komisyon Teklifi': '6,6' }, ''), 6.6);

console.log('\n=== "Tarife Seçimi" METNI DOSYADAN GELIR ===');
// Metin KURULMAZ; satirin kendi hucresi kopyalanir. Tarih araligi parantez
// icinde olmali — yalnizca "4 Günlük Fiyat" kabul edilen ciktiya uymuyor.
esit('3 gunluk metin', secimMetniniBul(SATIR, '3 Gün'), '3 Günlük Fiyat (1 Eylül 08.00-4 Eylül 07.59)');
esit('4 gunluk metin', secimMetniniBul(SATIR, '4 Gün'), '4 Günlük Fiyat (4 Eylül 08.00-8 Eylül 07.59)');
esit('7 gunluk metin', secimMetniniBul(SATIR, '7 Gün'), '7 Günlük Fiyat');
esit('olmayan pencere', secimMetniniBul(SATIR, '9 Gün'), null);
esit('bos hucre null', secimMetniniBul({ '3 Gün Tarih Aralığı': '  ' }, '3 Gün'), null);
esit('satir yok', secimMetniniBul(null, '3 Gün'), null);

console.log('\n=== HARITA VE UYGULAMA ===');
{
  const harita = plusPencereHaritasi(SATIR, plusPencereleriBul(SATIR));
  esit('pencere adlari', Object.keys(harita), ['3 Gün', '4 Gün']);
  esit('3 gunluk komisyon', harita['3 Gün'].komisyon, 10.1);
  esit('4 gunluk secim metni', harita['4 Gün'].secimMetni, '4 Günlük Fiyat (4 Eylül 08.00-8 Eylül 07.59)');

  const urun = { barcode: 'KCL3545', plus_pencereleri: harita, plus_commission_offer: 10.1 };
  const dort = plusPencereUygula(urun, '4 Gün');
  esit('komisyon degisti', dort.plus_commission_offer, 6.6);
  esit('pencere adi', dort.tarife_penceresi, '4 Gün');
  esit('secim metni', dort.tarife_secim_metni, '4 Günlük Fiyat (4 Eylül 08.00-8 Eylül 07.59)');
  esit('geri donebilir', plusPencereUygula(dort, '3 Gün').plus_commission_offer, 10.1);
  esit('pencere adlari', plusPencereAdlari(urun), ['3 Gün', '4 Gün']);
}

console.log('\n=== UC DURUMLAR ===');
esit('bos satir', plusPencereleriBul({}), []);
esit('null', plusPencereleriBul(null), []);
// Komisyon sutunu olmayan tarih basligi pencere sayilmaz
esit('komisyonsuz baslik', plusPencereleriBul({ 'Tarih Aralığı (9 Gün)': 'a' }).length, 0);
esit('harita gecersiz girdi', plusPencereHaritasi(null, []), {});
esit('uygula — urun yok', plusPencereUygula(null, '3 Gün'), null);
esit('uygula — olmayan pencere', plusPencereUygula({ plus_pencereleri: {} }, '9 Gün'), { plus_pencereleri: {} });
// Komisyonu 0 olan pencereye gecilmez; yanlis oranla kar hesaplanmasin
esit('komisyon 0 ise dokunmaz',
  plusPencereUygula({ plus_pencereleri: { '4 Gün': { komisyon: 0 } }, plus_commission_offer: 10.1 }, '4 Gün').plus_commission_offer, 10.1);
esit('haritasiz urun', plusPencereAdlari({}), []);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
