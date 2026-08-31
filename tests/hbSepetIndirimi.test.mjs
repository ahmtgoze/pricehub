import { indirimiCoz, aciklamalardanIndirim, indirimliFiyat, indirimEtiketi }
  from '../src/lib/hbSepetIndirimi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n═══ GERCEK DOSYADAKI METIN ═══');
esit('Sepette %15 İndirim', indirimiCoz('Sepette %15 İndirim'), { tur: 'yuzde', deger: 15 });

console.log('\n═══ YUZDE COZUMLEME ═══');
esit('bosluklu', indirimiCoz('Sepette % 20 İndirim'), { tur: 'yuzde', deger: 20 });
esit('yuzde sonda', indirimiCoz('Sepette 25% İndirim'), { tur: 'yuzde', deger: 25 });
esit('ondalik', indirimiCoz('Sepette %12,5 İndirim'), { tur: 'yuzde', deger: 12.5 });
esit('%100 kabul edilmez', indirimiCoz('Sepette %100 İndirim'), null);
esit('%0 kabul edilmez', indirimiCoz('Sepette %0 İndirim'), null);

console.log('\n═══ TUTAR COZUMLEME ═══');
esit('TL', indirimiCoz('Sepette 50 TL İndirim'), { tur: 'tutar', deger: 50 });
esit('lira isareti', indirimiCoz('Sepette 75₺ İndirim'), { tur: 'tutar', deger: 75 });

console.log('\n═══ COZULEMEYENLER ═══');
esit('bos', indirimiCoz(''), null);
esit('null', indirimiCoz(null), null);
esit('sayi yok', indirimiCoz('Sepette indirim var'), null);

console.log('\n═══ ACIKLAMALAR SAYFASI ═══');
{
  // HB dosyasinin gercek yapisi
  const sayfa = [
    ['Excel Kolon Adı', 'Karşılığı', 'Örnek'],
    ['Ürün Adı', 'Ürünü tanımlarken girdiğiniz adıdır.', 'Karton Kitap'],
    ['', '', ''],
    ['EK BİLGİLER', '', ''],
    ['Kampanyanın İndirimi', 'Sepette %15 İndirim', ''],
    ['', '', ''],
  ];
  esit('gercek yapidan bulundu', aciklamalardanIndirim(sayfa),
       { tur: 'yuzde', deger: 15, ham: 'Sepette %15 İndirim' });
}
esit('baslik yok', aciklamalardanIndirim([['Ürün Adı', 'x']]), null);
esit('bos sayfa', aciklamalardanIndirim([]), null);
esit('gecersiz girdi', aciklamalardanIndirim(null), null);
{
  // Baslik var ama deger cozulemiyor: uydurmak yerine ham metin dondurulur
  const r = aciklamalardanIndirim([['Kampanyanın İndirimi', 'Kargo bedava', '']]);
  esit('cozulemeyen deger', r, { tur: null, deger: 0, ham: 'Kargo bedava' });
}
{
  // Deger C sutununa kaymis
  const r = aciklamalardanIndirim([['Kampanyanın İndirimi', '', 'Sepette %10 İndirim']]);
  esit('saga kaymis deger', r, { tur: 'yuzde', deger: 10, ham: 'Sepette %10 İndirim' });
}

console.log('\n═══ INDIRIMLI FIYAT (kar bundan hesaplanir) ═══');
{
  const y15 = { tur: 'yuzde', deger: 15 };
  esit('1000 -> 850', indirimliFiyat(1000, y15), 850);
  esit('4532,99 -> 3853,04', indirimliFiyat(4532.99, y15), 3853.04);
  esit('tutar indirimi', indirimliFiyat(1000, { tur: 'tutar', deger: 50 }), 950);
}
// Indirim bilinmiyorsa fiyata DOKUNULMAZ — tahmin yanlis kar gosterir
esit('indirim yok', indirimliFiyat(1000, null), 1000);
esit('tur cozulememis', indirimliFiyat(1000, { tur: null, deger: 0 }), 1000);
esit('gecersiz fiyat', indirimliFiyat(0, { tur: 'yuzde', deger: 15 }), 0);
esit('indirim fiyati asarsa 0', indirimliFiyat(30, { tur: 'tutar', deger: 50 }), 0);

console.log('\n═══ ETIKET ═══');
esit('yuzde', indirimEtiketi({ tur: 'yuzde', deger: 15 }), 'Sepette %15 indirim');
esit('ondalik', indirimEtiketi({ tur: 'yuzde', deger: 12.5 }), 'Sepette %12,5 indirim');
esit('tutar', indirimEtiketi({ tur: 'tutar', deger: 50 }), 'Sepette 50 ₺ indirim');
esit('yok', indirimEtiketi(null), 'Kampanya indirimi yok');

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
