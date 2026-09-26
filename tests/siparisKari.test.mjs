/**
 * siparisKari.js — gerçekleşen sipariş kârı testi.
 *
 * Temel güvence: motordan BAĞIMSIZ, elle yazılmış formülle (satış − maliyet − komisyon − kargo
 * − hizmet bedeli − stopaj − net KDV) sonuç karşılaştırılır. Sabit veriler uydurmadır
 * (depo herkese açık); yalnızca Trendyol'un gerçek veri YAPISI taklit edilir (her satır bir
 * adet, komisyon satır bazında, kargo ve hizmet bedeli sipariş toplamı).
 */
import { readFileSync } from 'node:fs';

const lib = new URL('../src/lib/', import.meta.url).href;
const oku = (yol) => readFileSync(new URL(yol, import.meta.url), 'utf8');
const dataUrl = (kod) => 'data:text/javascript;base64,' + Buffer.from(kod).toString('base64');
const MOTOR = "'../components/PriceCalculationEngine.jsx'";

const motorUrl = dataUrl(oku('../src/components/PriceCalculationEngine.jsx').replaceAll("'../lib/", `'${lib}`));
const karHesabiUrl = dataUrl(oku('../src/lib/karHesabi.js').replace(MOTOR, `'${motorUrl}'`).replaceAll("'./", `'${lib}`));
const { siparisKari } = await import(dataUrl(
  oku('../src/lib/siparisKari.js').replace(MOTOR, `'${motorUrl}'`).replace("'./karHesabi.js'", `'${karHesabiUrl}'`).replaceAll("'./", `'${lib}`),
));

let gecen = 0, kalan = 0;
const dogru = (ad, kosul, aciklama = '') => {
  if (kosul) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}${aciklama ? '\n     ' + aciklama : ''}`); }
};
const esit = (ad, bulunan, beklenen) => dogru(ad, JSON.stringify(bulunan) === JSON.stringify(beklenen), `bulunan: ${JSON.stringify(bulunan)} beklenen: ${JSON.stringify(beklenen)}`);
const yakin = (ad, a, b, tol = 0.01) => dogru(ad, Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

/* ── Uydurma veri ───────────────────────────────────────────────────── */
const SABLON = {
  id: 'sablon', platform_type: 'trendyol', is_system_admin: true,
  use_barem: true, barem_max_desi: 10, barem1_min: 0, barem1_max: 199.99, barem2_min: 200, barem2_max: 349.99,
  has_withholding: true, withholding_rate: 1,
  has_service_fee: true, service_fee_type: 'fixed_per_order', service_fee_amount: 13.18, service_fee_vat_rate: 20,
  has_same_day_delivery: true, same_day_delivery_service_fee: 5.99,
  has_pos_service_fee: false, pos_service_fee_rate: 0, has_corporate_tax: true, corporate_tax_rate: 25,
};
const KULLANICI = { ...SABLON, id: 'p-ty', is_system_admin: false, is_active: true };
const t = (o) => ({ is_active: true, vat_rate: 20, is_admin_created: true, platform_type: 'trendyol', ...o });
const TARIFELER = [
  t({ rate_type: 'barem1', price: 88, same_day_delivery: false }), t({ rate_type: 'barem1', price: 46.49, same_day_delivery: true }),
  t({ rate_type: 'barem2', price: 94.49, same_day_delivery: false }), t({ rate_type: 'barem2', price: 84.49, same_day_delivery: true }),
  ...Array.from({ length: 41 }, (_, d) => t({ rate_type: 'desi', desi: d, price: 98 + d * 11, same_day_delivery: false })),
];
const urun = (o = {}) => ({ id: 'u', cost: 100, desi: 2, vat_rate: 20, printing_cost: 0, extra_cost: 0, same_day_delivery: false, ...o });
const satir = (id, satis, kom, u = urun(), o = {}) => ({ id, satis, indirim: 0, komisyonTutari: kom, durum: 'teslim', urun: u, ...o });
const hesapla = (o) => siparisKari({ platform: KULLANICI, sablonlar: [SABLON], tarifeler: TARIFELER, ayarlar: [], ...o });

// Motordan bağımsız elle formül (KDV %20, stopaj = KDV hariç satışın %1, vergi öncesi)
function elleVergiOncesi({ satislar, maliyetler, komisyonlar, kargo, hizmet, stopajOrani = 1 }) {
  const top = (d) => d.reduce((a, b) => a + b, 0);
  const S = top(satislar), M = top(maliyetler), K = top(komisyonlar);
  const stopaj = (S / 1.2) * (stopajOrani / 100);
  const netKdv = (S - M - kargo - hizmet - K) / 6; // her kalemin KDV'si /6 (KDV dahil tutar × 20/120)
  return S - M - K - kargo - hizmet - stopaj - netKdv;
}

console.log('\n═══ ELLE FORMÜLLE EŞİTLİK ═══');
{
  const satirlar = [satir('a', 735.99, 147.2, urun({ cost: 210 })), satir('b', 613.99, 122.8, urun({ cost: 150, desi: 3 })), satir('c', 369.49, 73.9, urun({ cost: 80 }))];
  const r = hesapla({ satirlar, siparis: { kargo: 98.34, hizmet: 13.19 } });
  esit('1 sonuç durumu', r.durum, 'tamam');
  const beklenen = elleVergiOncesi({ satislar: [735.99, 613.99, 369.49], maliyetler: [210, 150, 80], komisyonlar: [147.2, 122.8, 73.9], kargo: 98.34, hizmet: 13.19 });
  yakin('2 toplam vergi öncesi kâr = elle formül', r.toplam.vergiOncesiKar, beklenen);
  yakin('3 satır kârlarının toplamı = sipariş kârı', r.satirlar.reduce((a, x) => a + x.vergiOncesiKar, 0), r.toplam.vergiOncesiKar);
  yakin('4 kargo payları toplamı = sipariş kargosu', r.satirlar.reduce((a, x) => a + x.kargoPayi, 0), 98.34);
  yakin('5 hizmet bedeli payları toplamı = sipariş hizmet bedeli', r.satirlar.reduce((a, x) => a + x.hizmetPayi, 0), 13.19);
  yakin('6 kâr oranı = net kâr / maliyet', r.toplam.karOrani, (r.toplam.netKar / 440) * 100);
  yakin('7 kâr marjı = net kâr / satış', r.toplam.karMarji, (r.toplam.netKar / (735.99 + 613.99 + 369.49)) * 100);
  dogru('8 kurumlar vergisi net kârı vergi öncesinden düşürür', r.toplam.netKar < r.toplam.vergiOncesiKar);
  yakin('9 stopaj toplamı = KDV hariç satışın %1\'i', r.satirlar.reduce((a, x) => a + x.kalemler.stopaj, 0), ((735.99 + 613.99 + 369.49) / 1.2) * 0.01);
}

console.log('\n═══ PAY DAĞITIMI VE ADET ═══');
{
  // Adedi 2 olan ürün iki satır gelir (aynı ürün, aynı tutar)
  const u = urun({ cost: 100 });
  const iki = hesapla({ satirlar: [satir('1', 300, 60, u), satir('2', 300, 60, u), satir('3', 100, 20, urun({ cost: 30 }))], siparis: { kargo: 90, hizmet: 13 } });
  esit('10 aynı üründen iki satır sorunsuz', iki.durum, 'tamam');
  yakin('11 pay = satış oranı (300/700 × 90)', iki.satirlar[0].kargoPayi, (300 / 700) * 90);
  yakin('12 küçük satır payı (100/700 × 13)', iki.satirlar[2].hizmetPayi, (100 / 700) * 13);
  yakin('13 aynı satırlar aynı kâr', iki.satirlar[0].netKar, iki.satirlar[1].netKar, 1e-9);
}

console.log('\n═══ İNDİRİM, CEZA, İADE KARGO ═══');
{
  const a = hesapla({ satirlar: [satir('a', 500, 96, urun(), { indirim: 50 })], siparis: { kargo: 80, hizmet: 13 } });
  const b = hesapla({ satirlar: [satir('a', 450, 96)], siparis: { kargo: 80, hizmet: 13 } });
  yakin('14 satıcı indirimi satıştan düşülür (500−50 = 450)', a.toplam.netKar, b.toplam.netKar, 1e-9);
  const sade = hesapla({ satirlar: [satir('a', 450, 96)], siparis: { kargo: 80, hizmet: 13 } });
  const cezali = hesapla({ satirlar: [satir('a', 450, 96)], siparis: { kargo: 80, hizmet: 13, ceza: 25, iadeKargo: 10 } });
  yakin('15 ceza ve iade kargo net kârdan aynen düşer', sade.toplam.netKar - cezali.toplam.netKar, 35, 1e-9);
  esit('16 diğer kesinti ayrıca raporlanır', cezali.toplam.digerKesinti, 35);
}

console.log('\n═══ PLATFORM AYARI KAYNAĞI ═══');
{
  const girdi = { satirlar: [satir('a', 500, 100)], siparis: { kargo: 90, hizmet: 13 } };
  const kul = { ...KULLANICI, corporate_tax_rate: 20, withholding_rate: 0.5, service_fee_amount: 1 };
  const r = siparisKari({ ...girdi, platform: kul, sablonlar: [SABLON], tarifeler: TARIFELER });
  const ref = siparisKari({ ...girdi, platform: KULLANICI, sablonlar: [SABLON], tarifeler: TARIFELER });
  yakin('17 stopaj şablondan (%1), kullanıcı %0,5 yazsa da', r.satirlar[0].kalemler.stopaj, ref.satirlar[0].kalemler.stopaj, 1e-9);
  yakin('18 vergi öncesi kâr aynı', r.toplam.vergiOncesiKar, ref.toplam.vergiOncesiKar, 1e-9);
  dogru('19 kurumlar vergisi kullanıcıdan (%20 < %25 ⇒ net kâr daha yüksek)', r.toplam.netKar > ref.toplam.netKar, `${r.toplam.netKar} ≤ ${ref.toplam.netKar}`);
  yakin('20 gerçek hizmet bedeli kullanılır (platformdaki sabit değil)', r.satirlar[0].kalemler.hizmetBedeli, 13, 1e-9);
}

console.log('\n═══ YENİ SİPARİŞ: TAHMİNİ ═══');
{
  const yeni = (kargo0, u) => hesapla({ satirlar: [satir('a', 300, 60, u, { durum: 'yeni' })], siparis: { kargo: kargo0, hizmet: 0 } });
  const r = yeni(0, urun({ desi: 2 }));
  esit('21 kesinti yoksa "tahmini"', r.durum, 'tahmini');
  dogru('22 kargo PriceHub tarifesinden tahmin edilir', r.kesintiler.kargo > 0);
  yakin('23 hizmet bedeli şablondan (13,18)', r.kesintiler.hizmet, 13.18, 1e-9);
  const gunIci = yeni(0, urun({ desi: 2, same_day_delivery: true }));
  yakin('24 Bugün Kargoda ürününde indirimli hizmet bedeli (5,99)', gunIci.kesintiler.hizmet, 5.99, 1e-9);
  const dolu = hesapla({ satirlar: [satir('a', 300, 60, urun(), { durum: 'yeni' })], siparis: { kargo: 88, hizmet: 13.19 } });
  esit('25 kesinti geldiyse yeni sipariş de "tamam" sayılır', dolu.durum, 'tamam');
  esit('26 tarife yoksa rakam yok', hesapla({ satirlar: [satir('a', 300, 60, urun(), { durum: 'yeni' })], siparis: { kargo: 0, hizmet: 0 }, tarifeler: [] }).durum, 'kargo_tarifesi_yok');
}

console.log('\n═══ RAKAM ÇIKMAMASI GEREKEN DURUMLAR ═══');
{
  const s = (o) => satir('a', 300, 60, urun(), o);
  const sip = { kargo: 90, hizmet: 13 };
  for (const durum of ['iptal', 'iade', 'bilinmeyen']) {
    const r = hesapla({ satirlar: [s(), s({ id: 'b', durum })], siparis: sip });
    dogru(`27 ${durum} içeren sipariş → iade_iptal, rakam yok`, r.durum === 'iade_iptal' && r.toplam === undefined && r.satirlar === undefined);
  }
  const eslesmedi = hesapla({ satirlar: [s(), s({ id: 'b', urun: null })], siparis: sip });
  dogru('28 eşleşmeyen ürün → sipariş toplamı yok', eslesmedi.durum === 'eslesmedi' && eslesmedi.toplam === undefined);
  esit('29 eşleşen satır işaretlenir', eslesmedi.satirlar.map((x) => x.durum), ['tamam', 'eslesmedi']);
  const maliyetsiz = hesapla({ satirlar: [s(), s({ id: 'b', urun: urun({ cost: 0 }) })], siparis: sip });
  dogru('30 maliyeti olmayan ürün → sipariş toplamı yok', maliyetsiz.durum === 'maliyet_yok' && maliyetsiz.toplam === undefined);
  for (const [ad, girdi] of [['satır yok', { satirlar: [], siparis: sip }], ['sipariş yok', { satirlar: [s()], siparis: null }],
    ['negatif kargo', { satirlar: [s()], siparis: { kargo: -1, hizmet: 13 } }], ['kargo metin', { satirlar: [s()], siparis: { kargo: '90', hizmet: 13 } }],
    ['NaN hizmet', { satirlar: [s()], siparis: { kargo: 90, hizmet: NaN } }], ['negatif ceza', { satirlar: [s()], siparis: { ...sip, ceza: -5 } }],
    ['satış 0', { satirlar: [s({ satis: 0 })], siparis: sip }], ['indirim ≥ satış', { satirlar: [s({ indirim: 300 })], siparis: sip }],
    ['komisyon negatif', { satirlar: [s({ komisyonTutari: -1 })], siparis: sip }], ['satış metin', { satirlar: [s({ satis: '300' })], siparis: sip }]]) {
    esit(`31 ${ad} → veri_gecersiz`, hesapla(girdi).durum, 'veri_gecersiz');
  }
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
