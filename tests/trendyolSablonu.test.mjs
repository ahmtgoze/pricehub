import { TRENDYOL_SAYFA, TRENDYOL_BASLIKLAR, TRENDYOL_NOT, TRENDYOL_DROPDOWN,
         trendyolSatirlari, barkodsuzlar } from '../src/lib/trendyolSablonu.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n═══ SABLON YAPISI ═══');
// Trendyol panelinin bekledigi tam adlar; degisirse dosya kabul edilmez.
esit('sayfa adi', TRENDYOL_SAYFA, 'Güncelleme Bilgileri');
esit('basliklar', TRENDYOL_BASLIKLAR,
  ['Barkod', 'Trendyol Satış Fiyatı (TSF) (KDV Dahil)', 'Ürün Stok Adedi']);
esit('not barkod zorunlulugunu soyluyor', TRENDYOL_NOT.includes('"Barkod" bilgisi zorunludur'), true);
esit('dropdown 6 satir', TRENDYOL_DROPDOWN.length, 6);

console.log('\n═══ SATIRLAR ═══');
{
  const f = [
    { barkod: '869001', system_price: 123.456, stock_quantity: 7 },
    { barkod: '869002', system_price: 99.9,    stock_quantity: 0 },
  ];
  const r = trendyolSatirlari(f);
  esit('sutun sayisi 3', r[0].length, 3);
  esit('barkod ilk sutun', r[0][0], '869001');
  esit('fiyat kurusa yuvarlanir', r[0][1], 123.46);
  // STOK BOS: pazaryeri listesi yuklendigi andaki fotograf geri yazilirsa
  // o tarihten sonra degisen gercek stok eski degere donerdi.
  esit('stok bos birakilir', r[0][2], null);
  esit('stok 0 olsa da bos', r[1][2], null);
}

console.log('\n═══ BARKOD ZORUNLU ═══');
{
  const f = [
    { barkod: '869001', system_price: 100 },
    { barkod: '', system_price: 100 },
    { barkod: null, system_price: 100 },
    { barkod: '   ', system_price: 100 },
    { system_price: 100 },
  ];
  esit('barkodsuzlar atlanir', trendyolSatirlari(f).length, 1);
  esit('atlananlar sayilir', barkodsuzlar(f).length, 4);
  esit('barkod bosluklardan arinir', trendyolSatirlari([{ barkod: ' 8690 ', system_price: 5 }])[0][0], '8690');
}

console.log('\n═══ GECERSIZ FIYAT ═══');
esit('fiyat 0 ise bos', trendyolSatirlari([{ barkod: '1', system_price: 0 }])[0][1], null);
esit('fiyat negatifse bos', trendyolSatirlari([{ barkod: '1', system_price: -5 }])[0][1], null);
esit('fiyat metin gelirse cevrilir', trendyolSatirlari([{ barkod: '1', system_price: '12.5' }])[0][1], 12.5);
esit('bos girdi', trendyolSatirlari([]), []);
esit('null girdi', trendyolSatirlari(null), []);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
