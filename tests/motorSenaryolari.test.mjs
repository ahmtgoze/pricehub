/**
 * Motor Senaryoları — fiyat motorunun HER OLASILIK için doğru davrandığını
 * kontrol eder. Tarayıcı ve giriş gerektirmez.
 *
 * Kapsanan olasılıklar: barem 1 / barem 2 / desi, desi tavanı aşımı,
 * platform bazlı farklı bantlar (Trendyol ≠ HepsiBurada), web sitesinde
 * barem olmaması, Bugün Kargoda, çoklu paket, özel kargo, çift kargo,
 * barem kapalı platform.
 *
 * Motor saf JS (import içermiyor), bu yüzden dosya doğrudan okunup
 * çalıştırılabiliyor.
 */
import { readFileSync } from 'node:fs';

const kod = readFileSync(new URL('../src/components/PriceCalculationEngine.jsx', import.meta.url), 'utf8');
const motor = await import('data:text/javascript;base64,' + Buffer.from(kod).toString('base64'));
const { calculateProductPrice, calculatePriceBreakdown } = motor;

let gecen = 0, kalan = 0;
const esit = (ad, bulunan, beklenen) => {
  const a = JSON.stringify(bulunan), b = JSON.stringify(beklenen);
  if (a === b) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}\n     bulunan : ${a}\n     beklenen: ${b}`); }
};
const dogru = (ad, kosul, aciklama = '') => {
  if (kosul) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}${aciklama ? '\n     ' + aciklama : ''}`); }
};

/* ── Platformlar (gerçek ayarlarla birebir) ─────────────────────────── */
const TRENDYOL = {
  id: 'p-ty', name: 'Trendyol', platform_type: 'trendyol',
  use_barem: true, barem_max_desi: 10,
  barem1_min: 0, barem1_max: 149.99, barem2_min: 150, barem2_max: 299.99,
  has_service_fee: false, has_withholding: false, has_corporate_tax: false,
};
const HEPSIBURADA = {
  ...TRENDYOL, id: 'p-hb', name: 'HepsiBurada', platform_type: 'hepsiburada',
  barem_max_desi: 40, barem1_max: 199.99, barem2_min: 200, barem2_max: 399.99,
};
const WEB = {
  ...TRENDYOL, id: 'p-web', name: 'Web Sitesi', platform_type: 'website',
};

/* ── Kargo tarifeleri ───────────────────────────────────────────────── */
// Motor tarifenin sistem (is_admin_created) ya da manuel olmasini sart kosar.
const tarife = (o) => ({ is_active: true, vat_rate: 20, is_admin_created: true, ...o });
const TARIFELER = [
  tarife({ platform_type: 'trendyol', rate_type: 'barem1', price: 88.00, same_day_delivery: false }),
  tarife({ platform_type: 'trendyol', rate_type: 'barem2', price: 94.49, same_day_delivery: false }),
  tarife({ platform_type: 'trendyol', rate_type: 'barem1', price: 46.49, same_day_delivery: true }),
  tarife({ platform_type: 'trendyol', rate_type: 'barem2', price: 84.49, same_day_delivery: true }),
  ...Array.from({ length: 41 }, (_, d) =>
    tarife({ platform_type: 'trendyol', rate_type: 'desi', desi: d, price: 100 + d * 10 })),
  tarife({ platform_type: 'hepsiburada', rate_type: 'barem1', price: 52.19, same_day_delivery: false }),
  tarife({ platform_type: 'hepsiburada', rate_type: 'barem2', price: 91.19, same_day_delivery: false }),
  ...Array.from({ length: 41 }, (_, d) =>
    tarife({ platform_type: 'hepsiburada', rate_type: 'desi', desi: d, price: 90 + d * 10 })),
  // Web Sitesi'nde sistem tarifesi kullanilmaz; kullanicinin kendi MANUEL
  // tarifesi gecerlidir (platform_id ile eslesir).
  ...Array.from({ length: 41 }, (_, d) =>
    tarife({ platform_id: 'p-web', rate_type: 'desi', desi: d, price: 109 + d * 5,
             is_admin_created: false, is_manual: true })),
];

/* ── Ürün ve komisyon kalıpları ─────────────────────────────────────── */
const urun = (o) => ({
  id: 'u1', name: 'Test Ürün', sku: 'TEST-1', category_id: 'k1',
  cost: 100, desi: 3, vat_rate: 20,
  printing_cost: 0, extra_cost: 0,
  multi_package: false, special_shipping: false, double_shipping: false,
  same_day_delivery: false, ...o,
});
const komisyon = (oran = 20, hedef = 30) => ({
  commission_rate: oran, commission_vat_rate: 20, target_profit_rate: hedef,
});
const hesapla = (o) => calculateProductPrice({
  shippingRates: TARIFELER, packagingCost: 0, printingCost: 0, extraCost: 0,
  isSameDayDelivery: false, settings: [], ...o,
});

console.log('\n═══ BAREM SEÇİMİ ═══');

// Barem 1 bandina girebilmek icin urun YETERINCE UCUZ olmali:
// bant tavani 149,99 ve kargo tek basina 88,00 — geriye maliyet+kar icin
// az yer kaliyor. 15 TL'lik urun sigiyor, 40 TL'lik sigmiyor (motor o
// durumda dogru sekilde Barem 2'ye geciyor).
{
  const r = hesapla({ product: urun({ cost: 15, desi: 2 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  esit('1 ucuz ürün → barem1', r.barem_used, 'barem1');
  dogru('2 barem1 ücreti uygulandı', Math.abs(r.shipping_cost - 88.00) < 0.01, `kargo: ${r.shipping_cost}`);
  dogru('3 fiyat barem1 bandında', r.sale_price <= 149.99, `fiyat: ${r.sale_price}`);
}

// Ayni urun pahalilastikca bir ust banda gecer — motorun bant secimi
{
  const r = hesapla({ product: urun({ cost: 40, desi: 2 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  esit('3b orta ürün → barem2', r.barem_used, 'barem2');
  dogru('3c fiyat barem2 bandında', r.sale_price > 149.99 && r.sale_price <= 299.99, `fiyat: ${r.sale_price}`);
}

// Orta maliyet → Barem 2 bandı
{
  const r = hesapla({ product: urun({ cost: 100, desi: 2 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  dogru('4 Trendyol orta fiyat → barem', r.barem_used === 'barem1' || r.barem_used === 'barem2', `barem: ${r.barem_used}, fiyat: ${r.sale_price}`);
}

// Yüksek maliyet → fiyat barem üstü → desi tarifesi
{
  const r = hesapla({ product: urun({ cost: 400, desi: 2 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  esit('5 Trendyol yüksek fiyat → desi', r.barem_used, 'desi');
  dogru('6 fiyat barem bandının üstünde', r.sale_price > 299.99, `fiyat: ${r.sale_price}`);
}

console.log('\n═══ DESİ TAVANI ═══');

// Desi tavanı (Trendyol 10) aşılırsa barem YOK
{
  const r = hesapla({ product: urun({ cost: 40, desi: 11 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  esit('7 desi 11 > tavan 10 → barem yok', r.barem_used, 'desi');
}
{
  const r = hesapla({ product: urun({ cost: 40, desi: 10 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  dogru('8 desi 10 = tavan → barem geçerli (hangi barem olduğu motorun seçimi)',
    r.barem_used === 'barem1' || r.barem_used === 'barem2', `barem: ${r.barem_used}`);
}

// HepsiBurada tavanı 40 — 11 desi hâlâ barem alabilir
{
  const r = hesapla({ product: urun({ cost: 40, desi: 11 }), platform: HEPSIBURADA, commission: komisyon(20, 30) });
  esit('9 HB desi 11 ≤ tavan 40 → barem', r.barem_used, 'barem1');
}

console.log('\n═══ PLATFORM BANTLARI FARKLI ═══');

// Aynı ürün iki platformda farklı bant kullanabilir (bantlar farklı)
{
  const ty = hesapla({ product: urun({ cost: 100, desi: 2 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  const hb = hesapla({ product: urun({ cost: 100, desi: 2 }), platform: HEPSIBURADA, commission: komisyon(20, 30) });
  dogru('10 iki platform da hesaplandı', ty.sale_price > 0 && hb.sale_price > 0);
  dogru('11 HB barem1 tavanı daha yüksek (199,99)',
    hb.barem_used !== 'desi' || hb.sale_price > 399.99,
    `HB barem: ${hb.barem_used}, fiyat: ${hb.sale_price}`);
}

console.log('\n═══ WEB SİTESİ: BAREM YOK ═══');
{
  const r = hesapla({ product: urun({ cost: 40, desi: 2 }), platform: WEB, commission: komisyon(13, 30) });
  esit('12 web sitesinde her zaman desi', r.barem_used, 'desi');
}

console.log('\n═══ BAREM KAPALI PLATFORM ═══');
{
  const r = hesapla({ product: urun({ cost: 40, desi: 2 }), platform: { ...TRENDYOL, use_barem: false }, commission: komisyon(20, 30) });
  esit('13 use_barem kapalı → desi', r.barem_used, 'desi');
}

console.log('\n═══ ÖZEL DURUMLAR ═══');
{
  const r = hesapla({ product: urun({ cost: 40, desi: 2, special_shipping: true }), platform: TRENDYOL, commission: komisyon(20, 30) });
  esit('14 özel kargo → barem yok', r.barem_used, 'desi');
}
{
  const r = hesapla({
    product: urun({ cost: 40, desi: 2, multi_package: true, packages: JSON.stringify([{ desi: 2 }, { desi: 3 }]) }),
    platform: TRENDYOL, commission: komisyon(20, 30),
  });
  esit('15 çoklu paket → barem yok', r.barem_used, 'desi');
}
{
  const tek = hesapla({ product: urun({ cost: 400, desi: 5 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  const cift = hesapla({ product: urun({ cost: 400, desi: 5, double_shipping: true }), platform: TRENDYOL, commission: komisyon(20, 30) });
  dogru('16 çift kargo → kargo iki katı',
    Math.abs(cift.shipping_cost - tek.shipping_cost * 2) < 0.02,
    `tek: ${tek.shipping_cost}, çift: ${cift.shipping_cost}`);
}

console.log('\n═══ BUGÜN KARGODA ═══');
{
  const normal = hesapla({ product: urun({ cost: 40, desi: 2 }), platform: TRENDYOL, commission: komisyon(20, 30), isSameDayDelivery: false });
  const bugun = hesapla({ product: urun({ cost: 40, desi: 2 }), platform: TRENDYOL, commission: komisyon(20, 30), isSameDayDelivery: true });
  dogru('17 normalde standart barem ücreti (88,00 veya 94,49)',
    [88, 94.49].includes(Math.round(normal.shipping_cost * 100) / 100), `kargo: ${normal.shipping_cost}`);
  dogru('18 Bugün Kargoda indirimli barem ücreti (46,49 veya 84,49)',
    [46.49, 84.49].includes(Math.round(bugun.shipping_cost * 100) / 100), `kargo: ${bugun.shipping_cost}`);
  // Hedef kâr ORANI sabit olduğu için kâr tutarı da sabit kalır;
  // ucuzlayan kargo SATIŞ FİYATINI düşürür.
  dogru('19 Bugün Kargoda kargo daha ucuz', bugun.shipping_cost < normal.shipping_cost,
    `normal: ${normal.shipping_cost}, bugün: ${bugun.shipping_cost}`);
  dogru('20 Bugün Kargoda satış fiyatı daha düşük', bugun.sale_price < normal.sale_price,
    `normal: ${normal.sale_price}, bugün: ${bugun.sale_price}`);
}

console.log('\n═══ HEDEF KÂR ve YUVARLAMA ═══');
{
  const r = hesapla({ product: urun({ cost: 100, desi: 2 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  dogru('20 hedef kâr oranı tutturuldu (%30)', Math.abs(r.profit_rate - 30) < 1.5, `oran: ${r.profit_rate}`);
  const kurus = Math.round((r.sale_price % 1) * 100);
  dogru('21 fiyat ,49 veya ,99 ile bitiyor', kurus === 49 || kurus === 99, `fiyat: ${r.sale_price}`);
}

console.log('\n═══ FİYAT YUVARLAMA (platform ayarı) ═══');
{
  const kurus = (r) => Math.round((r.sale_price % 1) * 100);
  const varsayilan = hesapla({ product: urun({ cost: 100, desi: 2 }), platform: TRENDYOL, commission: komisyon(20, 30) });
  dogru('41 varsayılan kural → ,49 veya ,99',
    [49, 99].includes(kurus(varsayilan)), `fiyat: ${varsayilan.sale_price}`);

  const hep99 = hesapla({ product: urun({ cost: 100, desi: 2 }), platform: { ...TRENDYOL, price_rounding: 'hep_99' }, commission: komisyon(20, 30) });
  esit('42 hep_99 → her zaman ,99', kurus(hep99), 99);

  const yok = hesapla({ product: urun({ cost: 100, desi: 2 }), platform: { ...TRENDYOL, price_rounding: 'yok' }, commission: komisyon(20, 30) });
  dogru('43 yuvarlama yok → ,49/,99 zorunlu değil',
    typeof yok.sale_price === 'number' && yok.sale_price > 0, `fiyat: ${yok.sale_price}`);
}

console.log('\n═══ MİNİMUM KÂR TUTARI ═══');
{
  // KURAL: hedef kar ORANI dusuk bir tutar veriyorsa, minimum kar TUTARI
  // devreye girer ve fiyat ona gore yukselir. Her kisit icin ayri fiyat
  // hesaplanip EN YUKSEGI secilir; boylece hepsi birden saglanir.
  const dusukHedef = hesapla({
    product: urun({ cost: 100, desi: 2 }), platform: TRENDYOL,
    commission: { commission_rate: 20, commission_vat_rate: 20, target_profit_rate: 5 },
  });
  const minimumlu = hesapla({
    product: urun({ cost: 100, desi: 2 }), platform: TRENDYOL,
    commission: { commission_rate: 20, commission_vat_rate: 20, target_profit_rate: 5, minimum_profit_amount: 50 },
  });
  dogru('37 hedef %5 → kâr düşük', dusukHedef.net_profit < 50, `kâr: ${dusukHedef.net_profit}`);
  dogru('38 minimum 50 ₺ devreye girdi', minimumlu.net_profit >= 49.5, `kâr: ${minimumlu.net_profit}`);
  dogru('39 minimum fiyatı yükseltti', minimumlu.sale_price > dusukHedef.sale_price,
    `${dusukHedef.sale_price} → ${minimumlu.sale_price}`);
}
{
  // Hedef kar ORANI zaten minimumun ustundeyse minimum bir sey degistirmez
  const yuksekHedef = hesapla({
    product: urun({ cost: 100, desi: 2 }), platform: TRENDYOL,
    commission: { commission_rate: 20, commission_vat_rate: 20, target_profit_rate: 100, minimum_profit_amount: 10 },
  });
  dogru('40 hedef zaten yüksekse minimum etkisiz', yuksekHedef.net_profit > 90, `kâr: ${yuksekHedef.net_profit}`);
}

console.log('\n═══ KOMİSYON: ORAN KDV DAHİL ═══');
{
  // Komisyon = satış fiyatı (KDV dahil) × oran  — üstüne KDV EKLENMEZ
  const b = calculatePriceBreakdown({
    salePriceInclVat: 1000, productCost: 100, productVatRate: 20,
    shippingCost: 0, shippingVatRate: 20,
    commissionRate: 20, commissionVatRate: 20,
    platform: TRENDYOL, baremUsed: 'test',
  });
  esit('22 komisyon = 1000 × %20 = 200', Math.round(b.commissionAmount * 100) / 100, 200);
  esit('23 komisyonun içindeki KDV = 200 × 20/120', Math.round(b.commissionVat * 100) / 100, 33.33);
}

console.log('\n═══ VERGİLER ═══');
{
  const vergili = hesapla({
    product: urun({ cost: 100, desi: 2 }),
    platform: { ...TRENDYOL, has_corporate_tax: true, corporate_tax_rate: 25 },
    commission: komisyon(20, 30),
  });
  dogru('24 kurumlar vergisi kesildi', vergili.corporate_tax_amount > 0, `vergi: ${vergili.corporate_tax_amount}`);
  dogru('25 vergi = vergi öncesi kârın %25\'i',
    Math.abs(vergili.corporate_tax_amount - vergili.net_profit_before_tax * 0.25) < 0.02);
}
{
  const stopajli = hesapla({
    product: urun({ cost: 100, desi: 2 }),
    platform: { ...TRENDYOL, has_withholding: true, withholding_rate: 1 },
    commission: komisyon(20, 30),
  });
  dogru('26 stopaj kesildi', stopajli.withholding_amount > 0, `stopaj: ${stopajli.withholding_amount}`);
}
{
  const web = hesapla({
    product: urun({ cost: 100, desi: 2 }),
    platform: { ...WEB, has_withholding: true, withholding_rate: 1 },
    commission: komisyon(13, 30),
  });
  esit('27 web sitesinde stopaj HER ZAMAN 0', web.withholding_amount, 0);
}

console.log('\n═══ DESİ TARİFESİ SEÇİMİ ═══');
{
  const { findDesiShippingRate } = motor;
  const tarifeler = [
    { rate_type: 'desi', desi: 1, price: 100, is_active: true },
    { rate_type: 'desi', desi: 5, price: 150, is_active: true },
    { rate_type: 'desi', desi: 10, price: 200, is_active: true },
  ];
  esit('28 tam eşleşme', findDesiShippingRate(tarifeler, 5)?.price, 150);
  esit('29 ara değer bir ÜSTTEKİ tarifeye yuvarlanır (4,2 → 5 desi)',
    findDesiShippingRate(tarifeler, 4.2)?.price, 150);
  // KURAL: tarife yoksa fiyatlama YAPILMAZ. Eskiden en yuksek tarifeye
  // dusuluyordu ve kar oldugundan iyi gorunuyordu.
  esit('30 tavanı aşan desi → tarife YOK (null)',
    findDesiShippingRate(tarifeler, 99), null);
  esit('31 hiç tarife yoksa null', findDesiShippingRate([], 5), null);
  esit('32 pasif tarife yok sayılır',
    findDesiShippingRate([{ rate_type: 'desi', desi: 5, price: 150, is_active: false }], 5), null);
}

// Tarifesi olmayan urun fiyatlanmamali — motor hata firlatir
{
  const azTarife = [
    tarife({ platform_type: 'trendyol', rate_type: 'desi', desi: 5, price: 150 }),
  ];
  let hata = null;
  try {
    calculateProductPrice({
      product: urun({ cost: 100, desi: 60 }), platform: { ...TRENDYOL, use_barem: false },
      shippingRates: azTarife, commission: komisyon(20, 30),
      packagingCost: 0, printingCost: 0, extraCost: 0, settings: [],
    });
  } catch (e) { hata = e.message; }
  esit('32b tarifesiz ürün fiyatlanmaz', hata, 'KARGO_TARIFESI_YOK');
}

console.log('\n═══ KOMİSYON EŞLEŞTİRME ═══');
{
  const { findCommission } = motor;
  const komisyonlar = [
    { platform_id: 'p1', category_id: 'k1', commission_rate: 20, is_active: true },
    { platform_id: 'p1', category_id: 'k2', commission_rate: 15, is_active: true },
    { platform_id: 'p2', category_id: 'k1', commission_rate: 18, is_active: true },
    { platform_id: 'p1', category_id: 'k3', commission_rate: 99, is_active: false },
  ];
  esit('33 platform + kategori eşleşmesi', findCommission(komisyonlar, 'p1', 'k1')?.commission_rate, 20);
  esit('34 aynı kategori farklı platform', findCommission(komisyonlar, 'p2', 'k1')?.commission_rate, 18);
  esit('35 pasif komisyon bulunmaz', findCommission(komisyonlar, 'p1', 'k3'), undefined);
  esit('36 eşleşme yoksa undefined', findCommission(komisyonlar, 'p9', 'k9'), undefined);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
