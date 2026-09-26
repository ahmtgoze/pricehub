/**
 * karServisi.js — eklenti hesap servisinin iş mantığı testi.
 *
 * Veritabanı, ağ ve kimlik yok: `veri` nesnesi uydurma verilerle taklit
 * edilir. Sabit veriler uydurmadır (depo herkese açık). Modül zinciri .jsx
 * motoru içerdiği için metin olarak yüklenir (karHesabi.test.mjs ile aynı).
 */
import { readFileSync } from 'node:fs';

const lib = new URL('../src/lib/', import.meta.url).href;
const oku = (yol) => readFileSync(new URL(yol, import.meta.url), 'utf8');
const dataUrl = (kod) => 'data:text/javascript;base64,' + Buffer.from(kod).toString('base64');

const motorUrl = dataUrl(oku('../src/components/PriceCalculationEngine.jsx').replaceAll("'../lib/", `'${lib}`));
const karHesabiUrl = dataUrl(oku('../src/lib/karHesabi.js').replace("'../components/PriceCalculationEngine.jsx'", `'${motorUrl}'`).replaceAll("'./", `'${lib}`));
const { isle, istekiDogrula, SINIRLAR } = await import(dataUrl(
  oku('../src/lib/karServisi.js').replace("'./karHesabi.js'", `'${karHesabiUrl}'`).replaceAll("'./", `'${lib}`),
));
const { fiyattaKar } = await import(karHesabiUrl);

let gecen = 0, kalan = 0;
const dogru = (ad, kosul, aciklama = '') => {
  if (kosul) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}${aciklama ? '\n     ' + aciklama : ''}`); }
};
const esit = (ad, bulunan, beklenen) => dogru(ad, JSON.stringify(bulunan) === JSON.stringify(beklenen), `bulunan: ${JSON.stringify(bulunan)} beklenen: ${JSON.stringify(beklenen)}`);

/* ── Uydurma veri ───────────────────────────────────────────────────── */
const SABLON = {
  id: 'sablon', platform_type: 'trendyol', is_system_admin: true,
  use_barem: true, barem_max_desi: 10, barem1_min: 0, barem1_max: 199.99, barem2_min: 200, barem2_max: 349.99,
  has_withholding: true, withholding_rate: 1,
  has_service_fee: true, service_fee_type: 'fixed_per_order', service_fee_amount: 13.18, service_fee_vat_rate: 20, same_day_delivery_service_fee: 5.99,
  has_pos_service_fee: false, pos_service_fee_rate: 0, has_corporate_tax: true, corporate_tax_rate: 25,
};
const KULLANICI = { ...SABLON, id: 'p-ty', is_system_admin: false, is_active: true, shipping_company_name: 'Express', satici_no: 900001 };
const t = (o) => ({ is_active: true, vat_rate: 20, is_admin_created: true, platform_type: 'trendyol', shipping_company: 'Express', ...o });
const TARIFELER = [
  t({ rate_type: 'barem1', price: 88, same_day_delivery: false }), t({ rate_type: 'barem1', price: 46.49, same_day_delivery: true }),
  t({ rate_type: 'barem2', price: 94.49, same_day_delivery: false }), t({ rate_type: 'barem2', price: 84.49, same_day_delivery: true }),
  ...Array.from({ length: 41 }, (_, d) => t({ rate_type: 'desi', desi: d, price: 98 + d * 11, same_day_delivery: false })),
];
const urun = (o = {}) => ({ id: 'u1', category_id: 'k1', cost: 100, desi: 2, vat_rate: 20, printing_cost: 0, extra_cost: 0, same_day_delivery: false, ...o });
const KOMISYON = (o = {}) => ({ platform_id: 'p-ty', platform_name: 'Trendyol', category_id: 'k1', is_active: true, ...o });

function veriKur({ platformlar = [KULLANICI, SABLON], urunler = {}, komisyonlar = [], tarifeler = TARIFELER, ayarlar = [] } = {}) {
  const cagri = { platformlar: 0, tarifeler: 0, ayarlar: 0, komisyonlar: 0, urunler: 0 };
  return {
    cagri,
    platformlar: async () => (cagri.platformlar++, platformlar),
    tarifeler: async () => (cagri.tarifeler++, tarifeler),
    ayarlar: async () => (cagri.ayarlar++, ayarlar),
    komisyonlar: async () => (cagri.komisyonlar++, komisyonlar),
    urunler: async (b) => (cagri.urunler++, new Map(b.map((x) => x.toLowerCase()).filter((x) => urunler[x]).map((x) => [x, urunler[x]]))),
  };
}
const istek = (satirlar, saticiNo = 900001) => ({ surum: 1, platform: 'trendyol', saticiNo, satirlar });
const dogrula = (govde) => istekiDogrula(govde);
const satir = (o = {}) => ({ id: 's1', tur: 'fiyat', barkod: 'ABC-1', fiyat: 300, komisyonOrani: 20, kaynak: 'tarife', ...o });

console.log('\n═══ İSTEK DOĞRULAMA ═══');
{
  dogru('1 geçerli istek kabul', dogrula(istek([satir()])).tamam === true);
  for (const [ad, g] of [['null', null], ['dizi', []], ['metin', 'x'], ['sürüm 2', { ...istek([satir()]), surum: 2 }], ['platform hepsiburada', { ...istek([satir()]), platform: 'hepsiburada' }],
    ['satıcı no metin', istek([satir()], '900001')], ['satıcı no 0', istek([satir()], 0)], ['satıcı no negatif', istek([satir()], -5)], ['satıcı no kesirli', istek([satir()], 1.5)],
    ['satırlar boş', istek([])], ['satırlar dizi değil', { ...istek([]), satirlar: 'x' }], [`satırlar ${SINIRLAR.EN_FAZLA_SATIR + 1}`, istek(Array.from({ length: SINIRLAR.EN_FAZLA_SATIR + 1 }, () => satir()))]]) {
    dogru(`2 ${ad} reddedilir`, dogrula(g).tamam === false && typeof dogrula(g).hata === 'string');
  }
  dogru('3 tam sınır (200 satır) kabul', dogrula(istek(Array.from({ length: SINIRLAR.EN_FAZLA_SATIR }, () => satir()))).tamam === true);

  const d = dogrula(istek([
    satir({ musteriAdi: 'GİZLİ-AD', adres: 'GİZLİ-ADRES', telefon: '5551112233' }),
    satir({ id: 's2', fiyat: 0 }), satir({ id: 's3', fiyat: -1 }), satir({ id: 's4', fiyat: '300' }), satir({ id: 's5', fiyat: Infinity }),
    satir({ id: 's6', komisyonOrani: 101 }), satir({ id: 's7', komisyonOrani: -1 }), satir({ id: 's8', kaynak: 'bilinmeyen' }),
    satir({ id: 's9', tur: 'baska' }), satir({ id: 's10', barkod: '' }), satir({ id: 's11', barkod: 'x'.repeat(129) }),
    satir({ id: 'k'.repeat(65) }), satir({ id: 's13', fiyat: SINIRLAR.EN_FAZLA_FIYAT + 1 }), null, 'satır değil', satir({ id: undefined }),
  ]));
  const gecersiz = d.istek.satirlar.filter((s) => !s.gecerli).map((s) => s.id);
  dogru('4 15 bozuk satırın hepsi geçersiz işaretlenir', d.istek.satirlar.length === 16 && gecersiz.length === 15, `geçersiz: ${gecersiz.length}`);
  dogru('5 geçerli satır kalır', d.istek.satirlar[0].gecerli === true);
  dogru('6 fazladan alanlar (ad/adres/telefon) temizlenir', !JSON.stringify(d.istek).includes('GİZLİ') && !JSON.stringify(d.istek).includes('5551112233'));
  dogru('7 bozuk/uzun/eksik kimlik yerine sıra numarası', d.istek.satirlar[11].id === '#11' && d.istek.satirlar[15].id === '#15');
}

console.log('\n═══ MAĞAZA DOĞRULAMA ═══');
{
  const bagliDegil = veriKur({ platformlar: [{ ...KULLANICI, satici_no: null }, SABLON], urunler: { 'abc-1': { urun: urun(), eslesme: 'barkod' } } });
  const r1 = await isle(dogrula(istek([satir()])).istek, bagliDegil);
  esit('8 numara bağlı değil', [r1.magaza.durum, r1.satirlar], ['bagli_degil', []]);

  const uyusmuyor = veriKur({ urunler: { 'abc-1': { urun: urun(), eslesme: 'barkod' } } });
  const r2 = await isle(dogrula(istek([satir()], 111222)).istek, uyusmuyor);
  esit('9 numara uyuşmuyor: rakam yok, satır yok', [r2.magaza.durum, r2.satirlar], ['uyusmuyor', []]);
  dogru('10 uyuşmazlıkta maliyet/tarife/ürün verisi HİÇ okunmaz', uyusmuyor.cagri.urunler + uyusmuyor.cagri.tarifeler + uyusmuyor.cagri.komisyonlar + uyusmuyor.cagri.ayarlar === 0);
  dogru('11 uyuşmazlıkta kayıtlı numara sızmaz', !JSON.stringify(r2).includes('900001'));

  const bosPlatform = await isle(dogrula(istek([satir()])).istek, veriKur({ platformlar: [SABLON] }));
  esit('12 kullanıcı Trendyol kaydı yoksa bağlı değil', bosPlatform.magaza.durum, 'bagli_degil');
  const pasif = await isle(dogrula(istek([satir()])).istek, veriKur({ platformlar: [{ ...KULLANICI, is_active: false }, SABLON] }));
  esit('13 pasif platform sayılmaz', pasif.magaza.durum, 'bagli_degil');
  const hb = await isle(dogrula(istek([satir()])).istek, veriKur({ platformlar: [{ ...KULLANICI, platform_type: 'hepsiburada' }, SABLON] }));
  esit('14 başka tür platform sayılmaz', hb.magaza.durum, 'bagli_degil');
}

console.log('\n═══ HESAP ═══');
{
  const komisyonlar = [KOMISYON({ discounted_target_profit_rate: 50, discounted_minimum_profit_amount: 15 })];
  const veri = veriKur({ urunler: { 'abc-1': { urun: urun(), eslesme: 'barkod' }, 'mdl-2': { urun: urun({ cost: 60 }), eslesme: 'model_kodu' } }, komisyonlar });
  const r = await isle(dogrula(istek([satir(), satir({ id: 's2', barkod: 'MDL-2', fiyat: 250, komisyonOrani: 19 }), satir({ id: 's3', barkod: 'YOK' })])).istek, veri);
  esit('15 mağaza eşleşti', r.magaza.durum, 'eslesti');

  const beklenen = fiyattaKar({ urun: urun(), platform: KULLANICI, sablonlar: [SABLON], fiyat: 300, komisyonOrani: 20, tarifeler: TARIFELER });
  const s1 = r.satirlar[0];
  dogru('16 sonuç karHesabi ile aynı (net kâr)', s1.durum === 'tamam' && s1.netKar === Math.round(beklenen.netKar * 100) / 100);
  dogru('17 sonuç karHesabi ile aynı (kâr oranı, vergi öncesi, kargo)', s1.karOrani === Math.round(beklenen.karOrani * 100) / 100
    && s1.vergiOncesiKar === Math.round(beklenen.vergiOncesiKar * 100) / 100 && s1.kalemler.kargo === Math.round(beklenen.kalemler.kargo * 100) / 100);
  dogru('18 not alanı fiyat, komisyon ve kargoyu söyler', s1.not.includes('300') && s1.not.includes('%20') && s1.not.includes(beklenen.baremUsed));
  dogru('19 barkodla eşleşmede model kodu notu yok', !s1.not.includes('model koduyla'));
  dogru('20 model koduyla eşleşme notlanır', r.satirlar[1].durum === 'tamam' && r.satirlar[1].not.includes('model koduyla eşleşti'));
  esit('21 eşleşmeyen barkod: rakam yok', r.satirlar[2], { id: 's3', durum: 'eslesmedi' });
  dogru('22 barkod büyük/küçük harf farkı', (await isle(dogrula(istek([satir({ barkod: 'aBc-1' })])).istek, veri)).satirlar[0].durum === 'tamam');
  dogru('23 tek istekte tek veri çekimi (satır başına sorgu yok)', veri.cagri.urunler === 2 && veri.cagri.tarifeler === 2, JSON.stringify(veri.cagri));
}

console.log('\n═══ HEDEFİN ALTINDA MI ═══');
{
  const dene = async (komisyonlar) => (await isle(dogrula(istek([satir()])).istek, veriKur({ urunler: { 'abc-1': { urun: urun(), eslesme: 'barkod' } }, komisyonlar }))).satirlar[0];
  esit('24 hedef çok yüksek → hedefAlti true', (await dene([KOMISYON({ discounted_target_profit_rate: 9999 })])).hedefAlti, true);
  esit('25 hedef düşük → hedefAlti false', (await dene([KOMISYON({ discounted_target_profit_rate: 1, discounted_minimum_profit_amount: 1 })])).hedefAlti, false);
  esit('26 hedef tanımsız (0) → hedefAlti null', (await dene([KOMISYON({ discounted_target_profit_rate: 0 })])).hedefAlti, null);
  esit('27 komisyon kaydı yok → hedefAlti null', (await dene([])).hedefAlti, null);
  esit('28 başka kategori kaydı sayılmaz', (await dene([KOMISYON({ category_id: 'baska', discounted_target_profit_rate: 9999 })])).hedefAlti, null);
  esit('29 pasif komisyon sayılmaz', (await dene([KOMISYON({ is_active: false, discounted_target_profit_rate: 9999 })])).hedefAlti, null);
}

console.log('\n═══ EKSİK VERİ VE HATA: rakam çıkmamalı ═══');
{
  const tek = async (u, ek = {}) => (await isle(dogrula(istek([satir()])).istek, veriKur({ urunler: { 'abc-1': { urun: u, eslesme: 'barkod' } }, ...ek }))).satirlar[0];
  esit('30 maliyet yok', (await tek(urun({ cost: 0 }))).durum, 'maliyet_yok');
  esit('31 kargo tarifesi yok', (await tek(urun(), { tarifeler: [] })).durum, 'kargo_tarifesi_yok');
  esit('32 paketli ürün → hesaplanamadı (paket maliyeti)', await tek(urun({ package_id: 'pk1' })), { id: 's1', durum: 'hesaplanamadi', neden: 'paket_maliyeti' });
  esit('33 çok paketli (paket kimlikli) → hesaplanamadı', (await tek(urun({ multi_package: true, packages: '[{"desi":2,"package_id":"pk1"}]' }))).durum, 'hesaplanamadi');
  esit('34 çok paketli ama paket kimliği boş → hesaplanır', (await tek(urun({ multi_package: true, packages: '[{"desi":2,"package_id":""}]' }))).durum, 'tamam');
  esit('35 bozuk paket verisi → hesaplanamadı', (await tek(urun({ multi_package: true, packages: '{bozuk' }))).durum, 'hesaplanamadi');

  const patlak = new Proxy({}, { get() { throw new Error('bozuk kayıt'); } });
  const r = await isle(dogrula(istek([satir(), satir({ id: 's2', barkod: 'BOZUK' })])).istek,
    veriKur({ urunler: { 'abc-1': { urun: urun(), eslesme: 'barkod' }, bozuk: { urun: patlak, eslesme: 'barkod' } } }));
  esit('36 bir satırın patlaması diğerini bozmaz', [r.satirlar[0].durum, r.satirlar[1]], ['tamam', { id: 's2', durum: 'hesaplanamadi' }]);

  const ok = await isle(dogrula(istek([satir({ id: 's1', fiyat: 0 }), satir({ id: 's2', tur: 'siparis' })])).istek, veriKur());
  esit('37 geçersiz ve sipariş satırları', ok.satirlar, [{ id: 's1', durum: 'veri_gecersiz' }, { id: 's2', durum: 'desteklenmiyor' }]);
}

console.log('\n═══ KARGO FİRMASI VE VERİ SIZINTISI ═══');
{
  const ucuzDiger = TARIFELER.map((x) => ({ ...x, shipping_company: 'Diger', price: 1 }));
  const bak = async (tarifeler) => (await isle(dogrula(istek([satir()])).istek, veriKur({ urunler: { 'abc-1': { urun: urun(), eslesme: 'barkod' } }, tarifeler }))).satirlar[0];
  const a = await bak(TARIFELER), b = await bak([...ucuzDiger, ...TARIFELER]);
  dogru('38 kullanıcının kargo firması dışındaki tarifeler yok sayılır', a.netKar === b.netKar, `${a.netKar} ≠ ${b.netKar}`);

  const r = await isle(dogrula(istek([satir()])).istek, veriKur({ urunler: { 'abc-1': { urun: urun({ name: 'GİZLİ-ÜRÜN-ADI', sku: 'GİZLİ-SKU', cost: 123456 }), eslesme: 'barkod' } }, komisyonlar: [KOMISYON({ category_name: 'GİZLİ-KATEGORİ' })] }));
  const metin = JSON.stringify(r);
  dogru('39 yanıtta ürün adı, SKU ve kategori adı yok', !metin.includes('GİZLİ'));
  dogru('40 yanıtta tarife tablosu yok', !metin.includes('shipping') && !metin.includes('rate_type') && !metin.includes('same_day'));
  dogru('40b maliyet yalnızca istenen satırın dökümünde (sözleşme)', metin.split('123456').length === 2 && r.satirlar[0].kalemler.maliyet === 123456);
  esit('41 satır alanları izin listesinde', Object.keys(r.satirlar[0]).sort(), ['durum', 'hedefAlti', 'id', 'kalemler', 'karMarji', 'karOrani', 'netKar', 'not', 'vergiOncesiKar']);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
