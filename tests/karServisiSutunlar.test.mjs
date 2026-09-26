/**
 * Servisin veri katmanı (supabase/functions/kar-hesapla/veri.ts) yalnız listelediği sütunları çeker.
 * Hesap kodu bir alanı okuyup o alan çekilmiyorsa değer sessizce `undefined` olur ve rakam yanlış çıkar
 * (gerçek örnek: `has_same_day_delivery` çekilmiyordu, Bugün Kargoda hizmet bedeli hiç uygulanmıyordu).
 *
 * FARK TESTİ: aynı istek iki kez hesaplanır — (a) tablonun TÜM sütunlarını taşıyan kayıtlarla, (b) yalnız
 * veri.ts'in çektiği sütunlarla. Çekilmeyen bir alan sonucu etkiliyorsa iki sonuç ayrışır. Test verisi,
 * her sütunun etkisi görünsün diye kurulmuştur: kullanıcı kaydı ile yönetici şablonu FARKLI değerler taşır,
 * pasif/başka türde "tuzak" kayıtlar vardır, ürünler paketli/referanslı/farklı KDV'lidir.
 * Sütun listeleri veri.ts'ten okunur; liste ile test ayrışamaz.
 * (Proxy ile "okunmayan alan" yakalama denendi: kodun kayıtları kopyalaması (spread) bekçiyi devre dışı bırakır.)
 */
import { readFileSync } from 'node:fs';

const lib = new URL('../src/lib/', import.meta.url).href;
const oku = (yol) => readFileSync(new URL(yol, import.meta.url), 'utf8');
const dataUrl = (kod) => 'data:text/javascript;base64,' + Buffer.from(kod).toString('base64');
const MOTOR = "'../components/PriceCalculationEngine.jsx'";
const motorUrl = dataUrl(oku('../src/components/PriceCalculationEngine.jsx').replaceAll("'../lib/", `'${lib}`));
const karHesabiUrl = dataUrl(oku('../src/lib/karHesabi.js').replace(MOTOR, `'${motorUrl}'`).replaceAll("'./", `'${lib}`));
const siparisKariUrl = dataUrl(oku('../src/lib/siparisKari.js').replace(MOTOR, `'${motorUrl}'`).replace("'./karHesabi.js'", `'${karHesabiUrl}'`).replaceAll("'./", `'${lib}`));
const { isle, istekiDogrula } = await import(dataUrl(
  oku('../src/lib/karServisi.js').replace("'./karHesabi.js'", `'${karHesabiUrl}'`).replace("'./siparisKari.js'", `'${siparisKariUrl}'`).replaceAll("'./", `'${lib}`),
));

const veriTs = oku('../supabase/functions/kar-hesapla/veri.ts');
const sutunlar = (ad) => new Set(veriTs.match(new RegExp(`const ${ad} = '([^']+)'`))[1].split(','));
const PLATFORM = sutunlar('PLATFORM'), TARIFE = sutunlar('TARIFE'), KOMISYON = sutunlar('KOMISYON'), URUN = sutunlar('URUN');

let gecen = 0, kalan = 0;
const dogru = (ad, kosul, aciklama = '') => {
  if (kosul) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}${aciklama ? '\n     ' + aciklama : ''}`); }
};
const daralt = (kayit, izinli) => Object.fromEntries([...izinli].filter((k) => k in kayit).map((k) => [k, kayit[k]]));

/* ── Platformlar: kullanıcı kaydı ile şablon BİLEREK farklı ────────────────────────────────── */
const SABLON = { id: 'sablon', platform_type: 'trendyol', is_system_admin: true, is_active: true, name: 'Trendyol',
  use_barem: true, barem_max_desi: 10, barem1_min: 0, barem1_max: 199.99, barem2_min: 200, barem2_max: 349.99,
  has_withholding: true, withholding_rate: 1, has_service_fee: true, service_fee_type: 'fixed_per_order', service_fee_amount: 13.18, service_fee_vat_rate: 10,
  has_same_day_delivery: true, same_day_delivery_service_fee: 5.99, has_transaction_fee: false, transaction_fee_amount: 0, transaction_fee_vat_rate: 20, has_corporate_tax: true, corporate_tax_rate: 25,
  shipping_company_name: 'Express' };
const KULLANICI = { ...SABLON, id: 'p-ty', is_system_admin: false, satici_no: 900001, code: 'trendyol', shipping_company_id: 'sc1', price_rounding: 0.5, created_by: 'ben@ornek.com',
  // kullanıcıda kalması gerekenler (kural): kurumlar vergisi, kargo firması; şablondan gelmesi gerekenler yanlış değerde
  corporate_tax_rate: 20, has_corporate_tax: true, service_fee_amount: 9, same_day_delivery_service_fee: 3, withholding_rate: 0.5, barem1_max: 149.99, barem2_min: 150, barem_max_desi: 6,
  has_transaction_fee: true, transaction_fee_amount: 4.5, transaction_fee_vat_rate: 10 };
const PASIF_KULLANICI = { ...KULLANICI, id: 'p-eski', is_active: false, corporate_tax_rate: 0, has_corporate_tax: false };
const HB_SABLONU = { ...SABLON, id: 'sablon-hb', platform_type: 'hepsiburada', service_fee_amount: 1, withholding_rate: 9 };
const platformlar = (kul = {}) => [PASIF_KULLANICI, HB_SABLONU, { ...KULLANICI, ...kul }, SABLON];

/* ── Tarifeler: tuzak kayıtlar önde ────────────────────────────────────────────────────────── */
const t = (o) => ({ id: 't', created_by: 'yonetici', platform_name: 'Trendyol', updated_date: 'x', platform_id: null, platform_type: 'trendyol', shipping_company: 'Express',
  same_day_delivery: false, vat_rate: 20, is_active: true, ...o });
const TARIFELER = [
  t({ rate_type: 'barem1', price: 5, shipping_company: 'Diger' }), t({ rate_type: 'barem2', price: 5, shipping_company: 'Diger' }), t({ rate_type: 'desi', desi: 8, price: 5, shipping_company: 'Diger' }),
  t({ rate_type: 'barem1', price: 1, is_active: false }), t({ rate_type: 'barem1', price: 1, same_day_delivery: true, is_active: false }),
  t({ rate_type: 'barem2', price: 1, is_active: false }), t({ rate_type: 'desi', desi: 3, price: 1, is_active: false }),
  t({ rate_type: 'barem1', price: 2, platform_type: 'hepsiburada' }), t({ rate_type: 'desi', desi: 4, price: 2, platform_type: 'hepsiburada' }),
  t({ rate_type: 'desi', desi: 5, price: 33, platform_id: 'p-ty', platform_type: 'website' }),
  t({ rate_type: 'barem1', price: 88 }), t({ rate_type: 'barem1', price: 46.49, same_day_delivery: true }),
  t({ rate_type: 'barem2', price: 94.49, vat_rate: 18 }), t({ rate_type: 'barem2', price: 84.49, same_day_delivery: true, vat_rate: 18 }),
  ...Array.from({ length: 41 }, (_, d) => t({ rate_type: 'desi', desi: d, price: 98 + d * 11 })),
];

/* ── Ürünler: her sütunun devreye girdiği bir ürün ─────────────────────────────────────────── */
const u = (o) => ({ id: 'u', cost: 100, base_cost: 0, ref_product_id: null, ref_product_id_size: null, printing_cost: 0, extra_cost: 0, desi: 2, vat_rate: 20,
  category_id: 'k1', category_name: 'K1', same_day_delivery: false, double_shipping: false, multi_package: false, packages: null, package_id: null, auto_package_id: null,
  name: 'Ürün', sku: 'SKU', barcode: 'B', notes: 'n', cost_addon: 5, cost_addon_type: 'fixed', chain_group_id: 'c', match_group_id: 'm', ref_product_qty: 3, unit_quantity: 100,
  ref_comparison_type: 'ozellik', size_cost_addon: 7, is_active: true, created_by: 'ben@ornek.com', ...o });
const URUNLER = {
  'p-a': u({ id: 'a' }),
  'p-b': u({ id: 'b', cost: 60, vat_rate: 18, same_day_delivery: true, category_id: 'k9', category_name: 'K2' }),
  'p-c': u({ id: 'c', category_name: 'yok-boyle-bir-ad', extra_cost: 4, printing_cost: 2 }),
  'p-d': u({ id: 'd', multi_package: true, packages: '[{"desi":3,"package_id":""},{"desi":9,"package_id":""}]', double_shipping: true }),
  'p-e': u({ id: 'e', package_id: 'pk1' }),
  'p-f': u({ id: 'f', cost: 40, base_cost: 500, ref_product_id_size: 's' }),
  'p-g': u({ id: 'g', category_id: 'k3', category_name: 'K3' }),
  'p-h': u({ id: 'h', category_id: 'k4', category_name: 'K4' }),
  'p-i': u({ id: 'i', desi: 5 }),
  'p-j': u({ id: 'j', desi: 8 }),
  'p-k': u({ id: 'k', cost: 40, base_cost: 500, ref_product_id: 'r' }),
  'p-l': u({ id: 'l', auto_package_id: 'ap1' }),
  'p-m': u({ id: 'm', category_id: 'k7', category_name: 'komisyonu-olmayan-kategori' }),
};
const K = (o) => ({ id: 'k', created_by: 'ben@ornek.com', commission_rate: 25, commission_vat_rate: 20, minimum_profit_amount: 9, target_profit_rate: 60, target_profit_amount: 40, transaction_fee: 3,
  platform_id: 'p-ty', platform_name: 'Diger', category_id: 'k1', category_name: 'K1', is_active: true, discounted_target_profit_rate: 0, discounted_target_profit_amount: 0, discounted_minimum_profit_amount: 0, ...o });
const KOMISYONLAR = [
  K({ is_active: false, discounted_target_profit_rate: 99999 }),
  K({ discounted_target_profit_rate: 30 }),
  K({ platform_id: 'zzz', platform_name: 'Trendyol', category_id: 'k2', category_name: 'K2', discounted_target_profit_rate: 99999 }),
  K({ category_id: 'k3', category_name: 'K3', discounted_target_profit_rate: 1, discounted_minimum_profit_amount: 1_000_000 }),
  K({ category_id: 'k4', category_name: 'K4', discounted_target_profit_amount: 1_000_000 }),
];

const veri = (dar, kul = {}) => {
  const k = (kayit, sutunlar) => (dar ? daralt(kayit, sutunlar) : kayit);
  return {
    platformlar: async () => platformlar(kul).map((p) => k(p, PLATFORM)),
    tarifeler: async () => TARIFELER.map((x) => k(x, TARIFE)),
    ayarlar: async () => [{ setting_key: 'cift_kargo_kurallari', setting_value: '[{"min":0,"max":30,"yontem":"sabit","tutar":25}]' }],
    komisyonlar: async () => KOMISYONLAR.map((x) => k(x, KOMISYON)),
    urunler: async (b) => new Map(b.map((x) => x.toLowerCase()).filter((x) => URUNLER[x]).map((x) => [x, { urun: k(URUNLER[x], URUN), eslesme: 'barkod' }])),
    urunlerModelKoduyla: async (kodlar) => new Map(kodlar.map((x) => x.toLowerCase()).filter((x) => URUNLER[x]).map((x) => [x, { urun: k(URUNLER[x], URUN), eslesme: 'model_kodu' }])),
  };
};

const fiyat = (id, barkod, f, o) => ({ id, tur: 'fiyat', barkod, fiyat: f, komisyonOrani: o });
const siparis = (id, kod, durum, kargo, hizmet) => ({ id, tur: 'siparis', siparisNo: '11640000001', siparis: { kargoTutari: kargo, hizmetBedeli: hizmet, ceza: 5, iadeKargo: 2 },
  satirlar: [{ orderLineItemId: 1, urunAdi: `Başlık ${kod}, one size`, satisTutari: 300, komisyonTutari: 60, indirim: 10, durum }, { orderLineItemId: 2, urunAdi: `Başlık ${kod}, one size`, satisTutari: 300, komisyonTutari: 60, durum }] });

const istek = [];
for (const [kod, f] of [['p-a', 140], ['p-a', 180], ['p-a', 300], ['p-b', 120], ['p-b', 800], ['p-c', 260], ['p-d', 400], ['p-e', 200], ['p-f', 220], ['p-g', 500], ['p-h', 500], ['p-i', 900], ['p-j', 250], ['p-k', 220], ['p-l', 200], ['p-a', 900], ['p-m', 300]]) {
  istek.push(fiyat(`f-${kod}-${f}`, kod.toUpperCase(), f, 19));
}
for (const kod of ['p-a', 'p-b', 'p-c', 'p-d', 'p-e', 'p-f', 'p-i', 'p-j']) {
  istek.push(siparis(`t-${kod}`, kod, 'teslim', 98.34, 13.19), siparis(`y-${kod}`, kod, 'yeni', 0, 0), siparis(`i-${kod}`, kod, 'iptal', 98.34, 13.19));
}
const d = istekiDogrula({ surum: 1, platform: 'trendyol', saticiNo: 900001, satirlar: istek });
dogru('0 istek geçerli', d.tamam === true);
// İstek sınırı (200) altında kalmalı; satır sayısı yeterli çeşitlilikte
dogru('0b istek sayısı', istek.length <= 200 && istek.length >= 30, String(istek.length));

const VARYANTLAR = { 'kurumlar vergisi açık': {}, 'kurumlar vergisi kapalı': { has_corporate_tax: false } };
const sonuclar = {};
for (const [ad, kul] of Object.entries(VARYANTLAR)) {
  const tam = await isle(d.istek, veri(false, kul));
  const dar = await isle(d.istek, veri(true, kul));
  sonuclar[ad] = tam;
  const durumlar = tam.satirlar.map((x) => x.durum);
  const rakamli = durumlar.filter((x) => ['tamam', 'tahmini'].includes(x)).length;
  dogru(`1 [${ad}] tam kayıtlarla çok sayıda rakam üretildi`, rakamli >= 20, `${rakamli} rakamlı: ${JSON.stringify([...new Set(durumlar)])}`);
  const beklenmeyen = tam.satirlar.filter((x) => x.durum === 'hesaplanamadi' && !/(^|-)p-(e|l)(-|$)/.test(x.id)).map((x) => x.id);
  dogru(`2 [${ad}] beklenmeyen hata durumu yok`, beklenmeyen.length === 0, beklenmeyen.join(', '));
  dogru(`3 [${ad}] paketli ürün korumaları çalışıyor (package_id, auto_package_id)`, ['f-p-e-200', 'f-p-l-200'].every((id) => tam.satirlar.find((x) => x.id === id)?.durum === 'hesaplanamadi'));
  dogru(`4 [${ad}] hedefAlti hem true hem false hem null üretildi`, ['true', 'false', 'null'].every((v) => tam.satirlar.some((x) => String(x.hedefAlti) === v && x.durum === 'tamam')));
  const fark = tam.satirlar.map((x, i) => (JSON.stringify(x) === JSON.stringify(dar.satirlar[i]) ? null : x.id)).filter(Boolean);
  dogru(`5 [${ad}] yalnız çekilen sütunlarla sonuç, tüm sütunlarla sonuçla AYNI`, fark.length === 0 && JSON.stringify(tam) === JSON.stringify(dar), `ayrışan satırlar: ${fark.join(', ')}`);
}
const vergiToplami = (r) => r.satirlar.filter((x) => x.durum === 'tamam' && x.kalemler).reduce((a, x) => a + x.kalemler.kurumlarVergisi, 0);
dogru('6 test verisi kurumlar vergisi anahtarına duyarlı (açıkken vergi var, kapalıyken 0)', vergiToplami(sonuclar['kurumlar vergisi açık']) > 0 && vergiToplami(sonuclar['kurumlar vergisi kapalı']) === 0);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
