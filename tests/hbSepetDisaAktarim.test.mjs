import { sadelestir, sutunlariBul, kampanyaSayfasiniKur, satirPlani, otomatikGenislikler, bosSkuSutunu, SKU_BASLIGI }
  from '../src/lib/hbSepetDisaAktarim.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

// HB'nin gercek dosyasindaki baslik satiri (6a95e2ab...xlsx, "Listelerim")
const BASLIK = [
  'Ürün Adı', 'Marka', 'Satıcı stok kodu', '', 'Barkod', 'Kategori', 'Stok',
  'Girebileceğiniz max. fiyat', 'Mevcut satış fiyatı',
  'Güncel Komisyon Oranı', 'İndirimli Komisyon Oranı',
  'Kampanyanın uygulanacağı fiyat (Bu fiyat ekran üzerinden hesaplanacaktır)',
];
const satir = (kod, ad) => [ad, 'Svs', kod, 'HBCV1', 'BRK1', 'Kat', 100, 500, 500, 17, 9, ''];

console.log('\n═══ SUTUN BULMA ═══');
{
  const { skuSutunu, fiyatSutunu } = sutunlariBul(BASLIK);
  esit('stok kodu sutunu', skuSutunu, 2);
  esit('kampanya fiyati sutunu', fiyatSutunu, 11);
}
esit('baslik yazimi degisse de bulunur',
  sutunlariBul(['Satıcı Stok Kodu', 'Kampanyanın uygulanacağı fiyat']),
  { skuSutunu: 0, fiyatSutunu: 1 });
esit('fazla bosluklu baslik',
  sutunlariBul(['  Satıcı   stok  kodu ', 'Kampanyanın uygulanacağı fiyat (x)']),
  { skuSutunu: 0, fiyatSutunu: 1 });
esit('sutun yoksa null', sutunlariBul(['Ürün Adı', 'Marka']),
  { skuSutunu: null, fiyatSutunu: null });
esit('sadelestir', sadelestir('  a   b  '), 'a b');

console.log('\n═══ ANA KURAL: SECILMEYEN SATIR SILINIR ═══');
{
  const aoa = [BASLIK, satir('A1', 'Bir'), satir('A2', 'Iki'), satir('A3', 'Uc')];
  const secimler = [
    { seller_stock_code: 'A1', campaign_price: 450, selected: true },
    { seller_stock_code: 'A2', campaign_price: 400, selected: false },  // secilmedi
    { seller_stock_code: 'A3', campaign_price: 480, selected: true },
  ];
  const r = kampanyaSayfasiniKur(aoa, secimler);
  esit('hata yok', r.hata, null);
  esit('yalnizca secililer + baslik', r.satirlar.length, 3);
  esit('yazilan', r.yazilan, 2);
  esit('silinen', r.silinen, 1);
  esit('kalan kodlar', r.satirlar.slice(1).map((s) => s[2]), ['A1', 'A3']);
  esit('fiyatlar yazildi', r.satirlar.slice(1).map((s) => s[11]), [450, 480]);
  esit('baslik aynen korundu', r.satirlar[0], BASLIK);
  esit('sutun sayisi degismedi', r.satirlar[1].length, BASLIK.length);
  esit('diger sutunlara dokunulmadi', r.satirlar[1][0], 'Bir');
}

console.log('\n═══ FIYATI GECERSIZ OLAN SECILI URUN ═══');
{
  const aoa = [BASLIK, satir('A1', 'Bir'), satir('A2', 'Iki'), satir('A3', 'Uc')];
  const r = kampanyaSayfasiniKur(aoa, [
    { seller_stock_code: 'A1', campaign_price: 0, selected: true },      // fiyat yok
    { seller_stock_code: 'A2', campaign_price: -5, selected: true },     // negatif
    { seller_stock_code: 'A3', campaign_price: 480, selected: true },
  ]);
  // Fiyati olmayan urun kampanyaya giremez -> satiri da silinir
  esit('yalnizca gecerli fiyatli kaldi', r.satirlar.slice(1).map((s) => s[2]), ['A3']);
  esit('gecersizler silindi', r.silinen, 2);
}

console.log('\n═══ HIC SECIM YOKSA ═══');
{
  const aoa = [BASLIK, satir('A1', 'Bir'), satir('A2', 'Iki')];
  const r = kampanyaSayfasiniKur(aoa, []);
  esit('sadece baslik kalir', r.satirlar.length, 1);
  esit('yazilan sifir', r.yazilan, 0);
  esit('ikisi de silindi', r.silinen, 2);
}

console.log('\n═══ EXCEL TARAFINDAKI AKSILIKLER ═══');
{
  const aoa = [BASLIK, satir('A1', 'Bir'), ['', '', '', '', '', '', '', '', '', '', '', ''], satir('A2', 'Iki')];
  const r = kampanyaSayfasiniKur(aoa, [
    { seller_stock_code: 'A1', campaign_price: 450, selected: true },
    { seller_stock_code: 'A2', campaign_price: 460, selected: true },
  ]);
  esit('bos satir silinen sayilmaz', r.silinen, 0);
  esit('bos satir cikarildi', r.satirlar.length, 3);
}
{
  // Stok kodunda bosluk farki olsa da eslesmeli
  const aoa = [BASLIK, satir(' A1 ', 'Bir')];
  const r = kampanyaSayfasiniKur(aoa, [{ seller_stock_code: 'A1', campaign_price: 450, selected: true }]);
  esit('bosluklu kod eslesti', r.yazilan, 1);
}
{
  // Fiyat sutunu satirda hic yoksa (kisa satir) doldurulabilmeli
  const kisa = ['Ad', 'Svs', 'A1'];
  const r = kampanyaSayfasiniKur([BASLIK, kisa],
    [{ seller_stock_code: 'A1', campaign_price: 450, selected: true }]);
  esit('kisa satir tamamlandi', r.satirlar[1].length, BASLIK.length);
  esit('kisa satira fiyat yazildi', r.satirlar[1][11], 450);
}

console.log('\n═══ SUTUN BULUNAMAZSA DURDURULUR ═══');
{
  const r = kampanyaSayfasiniKur([['Ürün Adı', 'Marka'], ['a', 'b']], []);
  esit('hata bildirildi', r.hata, '"Kampanyanın uygulanacağı fiyat" sütunu bulunamadı');
  esit('satir uretilmedi', r.satirlar.length, 0);
}
{
  const r = kampanyaSayfasiniKur([['Kampanyanın uygulanacağı fiyat'], ['5']], []);
  esit('stok kodu yoksa hata', r.hata, '"Satıcı stok kodu" sütunu bulunamadı');
}
esit('bos sayfa', kampanyaSayfasiniKur([], []).hata, 'Excel sayfası boş');
esit('gecersiz girdi', kampanyaSayfasiniKur(null, null).hata, 'Excel sayfası boş');


console.log('\n═══ SATIR PLANI (bicim korumak icin kaynak satir yerleri) ═══');
{
  const aoa = [BASLIK, satir('A1','Bir'), satir('A2','Iki'), satir('A3','Uc')];
  const r = satirPlani(aoa, [
    { seller_stock_code: 'A1', campaign_price: 450, selected: true },
    { seller_stock_code: 'A2', campaign_price: 400, selected: false },
    { seller_stock_code: 'A3', campaign_price: 480, selected: true },
  ]);
  esit('hata yok', r.hata, null);
  esit('kaynak satir yerleri', r.tutulacak.map((t) => t.kaynakSatir), [1, 3]);
  esit('fiyatlar', r.tutulacak.map((t) => t.fiyat), [450, 480]);
  esit('silinen', r.silinen, 1);
  esit('fiyat sutunu', r.fiyatSutunu, 11);
  esit('sku sutunu', r.skuSutunu, 2);
}
{
  // Bos satir atlanir ama silinen sayilmaz; sonraki satirin YERI kaymaz
  const aoa = [BASLIK, satir('A1','Bir'), ['','','','','','','','','','','',''], satir('A2','Iki')];
  const r = satirPlani(aoa, [{ seller_stock_code: 'A2', campaign_price: 460, selected: true }]);
  esit('bos satir atlandi, yer dogru', r.tutulacak.map((t) => t.kaynakSatir), [3]);
  esit('bos satir silinen sayilmaz', r.silinen, 1);
}
esit('sutun yoksa hata', satirPlani([['Ürün Adı']], []).hata, '"Kampanyanın uygulanacağı fiyat" sütunu bulunamadı');
esit('bos sayfa', satirPlani([], []).hata, 'Excel sayfası boş');


console.log('\n═══ OTOMATIK SUTUN GENISLIGI ═══');
{
  const r = otomatikGenislikler([['Ad', 'Cok Uzun Bir Urun Adi Burada'], ['x', 'kisa']]);
  esit('sutun sayisi', r.length, 2);
  esit('kisa sutun en az degerde', r[0].wch, 8);
  esit('uzun sutun icerige gore', r[1].wch, 'Cok Uzun Bir Urun Adi Burada'.length + 2);
}
{
  // Cok uzun metin ust sinirla kisitlanir; yoksa sutun ekrana sigmaz
  const uzun = 'a'.repeat(200);
  esit('ust sinir', otomatikGenislikler([[uzun]])[0].wch, 60);
}
{
  // Satir sonu iceren baslikta en uzun PARCA esas alinir
  const r = otomatikGenislikler([['Teklif 1\nKatilabileceginiz Maximum Fiyat']]);
  esit('satir sonu bolunur', r[0].wch, 'Katilabileceginiz Maximum Fiyat'.length + 2);
}
{
  // Satirlarin sutun sayisi farkli olabilir
  const r = otomatikGenislikler([['a'], ['b', 'cccccccccccc']]);
  esit('en genis satira gore', r.length, 2);
}
esit('bos veri', otomatikGenislikler([]), []);
esit('gecersiz veri', otomatikGenislikler(null), []);
esit('null hucreler', otomatikGenislikler([[null, undefined]]).map((g) => g.wch), [8, 8]);
esit('sayilar da olculur', otomatikGenislikler([[1234567890123]])[0].wch, 15);


console.log('\n═══ BOS SKU BASLIGI ═══');
// HB sablonunda "Satıcı stok kodu"nun sagindaki sutun SKU'dur ama basligi bos
esit('gercek sablonda bulunur', bosSkuSutunu(BASLIK), 3);
esit('yazim farkli olsa da', bosSkuSutunu(['Satıcı Stok Kodu', '', 'Barkod']), 1);
// Dolu basligin uzerine YAZILMAZ
esit('dolu baslik korunur', bosSkuSutunu(['Satıcı stok kodu', 'SKU', 'Barkod']), null);
esit('stok kodu yoksa', bosSkuSutunu(['Ürün Adı', '']), null);
esit('stok kodu son sutunsa', bosSkuSutunu(['Barkod', 'Satıcı stok kodu']), null);
esit('bos girdi', bosSkuSutunu([]), null);
esit('gecersiz girdi', bosSkuSutunu(null), null);


console.log('\n═══ OKUNAMAYAN SKU BASLIGI ═══');
// Sablonda zengin metin oldugu icin kutuphane bos okuyor; geri yazilmali
esit('gercek sablonda bulunur', bosSkuSutunu(BASLIK), 3);
esit('baslik metni', SKU_BASLIGI.startsWith('SKU (Kampanyaya dahil etmek istemediğiniz'), true);
esit('yazim farkli olsa da', bosSkuSutunu(['Satıcı Stok Kodu', '', 'Barkod']), 1);
// Baslik okunabildiyse UZERINE YAZILMAZ
esit('dolu baslik korunur', bosSkuSutunu(['Satıcı stok kodu', SKU_BASLIGI, 'Barkod']), null);
esit('stok kodu yoksa', bosSkuSutunu(['Ürün Adı', '']), null);
esit('stok kodu son sutunsa', bosSkuSutunu(['Barkod', 'Satıcı stok kodu']), null);
esit('bos girdi', bosSkuSutunu([]), null);
esit('gecersiz girdi', bosSkuSutunu(null), null);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
