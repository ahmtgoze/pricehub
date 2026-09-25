/**
 * karHesabi.js — "verilen fiyatta kâr" modülünün testi.
 *
 * Asıl güvence: modül, promosyon sayfalarının (Campaigns.jsx satır ~598-651)
 * bugünkü kâr hesabıyla AYNI sonucu vermeli. O hesap burada bilerek olduğu
 * gibi yeniden yazıldı ve binlerce girdide modülle karşılaştırılıyor. Sayfa
 * mantığı değişirse ya da modül ondan ayrışırsa bu test düşer.
 *
 * Modül .jsx motoru import ettiği için (Node .jsx okuyamaz) motorla birlikte
 * metin olarak yüklenir; motorSenaryolari.test.mjs ile aynı yöntem.
 * Sabit veriler uydurmadır; gerçek maliyet/fiyat içermez (depo herkese açık).
 */
import { readFileSync } from 'node:fs';

const libKlasoru = new URL('../src/lib/', import.meta.url).href;
const oku = (yol) => readFileSync(new URL(yol, import.meta.url), 'utf8');
const yukle = (kod) => import('data:text/javascript;base64,' + Buffer.from(kod).toString('base64'));

const motor = await yukle(oku('../src/components/PriceCalculationEngine.jsx').replaceAll("'../lib/", `'${libKlasoru}`));
const motorUrl = 'data:text/javascript;base64,' + Buffer.from(oku('../src/components/PriceCalculationEngine.jsx').replaceAll("'../lib/", `'${libKlasoru}`)).toString('base64');
const { fiyattaKar, platformBirlestir } = await yukle(
  oku('../src/lib/karHesabi.js')
    .replace("'../components/PriceCalculationEngine.jsx'", `'${motorUrl}'`)
    .replaceAll("'./", `'${libKlasoru}`),
);
const { promosyonKargosu, ciftKargoKurallari } = await import(libKlasoru + 'kargoHesabi.js');
const { gecerliMaliyet } = await import(libKlasoru + 'gecerliMaliyet.js');
const { calculatePriceBreakdown } = motor;

let gecen = 0, kalan = 0;
const dogru = (ad, kosul, aciklama = '') => {
  if (kosul) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}${aciklama ? '\n     ' + aciklama : ''}`); }
};
const esit = (ad, bulunan, beklenen) => dogru(ad, JSON.stringify(bulunan) === JSON.stringify(beklenen), `bulunan: ${JSON.stringify(bulunan)} beklenen: ${JSON.stringify(beklenen)}`);

/* ── Sabitler (uydurma) ─────────────────────────────────────────────── */
const SABLON = {
  id: 'sablon', platform_type: 'trendyol', is_system_admin: true,
  use_barem: true, barem_max_desi: 10, barem1_min: 0, barem1_max: 199.99, barem2_min: 200, barem2_max: 349.99,
  has_withholding: true, withholding_rate: 1,
  has_service_fee: true, service_fee_type: 'fixed_per_order', service_fee_amount: 13.18, service_fee_vat_rate: 20, same_day_delivery_service_fee: 5.99,
  has_pos_service_fee: false, pos_service_fee_rate: 0,
  has_corporate_tax: true, corporate_tax_rate: 25,
};
const KULLANICI = { ...SABLON, id: 'p-ty', is_system_admin: false, shipping_company_name: 'Trendyol Express' };
const WEB = { id: 'p-web', platform_type: 'website', use_barem: false, has_corporate_tax: true, corporate_tax_rate: 25, use_custom_shipping_price: true };

const tarife = (o) => ({ is_active: true, vat_rate: 20, is_admin_created: true, ...o });
const TARIFELER = [
  tarife({ platform_type: 'trendyol', rate_type: 'barem1', price: 88.0, same_day_delivery: false }),
  tarife({ platform_type: 'trendyol', rate_type: 'barem1', price: 46.49, same_day_delivery: true }),
  tarife({ platform_type: 'trendyol', rate_type: 'barem2', price: 94.49, same_day_delivery: false }),
  tarife({ platform_type: 'trendyol', rate_type: 'barem2', price: 84.49, same_day_delivery: true }),
  ...Array.from({ length: 41 }, (_, d) => tarife({ platform_type: 'trendyol', rate_type: 'desi', desi: d, price: 98 + d * 11, same_day_delivery: false })),
];
const urun = (o = {}) => ({ id: 'u1', cost: 100, desi: 2, vat_rate: 20, printing_cost: 0, extra_cost: 0, same_day_delivery: false, ...o });

// Promosyon sayfasındaki (Campaigns.jsx) kâr hesabının birebir kopyası.
function sayfaHesabi({ urun: u, platform, fiyat, komisyon, tarifeler, ayarlar }) {
  const platformShippingRates = tarifeler.filter((r) => r.is_active !== false && (r.platform_id === platform.id || r.platform_type === platform.platform_type));
  const { shippingCost, shippingVatRate, baremUsed } = promosyonKargosu({ platform, urun: u, fiyat, tarifeler: platformShippingRates, kurallar: ciftKargoKurallari(ayarlar) });
  const b = calculatePriceBreakdown({
    salePriceInclVat: parseFloat(fiyat), productCost: gecerliMaliyet(u), productVatRate: parseFloat(u.vat_rate) || 20,
    shippingCost: parseFloat(shippingCost) || 0, shippingVatRate: parseFloat(shippingVatRate) || 20,
    commissionRate: parseFloat(komisyon) || 0, commissionVatRate: 20, platform, baremUsed,
    packagingCost: 0, printingCost: parseFloat(u.printing_cost) || 0, extraCost: parseFloat(u.extra_cost) || 0,
    isSameDayDelivery: u.same_day_delivery || false,
  });
  return { netKar: b.netProfit, karOrani: b.profitRate, kargo: b.shippingCost, baremUsed };
}

console.log('\n═══ SAYFA HESABIYLA EŞİTLİK ═══');
{
  let n = 0, farkli = 0, ilk = null;
  for (const cost of [15, 40, 100, 400, 1500]) {
    for (const desi of [1, 2, 5, 12]) {
      for (const fiyat of [59.99, 149.99, 199.99, 299.9, 524.24, 1200]) {
        for (const komisyon of [12, 19, 20]) {
          for (const gunIci of [false, true]) {
            const u = urun({ cost, desi, same_day_delivery: gunIci });
            const beklenen = sayfaHesabi({ urun: u, platform: KULLANICI, fiyat, komisyon, tarifeler: TARIFELER, ayarlar: [] });
            const r = fiyattaKar({ urun: u, platform: KULLANICI, sablonlar: [SABLON], fiyat, komisyonOrani: komisyon, tarifeler: TARIFELER });
            n++;
            const ayni = r.durum === 'tamam' && r.netKar === beklenen.netKar && r.karOrani === beklenen.karOrani
              && r.kalemler.kargo === beklenen.kargo && r.baremUsed === beklenen.baremUsed;
            if (!ayni) { farkli++; ilk ??= JSON.stringify({ cost, desi, fiyat, komisyon, gunIci, r: r.durum, beklenen }); }
          }
        }
      }
    }
  }
  dogru(`1 ${n} girdide modül = sayfa hesabı`, farkli === 0, `${farkli} fark. ilk: ${ilk}`);
}

console.log('\n═══ PLATFORM BİRLEŞTİRME ═══');
{
  const kul = { ...KULLANICI, corporate_tax_rate: 20, service_fee_amount: 9, withholding_rate: 0.5, barem1_max: 100, shipping_company_name: 'Benim Kargom' };
  const b = platformBirlestir(kul, [SABLON]);
  esit('2 hizmet bedeli şablondan', b.service_fee_amount, 13.18);
  esit('3 stopaj şablondan', b.withholding_rate, 1);
  esit('4 barem sınırı şablondan', b.barem1_max, 199.99);
  esit('5 kurumlar vergisi kullanıcıdan', b.corporate_tax_rate, 20);
  esit('6 kargo firması kullanıcıdan', b.shipping_company_name, 'Benim Kargom');
  esit('7 kullanıcı kaydı değişmedi', kul.service_fee_amount, 9);
  esit('8 web sitesi olduğu gibi', platformBirlestir(WEB, [SABLON]), WEB);
  esit('9 şablon yoksa olduğu gibi', platformBirlestir(kul, []), kul);
  esit('10 farklı tür şablonu uygulanmaz', platformBirlestir(kul, [{ ...SABLON, platform_type: 'hepsiburada', service_fee_amount: 99 }]), kul);
}
{
  const kul = { ...KULLANICI, service_fee_amount: 1 };
  const u = urun({ cost: 100, desi: 2 });
  const sablonlu = fiyattaKar({ urun: u, platform: kul, sablonlar: [SABLON], fiyat: 300, komisyonOrani: 20, tarifeler: TARIFELER });
  const sablonsuz = fiyattaKar({ urun: u, platform: kul, sablonlar: [], fiyat: 300, komisyonOrani: 20, tarifeler: TARIFELER });
  dogru('11 şablondaki yüksek hizmet bedeli kârı düşürür', sablonlu.netKar < sablonsuz.netKar, `${sablonlu.netKar} ≥ ${sablonsuz.netKar}`);
}

console.log('\n═══ GEÇERSİZ GİRDİ VE EKSİK VERİ: rakam çıkmamalı ═══');
{
  const dene = (o) => fiyattaKar({ urun: urun(), platform: KULLANICI, sablonlar: [SABLON], fiyat: 200, komisyonOrani: 20, tarifeler: TARIFELER, ...o });
  for (const [ad, girdi] of [['fiyat 0', { fiyat: 0 }], ['fiyat negatif', { fiyat: -5 }], ['fiyat metin', { fiyat: 'abc' }], ['fiyat boş', { fiyat: null }],
    ['fiyat sonsuz', { fiyat: Infinity }], ['komisyon negatif', { komisyonOrani: -1 }], ['komisyon 101', { komisyonOrani: 101 }], ['komisyon metin', { komisyonOrani: 'x' }]]) {
    const r = dene(girdi);
    dogru(`12 ${ad} → veri_gecersiz`, r.durum === 'veri_gecersiz' && r.netKar === undefined, JSON.stringify(r));
  }
  esit('13 maliyet 0 → maliyet_yok', dene({ urun: urun({ cost: 0 }) }).durum, 'maliyet_yok');
  esit('14 tarife yok → kargo_tarifesi_yok', dene({ tarifeler: [] }).durum, 'kargo_tarifesi_yok');
  esit('15 pasif tarifeler → kargo_tarifesi_yok', dene({ tarifeler: TARIFELER.map((t) => ({ ...t, is_active: false })) }).durum, 'kargo_tarifesi_yok');
  esit('16 metin olarak gelen sayılar (Supabase numeric)', dene({ fiyat: '200', komisyonOrani: '20', urun: urun({ cost: '100', vat_rate: '20' }) }).durum, 'tamam');
}

console.log('\n═══ MALİYET KURALI ═══');
{
  const r = fiyattaKar({ urun: urun({ cost: 50, base_cost: 80, ref_product_id: 'r' }), platform: KULLANICI, sablonlar: [SABLON], fiyat: 300, komisyonOrani: 20, tarifeler: TARIFELER });
  esit('17 referanslı ürün: baz maliyet kendisinden yüksekse baz kullanılır', r.kalemler.maliyet, 80);
  const s = fiyattaKar({ urun: urun({ cost: 50, base_cost: 80 }), platform: KULLANICI, sablonlar: [SABLON], fiyat: 300, komisyonOrani: 20, tarifeler: TARIFELER });
  esit('18 referanssız ürün: baz maliyet yok sayılır', s.kalemler.maliyet, 50);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
