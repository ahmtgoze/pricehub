import { zincirKur, sira0Adaylari, plusDurumu, bugunMetni, KAYNAK, kendiIndirimTutari } from '../src/lib/zincirHesabi.js';
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
  plusTariffs: [{ barcode: 'KCZ4555', platform_account: 'Trendyol', start_date: '2026-09-15', end_date: '2026-09-22', selected_type: 'plus', selected_price: 283.83, plus_commission_offer: 7.4 }],
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
  esit('plus tarifesi 283,83 > 254,31 -> devreye girmez', z.plusTarife, null);
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
  esit('240 < 254,31 -> tarife gecerli, %5 yok, komisyon 7,4', [z.musteriFiyat, z.saticiNet, z.komisyon, z.plusIndirim], [240, 240, 7.4, 0]);
}

console.log('\n=== KENDI INDIRIMLERIM ===');
{
  const D = (ek) => ({ id: 'd', aktif: true, start_date: '2026-09-01', end_date: '2026-09-30', hedef_kitle: 'all', kapsam_turu: 'all', karsilama: 0, alt_limit: 0, ...ek });
  esit('tutar: kendiIndirimTutari %10', kendiIndirimTutari(D({ indirim_tipi: 'percent', oran: 10 }), 297.43), 29.74);
  esit('tutar: 30 TL, alt limit 300, urun 297 -> oranli', kendiIndirimTutari(D({ indirim_tipi: 'tl', tutar: 30, alt_limit: 300 }), 297.43), 29.74);
  esit('kosullu: 30 TL, alt limit 300, urun 900 -> 3 kat', kendiIndirimTutari(D({ tur: 'kosullu_tutar', indirim_tipi: 'tl', tutar: 30, alt_limit: 300 }), 900), 90);
  esit('kupon: 30 TL, alt limit 300, urun 900 -> tek sefer', kendiIndirimTutari(D({ tur: 'kupon', indirim_tipi: 'tl', tutar: 30, alt_limit: 300 }), 900), 30);
  esit('kupon: alt limit altinda oranli', kendiIndirimTutari(D({ tur: 'kupon', indirim_tipi: 'tl', tutar: 30, alt_limit: 300 }), 150), 15);
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
  // plus'a ozel %8 kendi indirimi: Plus %5 ile yarisir, 8 gecer
  const K10 = { ...K, ownDiscounts: [D({ tur: 'net', indirim_tipi: 'percent', oran: 8, hedef_kitle: 'plus' })] };
  const z10 = zincirKur({ urun, kaynaklar: K10, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.PLUS_GIRILEN, fiyat: 346.49 }, plus: { oran: 5, karsilama: 0 } });
  esit("plus'a ozel %8 > %5", z10.plus.oran, 8);
  // suresi bitmis -> yok
  const K11 = { ...K, ownDiscounts: [D({ tur: 'net', indirim_tipi: 'percent', oran: 10, end_date: '2026-09-10' })] };
  esit('bitmis indirim yok', zincirKur({ urun, kaynaklar: K11, bugun: BUGUN, platform: 'Trendyol', aday: { kaynak: KAYNAK.TARIFE, fiyat: 297.43 } }).net, null);
}

esit('bugunMetni bicimi', /^\d{4}-\d{2}-\d{2}$/.test(bugunMetni()), true);
console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`); if (kalan) process.exit(1);
