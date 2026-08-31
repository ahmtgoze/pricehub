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


console.log('\n═══ KARGO / PAKETLEME / HIZMET BEDELI / KURUMLAR VERGISI ═══');
{
  const urun = { id: 'u1', cost: 100, printing_cost: 0, extra_cost: 0, category_id: 'k1' };
  const d2 = {
    productCost: 100, printingCost: 0, extraCost: 0, packagingCost: 5,
    commissionRate: 20, targetProfitRate: 30,
    kullanilanTarifeler: [{ id: 't1', price: 50 }],
    serviceFeeType: 'fixed_per_order', serviceFeeAmount: 13.18,
    sameDayServiceFeeAmount: null, corporateTaxRate: 25,
  };
  const fiyat = { product_id: 'u1', platform_id: 'p1', calculation_details: JSON.stringify(d2) };
  const kom = [{ platform_id: 'p1', category_id: 'k1', commission_rate: 20, target_profit_rate: 30 }];
  const plat = { id: 'p1', service_fee_type: 'fixed_per_order', service_fee_amount: 13.18,
                 same_day_delivery_service_fee: null, corporate_tax_rate: 25 };
  const temel = { kargoTarifeleri: [{ id: 't1', price: 50, is_active: true }],
                  platformlar: [plat], paketMaliyeti: () => 5 };
  const bul = (ekle) => bayatFiyatlariBul([fiyat], [urun], kom, { ...temel, ...ekle });

  esit('hicbir sey degismediyse bayat degil', bul({}).bayatSayisi, 0);

  // Kullanicinin bildirdigi asil senaryo: yeni kargo ucretleri geldi.
  esit('kargo zamlandi',
    bul({ kargoTarifeleri: [{ id: 't1', price: 60, is_active: true }] }).sebepler.kargo, 1);
  esit('tarife pasife alindi',
    bul({ kargoTarifeleri: [{ id: 't1', price: 50, is_active: false }] }).sebepler.kargo, 1);
  // Silinme, BASKA tarifeler dururken o tarifenin yok olmasidir. Bos liste
  // "veri verilmedi" anlamina gelir; o durumda yargilanmaz.
  esit('tarife silindi',
    bul({ kargoTarifeleri: [{ id: 'baska', price: 10, is_active: true }] }).sebepler.kargo, 1);
  esit('tarife listesi hic verilmediyse yargilanmaz',
    bul({ kargoTarifeleri: [] }).sebepler.kargo, 0);

  esit('paketleme degisti', bul({ paketMaliyeti: () => 9 }).sebepler.paketleme, 1);

  esit('hizmet bedeli tutari degisti',
    bul({ platformlar: [{ ...plat, service_fee_amount: 15 }] }).sebepler.hizmetBedeli, 1);
  esit('hizmet bedeli tipi degisti',
    bul({ platformlar: [{ ...plat, service_fee_type: 'percent_of_sale' }] }).sebepler.hizmetBedeli, 1);

  esit('kurumlar vergisi degisti',
    bul({ platformlar: [{ ...plat, corporate_tax_rate: 20 }] }).sebepler.kurumlarVergisi, 1);

  // ESKI KAYITLAR: bu alanlar yokken hesaplanmis fiyatlar yanlislikla
  // "bayat" sayilmamali; karsilastirilacak veri yok demektir.
  const eskiFiyat = { product_id: 'u1', platform_id: 'p1', calculation_details: JSON.stringify({
    productCost: 100, printingCost: 0, extraCost: 0, packagingCost: 5,
    commissionRate: 20, targetProfitRate: 30 }) };
  const eski = bayatFiyatlariBul([eskiFiyat], [urun], kom, temel);
  esit('eski kayit kargodan bayat sayilmaz', eski.sebepler.kargo, 0);
  esit('eski kayit hizmet bedelinden bayat sayilmaz', eski.sebepler.hizmetBedeli, 0);
  esit('eski kayit kurumlar vergisinden bayat sayilmaz', eski.sebepler.kurumlarVergisi, 0);

  // Ek veri verilmezse eski cagri sekli calismaya devam etmeli.
  esit('ek veri olmadan cagrilabilir', bayatFiyatlariBul([fiyat], [urun], kom).bayatSayisi, 0);
}

console.log(`GECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
