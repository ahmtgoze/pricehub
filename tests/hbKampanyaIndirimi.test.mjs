import { kampanyaFiyati, altLimitiGeciyorMu, ALT_LIMIT_SECENEKLERI }
  from '../src/lib/hbKampanyaIndirimi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n═══ SEPETTE % INDIRIM ═══');
esit('düz %15', kampanyaFiyati(1000, { tur: 'cart_percent', oran: 15 }), 850);
// Tavan: %15 = 150 TL ama en fazla 100 TL inebilir
esit('tavan indirimi kısıtlar',
  kampanyaFiyati(1000, { tur: 'cart_percent', oran: 15, tavan: 100 }), 900);
esit('tavan aşılmıyorsa etkisiz',
  kampanyaFiyati(500, { tur: 'cart_percent', oran: 15, tavan: 100 }), 425);
// Alt limit: fiyat limitin ALTINDAYSA indirim yok
esit('alt limitin altında indirim yok',
  kampanyaFiyati(200, { tur: 'cart_percent', oran: 15, altLimit: 250 }), 200);
esit('alt limite eşitse indirim var',
  kampanyaFiyati(250, { tur: 'cart_percent', oran: 15, altLimit: 250 }), 212.5);
esit('oran yoksa fiyat aynı', kampanyaFiyati(1000, { tur: 'cart_percent', oran: 0 }), 1000);

console.log('\n═══ SEPETTE TL INDIRIM ═══');
esit('düz 50 TL', kampanyaFiyati(1000, { tur: 'cart_tl', tutar: 50 }), 950);
// Kullanicinin ornegi: "250 ve uzeri 50 TL indirim"
esit('250 altı indirim yok',
  kampanyaFiyati(200, { tur: 'cart_tl', tutar: 50, altLimit: 250 }), 200);
esit('250 üstü indirim var',
  kampanyaFiyati(300, { tur: 'cart_tl', tutar: 50, altLimit: 250 }), 250);
esit('indirim fiyatı aşarsa 0', kampanyaFiyati(30, { tur: 'cart_tl', tutar: 50 }), 0);

console.log('\n═══ X. URUN % INDIRIMI ═══');
// Kullanicinin tarifi: "2. urune %50 ise sadece 2. urun %50 alir, 1. urun tam"
// 2 urun: 1000 + 500 = 1500 -> birim 750
esit('2. ürüne %50', kampanyaFiyati(1000, { tur: 'nth_percent', oran: 50, kacinci: 2 }), 750);
// 3 urun: 1000 + 1000 + 500 = 2500 -> birim 833,33
esit('3. ürüne %50', kampanyaFiyati(1000, { tur: 'nth_percent', oran: 50, kacinci: 3 }), 833.33);
esit('2. ürüne %100 (bedava)', kampanyaFiyati(1000, { tur: 'nth_percent', oran: 100, kacinci: 2 }), 500);
// N bilinmeden ortalama cikmaz; uydurmak yerine fiyat aynen doner
esit('kaçıncı ürün yoksa dokunulmaz', kampanyaFiyati(1000, { tur: 'nth_percent', oran: 50 }), 1000);
esit('1. ürün anlamsız', kampanyaFiyati(1000, { tur: 'nth_percent', oran: 50, kacinci: 1 }), 1000);

console.log('\n═══ X. URUN Y TL INDIRIMI ═══');
// 2 urun: 1000 + 950 = 1950 -> birim 975
esit('2. ürüne 50 TL', kampanyaFiyati(1000, { tur: 'nth_tl', tutar: 50, kacinci: 2 }), 975);
esit('4. ürüne 100 TL', kampanyaFiyati(1000, { tur: 'nth_tl', tutar: 100, kacinci: 4 }), 975);
esit('kaçıncı ürün yoksa dokunulmaz', kampanyaFiyati(1000, { tur: 'nth_tl', tutar: 50 }), 1000);

console.log('\n═══ SEPETTE X AL Y ODE ═══');
// 3 al 2 ode: 3 urune 2 fiyat -> birim fiyat x 2/3
esit('3 al 2 öde', kampanyaFiyati(900, { tur: 'buy_x_pay_y', alX: 3, odeY: 2 }), 600);
esit('2 al 1 öde', kampanyaFiyati(1000, { tur: 'buy_x_pay_y', alX: 2, odeY: 1 }), 500);
// Y >= X ise indirim yok, anlamsiz giris
esit('öde >= al ise indirim yok', kampanyaFiyati(1000, { tur: 'buy_x_pay_y', alX: 2, odeY: 2 }), 1000);
esit('eksik giriş', kampanyaFiyati(1000, { tur: 'buy_x_pay_y', alX: 3 }), 1000);

console.log('\n═══ ALT LIMIT KONTROLU ═══');
esit('sepet kampanyasında limit altı', altLimitiGeciyorMu(200, { tur: 'cart_tl', altLimit: 250 }), false);
esit('sepet kampanyasında limit üstü', altLimitiGeciyorMu(300, { tur: 'cart_tl', altLimit: 250 }), true);
// Urune ozel turlerde alt limit kavrami YOK
esit('ürüne özel türde limit aranmaz', altLimitiGeciyorMu(10, { tur: 'nth_percent', altLimit: 250 }), true);
esit('kampanya yoksa', altLimitiGeciyorMu(10, null), true);

console.log('\n═══ GECERSIZ GIRDI ═══');
esit('fiyat yok', kampanyaFiyati(0, { tur: 'cart_percent', oran: 15 }), 0);
esit('kampanya yok', kampanyaFiyati(1000, null), 1000);
esit('bilinmeyen tür', kampanyaFiyati(1000, { tur: 'baska' }), 1000);
esit('alt limit seçenekleri', ALT_LIMIT_SECENEKLERI.length, 28);
esit('ilk seçenek 0', ALT_LIMIT_SECENEKLERI[0], 0);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
