/**
 * Servisin çakışma veri katmanı (supabase/functions/kar-hesapla/veri.ts) yalnız listelediği sütunları çeker.
 * Motor bir alanı okuyup o alan çekilmiyorsa değer sessizce `undefined` olur ve rakam yanlış çıkar
 * (Dilim 1'de `has_same_day_delivery` böyle unutulmuştu).
 *
 * 1) FARK: aynı istekler (a) tablonun TÜM sütunlarıyla dolu kayıtlarla, (b) yalnız veri.ts'in çektiği sütunlarla
 *    hesaplanır; sonuçlar ayrışmamalı.
 * 2) DENETİM: listedeki her sütun tek tek çıkarılır; sonuç DEĞİŞMİYORSA sütun ya gereksizdir ya da fikstür onu
 *    sınamıyordur. Sınanmayan sütun listesi boş olmalı.
 * Sütun listeleri veri.ts'ten okunur; liste ile test ayrışamaz.
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
const liste = (ad) => veriTs.match(new RegExp(`const ${ad} = '([^']+)'`))[1].split(',');
const SUTUNLAR = {
  priceRanges: liste('ZINCIR_FIYAT_ARALIGI'), advantageTags: liste('ZINCIR_ETIKET'), flashProducts: liste('ZINCIR_FLAS'), plusTariffs: liste('ZINCIR_PLUS_TARIFE'),
  campaigns: liste('ZINCIR_KAMPANYA'), campaignProducts: liste('ZINCIR_KAMPANYA_URUNU'), ownDiscounts: liste('ZINCIR_KENDI_INDIRIM'),
};

let gecen = 0, kalan = 0;
const dogru = (ad, kosul, aciklama = '') => {
  if (kosul) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}${aciklama ? '\n     ' + aciklama : ''}`); }
};

/* ── Sabit uydurma dünya ─────────────────────────────────────────────── */
const BUGUN = '2026-09-26';
const SABLON = { id: 'sablon', platform_type: 'trendyol', is_system_admin: true, use_barem: true, barem_max_desi: 10, barem1_min: 0, barem1_max: 199.99, barem2_min: 200, barem2_max: 349.99,
  has_withholding: true, withholding_rate: 1, has_service_fee: true, service_fee_type: 'fixed_per_order', service_fee_amount: 13.18, service_fee_vat_rate: 20, same_day_delivery_service_fee: 5.99, has_corporate_tax: true, corporate_tax_rate: 25 };
const KULLANICI = { ...SABLON, id: 'p-ty', name: 'Trendyol', is_system_admin: false, is_active: true, shipping_company_name: 'Express', satici_no: 900001 };
const t = (o) => ({ is_active: true, vat_rate: 20, is_admin_created: true, platform_type: 'trendyol', shipping_company: 'Express', ...o });
const TARIFELER = [t({ rate_type: 'barem1', price: 88 }), t({ rate_type: 'barem2', price: 94.49 }), ...Array.from({ length: 41 }, (_, d) => t({ rate_type: 'desi', desi: d, price: 98 + d * 11 }))];
// Tüm sütunları dolu kayıt: listedeki her ad için ayırt edilebilir, zararsız bir değer; `o` ile gerçek değerler ezilir.
const TUM = {
  priceRanges: 'id,created_at,created_by,platform_account,start_date,end_date,product_name,barcode,seller_stock_code,size,model_code,category,brand,stock,price_range_1_min,price_range_1_max,price_range_2_min,price_range_2_max,price_range_3_min,price_range_3_max,price_range_4_min,price_range_4_max,commission_1,commission_2,commission_3,commission_4,current_base_price,current_commission,current_tsf,selected_range,selected_price,manual_price,calculated_commission,calculated_profit,calculated_profit_rate,apply_until_end,matched_product_id,excel_file_url,updated_date,has_commission_tariff,created_date,tarife_penceresi,pencere_komisyonlari,secim_penceresi,secimler,pencere_tarihleri',
  advantageTags: 'id,created_at,created_by,platform_account,start_date,end_date,product_name,barcode,seller_stock_code,size,model_code,category,brand,stock,has_commission_tariff,advantage_min,advantage_max,advantage_commission,current_base_price,current_commission,current_tsf,selected_range,selected_price,manual_price,calculated_commission,calculated_profit,updated_date,commission_rate,selected_commission,created_date',
  flashProducts: 'id,created_at,created_by,master_product_id,product_name,stock,price_24h,start_24h,end_24h,price_3h,start_3h,end_3h,platform_account,has_commission_tariff,start_date,end_date,selected_type,selected_price,manual_price,updated_date,commission_rate,category,barcode,selected_time_range,manual_time_range,manual_profit,created_date,urun_id',
  plusTariffs: 'id,created_at,created_by,platform_account,start_date,end_date,product_name,barcode,seller_stock_code,size,model_code,category,brand,stock,current_base_price,current_commission,plus_price_limit,plus_commission_offer,plus_base_price,selected_price,calculated_commission,cancel_status,matched_product_id,updated_date,has_commission_tariff,selected_type,manual_price,manual_profit,plus_pencereleri,tarife_penceresi,tarife_secim_metni,secimler',
  campaigns: 'id,created_at,created_by,campaign_type,campaign_category,region,description,start_date,end_date,cart_amount,cart_condition,discount_type,discount_amount,trendyol_coverage_rate,is_active,updated_date,campaign_name,discount_kind,threshold_amount,buy_x,pay_y,min_qty,price_rule_min,price_rule_max,participation_condition',
  campaignProducts: 'id,created_at,created_by,campaign_id,platform_account,barcode,product_name,product_code,category,brand,color,size,stock_code,current_stock,current_sale_price,max_price,campaign_price,manual_price,commission_tariff,listing_id,selected_type,calculated_commission,calculated_profit,manual_profit,matched_product_id,created_date,updated_date',
  ownDiscounts: 'id,created_at,created_by,updated_date,platform_account,ad,tur,hedef_kitle,kapsam_turu,kapsam_kategoriler,kapsam_urunler,indirim_tipi,oran,tutar,alt_limit,adet,al_x,ode_y,maks_tutar,karsilama,kupon_adedi,siparis_limiti,start_date,end_date,aktif,not_metni,kupon_turu',
};
// Değer üreteci: bilinmeyen sütuna sayı/metin; gerçek değerler `o`'dan
const junk = (ad) => (/date|_at$/.test(ad) ? '2026-01-01' : `j-${ad}`);
function kayit(tablo, o) {
  const k = {};
  for (const ad of TUM[tablo].split(',')) k[ad] = junk(ad);
  return { ...k, ...o };
}
const tarihli = (o = {}) => ({ platform_account: 'Trendyol', start_date: '2026-09-01', end_date: '2026-12-31', ...o });

/* ── Dünya: her kaynak KENDİ ürününde tek başına bağlayıcı; yanında tuzak kayıtlar ─────────────
 * Tuzaklar (başka platform, gelecek tarihli, süresi dolmuş) ana kayıttan DAHA DÜŞÜK fiyatlıdır: sütun
 * çekilmezse tuzak devreye girer ve sonuç değişir. */
const URUNLER = {};
const kaynaklar = { priceRanges: [], advantageTags: [], flashProducts: [], plusTariffs: [], campaigns: [], campaignProducts: [], ownDiscounts: [] };
const KOMISYONLAR = [{ platform_id: 'p-ty', platform_name: 'Trendyol', category_id: 'k1', is_active: true, discounted_target_profit_rate: 10 }];
const urunEkle = (kod, kategori = 'Etiket') => { URUNLER[kod.toLowerCase()] = { urun: { id: kod, category_id: 'k1', category_name: kategori, cost: 40, desi: 2, vat_rate: 20 }, eslesme: 'barkod' }; return kod; };
const TUZAK = [{ platform_account: 'Hepsiburada' }, { start_date: '2026-10-05', end_date: '2026-12-31' }, { start_date: '2026-08-01', end_date: '2026-09-10' }];
const tuzakli = (tablo, ana, fiyatAlani, tuzakFiyati) => {
  kaynaklar[tablo].push(ana);
  for (const t of TUZAK) kaynaklar[tablo].push({ ...ana, ...t, ...fiyatAlani(tuzakFiyati) });
};

// Tarife, pencere yolu (3 günlük pencere bugün açık, seçim pencerenin haritasında)
{
  const kod = urunEkle('TA-P');
  const pen = { pencere_tarihleri: { '3gun': { baslangic: '2026-09-24', bitis: '2026-09-27' }, '4gun': { baslangic: '2026-09-28', bitis: '2026-10-01' } }, tarife_penceresi: '3gun', secim_penceresi: '3gun',
    pencere_komisyonlari: { '3gun': [19, 17, 15, 12], '4gun': [18, 16, 14, 11] }, commission_1: 20, commission_2: 18, commission_3: 16, commission_4: 13, price_range_1_min: 100, price_range_2_min: 70, price_range_2_max: 99.99, price_range_3_min: 50, price_range_3_max: 69.99, price_range_4_max: 49.99 };
  const f = (x) => ({ secimler: { '3gun': { kademe: 'range_1', fiyat: x, manuel: 0 }, '4gun': { kademe: 'none', fiyat: 0, manuel: 0 } }, selected_range: 'range_1', selected_price: 999, manual_price: 888 });
  tuzakli('priceRanges', kayit('priceRanges', { ...tarihli({ updated_date: '2026-09-25', created_at: '2026-09-01' }), barcode: kod, ...pen, ...f(60), calculated_commission: 21, current_commission: 22 }), f, 40);
  // pencere dışı seçim: 4 günlük pencerede seçili olan bugün sayılmaz
  const kod2 = urunEkle('TA-P2');
  kaynaklar.priceRanges.push(kayit('priceRanges', { ...tarihli(), barcode: kod2, ...pen, secimler: { '3gun': { kademe: 'none', fiyat: 0, manuel: 0 }, '4gun': { kademe: 'range_1', fiyat: 30, manuel: 0 } }, selected_range: 'none', selected_price: 0, manual_price: 0 }));
  const kod3 = urunEkle('TA-P3'); // pencere haritasında manuel fiyat
  kaynaklar.priceRanges.push(kayit('priceRanges', { ...tarihli(), barcode: kod3, ...pen, secimler: { '3gun': { kademe: 'none', fiyat: 0, manuel: 58 } }, selected_range: 'range_2', selected_price: 5, manual_price: 6 }));
}
// Tarife, klasik sütunlar (pencere yok)
{
  const kod = urunEkle('TA-C');
  const f = (x) => ({ selected_range: 'range_2', selected_price: x, manual_price: 0 });
  tuzakli('priceRanges', kayit('priceRanges', { ...tarihli(), barcode: kod, pencere_tarihleri: null, secimler: null, pencere_komisyonlari: null, commission_1: 20, commission_2: 18, ...f(62) }), f, 41);
  const kod2 = urunEkle('TA-M');
  kaynaklar.priceRanges.push(kayit('priceRanges', { ...tarihli(), barcode: kod2, pencere_tarihleri: null, secimler: null, selected_range: 'manual', selected_price: 999, manual_price: 58 }));
}
// Etiket
{
  const kod = urunEkle('ET-1');
  const f = (x) => ({ selected_range: 'advantage', selected_price: x, manual_price: 0 });
  tuzakli('advantageTags', kayit('advantageTags', { ...tarihli({ updated_date: '2026-09-25' }), barcode: kod, seller_stock_code: 'SKU-E', category: 'Etiket', ...f(55), calculated_commission: 15, current_commission: 16 }), f, 42);
  kaynaklar.advantageTags.push(kayit('advantageTags', { ...tarihli(), barcode: urunEkle('ET-M'), selected_range: 'manual', selected_price: 999, manual_price: 54 }));
}
// Flaş
{
  const kod = urunEkle('FL-1');
  const f = (x) => ({ selected_type: 'price_24h', selected_price: x, manual_price: 0 });
  tuzakli('flashProducts', kayit('flashProducts', { ...tarihli({ updated_date: '2026-09-25' }), barcode: kod, category: 'Etiket', ...f(56) }), f, 43);
  kaynaklar.flashProducts.push(kayit('flashProducts', { ...tarihli(), barcode: urunEkle('FL-M'), selected_type: 'manual', selected_price: 999, manual_price: 57 }));
}
// Sepet kampanyaları (kampanya ürünü fiyatı taban olur, indirim onun üstüne iner)
{
  const kamp = (id, o) => kaynaklar.campaigns.push(kayit('campaigns', { id, campaign_type: 'basket', is_active: true, start_date: '2026-09-01', end_date: '2026-12-31', updated_date: '2026-09-25', ...o }));
  kamp('c-pct', { discount_kind: 'net_percent', discount_amount: 10, trendyol_coverage_rate: 50 });
  kamp('c-tl', { discount_type: 'tl', discount_kind: null, discount_amount: 30, cart_amount: 500, cart_condition: 'over', threshold_amount: 250, trendyol_coverage_rate: 0 });
  kamp('c-tl-ust', { discount_type: 'tl', discount_kind: null, discount_amount: 40, cart_amount: 600, cart_condition: 'over', threshold_amount: null, trendyol_coverage_rate: 0 });
  kamp('c-tl-alt', { discount_type: 'tl', discount_kind: null, discount_amount: 40, cart_amount: 600, cart_condition: 'under', threshold_amount: null, trendyol_coverage_rate: 0 });
  kamp('c-xy', { discount_kind: 'buy_x_pay_y', buy_x: 3, pay_y: 2, min_qty: 3, discount_amount: 0 });
  kamp('c-qty', { discount_kind: 'qty_percent', discount_amount: 12, min_qty: 2 });
  kamp('c-eski', { is_active: false, discount_kind: 'net_percent', discount_amount: 60 });
  kaynaklar.campaigns.push(kayit('campaigns', { id: 'c-gelecek', campaign_type: 'basket', is_active: true, start_date: '2026-10-05', end_date: '2026-12-31', discount_kind: 'net_percent', discount_amount: 70 }));
  kaynaklar.campaigns.push(kayit('campaigns', { id: 'c-bitmis', campaign_type: 'basket', is_active: true, start_date: '2026-08-01', end_date: '2026-09-10', discount_kind: 'net_percent', discount_amount: 70 }));
  const cp = (kod, campaign_id, campaign_price, o = {}) => kaynaklar.campaignProducts.push(kayit('campaignProducts', { campaign_id, barcode: urunEkle(kod), platform_account: 'Trendyol', selected_type: 'campaign', campaign_price, manual_price: 0, category: 'Etiket', stock_code: 'SKU-C', updated_date: '2026-09-25', ...o }));
  for (const [kod, id, fiyat] of [['CA-P', 'c-pct', 52], ['CA-T', 'c-tl', 300], ['CA-TU', 'c-tl-ust', 300], ['CA-TA', 'c-tl-alt', 300], ['CA-X', 'c-xy', 260], ['CA-Q', 'c-qty', 250]]) {
    cp(kod, id, fiyat);
    // tuzak: başka platformun kampanya ürünü, pasif/gelecek/bitmiş kampanyaya bağlı kayıt (düşük fiyatlı)
    kaynaklar.campaignProducts.push(kayit('campaignProducts', { campaign_id: id, barcode: kod, platform_account: 'Hepsiburada', selected_type: 'campaign', campaign_price: 30 }));
  }
  for (const [kod, id] of [['CA-E', 'c-eski'], ['CA-G', 'c-gelecek'], ['CA-B', 'c-bitmis']]) cp(kod, id, 20);
  kaynaklar.campaignProducts.push(kayit('campaignProducts', { campaign_id: 'c-pct', barcode: urunEkle('CA-S'), platform_account: 'Trendyol', selected_type: 'none', campaign_price: 20 })); // seçili değil
  kaynaklar.campaignProducts.push(kayit('campaignProducts', { campaign_id: 'c-pct', barcode: urunEkle('CA-M'), platform_account: 'Trendyol', selected_type: 'campaign', campaign_price: 0, manual_price: 25 })); // fiyat yok
}
// Plus: ürün Plus kampanyasında kayıtlı + Plus tarifesi kaydı; kalan fiyat 260'lık flaş ile en az bir sira0 adayı
{
  kaynaklar.campaigns.push(kayit('campaigns', { id: 'c-plus', campaign_type: 'trendyol_plus', is_active: true, start_date: '2026-09-01', end_date: '2026-12-31', discount_kind: 'net_percent', discount_amount: 5, trendyol_coverage_rate: 0 }));
  const uye = (kod) => { kaynaklar.campaignProducts.push(kayit('campaignProducts', { campaign_id: 'c-plus', barcode: kod, platform_account: 'Trendyol', selected_type: 'campaign' })); kaynaklar.flashProducts.push(kayit('flashProducts', { ...tarihli(), barcode: kod, selected_type: 'price_24h', selected_price: 260, manual_price: 0 })); return kod; };
  const kod = uye(urunEkle('PL-1'));
  const f = (x) => ({ selected_type: 'plus_price', selected_price: x, manual_price: 0 });
  tuzakli('plusTariffs', kayit('plusTariffs', { ...tarihli({ updated_date: '2026-09-25' }), barcode: kod, seller_stock_code: 'SKU-P', category: 'Etiket', ...f(85), plus_commission_offer: 9, calculated_commission: 10, current_commission: 11,
    secimler: { '3gun': { kademe: 'range_1', fiyat: 82, manuel: 0 } }, plus_pencereleri: { '3gun': { baslangic: '2026-09-24', bitis: '2026-09-27' } }, tarife_penceresi: '3gun' }), f, 44);
  kaynaklar.plusTariffs.push(kayit('plusTariffs', { ...tarihli(), barcode: uye(urunEkle('PL-M')), selected_type: 'manual', selected_price: 0, manual_price: 150, plus_commission_offer: 0, calculated_commission: 12, current_commission: 13 }));
  kaynaklar.plusTariffs.push(kayit('plusTariffs', { ...tarihli(), barcode: uye(urunEkle('PL-C')), selected_type: 'plus_price', selected_price: 140, manual_price: 0, plus_commission_offer: 0, calculated_commission: 0, current_commission: 13 }));
  kaynaklar.plusTariffs.push(kayit('plusTariffs', { ...tarihli(), barcode: urunEkle('PL-N'), selected_type: 'manual', selected_price: 0, manual_price: 100, plus_commission_offer: 9 })); // Plus üyesi değil: sayılmaz
}
// Kendi indirimlerim (kupon, kod, net, koşullu, Plus'a özel): taban flaş 250'de; ürün başına kapsam
{
  const flas = (kod) => kaynaklar.flashProducts.push(kayit('flashProducts', { ...tarihli(), barcode: kod, selected_type: 'price_24h', selected_price: 250, manual_price: 0 }));
  const kap = (kod, kat = 'Etiket') => { flas(urunEkle(kod, kat)); return kod; };
  // Her indirim yalnız KENDİ ürününe kapsamlı: başka ürünlerde en yüksek tek indirim olarak baskın çıkıp sepet kampanyalarını gizlemesin.
  const od = (id, kod, o) => kaynaklar.ownDiscounts.push(kayit('ownDiscounts', { id, aktif: true, hedef_kitle: 'all', kapsam_turu: 'urunler', kapsam_urunler: [kod], indirim_tipi: 'percent', ad: `Deneme-${id}`, updated_date: '2026-09-25', ...tarihli(), ...o }));
  kap('OW-K'); od('o-kupon', 'OW-K', { tur: 'kupon', oran: 5, maks_tutar: 8, alt_limit: 300, karsilama: 25 });
  kap('OW-KOD'); od('o-kod', 'OW-KOD', { tur: 'indirim_kodu', indirim_tipi: 'tl', tutar: 7 });
  kap('OW-NET', 'Poşet'); od('o-net', 'OW-NET', { tur: 'net', kapsam_turu: 'kategori', kapsam_kategoriler: ['Poşet'], oran: 4 });
  kap('OW-XY'); od('o-xy', 'OW-XY', { tur: 'kosullu_adet', indirim_tipi: 'xalyode', al_x: 3, ode_y: 2 });
  kap('OW-KT'); od('o-kt', 'OW-KT', { tur: 'kosullu_tutar', indirim_tipi: 'tl', tutar: 15, alt_limit: 400 });
  kap('OW-DIS'); od('o-dis', 'BASKA-URUN', { tur: 'kupon', indirim_tipi: 'tl', tutar: 90 }); // kapsam dışı
  // tuzaklar (OW-K'ye kapsamlı, yanlışlıkla sayılırsa sonuç değişir)
  od('o-pasif', 'OW-K', { tur: 'kupon', aktif: false, indirim_tipi: 'tl', tutar: 90 });
  od('o-baska', 'OW-K', { tur: 'kupon', platform_account: 'Hepsiburada', indirim_tipi: 'tl', tutar: 90 });
  od('o-gelecek', 'OW-K', { tur: 'kupon', start_date: '2026-10-05', indirim_tipi: 'tl', tutar: 90 });
  od('o-bitmis', 'OW-K', { tur: 'kupon', end_date: '2026-09-10', indirim_tipi: 'tl', tutar: 90 });
  // Plus'a özel yüzde indirim yalnız Plus üyesinde
  const plusUye = (kod) => { kaynaklar.campaignProducts.push(kayit('campaignProducts', { campaign_id: 'c-plus', barcode: kod, platform_account: 'Trendyol', selected_type: 'campaign' })); return kod; };
  plusUye(kap('OW-PL')); od('o-plus', 'OW-PL', { tur: 'net', hedef_kitle: 'plus', indirim_tipi: 'percent', oran: 9 });
}

const KADEMELER = [{ enAz: 100, enCok: null, komisyon: 19 }, { enAz: 70, enCok: 99.99, komisyon: 17.6 }, { enAz: 50, enCok: 69.99, komisyon: 15.3 }, { enAz: null, enCok: 49.99, komisyon: 12.4 }];
const satirlari = [];
let n = 0;
for (const kodKey of Object.keys(URUNLER)) {
  const barkod = URUNLER[kodKey].urun.id;
  for (const kaynak of ['tarife', 'etiket', 'flas', 'plus']) {
    for (const fiyat of [400, 90, 45]) satirlari.push({ id: `s${n++}`, tur: 'fiyat', barkod, fiyat, komisyonOrani: 20, kaynak, zincir: true, kademeler: n % 2 ? KADEMELER : undefined });
  }
}
// 200 satır sınırı için parçalanır (aşağıda)

function veriKur(kaynaklar) {
  return {
    bugun: () => BUGUN,
    platformlar: async () => [KULLANICI, SABLON], tarifeler: async () => TARIFELER, ayarlar: async () => [],
    komisyonlar: async () => KOMISYONLAR,
    urunler: async (b) => new Map(b.map((x) => x.toLowerCase()).filter((x) => URUNLER[x]).map((x) => [x, URUNLER[x]])), urunlerModelKoduyla: async () => new Map(),
    zincirKaynaklari: async () => kaynaklar,
  };
}
const hesapla = async (k) => {
  const sonuc = [];
  for (let i = 0; i < satirlari.length; i += 190) {
    const d = istekiDogrula({ surum: 1, platform: 'trendyol', saticiNo: 900001, satirlar: satirlari.slice(i, i + 190) });
    sonuc.push(...(await isle(d.istek, veriKur(k))).satirlar);
  }
  return JSON.stringify(sonuc);
};
const daralt = (k, izinli) => Object.fromEntries(Object.entries(k).filter(([ad]) => izinli.includes(ad)));
const daralt7 = (tum, cikar) => Object.fromEntries(Object.entries(tum).map(([tablo, satirlar]) => [tablo,
  satirlar.map((s) => daralt(s, SUTUNLAR[tablo].filter((c) => !(cikar && cikar.tablo === tablo && cikar.sutun === c))))]));

const tum = kaynaklar;
const tumSonuc = await hesapla(tum);
const cozum = JSON.parse(tumSonuc);
const zincirli = cozum.filter((s) => s.zincir?.durum === 'tamam').length;
const eslesmedi = cozum.filter((s) => s.durum === 'eslesmedi').length;
import { createHash } from 'node:crypto';
console.log('sonuc-ozeti', createHash('sha256').update(tumSonuc).digest('hex').slice(0, 16));
console.log(`\nfikstür: ${satirlari.length} satır, ${zincirli} çakışmalı sonuç`);
dogru('0 fikstür yeterince çeşitli (en az 100 çakışmalı sonuç, eşleşmeyen yok)', zincirli >= 100 && eslesmedi === 0, `çakışmalı: ${zincirli}, eşleşmeyen: ${eslesmedi}`);
dogru('0b farklı taban kaynakları ve komisyon kaynakları var', new Set(cozum.map((s) => s.zincir?.taban?.kaynak).filter(Boolean)).size >= 3 && new Set(cozum.map((s) => s.zincir?.komisyonKaynagi).filter(Boolean)).size >= 2);

console.log('\n═══ FARK: tüm sütunlar ↔ yalnız çekilen sütunlar ═══');
{
  const dar = await hesapla(daralt7(tum, null));
  dogru('1 sonuçlar birebir aynı', dar === tumSonuc);
}

console.log('\n═══ DENETİM: her sütunun etkisi sınanıyor ═══');
{
  const sinanmayan = [];
  let toplam = 0;
  const temel = await hesapla(daralt7(tum, null));
  for (const [tablo, sutunlar] of Object.entries(SUTUNLAR)) {
    for (const sutun of sutunlar) {
      toplam++;
      const sonuc = await hesapla(daralt7(tum, { tablo, sutun }));
      if (sonuc === temel) sinanmayan.push(`${tablo}.${sutun}`);
    }
  }
  console.log(`  ${toplam - sinanmayan.length}/${toplam} sütun sonucu etkiliyor`);
  dogru('2 çekilen her sütun sonucu etkiliyor (etkilemeyen: gereksiz ya da sınanmıyor)', sinanmayan.length === 0, `sınanmayan: ${sinanmayan.join(', ')}`);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
