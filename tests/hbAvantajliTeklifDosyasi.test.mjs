import { excelTarihi, hbTeklifSutunlari, hbTeklifleriOku, dosyaTarihAraligi, teklifAralikta } from '../src/lib/hbAvantajliTeklifDosyasi.js';
let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n=== EXCEL TARIHI ===');
esit('seri sayi 9 Eylul 00:20', excelTarihi(46274.01427371528), { tarih: '2026-09-09', saat: '00:20' });
esit('seri sayi 15 Eylul 23:59', excelTarihi(46280.99930555555), { tarih: '2026-09-15', saat: '23:59' });
esit('gun/ay/yil metni', excelTarihi('09/09/2026 00:20'), { tarih: '2026-09-09', saat: '00:20' });
esit('iso metni', excelTarihi('2026-09-15T23:59'), { tarih: '2026-09-15', saat: '23:59' });
esit('bos', excelTarihi(null), null);

// Avantajlı_Teklifler-15-09-2026-11_35.xlsx — GERCEK basliklar ve ilk satir
const YENI = [
  ['Ürün Adı','Satıcı Stok Kodu','SKU','Kategori','Stok','Başlangıç','Bitiş','Mevcut Fiyat','Mevcut Komisyon','Teklif 1',null,'Teklif 2',null,'Teklif 3',null,'Fiyatı Güncelle','Teklif Kodu'],
  [null,null,null,null,null,null,null,null,null,'Üst Fiyat','Komisyon\n','Üst Fiyat','Komisyon\n','Üst Fiyat','Komisyon\n'],
  ['Kargo Toptancısı Gri Cepli Kargo Poşeti 100 Adet 35x45+5 cm','HBCV000025ZQXA','HBCV000025ZQXA','Kırtasiye',872,46274.01427371528,46280.99930555555,554.49,'17,00 %',268,'5,2 %',255,'4,6 %',241,'4,1 %',null,138361255],
  [],
];
console.log('\n=== YENI BICIM (iki baslik satiri) ===');
{
  const s = hbTeklifSutunlari(YENI);
  esit('baslik 0, veri 2', [s.baslik, s.veri], [0, 2]);
  esit('sku/mevcut fiyat/komisyon/fiyat guncelle', [s.sku, s.mevcutFiyat, s.mevcutKomisyon, s.fiyatGuncelle], [2, 7, 8, 15]);
  esit('teklif sutunlari', s.teklifler, { 1: { fiyat: 9, komisyon: 10 }, 2: { fiyat: 11, komisyon: 12 }, 3: { fiyat: 13, komisyon: 14 } });
  const { teklifler } = hbTeklifleriOku(YENI);
  esit('bir teklif okunur (alt baslik ve bos satir atlanir)', teklifler.length, 1);
  const t = teklifler[0];
  esit('sku', t.sku, 'HBCV000025ZQXA');
  esit('mevcut fiyat/komisyon', [t.mevcutFiyat, t.mevcutKomisyon], [554.49, '17,00 %']);
  esit('teklif 1-3', [t.teklif1Fiyat, t.teklif1Komisyon, t.teklif2Fiyat, t.teklif2Komisyon, t.teklif3Fiyat, t.teklif3Komisyon], [268, '5,2 %', 255, '4,6 %', 241, '4,1 %']);
  esit('tarihler', [t.baslangic, t.baslangicSaat, t.bitis, t.bitisSaat], ['2026-09-09', '00:20', '2026-09-15', '23:59']);
  esit('teklif kodu', t.teklifKodu, 138361255);
  esit('excel satir no', t.satir, 2);
  esit('dosya araligi', dosyaTarihAraligi(teklifler), { baslangic: '2026-09-09', bitis: '2026-09-15' });
}

const ESKI = [
  ['Ürün Adı','Satıcı Stok Kodu','SKU','Kategori','Stok','Güncel Fiyat','Güncel Komisyon','Teklif 1 \nKatılabileceğiniz Maximum Fiyat\n','Komisyon Teklifi 1','Teklif 2 Katılabileceğiniz Maximum Fiyat','Komisyon Teklifi 2','Teklif 3 Katılabileceğiniz Maximum Fiyat','Komisyon Teklifi 3','Fiyat Gir','Teklif Kodu'],
  ['Urun','A1','HBCV1','Kırtasiye',10,500,'17,00 %',400,'7,4 %',380,'6,0 %',350,'5,0 %',null,1],
];
console.log('\n=== ESKI BICIM (tek baslik satiri) ===');
{
  const s = hbTeklifSutunlari(ESKI);
  esit('veri 1. satirdan', s.veri, 1);
  esit('fiyat gir sutunu', s.fiyatGuncelle, 13);
  esit('teklif sutunlari', s.teklifler, { 1: { fiyat: 7, komisyon: 8 }, 2: { fiyat: 9, komisyon: 10 }, 3: { fiyat: 11, komisyon: 12 } });
  const t = hbTeklifleriOku(ESKI).teklifler[0];
  esit('degerler', [t.mevcutFiyat, t.teklif1Fiyat, t.teklif3Komisyon, t.baslangic], [500, 400, '5,0 %', '']);
  esit('tarihsiz teklif kisitsiz', teklifAralikta(t, { baslangic: '2026-09-15', bitis: '2026-09-22' }), true);
}

console.log('\n=== ARALIK KURALI ===');
const T = { baslangic: '2026-09-09', bitis: '2026-09-15' };
esit('icinde', teklifAralikta(T, { baslangic: '2026-09-09', bitis: '2026-09-15' }), true);
esit('sonraki hafta secildi -> disi', teklifAralikta(T, { baslangic: '2026-09-16', bitis: '2026-09-22' }), false);
esit('aralik secilmedi -> kisitsiz', teklifAralikta(T, null), true);
esit('SKU yok -> null', hbTeklifSutunlari([['a','b']]), null);
console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`); if (kalan) process.exit(1);
