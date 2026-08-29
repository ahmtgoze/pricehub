import { bayatFiyatlariBul, gecerliMaliyet, detayCoz } from '../src/lib/fiyatGuncelligi.js';

let gecen = 0, kalan = 0;
const esit = (ad, bulunan, beklenen) => {
  const a = JSON.stringify(bulunan), b = JSON.stringify(beklenen);
  if (a === b) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}\n     bulunan : ${a}\n     beklenen: ${b}`); }
};

const detay = (o) => JSON.stringify({
  productCost: 100, commissionRate: 20, targetProfitRate: 30,
  printingCost: 0, extraCost: 0, ...o,
});
const fiyat = (o = {}) => ({ product_id: 'u1', platform_id: 'p1', calculation_details: detay(o.detay || {}), ...o });
const urun = (o = {}) => ({ id: 'u1', category_id: 'k1', cost: 100, printing_cost: 0, extra_cost: 0, ...o });
const kom = (o = {}) => ([{ platform_id: 'p1', category_id: 'k1', commission_rate: 20, target_profit_rate: 30, is_active: true, ...o }]);

// --- degisiklik yoksa ---
esit('1 hiçbir şey değişmediyse bayat yok',
  bayatFiyatlariBul([fiyat()], [urun()], kom()).bayatSayisi, 0);

// --- her sebep ayri ayri ---
esit('2 maliyet değişti', bayatFiyatlariBul([fiyat()], [urun({ cost: 150 })], kom()).sebepler.maliyet, 1);
esit('3 komisyon değişti', bayatFiyatlariBul([fiyat()], [urun()], kom({ commission_rate: 25 })).sebepler.komisyon, 1);
esit('4 hedef kâr değişti', bayatFiyatlariBul([fiyat()], [urun()], kom({ target_profit_rate: 40 })).sebepler.hedefKar, 1);
esit('5 baskı maliyeti değişti', bayatFiyatlariBul([fiyat()], [urun({ printing_cost: 5 })], kom()).sebepler.baski, 1);
esit('6 ek maliyet değişti', bayatFiyatlariBul([fiyat()], [urun({ extra_cost: 7 })], kom()).sebepler.ekMaliyet, 1);

// --- kurus farki degisiklik sayilmaz ---
esit('7 1 kuruşun altı fark sayılmaz',
  bayatFiyatlariBul([fiyat()], [urun({ cost: 100.001 })], kom()).bayatSayisi, 0);

// --- ayni urun birden fazla sebep ---
{
  const r = bayatFiyatlariBul([fiyat()], [urun({ cost: 150, extra_cost: 3 })], kom({ commission_rate: 25 }));
  esit('8 aynı ürün tek kez sayılır', r.bayatSayisi, 1);
  esit('9 sebeplerin hepsi listelenir', r.urunler[0].sebepler.sort(), ['ekMaliyet', 'komisyon', 'maliyet']);
}

// --- referansli urun: baz maliyet daha yuksekse o gecerli (motorla ayni kural) ---
esit('10 referanslı üründe yüksek baz maliyet geçerli',
  gecerliMaliyet({ cost: 100, base_cost: 150, ref_product_id: 'r1' }), 150);
esit('11 referanssız üründe baz maliyet yok sayılır',
  gecerliMaliyet({ cost: 100, base_cost: 150 }), 100);
esit('12 baz maliyet düşükse maliyet geçerli',
  gecerliMaliyet({ cost: 100, base_cost: 50, ref_product_id: 'r1' }), 100);

// --- dayaniklilik ---
esit('13 detay yoksa karşılaştırma yapılmaz',
  bayatFiyatlariBul([{ product_id: 'u1', platform_id: 'p1', calculation_details: null }], [urun({ cost: 999 })], kom()).bayatSayisi, 0);
esit('14 bozuk detay atlanır',
  bayatFiyatlariBul([{ product_id: 'u1', platform_id: 'p1', calculation_details: '{bozuk' }], [urun({ cost: 999 })], kom()).bayatSayisi, 0);
esit('15 ürün bulunamazsa atlanır',
  bayatFiyatlariBul([fiyat({ product_id: 'yok' })], [urun()], kom()).bayatSayisi, 0);
esit('16 komisyon yoksa yalnız maliyet bakılır',
  bayatFiyatlariBul([fiyat()], [urun({ cost: 150 })], []).sebepler.maliyet, 1);
esit('17 pasif komisyon dikkate alınmaz',
  bayatFiyatlariBul([fiyat()], [urun()], kom({ commission_rate: 99, is_active: false })).bayatSayisi, 0);
esit('18 boş listeler', bayatFiyatlariBul([], [], []).bayatSayisi, 0);
esit('19 null listeler', bayatFiyatlariBul(null, null, null).bayatSayisi, 0);

// --- cift kodlanmis JSON ---
esit('20 çift kodlanmış detay çözülür',
  detayCoz(JSON.stringify(detay({})))?.productCost, 100);

console.log(`GECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
