import { kampanyayiDenetle, gunFarki, indirimKoduSorulurMu, EN_FAZLA_GUN }
  from '../src/lib/hbKampanyaKurallari.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

// Testler sabit bir "simdi" ile calisir; yoksa yarin kirilirlar
const SIMDI = new Date(2026, 8, 1, 12, 0, 0);          // 1 Eylul 2026, 12:00
const gun = (n) => new Date(2026, 8, 1 + n, 12, 0, 0); // SIMDI + n gun
const alanlar = (u) => u.map((x) => x.alan);

console.log('\n=== GUN FARKI ===');
esit('ayni gun 1 gun sayilir', gunFarki(gun(0), gun(0)), 1);
esit('iki gun', gunFarki(gun(0), gun(1)), 2);
esit('92 gun', gunFarki(gun(0), gun(91)), 92);
esit('gecersiz tarih', gunFarki(null, gun(1)), null);

console.log('\n=== SURE SINIRI (en fazla 92 gun) ===');
esit('92 gun kabul', alanlar(kampanyayiDenetle({ baslangic: gun(0), bitis: gun(91) }, SIMDI)), []);
esit('93 gun reddedilir', alanlar(kampanyayiDenetle({ baslangic: gun(0), bitis: gun(92) }, SIMDI)), ['tarih']);
esit('bitis baslangictan once', alanlar(kampanyayiDenetle({ baslangic: gun(5), bitis: gun(2) }, SIMDI)), ['tarih']);
esit('gecmis tarih', alanlar(kampanyayiDenetle({ baslangic: gun(-1), bitis: gun(5) }, SIMDI)), ['tarih']);
esit('bugun baslayabilir', alanlar(kampanyayiDenetle({ baslangic: gun(0), bitis: gun(5) }, SIMDI)), []);
esit('93 gun sonra baslayamaz', alanlar(kampanyayiDenetle({ baslangic: gun(93), bitis: gun(95) }, SIMDI)), ['tarih']);

console.log('\n=== BUTCE (1.000 - 10.000.000) ===');
esit('alt sinir kabul', alanlar(kampanyayiDenetle({ butce: 1000 }, SIMDI)), []);
esit('altinda reddedilir', alanlar(kampanyayiDenetle({ butce: 999 }, SIMDI)), ['butce']);
esit('ust sinir kabul', alanlar(kampanyayiDenetle({ butce: 10000000 }, SIMDI)), []);
esit('ustunde reddedilir', alanlar(kampanyayiDenetle({ butce: 10000001 }, SIMDI)), ['butce']);
esit('butce girilmemisse denetlenmez', alanlar(kampanyayiDenetle({}, SIMDI)), []);

console.log('\n=== INDIRIM ORANI (%2 - %99) ===');
esit('%2 kabul', alanlar(kampanyayiDenetle({ tur: 'cart_percent', oran: 2 }, SIMDI)), []);
esit('%1 reddedilir', alanlar(kampanyayiDenetle({ tur: 'cart_percent', oran: 1 }, SIMDI)), ['oran']);
esit('%99 kabul', alanlar(kampanyayiDenetle({ tur: 'cart_percent', oran: 99 }, SIMDI)), []);
esit('%100 reddedilir', alanlar(kampanyayiDenetle({ tur: 'cart_percent', oran: 100 }, SIMDI)), ['oran']);
// TL turlerinde oran alani anlamsiz, denetlenmez
esit('TL turunde oran denetlenmez', alanlar(kampanyayiDenetle({ tur: 'cart_tl', oran: 1 }, SIMDI)), []);

console.log('\n=== MAKSIMUM SIPARIS ADEDI (20 - 100.000) ===');
esit('20 kabul', alanlar(kampanyayiDenetle({ maksSiparis: 20 }, SIMDI)), []);
esit('19 reddedilir', alanlar(kampanyayiDenetle({ maksSiparis: 19 }, SIMDI)), ['siparis']);
esit('100.000 kabul', alanlar(kampanyayiDenetle({ maksSiparis: 100000 }, SIMDI)), []);
esit('100.001 reddedilir', alanlar(kampanyayiDenetle({ maksSiparis: 100001 }, SIMDI)), ['siparis']);

console.log('\n=== INDIRIM KODU ===');
esit('sepet turlerinde sorulur', [indirimKoduSorulurMu('cart_percent'), indirimKoduSorulurMu('cart_tl')], [true, true]);
esit('urune ozel turlerde sorulmaz',
  [indirimKoduSorulurMu('nth_percent'), indirimKoduSorulurMu('nth_tl'), indirimKoduSorulurMu('buy_x_pay_y')],
  [false, false, false]);
esit('kod dolu kabul',
  alanlar(kampanyayiDenetle({ tur: 'cart_tl', indirimKoduIstiyor: true, indirimKodu: 'SVS20' }, SIMDI)), []);
esit('kod bos reddedilir',
  alanlar(kampanyayiDenetle({ tur: 'cart_tl', indirimKoduIstiyor: true, indirimKodu: '  ' }, SIMDI)), ['kod']);
esit('urune ozel turde kod istenemez',
  alanlar(kampanyayiDenetle({ tur: 'nth_tl', indirimKoduIstiyor: true, indirimKodu: 'X' }, SIMDI)), ['kod']);
esit('kod istenmiyorsa denetlenmez',
  alanlar(kampanyayiDenetle({ tur: 'nth_tl', indirimKoduIstiyor: false }, SIMDI)), []);

console.log('\n=== BIRDEN COK IHLAL ===');
esit('hepsi birden bildirilir',
  alanlar(kampanyayiDenetle({ tur: 'cart_percent', oran: 1, butce: 5, baslangic: gun(0), bitis: gun(200) }, SIMDI)).sort(),
  ['butce', 'oran', 'tarih']);

console.log('\n=== UC DURUMLAR ===');
esit('bos kampanya', kampanyayiDenetle({}, SIMDI), []);
esit('gecersiz girdi', kampanyayiDenetle(null, SIMDI), []);
esit('sabit dogru', EN_FAZLA_GUN, 92);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
