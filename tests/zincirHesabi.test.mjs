import { zincirKur, sira0Adaylari, genelKampanyalar, plusDurumu, bugunMetni, KAYNAK, kendiIndirimTutari } from '../src/lib/zincirHesabi.js';
let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};
const BUGUN = '2026-09-15';
// KCZ4555 gercek kayitlari (15 Eylul 2026)
const urun = { barcode: 'KCZ4555', stock_code: 'KCZ4555' };
const K = {
  priceRanges: [{ barcode: 'KCZ4555', platform_account: 'Trendyol', start_date: '2026-09-15', end_date: '2026-09-22', selected_range: 'range_4', selected_price: 297.43,
    pencere_tarihleri: { '7 Gün': { baslangic: '2026-09-15T08:00:00+03:00', bitis: '2026-09-22T07:59:00+03:00' } }, secimler: { '7 Gün': { kademe: 'range_4', fiyat: 297.43 } } }],
  advantageTags: [{ barcode: 'KCZ4555', platform_account: 'Trendyol', start_date: '2026-09-15', end_date: '2026-09-22', selected_range: 'mega_advantage', selected_price: 297.43 }],
  flashProducts: [
    { barcode: 'KCZ4555', platform_account: 'Trendyol', start_date: '2026-09-15', end_date: '2026-09-22', selected_type: 'flash_24h', selected_price: 309.22 },
    { barcode: 'KCZ4555', platform_account: 'Trendyol', start_date: '2026-09-15', end_date: '2026-09-22', selected_type: 'none', selected_price: 0 },
  ],
  plusTariffs: [{ barcode: 'KCZ4555', platform_account: 'Trendyol', start_date: '2026-09-15', end_date: '2026-09-22', selected_type: 'plus', selected_price: 299, plus_commission_offer: 7.4 }],
  campaigns: [
    { id: 'c300', campaign_type: 'all_countries', start_date: '2026-09-15', end_date: '2026-09-22', discount_kind: 'cart_tl', discount_amount: 30, threshold_amount: 300, trendyol_coverage_rate: 55 },
    { id: 'c500', campaign_type: 'all_countries', start_date: '2026-09-15', end_date: '2026-09-22', discount_kind: 'cart_tl', discount_amount: 50, threshold_amount: 500, trendyol_coverage_rate: 55 },
    { id: 'c1000', campaign_type: 'all_countries', start_date: '2026-09-15', end_date: '2026-09-22', discount_kind: 'cart_tl', discount_amount: 100, threshold_amount: 1000, trendyol_coverage_rate: 40 },
    { id: 'bitmis', campaign_type: 'all_countries', start_date: '2026-09-01', end_date: '2026-09-08', discount_kind: 'cart_tl', discount_amount: 200, threshold_amount: 1000, trendyol_coverage_rate: 0 },
    { id: 'plus', campaign_type: 'trendyol_plus', start_date: '2026-07-06', end_date: '2026-10-01', discount_kind: 'net_percent', discount_amount: 5, trendyol_coverage_rate: 0 },
  ],
  campaignProducts: [
    { campaign_id: 'c300', barcode: 'KCZ4555', selected_type: 'campaign', campaign_price: 346.49 },
    { campaign_id: 'c500', barcode: 'KCZ4555', selected_type: 'campaign', campaign_price: 346.49 },
    { campaign_id: 'c1000', barcode: 'KCZ4555', selected_type: 'campaign', campaign_price: 346.49 },
    { campaign_id: 'bitmis', barcode: 'KCZ4555', selected_type: 'campaign', campaign_price: 300 },
    { campaign_id: 'plus', barcode: 'KCZ4555', selected_type: 'campaign', campaign_price: 346.49 },
  ],
};

console.log('\n=== SIRA 0 ADAYLARI ===');
{
  const a = sira0Adaylari(urun, K, { bugun: BUGUN, platform: 'Trendyol' });
  esit('kaynaklar', a.map((x) => x.kaynak), [KAYNAK.TARIFE, KAYNAK.AVANTAJLI, KAYNAK.FLAS, "300 TL'ye 30 TL İndirim", "500 TL'ye 50 TL İndirim", "1000 TL'ye 100 TL İndirim"]);
  esit('flas none satiri atlanir, bitmis kampanya yok', a.length, 6);
  esit('haric: tarife atlanir', sira0Adaylari(urun, K, { bugun: BUGUN, haric: [KAYNAK.TARIFE] }).some((x) => x.kaynak === KAYNAK.TARIFE), false);
  esit('plus durumu', plusDurumu(urun, K, { bugun: BUGUN })?.oran, 5);
}

console.log('\n=== KCZ4555 — PLUS SAYFASI (Plus girilen 346,49) ===');
{
  const z = zincirKur({ urun, kaynaklar: K, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.PLUS_GIRILEN, fiyat: 346.49 }, plus: { oran: 5, karsilama: 0 } });
  esit('taban tarife 297,43', [z.taban.kaynak, z.taban.fiyat], [KAYNAK.TARIFE, 297.43]);
  esit('en yuksek indirim 29,74; esitlikte dusuk karsilama (1000e100 %40)', [z.genelIndirim, z.genel.kampanya.id], [29.74, 'c1000']);
  esit('musteri oder 254,31', z.musteriFiyat, 254.31);
  esit('saticiya 266,21', z.saticiNet, 266.21);
  esit('plus tarifesi 299 > taban 297,43 -> devreye girmez', z.plusTarife, null);
}

console.log('\n=== KCZ4555 — TARIFE SAYFASI (aday 4. kademe 297,43; Plus kayittan) ===');
{
  const z = zincirKur({ urun, kaynaklar: K, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 } });
  esit('kendi kaydi yerine aday', z.adaylar.filter((a) => a.kaynak === KAYNAK.TARIFE).length, 1);
  esit('plus kayittan bulundu', z.plus?.oran, 5);
  esit('sonuc Plus sayfasiyla ayni', [z.musteriFiyat, z.saticiNet], [254.31, 266.21]);
  const z2 = zincirKur({ urun, kaynaklar: K, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 320 } });
  esit('aday 320 -> taban yine avantajli 297,43', [z2.taban.kaynak, z2.taban.fiyat], [KAYNAK.AVANTAJLI, 297.43]);
}

console.log('\n=== KCZ4555 — GENEL KAMPANYA SAYFASI (2000e150 %30, yazilan 346,49) ===');
{
  const genel = { tur: 'cart_tl', tutar: 150, esik: 2000, karsilama: 30, oran: 0 };
  const z = zincirKur({ urun, kaynaklar: K, bugun: BUGUN, platform: 'Trendyol', ekGenel: { kampanyaId: 'yeni', genel, ad: "2000 TL'ye 150 TL", fiyat: 346.49 } });
  // 2000e150: 150 x 297.43/2000 = 22.31 < 1000e100'un 29.74 -> 1000e100 kazanir
  esit('kazanan yine 1000e100', [z.genelIndirim, z.genel.kampanya.id], [29.74, 'c1000']);
  esit('yazilan fiyat sira 0 adayi', z.adaylar.some((a) => a.kaynak === "2000 TL'ye 150 TL"), true);
}

console.log('\n=== PLUS YOK / KAMPANYA YOK ===');
{
  const K2 = { ...K, campaignProducts: K.campaignProducts.filter((cp) => cp.campaign_id !== 'plus') };
  const z = zincirKur({ urun, kaynaklar: K2, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 } });
  esit('plus yok: musteri 267,69 satici 279,59', [z.plus, z.musteriFiyat, z.saticiNet], [null, 267.69, 279.59]);
  const K3 = { ...K, campaignProducts: [], campaigns: [] };
  const z3 = zincirKur({ urun, kaynaklar: K3, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 } });
  esit('kampanya yok: taban = aday, net = aday', [z3.genel, z3.saticiNet], [null, 297.43]);
  esit('urun yok -> null', zincirKur({ urun: { barcode: 'X' }, kaynaklar: K3, bugun: BUGUN }), null);
}

console.log('\n=== PLUS TARIFESI KAZANIR ===');
{
  const K4 = { ...K, plusTariffs: [{ ...K.plusTariffs[0], selected_price: 240 }] };
  const z = zincirKur({ urun, kaynaklar: K4, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.PLUS_GIRILEN, fiyat: 346.49 }, plus: { oran: 5, karsilama: 0 } });
  esit('240 taban olur; 1000e100 ustune biner (24); %5 yok; komisyon 7,4', [z.taban.kaynak, z.musteriFiyat, z.saticiNet, z.komisyon, z.plusIndirim], [KAYNAK.PLUS_TARIFE, 216, 225.6, 7.4, 0]);
}

console.log('\n=== GERCEK PLUS SEPETI (16 Eyl 2026: 297,43 -> Plus tarifesi 283,83 -> 500e50) ===');
{
  // Plus uyeli hesap, KCZ4555 x 2: Fiyat Indirimi 98,12 (346,49 -> 297,43), Plus'a Ozel Fiyat 27,20
  // (297,43 -> 283,83), 500 TL'ye 50 -> 50, kuponlar. Urun Plus %5 kampanyasinda DEGIL.
  const K5 = { ...K, plusTariffs: [{ ...K.plusTariffs[0], selected_price: 283.83 }], campaigns: [K.campaigns[1]], campaignProducts: [{ campaign_id: 'c500', barcode: 'KCZ4555', selected_type: 'campaign', campaign_price: 346.49 }] };
  const z = zincirKur({ urun, kaynaklar: K5, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 }, plus: { oran: 5, karsilama: 0 } });
  esit('taban Plus tarifesi 283,83', [z.taban.kaynak, z.taban.fiyat], [KAYNAK.PLUS_TARIFE, 283.83]);
  esit('Plus %5 uygulanmaz', z.plusIndirim, 0);
  esit('500e50 ustune biner: en kotu 28,38 (gercek 2 adette 25)', z.genelIndirim, 28.38);
  esit('musteri oder 255,45 (gercek 2 adette 258,83)', z.musteriFiyat, 255.45);
  esit('satici payi %45 = 12,77; saticiya 271,06', [z.saticiPayi, z.saticiNet], [12.77, 271.06]);
  esit('komisyon Plus tarifesinin teklifi', z.komisyon, 7.4);
}

console.log('\n=== KENDI INDIRIMLERIM ===');
{
  const D = (ek) => ({ id: 'd', aktif: true, start_date: '2026-09-01', end_date: '2026-09-30', hedef_kitle: 'all', kapsam_turu: 'all', karsilama: 0, alt_limit: 0, ...ek });
  esit('tutar: kendiIndirimTutari %10', kendiIndirimTutari(D({ indirim_tipi: 'percent', oran: 10 }), 297.43), 29.74);
  esit('tutar: 30 TL, alt limit 300, urun 297 -> oranli', kendiIndirimTutari(D({ indirim_tipi: 'tl', tutar: 30, alt_limit: 300 }), 297.43), 29.74);
  esit('kosullu: 30 TL, alt limit 300, urun 900 -> her adette bir kez 30', kendiIndirimTutari(D({ tur: 'kosullu_tutar', indirim_tipi: 'tl', tutar: 30, alt_limit: 300 }), 900), 30);
  esit('tutar: %10 kupon tavan 20 TL', kendiIndirimTutari(D({ indirim_tipi: 'percent', oran: 10, maks_tutar: 20 }), 297.43), 20);
  esit('tutar: 3 al 2 ode', kendiIndirimTutari(D({ indirim_tipi: 'xalyode', al_x: 3, ode_y: 2 }), 300), 100);

  // KCZ4555 + kupon 50 TL alt limit 500 %50 karsilamali (Plus musterisi)
  const K5 = { ...K, ownDiscounts: [D({ tur: 'kupon', indirim_tipi: 'tl', tutar: 50, alt_limit: 500, karsilama: 50 })] };
  const z = zincirKur({ urun, kaynaklar: K5, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.PLUS_GIRILEN, fiyat: 346.49 }, plus: { oran: 5, karsilama: 0 } });
  // 254.31 kalan; kupon 50 x 254.31/500 = 25.43; satici payi 12.72
  esit('kupon urune dusen', z.kupon.indirim, 25.43);
  esit('kupon satici payi %50', z.kupon.saticiPayi, 12.72);
  esit('musteri oder 254,31 - 25,43', z.musteriFiyat, 228.88);
  esit('saticiya 266,21 - 12,72', z.saticiNet, 253.49);

  // net %10 + kampanya: net once duser, kampanya kalan uzerinden
  const K6 = { ...K, ownDiscounts: [D({ tur: 'net', indirim_tipi: 'percent', oran: 10 })] };
  const z6 = zincirKur({ urun, kaynaklar: K6, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 } });
  esit('net 29,74 duser', z6.net.indirim, 29.74);
  // 267.69 uzerinden 1000e100: 100 x 267.69/1000 = 26.77; plus %5 on 240.92 = 12.05 -> 228.87
  esit('kampanya kalan uzerinden', z6.genelIndirim, 26.77);
  esit('musteri', z6.musteriFiyat, 228.87);
  // satici: 297.43 - 29.74 - 26.77x0.6(16.06) - 12.05 = 239.58
  esit('satici', z6.saticiNet, 239.58);

  // kosullu %15 (tutar, alt limit 200) sepet kampanyasindan yuksek -> o gecer
  const K7 = { ...K, ownDiscounts: [D({ tur: 'kosullu_tutar', indirim_tipi: 'percent', oran: 15, alt_limit: 200 })] };
  const z7 = zincirKur({ urun, kaynaklar: K7, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 } });
  esit('kosullu %15 = 44,61 kazanir', [z7.genelIndirim, z7.genel.kendi], [44.61, true]);

  // kapsam: baska kategori -> uygulanmaz
  const K8 = { ...K, ownDiscounts: [D({ tur: 'net', indirim_tipi: 'percent', oran: 10, kapsam_turu: 'kategori', kapsam_kategoriler: ['Etiket'] })] };
  esit('kapsam disi net yok', zincirKur({ urun: { ...urun, category: 'Cepsiz Kargo Poşeti' }, kaynaklar: K8, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 } }).net, null);
  // kapsam: urun listesi
  const K9 = { ...K, ownDiscounts: [D({ tur: 'indirim_kodu', indirim_tipi: 'tl', tutar: 20, kapsam_turu: 'urunler', kapsam_urunler: ['KCZ4555'] })] };
  esit('kod urune uygulanir', zincirKur({ urun, kaynaklar: K9, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 } }).kod?.indirim, 20);
  // plus'a ozel %8 kendi indirimi: Plus %5 ile yarisir, 8 gecer; YUZDE oldugu icin 'net' alaninda TEKRAR
  // SAYILMAMALI (sira 2.5'te tek basina degerlendiriliyor) — cifte sayim regresyon kontrolu.
  const K10 = { ...K, ownDiscounts: [D({ tur: 'net', indirim_tipi: 'percent', oran: 8, hedef_kitle: 'plus' })] };
  const z10 = zincirKur({ urun, kaynaklar: K10, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.PLUS_GIRILEN, fiyat: 346.49 }, plus: { oran: 5, karsilama: 0 } });
  esit("plus'a ozel %8 > %5", z10.plus.oran, 8);
  esit("yuzdelik plus indirimi 'net' olarak tekrar sayilmaz", z10.net, null);

  // plus'a ozel TL "Net İndirim": Plus musterisinde SIRA 1'de duser, normal musteride hic uygulanmaz
  // (1 Eki 2026 duzeltmesi: eskiden kendiOlan hepsini 'all' sanip bunu sessizce eliyordu).
  const K12 = { ...K, ownDiscounts: [D({ tur: 'net', indirim_tipi: 'tl', tutar: 20, hedef_kitle: 'plus' })] };
  const z12plus = zincirKur({ urun, kaynaklar: K12, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.PLUS_GIRILEN, fiyat: 346.49 }, plus: { oran: 5, karsilama: 0 } });
  esit("plus'a ozel TL net indirim Plus musterisinde duser", z12plus.net?.indirim, 20);
  const z12normal = zincirKur({ urun, kaynaklar: K12, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 }, plus: null });
  esit("plus'a ozel TL net indirim normal musteride yok", z12normal.net, null);

  // plus'a ozel "İndirim Kodu": Plus musterisinde SIRA 5'te duser, normal musteride hic uygulanmaz
  const K13 = { ...K, ownDiscounts: [D({ tur: 'indirim_kodu', indirim_tipi: 'tl', tutar: 15, hedef_kitle: 'plus' })] };
  const z13plus = zincirKur({ urun, kaynaklar: K13, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.PLUS_GIRILEN, fiyat: 346.49 }, plus: { oran: 5, karsilama: 0 } });
  esit("plus'a ozel kod Plus musterisinde duser", z13plus.kod?.indirim, 15);
  const z13normal = zincirKur({ urun, kaynaklar: K13, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 }, plus: null });
  esit("plus'a ozel kod normal musteride yok", z13normal.kod, null);

  // plus'a ozel "Koşullu İndirim" (TL): Plus musterisinde sepet kampanyasi gibi SIRA 2'de yarisir
  const K14 = { ...K, ownDiscounts: [D({ tur: 'kosullu_tutar', indirim_tipi: 'tl', tutar: 80, alt_limit: 200, hedef_kitle: 'plus' })] };
  const z14plus = zincirKur({ urun, kaynaklar: K14, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.PLUS_GIRILEN, fiyat: 346.49 }, plus: { oran: 5, karsilama: 0 } });
  esit("plus'a ozel kosullu TL Plus musterisinde kazanir (80 > 1000e100'un 346,49'a dusen payi)", [z14plus.genelIndirim, z14plus.genel.kendi], [80, true]);
  const z14normal = zincirKur({ urun, kaynaklar: K14, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 }, plus: null });
  esit("plus'a ozel kosullu TL normal musteride devrede degil (sepet kampanyasi kazanir)", z14normal.genel?.kendi, undefined);
  // suresi bitmis -> yok
  const K11 = { ...K, ownDiscounts: [D({ tur: 'net', indirim_tipi: 'percent', oran: 10, end_date: '2026-09-10' })] };
  esit('bitmis indirim yok', zincirKur({ urun, kaynaklar: K11, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 } }).net, null);
}

console.log('\n=== MIKRO IHRACAT KAMPANYASI TURKIYE ZINCIRINE SIZMAZ ===');
{
  // Ayni urun icin, buyuk indirimli bir mikro_ihracat kampanyasi kayitli olsa
  // bile Turkiye zinciri (sira0 adaylari + sepet kampanyalari) bunu gormemeli
  // (1 Eki 2026: mikro_ihracat kampanya turu dropdown'da zaten secilebiliyordu,
  // ama genelKampanyalar bunu disarida birakmiyordu — gercek bir kayit
  // olusturulsa Turkiye fiyatina karisabilirdi).
  const mikroKampanya = { id: 'mikro1', campaign_type: 'mikro_ihracat', start_date: '2026-09-15', end_date: '2026-09-22', discount_kind: 'cart_tl', discount_amount: 999, threshold_amount: 2, trendyol_coverage_rate: 0 };
  const Kmikro = {
    ...K,
    campaigns: [...K.campaigns, mikroKampanya],
    campaignProducts: [...K.campaignProducts, { campaign_id: 'mikro1', barcode: 'KCZ4555', selected_type: 'campaign', campaign_price: 346.49 }],
  };
  esit('mikro kampanya genelKampanyalar taramasinda yok', genelKampanyalar(urun, Kmikro, { bugun: BUGUN }).some((g) => g.kampanya.id === 'mikro1'), false);
  esit('mikro kampanya sira0 aday sayisini degistirmiyor', sira0Adaylari(urun, Kmikro, { bugun: BUGUN, platform: 'Trendyol' }).length, sira0Adaylari(urun, K, { bugun: BUGUN, platform: 'Trendyol' }).length);
  const aday = { kaynak: KAYNAK.TARIFE, fiyat: 297.43 };
  const zBaseline = zincirKur({ urun, kaynaklar: K, bugun: BUGUN, platform: 'Trendyol', aday });
  const zMikro = zincirKur({ urun, kaynaklar: Kmikro, bugun: BUGUN, platform: 'Trendyol', aday });
  esit('mikro kampanya Turkiye sepet indirimini degistirmiyor', zMikro.genelIndirim, zBaseline.genelIndirim);
}

esit('bugunMetni bicimi', /^\d{4}-\d{2}-\d{2}$/.test(bugunMetni()), true);
console.log('\n=== PLUS SEPETTE TL + KARSILAMA (Plus Gunleri, 6 Eki 2026) ===');
{
  const u = { barcode: 'P1', stock_code: 'P1' };
  const plusTl = { id: 'ptl', campaign_type: 'trendyol_plus', start_date: '2026-09-01', end_date: '2026-10-01', discount_kind: 'cart_tl', discount_amount: 100, threshold_amount: 500, trendyol_coverage_rate: 40 };
  const kayit = (id) => ({ campaign_id: id, barcode: 'P1', selected_type: 'campaign', campaign_price: 600 });
  const Kp = { campaigns: [plusTl], campaignProducts: [kayit('ptl')] };
  const z600 = zincirKur({ urun: u, kaynaklar: Kp, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 600 } });
  esit("600 TL: musteri 500, satici payi 60, kalan 540", [z600.musteriFiyat, z600.plusIndirim, z600.saticiNet], [500, 100, 540]);
  esit('etiket', z600.plus.etiket, "Plus 500 TL'ye 100 TL İndirim");
  const z400 = zincirKur({ urun: u, kaynaklar: Kp, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 400 } });
  esit('400 TL: indirim 80 (pay 400/500), satici payi 48, kalan 352', [z400.plusIndirim, z400.saticiNet], [80, 352]);

  // Trendyol'un kendi ornegi: 1000 -> sepet %10 (900) -> Plus %10 (810)
  const sepet10 = { id: 's10', campaign_type: 'all_countries', start_date: '2026-09-01', end_date: '2026-10-01', discount_kind: 'cart_percent', discount_amount: 10, trendyol_coverage_rate: 0 };
  const plus10 = { id: 'p10', campaign_type: 'trendyol_plus', start_date: '2026-09-01', end_date: '2026-10-01', discount_kind: 'net_percent', discount_amount: 10, trendyol_coverage_rate: 0 };
  const plus5 = { ...plus10, id: 'p5', discount_amount: 5 };
  const Ko = { campaigns: [sepet10, plus5, plus10], campaignProducts: ['s10', 'p5', 'p10'].map((id) => ({ ...kayit(id), campaign_price: 1000 })) };
  const zo = zincirKur({ urun: u, kaynaklar: Ko, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 1000 } });
  esit('1000 -> 900 -> 810; iki Plus kampanyasindan yuksek olan (%10)', [zo.genelIndirim, zo.plusIndirim, zo.musteriFiyat, zo.plus.oran, zo.plus.etiket], [100, 90, 810, 10, 'Plus %10']);

  // Plus %10, %30 Trendyol karsilamali: satici payi 70
  const Kk = { campaigns: [{ ...plus10, trendyol_coverage_rate: 30 }], campaignProducts: [{ ...kayit('p10'), campaign_price: 1000 }] };
  const zk = zincirKur({ urun: u, kaynaklar: Kk, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 1000 } });
  esit('karsilamali Plus %10: musteri 900, saticiya kalan 930', [zk.musteriFiyat, zk.saticiNet], [900, 930]);

  // Yuzde ile TL yarisir: o fiyatta yuksek olan
  const Ky = { campaigns: [plusTl, plus10], campaignProducts: [kayit('ptl'), kayit('p10')] };
  esit('600 TL: 500e100 (100) > %10 (60)', zincirKur({ urun: u, kaynaklar: Ky, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 600 } }).plusIndirim, 100);
  esit('2000 TL: %10 (200) > 500e100 (100)', zincirKur({ urun: u, kaynaklar: Ky, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 2000 } }).plusIndirim, 200);
}

console.log('\n=== PLUS KUPON KAMPANYASI (750 TL\'ye 100 TL, 6 Eki 2026) ===');
{
  const u = { barcode: 'P1', stock_code: 'P1' };
  const tarih = { start_date: '2026-09-01', end_date: '2026-10-01' };
  const kupon = { id: 'kup', campaign_type: 'trendyol_plus', ...tarih, discount_kind: 'coupon_tl', discount_amount: 100, threshold_amount: 750, trendyol_coverage_rate: 0 };
  const sepet10 = { id: 's10', campaign_type: 'all_countries', ...tarih, discount_kind: 'cart_percent', discount_amount: 10, trendyol_coverage_rate: 0 };
  const plus10 = { id: 'p10', campaign_type: 'trendyol_plus', ...tarih, discount_kind: 'net_percent', discount_amount: 10, trendyol_coverage_rate: 0 };
  const kayit = (id) => ({ campaign_id: id, barcode: 'P1', selected_type: 'campaign', campaign_price: 1000 });
  // Trendyol'un ornegi: 1000 -> 900 (sepet %10) -> 810 (Plus %10) -> 710 (Plus kuponu)
  const Kt = { campaigns: [sepet10, plus10, kupon], campaignProducts: ['s10', 'p10', 'kup'].map(kayit) };
  const z = zincirKur({ urun: u, kaynaklar: Kt, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 1000 } });
  esit('1000 -> 900 -> 810 -> 710, saticiya kalan 710', [z.musteriFiyat, z.saticiNet, z.kupon?.ad], [710, 710, "Plus 750 TL'ye 100 TL Kupon"]);
  esit('kupon Plus yuzdesi sayilmaz', z.plus.oran, 10);
  // Yalniz kupon kampanyasinda: Plus uyesi sayilir, kupon uygulanir
  const Ky = { campaigns: [kupon], campaignProducts: [{ ...kayit('kup'), campaign_price: 300 }] };
  const zy = zincirKur({ urun: u, kaynaklar: Ky, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 300 } });
  esit('300 TL urun: pay 100 x 300/750 = 40', [zy.plus, zy.kupon.indirim, zy.saticiNet], [null, 40, 260]);
  // Kendi kuponunla yarisir: ayni urune tek kupon, yuksek olan
  const Kk = { ...Ky, ownDiscounts: [{ tur: 'kupon', indirim_tipi: 'tl', tutar: 60, alt_limit: 0, karsilama: 0, hedef_kitle: 'all', kapsam_turu: 'all', aktif: true, ...tarih, platform_account: 'Trendyol' }] };
  esit('kendi 60 TL kuponu > Plus kuponu payi 40', zincirKur({ urun: u, kaynaklar: Kk, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 300 } }).kupon.indirim, 60);
  // Kayitli degilken ekranda deneme (ekKupon)
  const zd = zincirKur({ urun: u, kaynaklar: { campaigns: [], campaignProducts: [] }, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 1000 }, ekKupon: { kampanyaId: 'kup', genel: { tur: 'coupon_tl', tutar: 100, esik: 750, karsilama: 0 } } });
  esit('ekKupon: 1000 -> 900', [zd.musteriFiyat, zd.saticiNet], [900, 900]);
}

console.log('\n=== BIRLIKTE AL (Trendyol Ortak onerisi, 6 Eki 2026: TBE1 135 -> 88) ===');
{
  const u = { barcode: 'TBE1', stock_code: 'TBE-2040-1000-1' };
  const tarih = { start_date: '2026-09-01', end_date: '2026-10-01' };
  const ba = { id: 'ba', tur: 'birlikte_al', aktif: true, hedef_kitle: 'all', kapsam_turu: 'all', alt_limit: 117, platform_account: 'Trendyol', ...tarih,
    odul_urunler: [{ barkod: 'TBE1', fiyat: 88 }, { barkod: 'KCL3545', fiyat: 332 }] };
  const z = zincirKur({ urun: u, kaynaklar: { ownDiscounts: [ba] }, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 135.49 } });
  esit('odul urun: musteri 88 oder, fark saticidan', [z.musteriFiyat, z.saticiNet, z.birlikte.indirim], [88, 88, 47.49]);
  const zd = zincirKur({ urun: { barcode: 'BASKA' }, kaynaklar: { ownDiscounts: [ba] }, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 135.49 } });
  esit('odul olmayan urun etkilenmez', [zd.musteriFiyat, zd.birlikte], [135.49, null]);
  const zu = zincirKur({ urun: u, kaynaklar: { ownDiscounts: [ba] }, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 80 } });
  esit('fiyat zaten odul fiyatinin altindaysa etkisi yok', [zu.musteriFiyat, zu.birlikte], [80, null]);
  esit('stok koduyla da eslesir', zincirKur({ urun: { barcode: 'X', stock_code: 'KCL3545' }, kaynaklar: { ownDiscounts: [ba] }, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 373 } }).musteriFiyat, 332);
  esit('pasif kayit sayilmaz', zincirKur({ urun: u, kaynaklar: { ownDiscounts: [{ ...ba, aktif: false }] }, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: 'Liste', fiyat: 135.49 } }).birlikte, null);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`); if (kalan) process.exit(1);
