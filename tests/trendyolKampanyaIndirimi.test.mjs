import {
  musteriIndirimi, musteriFiyati, kampanyaFiyati, kampanyaFiyatiTersi, sepetPayi,
  beklenenSepetle, dosyaAdindanKampanya, fiyatKuralinaUyuyorMu, kampanyaMetni, fiyatKuraliMetni, kaydiKampanyayaCevir,
  INDIRIM_TURLERI, KAMPANYA_GRUPLARI,
} from '../src/lib/trendyolKampanyaIndirimi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n=== NET % INDIRIM ===');
{
  const k = { tur: 'net_percent', oran: 15 };
  esit('musteri indirimi', musteriIndirimi(200, k), 30);
  esit('satici fiyati (karsilama yok)', kampanyaFiyati(200, k), 170);
  esit('%40 Trendyol karsilamali', kampanyaFiyati(200, { ...k, karsilama: 40 }), 182);
  // Trendyol teyidi: komisyon musterinin odedigi fiyattan; karsilama musteri fiyatini degistirmez
  esit('musteri fiyati karsilamadan bagimsiz', musteriFiyati(200, { ...k, karsilama: 40 }), 170);
  esit('musteri fiyati karsilamasiz', musteriFiyati(200, k), 170);
  esit('musteri fiyati kampanya yok', musteriFiyati(200, null), 200);
  esit('%100 karsilama -> fiyat degismez', kampanyaFiyati(200, { ...k, karsilama: 100 }), 200);
  esit('oran 0 -> fiyat degismez', kampanyaFiyati(200, { tur: 'net_percent', oran: 0 }), 200);
  esit('tersi', kampanyaFiyatiTersi(170, k), 200);
  esit('tersi karsilamali', kampanyaFiyatiTersi(182, { ...k, karsilama: 40 }), 200);
}

console.log('\n=== SEPETTE % INDIRIM ===');
{
  const k = { tur: 'cart_percent', oran: 40, karsilama: 25 };
  // 480 x %40 = 192 indirim; %25'i Trendyol -> saticidan 144
  esit('sepette %40, %25 karsilamali', kampanyaFiyati(480, k), 336);
  esit('tersi', kampanyaFiyatiTersi(336, k), 480);
}

console.log('\n=== X TL\'YE Y TL INDIRIM ===');
{
  const k = { tur: 'cart_tl', esik: 500, tutar: 100 };
  esit('esigi tek basina gecen urun: tamami iner', musteriIndirimi(600, k), 100);
  esit('tam esik', musteriIndirimi(500, k), 100);
  // Sepet tam esikte: indirim orani 100/500 = %20, urune fiyatinin %20'si
  esit('esigin altinda: oransal (%20)', musteriIndirimi(300, k), 60);
  esit('120 TL urun -> 24 TL', musteriIndirimi(120, k), 24);
  esit('pay: 120/500', sepetPayi(120, 500), 0.24);
  esit('pay: esik yok -> tamami', sepetPayi(120, 0), 1);
  esit('pay: esigi gecen -> tamami', sepetPayi(600, 500), 1);
  // Kullanicinin dosyasi: 2000 TL'ye 150 TL, %30 karsilamali, 826,99 TL poset
  esit('2000/150: 826,99 TL urun musteri indirimi', musteriIndirimi(826.99, { tur: 'cart_tl', esik: 2000, tutar: 150 }), 62.02);
  esit('2000/150 %30 karsilamali satici fiyati', kampanyaFiyati(826.99, { tur: 'cart_tl', esik: 2000, tutar: 150, karsilama: 30 }), 783.58);
  esit('satici fiyati %30 karsilamali', kampanyaFiyati(600, { ...k, karsilama: 30 }), 530);
  esit('esiksiz duz TL indirim (eski davranis)', kampanyaFiyati(200, { tur: 'cart_tl', esik: 0, tutar: 50 }), 150);
  esit('indirim fiyati asamaz', musteriIndirimi(30, { tur: 'cart_tl', esik: 0, tutar: 50 }), 30);
  esit('tersi (tek adet)', kampanyaFiyatiTersi(500, k), 600);
  esit('tersi (esigin altinda)', kampanyaFiyatiTersi(240, k), 300);
  esit('tersi gidis-donus', kampanyaFiyatiTersi(kampanyaFiyati(300, k), k), 300);
  esit('tersi gidis-donus (esik ustu)', kampanyaFiyatiTersi(kampanyaFiyati(900, k), k), 900);
  esit('tersi karsilamali', kampanyaFiyatiTersi(530, { ...k, karsilama: 30 }), 600);
  esit('tutar 0 -> degismez', kampanyaFiyati(600, { tur: 'cart_tl', esik: 500, tutar: 0 }), 600);
}

console.log('\n=== BEKLENEN ORTALAMA SEPET ===');
{
  const k = { tur: 'cart_tl', esik: 2000, tutar: 200 };
  // en kotu durum: tam esik -> %10
  esit('en kotu durum 300 TL', kampanyaFiyati(300, k), 270);
  // beklenen 2600 -> 300 x 200/2600 = 23,08
  const b = beklenenSepetle({ ...k, beklenenSepet: 2600 });
  esit('beklenen nesnesi sepet tasir', b.sepet, 2600);
  esit('beklenen 2600: musteri indirimi', musteriIndirimi(300, b), 23.08);
  esit('beklenen 2600: satici fiyati', kampanyaFiyati(300, b), 276.92);
  esit('beklenen 2600 %40 karsilamali', kampanyaFiyati(300, { ...b, karsilama: 40 }), 286.15);
  // urun beklenen sepetten pahaliysa pay tamami
  esit('urun 3000 > beklenen 2600 -> tamami', musteriIndirimi(3000, b), 200);
  // beklenen esikten kucuk / esit / bos -> null (en kotu durumla ayni)
  esit('beklenen < esik -> null', beklenenSepetle({ ...k, beklenenSepet: 1500 }), null);
  esit('beklenen = esik -> null', beklenenSepetle({ ...k, beklenenSepet: 2000 }), null);
  esit('beklenen yok -> null', beklenenSepetle(k), null);
  esit('yuzdeli turde -> null', beklenenSepetle({ tur: 'net_percent', oran: 10, beklenenSepet: 3000 }), null);
  // tersi (fiyat onerisi) beklenen sepeti DIKKATE ALMAZ, en kotu durum
  esit('tersi en kotu durumdan', kampanyaFiyatiTersi(270, b), 300);
  // sepet alanı varsayilan hesabi etkilemez
  esit('beklenenSepet alani tek basina etkisiz', kampanyaFiyati(300, { ...k, beklenenSepet: 2600 }), 270);
  // kayit cevirici
  esit('kayittan beklenenSepet', kaydiKampanyayaCevir({ discount_kind: 'cart_tl', discount_amount: 200, threshold_amount: 2000, expected_cart_amount: 2600 }).beklenenSepet, 2600);
}

console.log('\n=== X AL Y ODE ===');
{
  const k = { tur: 'buy_x_pay_y', alX: 3, odeY: 2 };
  esit('3 al 2 ode: birim indirim', musteriIndirimi(300, k), 100);
  esit('satici fiyati', kampanyaFiyati(300, k), 200);
  esit('%50 karsilamali', kampanyaFiyati(300, { ...k, karsilama: 50 }), 250);
  esit('tersi', kampanyaFiyatiTersi(200, k), 300);
  esit('gecersiz (2 al 3 ode)', kampanyaFiyati(300, { tur: 'buy_x_pay_y', alX: 2, odeY: 3 }), 300);
  esit('gecersiz (0)', kampanyaFiyati(300, { tur: 'buy_x_pay_y', alX: 0, odeY: 0 }), 300);
}

console.log('\n=== N ADET VE UZERI % INDIRIM ===');
{
  const k = { tur: 'qty_percent', minAdet: 2, oran: 15 };
  esit('tum adetler %15', kampanyaFiyati(200, k), 170);
  esit('tersi', kampanyaFiyatiTersi(170, k), 200);
}

console.log('\n=== GECERSIZ GIRDI ===');
{
  esit('fiyat 0', kampanyaFiyati(0, { tur: 'net_percent', oran: 10 }), 0);
  esit('fiyat metin', kampanyaFiyati('abc', { tur: 'net_percent', oran: 10 }), 0);
  esit('kampanya yok', kampanyaFiyati(100, null), 100);
  esit('bilinmeyen tur', kampanyaFiyati(100, { tur: 'x', oran: 10 }), 100);
  esit('tersi kampanya yok', kampanyaFiyatiTersi(100, null), 100);
  esit('tersi hedef 0', kampanyaFiyatiTersi(0, { tur: 'net_percent', oran: 10 }), 0);
  esit('karsilama sinir disi (150) -> 100 sayilir', kampanyaFiyati(200, { tur: 'net_percent', oran: 10, karsilama: 150 }), 200);
}

console.log('\n=== FIYAT KURALI ===');
{
  esit('100 ve uzeri: 99 giremez', fiyatKuralinaUyuyorMu(99, { kuralMin: 100 }), false);
  esit('100 ve uzeri: 100 girer', fiyatKuralinaUyuyorMu(100, { kuralMin: 100 }), true);
  esit('10-700 arasi: 701 giremez', fiyatKuralinaUyuyorMu(701, { kuralMin: 10, kuralMax: 700 }), false);
  esit('10-700 arasi: 350 girer', fiyatKuralinaUyuyorMu(350, { kuralMin: 10, kuralMax: 700 }), true);
  esit('800 ve alti: 800 girer', fiyatKuralinaUyuyorMu(800, { kuralMax: 800 }), true);
  esit('kural yok: her fiyat girer', fiyatKuralinaUyuyorMu(5, {}), true);
  esit('kural 0 = yok', fiyatKuralinaUyuyorMu(5, { kuralMin: 0, kuralMax: 0 }), true);
  esit('fiyat yok', fiyatKuralinaUyuyorMu(null, {}), false);
}

console.log('\n=== METINLER (Trendyol ekranindaki gibi) ===');
{
  esit('net', kampanyaMetni({ tur: 'net_percent', oran: 15 }), 'Net %15 İndirim');
  esit('sepette', kampanyaMetni({ tur: 'cart_percent', oran: 40 }), 'Sepette %40 İndirim');
  esit('tl esikli', kampanyaMetni({ tur: 'cart_tl', esik: 500, tutar: 100 }), "500 TL'ye 100 TL İndirim");
  esit('tl esiksiz', kampanyaMetni({ tur: 'cart_tl', esik: 0, tutar: 50 }), '50 TL İndirim');
  esit('x al y ode', kampanyaMetni({ tur: 'buy_x_pay_y', alX: 3, odeY: 2 }), '3 Al 2 Öde');
  esit('adet', kampanyaMetni({ tur: 'qty_percent', minAdet: 2, oran: 15 }), '2 Adet ve Üzeri %15 İndirim');
  esit('ondalik oran virgulle', kampanyaMetni({ tur: 'net_percent', oran: 27.5 }), 'Net %27,5 İndirim');
  esit('bos', kampanyaMetni(null), '');
  esit('kural: ve uzeri', fiyatKuraliMetni({ kuralMin: 100 }), '100 TL ve üzeri ürünler');
  esit('kural: arasi', fiyatKuraliMetni({ kuralMin: 10, kuralMax: 700 }), '10 TL ve 700 TL arası ürünler');
  esit('kural: ve alti', fiyatKuraliMetni({ kuralMax: 800 }), '800 TL ve altı ürünler');
  esit('kural yok', fiyatKuraliMetni({}), '');
}

console.log('\n=== DOSYA ADINDAN KAMPANYA ===');
{
  const a = dosyaAdindanKampanya('2000-tl-uzeri-150-tl-indirim-30-trendyol-karsilamali-mobilya-hali-aydinlatma-bahce-yapi-market_2026-09-03_20-02_tr-TR_part_1.xlsx');
  esit('genel sepet: tur', a.campaign_type, 'all_countries');
  esit('genel sepet: indirim', [a.discount_kind, a.threshold_amount, a.discount_amount], ['cart_tl', 2000, 150]);
  esit('genel sepet: karsilama', a.trendyol_coverage_rate, 30);
  esit('genel sepet: ad', a.campaign_name, '2000 tl uzeri 150 tl indirim 30 trendyol karsilamali mobilya hali aydinlatma bahce yapi market');
  const b = dosyaAdindanKampanya('okula-donus-kategorilerinde-1000-tl-uzeri-150-tl-indirim_2026-09-03_20-02_tr-TR_part_1.xlsx');
  esit('okula donus', [b.campaign_type, b.discount_kind, b.threshold_amount, b.discount_amount, b.trendyol_coverage_rate], ['all_countries', 'cart_tl', 1000, 150, null]);
  const c = dosyaAdindanKampanya('trendyol-plus-musterilerine-ozel-ek-5-indirim_2026-09-03_20-03_tr-TR_part_1.xlsx');
  esit('plus ek %5', [c.campaign_type, c.discount_kind, c.discount_amount, c.threshold_amount], ['trendyol_plus', 'net_percent', 5, null]);
  esit('plus ad', c.campaign_name, 'Trendyol plus musterilerine ozel ek 5 indirim');
  const d = dosyaAdindanKampanya('C:\\\\indir\\\\mikro-ihracat-4-al-3-ode.xlsx');
  esit('yol ayiklanir, mikro ihracat', [d.campaign_type, d.discount_kind], ['mikro_ihracat', null]);
  esit('tanimsiz ad -> tur genel, indirim yok', dosyaAdindanKampanya('promotion-downloaded.xlsx').discount_kind, null);
  esit('bos -> null', dosyaAdindanKampanya(''), null);
  esit('bos -> null 2', dosyaAdindanKampanya(null), null);
}

console.log('\n=== ESKI KAYIT UYUMU ===');
{
  // discount_kind eklenmeden onceki kayitlar
  const eskiYuzde = { discount_type: 'percent', discount_amount: 20, trendyol_coverage_rate: 40 };
  const c1 = kaydiKampanyayaCevir(eskiYuzde);
  esit('percent -> net_percent', [c1.tur, c1.oran, c1.karsilama], ['net_percent', 20, 40]);
  esit('eski %20 fiyat ayni kalir', kampanyaFiyati(100, c1), 100 * (1 - 0.2 * 0.6));

  const eskiTl = { discount_type: 'tl', discount_amount: 50, cart_amount: 250, cart_condition: 'over' };
  const c2 = kaydiKampanyayaCevir(eskiTl);
  esit('tl + sepet uzeri -> cart_tl esikli', [c2.tur, c2.tutar, c2.esik], ['cart_tl', 50, 250]);

  const eskiTlEsiksiz = { discount_type: 'tl', discount_amount: 50 };
  const c3 = kaydiKampanyayaCevir(eskiTlEsiksiz);
  esit('tl esiksiz', [c3.tur, c3.tutar, c3.esik], ['cart_tl', 50, 0]);
  esit('eski duz 50 TL fiyat ayni kalir', kampanyaFiyati(200, c3), 150);

  const eskiYuzdeAlti = { discount_type: 'percent', discount_amount: 10, cart_amount: 700, cart_condition: 'under' };
  const c4 = kaydiKampanyayaCevir(eskiYuzdeAlti);
  esit('percent + sepet alti -> fiyat kurali max', [c4.tur, c4.kuralMax, c4.kuralMin], ['net_percent', 700, 0]);

  const eskiYuzdeUstu = { discount_type: 'percent', discount_amount: 10, cart_amount: 100, cart_condition: 'over' };
  const c5 = kaydiKampanyayaCevir(eskiYuzdeUstu);
  esit('percent + sepet uzeri -> fiyat kurali min', [c5.kuralMin, c5.kuralMax], [100, 0]);

  // yeni kayit
  const yeni = {
    discount_kind: 'buy_x_pay_y', buy_x: 3, pay_y: 2, price_rule_min: 10, price_rule_max: 5000,
    participation_condition: 'buybox', trendyol_coverage_rate: 30,
  };
  const c6 = kaydiKampanyayaCevir(yeni);
  esit('yeni kayit', [c6.tur, c6.alX, c6.odeY, c6.kuralMin, c6.kuralMax, c6.katilim, c6.karsilama], ['buy_x_pay_y', 3, 2, 10, 5000, 'buybox', 30]);
  const yeniTl = { discount_kind: 'cart_tl', discount_amount: 100, threshold_amount: 500 };
  const c7 = kaydiKampanyayaCevir(yeniTl);
  esit('yeni cart_tl', [c7.tutar, c7.esik], [100, 500]);
  esit('null', kaydiKampanyayaCevir(null), null);
}

console.log('\n=== SABIT LISTELER ===');
{
  esit('5 indirim turu', INDIRIM_TURLERI.map((t) => t.value), ['net_percent', 'cart_percent', 'cart_tl', 'buy_x_pay_y', 'qty_percent']);
  esit('uc grup: genel, plus, mikro ihracat', KAMPANYA_GRUPLARI.map((g) => g.value), ['all_countries', 'trendyol_plus', 'mikro_ihracat']);
  esit('okul donemi ayri grup degil', KAMPANYA_GRUPLARI.some((g) => g.value === 'ozel_donem'), false);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
