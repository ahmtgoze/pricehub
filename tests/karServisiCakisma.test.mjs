/**
 * Eklenti çakışma uyarısı (2B-b): fiyat seçeneğinin DİĞER promosyonlarla birlikte kârı.
 *
 * Beklenen değerler, servis kodundan BAĞIMSIZ kurulur: aynı girdilerle zincirKur + kademeKomisyonu + fiyattaKar
 * doğrudan çağrılır (PriceHub sayfalarının yaptığı iş). Servis çıktısı bununla farksız olmalı.
 * Veritabanı/ağ yok; sabit veriler uydurmadır (depo herkese açık).
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
const { fiyattaKar } = await import(karHesabiUrl);
const { zincirKur, zincirFarkli, KAYNAK } = await import(`${lib}zincirHesabi.js`);
const { kademeKomisyonu } = await import(`${lib}tarifeKaydiSecimi.js`);

let gecen = 0, kalan = 0;
const dogru = (ad, kosul, aciklama = '') => {
  if (kosul) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}${aciklama ? '\n     ' + aciklama : ''}`); }
};
const esit = (ad, bulunan, beklenen) => dogru(ad, JSON.stringify(bulunan) === JSON.stringify(beklenen), `bulunan: ${JSON.stringify(bulunan)} beklenen: ${JSON.stringify(beklenen)}`);
const yuvarla = (x) => Math.round(x * 100) / 100;

/* ── Uydurma veri ───────────────────────────────────────────────────── */
const BUGUN = '2026-09-26';
const SABLON = {
  id: 'sablon', platform_type: 'trendyol', is_system_admin: true,
  use_barem: true, barem_max_desi: 10, barem1_min: 0, barem1_max: 199.99, barem2_min: 200, barem2_max: 349.99,
  has_withholding: true, withholding_rate: 1,
  has_service_fee: true, service_fee_type: 'fixed_per_order', service_fee_amount: 13.18, service_fee_vat_rate: 20, same_day_delivery_service_fee: 5.99,
  has_pos_service_fee: false, pos_service_fee_rate: 0, has_corporate_tax: true, corporate_tax_rate: 25,
};
const KULLANICI = { ...SABLON, id: 'p-ty', name: 'Trendyol', is_system_admin: false, is_active: true, shipping_company_name: 'Express', satici_no: 900001 };
const t = (o) => ({ is_active: true, vat_rate: 20, is_admin_created: true, platform_type: 'trendyol', shipping_company: 'Express', ...o });
const TARIFELER = [
  t({ rate_type: 'barem1', price: 88, same_day_delivery: false }), t({ rate_type: 'barem1', price: 46.49, same_day_delivery: true }),
  t({ rate_type: 'barem2', price: 94.49, same_day_delivery: false }), t({ rate_type: 'barem2', price: 84.49, same_day_delivery: true }),
  ...Array.from({ length: 41 }, (_, d) => t({ rate_type: 'desi', desi: d, price: 98 + d * 11, same_day_delivery: false })),
];
const URUN = { id: 'u1', category_id: 'k1', category_name: 'Etiket', cost: 40, desi: 2, vat_rate: 20, printing_cost: 0, extra_cost: 0, same_day_delivery: false };
const KOMISYON = (o = {}) => ({ platform_id: 'p-ty', platform_name: 'Trendyol', category_id: 'k1', is_active: true, ...o });

const tarihli = { platform_account: 'Trendyol', start_date: '2026-09-01', end_date: '2026-12-31' };
const FLAS = (fiyat, o = {}) => ({ barcode: 'ABC-1', ...tarihli, selected_type: 'price_24h', selected_price: fiyat, ...o });
const ETIKET = (fiyat, o = {}) => ({ barcode: 'ABC-1', ...tarihli, selected_range: 'advantage', selected_price: fiyat, ...o });
const SEPET = { id: 'c1', campaign_type: 'basket', is_active: true, start_date: '2026-09-01', end_date: '2026-12-31', discount_kind: 'net_percent', discount_amount: 10, trendyol_coverage_rate: 0 };
const SEPET_URUNU = (fiyat = 0, o = {}) => ({ campaign_id: 'c1', barcode: 'ABC-1', platform_account: 'Trendyol', selected_type: 'campaign', campaign_price: fiyat, ...o });
const PLUS_KAMPANYA = { id: 'c2', campaign_type: 'trendyol_plus', is_active: true, start_date: '2026-09-01', end_date: '2026-12-31', discount_kind: 'net_percent', discount_amount: 5, trendyol_coverage_rate: 0 };
const PLUS_URUNU = { campaign_id: 'c2', barcode: 'ABC-1', platform_account: 'Trendyol', selected_type: 'campaign' };
const KUPON = { id: 'k1', tur: 'kupon', aktif: true, hedef_kitle: 'all', kapsam_turu: 'all', indirim_tipi: 'tl', tutar: 10, karsilama: 0, platform_account: 'Trendyol', start_date: '2026-09-01', end_date: '2026-12-31' };
const KAYNAK_BOS = { priceRanges: [], advantageTags: [], flashProducts: [], plusTariffs: [], campaigns: [], campaignProducts: [], ownDiscounts: [] };
const kaynak = (o = {}) => ({ ...KAYNAK_BOS, ...o });
// Tarife kademeleri (panel biçimi): birinci ve üstü %19, ikinci %17,6, üçüncü %15,3, dördüncü ve altı %12,4
const KADEMELER = [{ enAz: 100, enCok: null, komisyon: 19 }, { enAz: 70, enCok: 99.99, komisyon: 17.6 }, { enAz: 50, enCok: 69.99, komisyon: 15.3 }, { enAz: null, enCok: 49.99, komisyon: 12.4 }];

function veriKur({ kaynaklar = KAYNAK_BOS, zincirHatasi = false, komisyonlar = [], urunler = { 'abc-1': { urun: URUN, eslesme: 'barkod' } }, platformlar = [KULLANICI, SABLON], bugun = () => BUGUN } = {}) {
  const cagri = { zincir: 0, barkodlar: null };
  return {
    cagri, bugun,
    platformlar: async () => platformlar,
    tarifeler: async () => TARIFELER,
    ayarlar: async () => [],
    komisyonlar: async () => komisyonlar,
    urunler: async (b) => new Map(b.map((x) => x.toLowerCase()).filter((x) => urunler[x]).map((x) => [x, urunler[x]])),
    urunlerModelKoduyla: async () => new Map(),
    zincirKaynaklari: async (b) => { cagri.zincir++; cagri.barkodlar = b; if (zincirHatasi) throw new Error('veri_hatasi'); return kaynaklar; },
  };
}
const istek = (satirlar, saticiNo = 900001) => ({ surum: 1, platform: 'trendyol', saticiNo, satirlar });
const satir = (o = {}) => ({ id: 's1', tur: 'fiyat', barkod: 'ABC-1', fiyat: 300, komisyonOrani: 20, kaynak: 'tarife', zincir: true, ...o });
const calistir = async (satirlar, veriAyar) => {
  const d = istekiDogrula(istek(satirlar));
  if (!d.tamam) return { gecersiz: d.hata };
  const veri = veriKur(veriAyar);
  if (veriAyar?.bugun === null) delete veri.bugun; // bugün verilmezse servis İstanbul gününü kendisi bulur
  const yanit = await isle(d.istek, veri);
  return { yanit, veri, satirlar: yanit.satirlar };
};

const ADAY = { tarife: KAYNAK.TARIFE, etiket: KAYNAK.AVANTAJLI, flas: KAYNAK.FLAS };
// Bağımsız beklenen değer: sayfaların yaptığı iş
function beklenen({ kaynakAdi, fiyat, komisyon, kademeler, kaynaklar, urun = URUN }) {
  const item = { barcode: 'ABC-1', category_name: urun.category_name, category: urun.category_name };
  const z = zincirKur({ urun: item, kaynaklar, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: ADAY[kaynakAdi], fiyat } });
  if (!z || !zincirFarkli(z, fiyat)) return null;
  const kayit = kademeler ? {
    price_range_1_min: kademeler[0]?.enAz ?? undefined, commission_1: kademeler[0]?.komisyon,
    price_range_2_min: kademeler[1]?.enAz ?? undefined, price_range_2_max: kademeler[1]?.enCok ?? undefined, commission_2: kademeler[1]?.komisyon,
    price_range_3_min: kademeler[2]?.enAz ?? undefined, price_range_3_max: kademeler[2]?.enCok ?? undefined, commission_3: kademeler[2]?.komisyon,
    price_range_4_max: kademeler[3]?.enCok ?? undefined, commission_4: kademeler[3]?.komisyon,
  } : null;
  const oran = z.komisyon ?? (kayit ? kademeKomisyonu(kayit, z.saticiNet) : null) ?? komisyon;
  const r = fiyattaKar({ urun, platform: KULLANICI, sablonlar: [SABLON], fiyat: z.saticiNet, komisyonOrani: oran, tarifeler: TARIFELER, ayarlar: [] });
  return { z, oran, r };
}

console.log('\n═══ ÇAKIŞMA YOK ═══');
{
  const a = await calistir([satir()]);
  dogru('1 kayıt yok: tek başına kâr var, zincir alanı yok', a.satirlar[0].durum === 'tamam' && !('zincir' in a.satirlar[0]));
  esit('2 kayıt yokken çakışma verisi bir kez okunur', a.veri.cagri.zincir, 1);
  const b = await calistir([satir({ zincir: undefined })]);
  esit('3 çakışma istenmediyse veri hiç okunmaz, alan yok', [b.veri.cagri.zincir, 'zincir' in b.satirlar[0]], [0, false]);
  const c = await calistir([satir({ id: 'a' }), satir({ id: 'b', barkod: 'ABC-1', zincir: undefined, fiyat: 250 })]);
  esit('4 yalnız isteyen satır zincir taşır', [('zincir' in c.satirlar[0]), ('zincir' in c.satirlar[1])], [false, false]);
  const d = await calistir([satir()], { kaynaklar: kaynak({ flashProducts: [FLAS(300)] }) });
  dogru('5 diğer kayıt aynı fiyattaysa (fark yok) zincir yok', !('zincir' in d.satirlar[0]));
  const e = await calistir([satir()], { kaynaklar: kaynak({ flashProducts: [FLAS(80, { platform_account: 'Hepsiburada' })] }) });
  dogru('6 başka platformun kaydı sayılmaz', !('zincir' in e.satirlar[0]));
  const f = await calistir([satir()], { kaynaklar: kaynak({ flashProducts: [FLAS(80, { start_date: '2026-10-01', end_date: '2026-10-05' })] }) });
  dogru('7 bugün geçerli olmayan kayıt sayılmaz', !('zincir' in f.satirlar[0]));
  const g = await calistir([satir()], { kaynaklar: kaynak({ flashProducts: [FLAS(80, { barcode: 'BASKA' })] }) });
  dogru('8 başka ürünün kaydı sayılmaz', !('zincir' in g.satirlar[0]));
}

console.log('\n═══ ÇAKIŞMA VAR: PriceHub sayfa hesabıyla farksız ═══');
{
  const senaryolar = [
    ['flaş kayıtlı 80, aday tarife 300, kademeli', { kaynakAdi: 'tarife', fiyat: 300, kademeler: KADEMELER, kaynaklar: kaynak({ flashProducts: [FLAS(80)] }) }],
    ['flaş kayıtlı 80, kademe yok (aynı komisyon)', { kaynakAdi: 'tarife', fiyat: 300, kademeler: undefined, kaynaklar: kaynak({ flashProducts: [FLAS(80)] }) }],
    ['flaş 45: kademe dördüncü', { kaynakAdi: 'tarife', fiyat: 300, kademeler: KADEMELER, kaynaklar: kaynak({ flashProducts: [FLAS(45)] }) }],
    ['flaş 65: kademe üçüncü', { kaynakAdi: 'tarife', fiyat: 300, kademeler: KADEMELER, kaynaklar: kaynak({ flashProducts: [FLAS(65)] }) }],
    ['kademe boşluğuna düşen fiyat (49,995) aynı komisyon', { kaynakAdi: 'tarife', fiyat: 300, kademeler: KADEMELER, kaynaklar: kaynak({ flashProducts: [FLAS(49.995)] }) }],
    ['aday etiket 300, kayıtlı flaş 90', { kaynakAdi: 'etiket', fiyat: 300, kademeler: KADEMELER, kaynaklar: kaynak({ flashProducts: [FLAS(90)] }) }],
    ['aday flaş 300, kayıtlı etiket 90', { kaynakAdi: 'flas', fiyat: 300, kademeler: KADEMELER, kaynaklar: kaynak({ advantageTags: [ETIKET(90)] }) }],
    ['sepet kampanyası %10 + kayıtlı flaş 100', { kaynakAdi: 'tarife', fiyat: 300, kademeler: KADEMELER, kaynaklar: kaynak({ flashProducts: [FLAS(100)], campaigns: [SEPET], campaignProducts: [SEPET_URUNU(100)] }) }],
    ['kupon 10 TL + kayıtlı flaş 100', { kaynakAdi: 'tarife', fiyat: 300, kademeler: KADEMELER, kaynaklar: kaynak({ flashProducts: [FLAS(100)], ownDiscounts: [KUPON] }) }],
    ['sepet kampanyasında yazılı fiyat 60', { kaynakAdi: 'tarife', fiyat: 300, kademeler: KADEMELER, kaynaklar: kaynak({ campaigns: [SEPET], campaignProducts: [SEPET_URUNU(60)] }) }],
  ];
  for (const [ad, s] of senaryolar) {
    const e = beklenen({ ...s, komisyon: 20 });
    const g = await calistir([satir({ fiyat: s.fiyat, kaynak: s.kaynakAdi, kademeler: s.kademeler })], { kaynaklar: s.kaynaklar });
    const z = g.satirlar[0].zincir;
    if (!e) { dogru(`${ad}: sayfa çakışma görmüyor → servis de görmemeli`, z === undefined); continue; }
    dogru(`${ad}: zincir var`, z?.durum === 'tamam');
    esit(`${ad}: satıcıya kalan`, z?.saticiNet, yuvarla(e.z.saticiNet));
    esit(`${ad}: müşteri fiyatı`, z?.musteriFiyat, yuvarla(e.z.musteriFiyat));
    esit(`${ad}: komisyon oranı`, z?.komisyonOrani, e.oran);
    esit(`${ad}: net kâr`, z?.netKar, yuvarla(e.r.netKar));
    esit(`${ad}: kâr oranı`, z?.karOrani, yuvarla(e.r.karOrani));
    esit(`${ad}: taban`, z?.taban, { kaynak: e.z.taban.kaynak, fiyat: yuvarla(e.z.taban.fiyat) });
  }
}

console.log('\n═══ KOMİSYON KAYNAĞI VE ALANLAR ═══');
{
  const k = kaynak({ flashProducts: [FLAS(80)] });
  esit('1 kademeden (80 → ikinci kademe %17,6)', (await calistir([satir({ kademeler: KADEMELER })], { kaynaklar: k })).satirlar[0].zincir.komisyonKaynagi, 'kademe');
  esit('2 kademe yoksa seçeneğin kendi komisyonu', (await calistir([satir()], { kaynaklar: k })).satirlar[0].zincir.komisyonKaynagi, 'ayni');
  esit('3 kademe yoksa oran = seçeneğin oranı', (await calistir([satir()], { kaynaklar: k })).satirlar[0].zincir.komisyonOrani, 20);
  esit('4 kademeden oran', (await calistir([satir({ kademeler: KADEMELER })], { kaynaklar: k })).satirlar[0].zincir.komisyonOrani, 17.6);
  const kupon = (await calistir([satir()], { kaynaklar: kaynak({ flashProducts: [FLAS(100)], ownDiscounts: [KUPON] }) })).satirlar[0].zincir;
  dogru('5 kupon adı yanıtta', typeof kupon.kupon === 'string' && /Kupon/.test(kupon.kupon));
  const sepet = (await calistir([satir()], { kaynaklar: kaynak({ flashProducts: [FLAS(100)], campaigns: [SEPET], campaignProducts: [SEPET_URUNU(100)] }) })).satirlar[0].zincir;
  dogru('6 sepet kampanyası: müşteri fiyatı taban altına iner', sepet.musteriFiyat < sepet.taban.fiyat && sepet.saticiNet < sepet.taban.fiyat, JSON.stringify(sepet));
  dogru('7 genel kampanya adı yanıtta', typeof sepet.genel === 'string');
  esit('8 yanıt alanları (sızıntı yok)', Object.keys(sepet).sort(), ['durum', 'genel', 'hedefAlti', 'karMarji', 'karOrani', 'komisyonKaynagi', 'komisyonOrani', 'kod', 'kupon', 'musteriFiyat', 'netKar', 'plus', 'saticiNet', 'taban'].sort());
  dogru('9 sayılar iki ondalık', [sepet.netKar, sepet.saticiNet, sepet.musteriFiyat, sepet.karOrani].every((x) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-6));
  const ham = JSON.stringify((await calistir([satir()], { kaynaklar: kaynak({ flashProducts: [FLAS(100, { product_name: 'GİZLİ-AD' })] }) })).yanit);
  dogru('10 ham kayıt yanıta girmez', !ham.includes('GİZLİ-AD'));
}

console.log('\n═══ PLUS SEÇENEĞİ ═══');
{
  const plusluKayit = kaynak({ flashProducts: [FLAS(100)], campaigns: [PLUS_KAMPANYA, SEPET], campaignProducts: [PLUS_URUNU, SEPET_URUNU(100)] });
  const p = (await calistir([satir({ kaynak: 'plus', fiyat: 60, komisyonOrani: 6.8 })], { kaynaklar: plusluKayit })).satirlar[0].zincir;
  dogru('1 ürün Plus kampanyasında kayıtlı: Plus fiyatı taban olur, sepet indirimi onun üstüne iner', p?.durum === 'tamam' && p.taban.fiyat === 60 && p.saticiNet < 60, JSON.stringify(p));
  esit('2 komisyon Plus tarifesinin komisyonu', [p?.komisyonKaynagi, p?.komisyonOrani], ['plus_tarifesi', 6.8]);
  const kayitsiz = kaynak({ flashProducts: [FLAS(100)] });
  const kayitsizSonuc = (await calistir([satir({ kaynak: 'plus', fiyat: 60, komisyonOrani: 6.8 })], { kaynaklar: kayitsiz })).satirlar[0];
  dogru('3 Plus kampanyasında kayıtlı değilse Plus fiyatı sayılmaz (çakışma yok)', !('zincir' in kayitsizSonuc));
  dogru('4 başka kayıt yoksa Plus tek başına zincir kurmaz', !('zincir' in (await calistir([satir({ kaynak: 'plus', fiyat: 60, komisyonOrani: 6.8 })], { kaynaklar: kaynak({ campaigns: [PLUS_KAMPANYA], campaignProducts: [PLUS_URUNU] }) })).satirlar[0]));
  dogru('5 Plus fiyatının kendisi zincirle değişmiyorsa (yalnız flaş 100) alan yok', !('zincir' in (await calistir([satir({ kaynak: 'plus', fiyat: 60, komisyonOrani: 6.8 })], { kaynaklar: kaynak({ flashProducts: [FLAS(100)], campaigns: [PLUS_KAMPANYA], campaignProducts: [PLUS_URUNU] }) })).satirlar[0]));
}

console.log('\n═══ HEDEF ═══');
{
  const k = kaynak({ flashProducts: [FLAS(200)] });
  const hedefsiz = (await calistir([satir()], { kaynaklar: k })).satirlar[0].zincir;
  esit('1 hedef tanımsızsa null', hedefsiz.hedefAlti, null);
  const yuksek = (await calistir([satir()], { kaynaklar: k, komisyonlar: [KOMISYON({ discounted_target_profit_rate: 1000, discounted_minimum_profit_amount: 0 })] })).satirlar[0].zincir;
  dogru('2 hedef çok yüksekse hedefAlti true', yuksek.hedefAlti === true, JSON.stringify(yuksek));
  const dusuk = (await calistir([satir()], { kaynaklar: k, komisyonlar: [KOMISYON({ discounted_target_profit_rate: 1 })] })).satirlar[0].zincir;
  dogru('3 hedef çok düşükse hedefAlti false', dusuk.hedefAlti === false, JSON.stringify(dusuk));
}

console.log('\n═══ GİRDİ DOĞRULAMA ═══');
{
  const gecerli = async (o) => (await calistir([satir(o)])).satirlar?.[0]?.durum;
  esit('1 geçerli zincir isteği', await gecerli({}), 'tamam');
  for (const [ad, o] of [
    ['zincir false', { zincir: false }], ['zincir "true"', { zincir: 'true' }], ['zincir 1', { zincir: 1 }],
    ['kaynak yok', { kaynak: undefined }], ['kaynak mevcut', { kaynak: 'mevcut' }], ['kaynak buybox', { kaynak: 'buybox' }],
    ['kademeler zinciri olmadan', { zincir: undefined, kademeler: KADEMELER }],
    ['kademeler dizi değil', { kademeler: 'x' }], ['kademeler 5 öğe', { kademeler: [null, null, null, null, null] }],
    ['kademe komisyon 101', { kademeler: [{ enAz: 1, enCok: null, komisyon: 101 }] }], ['kademe komisyon metin', { kademeler: [{ enAz: 1, enCok: null, komisyon: '10' }] }],
    ['kademe komisyon eksi', { kademeler: [{ enAz: 1, enCok: null, komisyon: -1 }] }], ['kademe sınırsız', { kademeler: [{ enAz: null, enCok: null, komisyon: 10 }] }],
    ['kademe eksi sınır', { kademeler: [{ enAz: -5, enCok: null, komisyon: 10 }] }], ['kademe dev sınır', { kademeler: [{ enAz: 1e12, enCok: null, komisyon: 10 }] }],
    ['kademe metin öğe', { kademeler: ['x'] }],
  ]) {
    esit(`2 ${ad} → veri_gecersiz`, await gecerli(o), 'veri_gecersiz');
  }
  esit('3 tam 4 kademe (boşluklu) geçerli', await gecerli({ kademeler: [null, KADEMELER[1], null, KADEMELER[3]] }), 'tamam');
  for (const kaynakAdi of ['tarife', 'etiket', 'flas', 'plus']) esit(`4 kaynak ${kaynakAdi} kabul`, await gecerli({ kaynak: kaynakAdi }), 'tamam');
  const temiz = istekiDogrula(istek([satir({ kademeler: [{ ...KADEMELER[0], fazla: 'x' }], gizli: 'GİZLİ' })])).istek.satirlar[0];
  dogru('5 bilinmeyen alan istekte taşınmaz', !('gizli' in temiz));
}

console.log('\n═══ HATA VE UÇ DURUMLAR ═══');
{
  const h = (await calistir([satir()], { zincirHatasi: true })).satirlar[0];
  esit('1 çakışma verisi okunamazsa tek başına kâr korunur', h.durum, 'tamam');
  esit('2 ve zincir "hesaplanamadi" döner', h.zincir, { durum: 'hesaplanamadi' });
  const m = await calistir([satir({ barkod: 'YOK-1' })], { kaynaklar: kaynak({ flashProducts: [FLAS(80, { barcode: 'YOK-1' })] }) });
  esit('3 eşleşmeyen ürün: rakam da zincir de yok', [m.satirlar[0].durum, 'zincir' in m.satirlar[0]], ['eslesmedi', false]);
  const u = await calistir([satir()], { platformlar: [{ ...KULLANICI, satici_no: 111 }, SABLON], kaynaklar: kaynak({ flashProducts: [FLAS(80)] }) });
  esit('4 mağaza uyuşmuyorsa çakışma verisi hiç okunmaz', [u.yanit.magaza.durum, u.veri.cagri.zincir, u.satirlar.length], ['uyusmuyor', 0, 0]);
  const b = await calistir([satir({ id: 'a', barkod: 'ABC-1' }), satir({ id: 'b', barkod: 'ABC-1', fiyat: 250 }), satir({ id: 'c', barkod: 'XYZ', zincir: undefined })]);
  esit('5 yalnız istenen barkodlar (tekil) okunur', b.veri.cagri.barkodlar, ['ABC-1']);
  const i = await calistir([satir({ fiyat: 0 })], { kaynaklar: kaynak({ flashProducts: [FLAS(80)] }) });
  esit('6 geçersiz satır: veri_gecersiz, zincir yok', [i.satirlar[0].durum, 'zincir' in i.satirlar[0]], ['veri_gecersiz', false]);
  const s = await calistir([satir()], { bugun: null, kaynaklar: kaynak({ flashProducts: [FLAS(80, { start_date: '2999-01-01', end_date: '2999-12-31' })] }) });
  esit('7 bugün verilmezse İstanbul günü kullanılır (gelecek tarihli kayıt sayılmaz)', 'zincir' in s.satirlar[0], false);
}

console.log('\n═══ BOŞLUKLAR (mutasyon denetiminden) ═══');
{
  // 1) Plus seçeneği, ürün Plus'ta kayıtlı DEĞİL ama başka bir kayıt Plus fiyatından düşük: Plus fiyatı uygulanmaz → çakışma raporlanmaz
  const dusuk = kaynak({ flashProducts: [FLAS(50)] });
  dogru('1 Plus üyesi olmayan üründe, Plus fiyatından düşük başka kayıt çakışma sayılmaz',
    !('zincir' in (await calistir([satir({ kaynak: 'plus', fiyat: 60, komisyonOrani: 6.8 })], { kaynaklar: dusuk })).satirlar[0]));
  // 2) Plus üyesinde komisyon, kademelerden DEĞİL Plus tarifesinden (seçeneğin kendi komisyonu) gelir
  const uye = kaynak({ flashProducts: [FLAS(100)], campaigns: [PLUS_KAMPANYA, SEPET], campaignProducts: [PLUS_URUNU, SEPET_URUNU(100)] });
  const pz = (await calistir([satir({ kaynak: 'plus', fiyat: 60, komisyonOrani: 6.8, kademeler: KADEMELER })], { kaynaklar: uye })).satirlar[0].zincir;
  esit('2 Plus: kademe olsa da komisyon Plus tarifesinin', [pz.komisyonKaynagi, pz.komisyonOrani], ['plus_tarifesi', 6.8]);
  // 3) Kaynak eşlemesi: etiket adayı, kayıtlı ETİKET kaydının yerine geçer; kayıtlı TARİFE kaydı kalır
  const karisik = kaynak({ priceRanges: [{ barcode: 'ABC-1', ...tarihli, selected_range: 'range_1', selected_price: 60, manual_price: 0 }], advantageTags: [ETIKET(55)] });
  const e = beklenen({ kaynakAdi: 'etiket', fiyat: 300, komisyon: 20, kademeler: undefined, kaynaklar: karisik });
  const ez = (await calistir([satir({ kaynak: 'etiket', fiyat: 300 })], { kaynaklar: karisik })).satirlar[0].zincir;
  esit('3 etiket adayı: taban kayıtlı tarife (60), kayıtlı etiket (55) yerine geçti', [ez.taban.kaynak, ez.taban.fiyat, ez.saticiNet], [e.z.taban.kaynak, 60, yuvarla(e.z.saticiNet)]);
  // 4) Boş (null) kademeler yanlış eşleşmez: yalnız dördüncü kademe tanımlı, net fiyat 45 → o kademenin komisyonu
  const dortSadece = [null, null, null, { enAz: null, enCok: 49.99, komisyon: 12.4 }];
  const dz = (await calistir([satir({ kademeler: dortSadece })], { kaynaklar: kaynak({ flashProducts: [FLAS(45)] }) })).satirlar[0].zincir;
  esit('4 yalnız dördüncü kademe tanımlıyken 45 ₺ → %12,4', [dz.komisyonKaynagi, dz.komisyonOrani], ['kademe', 12.4]);
  const uzak = (await calistir([satir({ kademeler: dortSadece })], { kaynaklar: kaynak({ flashProducts: [FLAS(80)] }) })).satirlar[0].zincir;
  esit('4b aynı kademelerle 80 ₺ (kademe dışı) → seçeneğin kendi komisyonu', [uzak.komisyonKaynagi, uzak.komisyonOrani], ['ayni', 20]);
  // 5) Bugün İstanbul gününe göre (veri.bugun verilmezse): bugün başlayıp bugün biten kayıt sayılır
  const istBugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
  const s5 = await calistir([satir()], { bugun: null, kaynaklar: kaynak({ flashProducts: [FLAS(80, { start_date: istBugun, end_date: istBugun })] }) });
  dogru('5 İstanbul bugününde geçerli kayıt sayılır', s5.satirlar[0].zincir?.durum === 'tamam');
  // 6) Kâr hesaplanamazsa (kargo tarifesi vb.) çakışma sonucu yok: rakam uydurulmaz
  const { cakismaKari } = await import(`${lib}cakismaKari.js`);
  const c = cakismaKari({ kaynak: 'tarife', barkod: 'ABC-1', fiyat: 300, komisyonOrani: 20, kademeler: undefined, urun: URUN, kaynaklar: kaynak({ flashProducts: [FLAS(80)] }), bugun: BUGUN, platformAdi: 'Trendyol', hesapla: () => ({ durum: 'kargo_tarifesi_yok' }) });
  esit('6 hesapla tamam vermezse sonuç null', c, null);
  const c2 = cakismaKari({ kaynak: 'tarife', barkod: 'ABC-1', fiyat: 300, komisyonOrani: 20, kademeler: undefined, urun: URUN, kaynaklar: kaynak({ flashProducts: [FLAS(80)] }), bugun: BUGUN, platformAdi: 'Trendyol', hesapla: () => null });
  esit('6b hesapla null verirse sonuç null', c2, null);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
