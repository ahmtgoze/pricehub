import { hedefleriCoz, hedefVarMi, hedefTutuyorMu, komisyonBul }
  from '../src/lib/hedefKarSecimi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n═══ HEDEF COZUMLEME ═══');
esit('hepsi tanimli',
  hedefleriCoz({ discounted_target_profit_rate: 18, discounted_target_profit_amount: 50, discounted_minimum_profit_amount: 10 }),
  { oran: 18, tutar: 50, minimum: 10 });
// 0 hedefi her kosulu saglardi; TANIMSIZ sayilir
esit('sifir tanimsiz sayilir',
  hedefleriCoz({ discounted_target_profit_rate: 0, discounted_target_profit_amount: 0, discounted_minimum_profit_amount: 0 }),
  { oran: null, tutar: null, minimum: null });
esit('bos metin tanimsiz',
  hedefleriCoz({ discounted_target_profit_rate: '', discounted_target_profit_amount: null }),
  { oran: null, tutar: null, minimum: null });
esit('negatif tanimsiz',
  hedefleriCoz({ discounted_target_profit_rate: -5 }),
  { oran: null, tutar: null, minimum: null });
esit('kayit yoksa', hedefleriCoz(null), { oran: null, tutar: null, minimum: null });
esit('metin sayi', hedefleriCoz({ discounted_target_profit_rate: '18' }).oran, 18);

console.log('\n═══ HEDEF VAR MI ═══');
esit('oran varsa', hedefVarMi({ oran: 18, tutar: null }), true);
esit('tutar varsa', hedefVarMi({ oran: null, tutar: 50 }), true);
// Ikisi de yoksa urun ATLANIR (yalnizca minimum yeterli degil)
esit('ikisi de yoksa', hedefVarMi({ oran: null, tutar: null, minimum: 10 }), false);
esit('bos', hedefVarMi(null), false);

console.log('\n═══ SIKI KONTROL: TUM HEDEFLER BIRDEN ═══');
{
  const h = { oran: 18, tutar: 50, minimum: 10 };
  esit('hepsi tutuyor', hedefTutuyorMu(60, 20, h), { uygun: true, sebep: null });
  esit('oran tutmuyor', hedefTutuyorMu(60, 15, h), { uygun: false, sebep: 'oran' });
  esit('tutar tutmuyor', hedefTutuyorMu(40, 20, h), { uygun: false, sebep: 'tutar' });
  esit('minimum altinda', hedefTutuyorMu(5, 20, h), { uygun: false, sebep: 'minimum' });
  // Sinir degerler dahil
  esit('tam hedefte', hedefTutuyorMu(50, 18, h), { uygun: true, sebep: null });
}
{
  // Yalnizca oran tanimliysa tutara bakilmaz
  const h = { oran: 18, tutar: null, minimum: null };
  esit('sadece oran', hedefTutuyorMu(1, 20, h), { uygun: true, sebep: null });
  esit('sadece oran tutmuyor', hedefTutuyorMu(999, 17, h), { uygun: false, sebep: 'oran' });
}
esit('gecersiz kar', hedefTutuyorMu(NaN, 20, { oran: 18 }), { uygun: false, sebep: 'minimum' });

console.log('\n═══ KOMISYON BULMA ═══');
{
  const platformlar = [{ id: 'hb1', name: 'HepsiBurada' }];
  const komisyonlar = [
    { platform_id: 'hb1', category_id: 'k1', discounted_target_profit_rate: 18 },
    { platform_id: 'ty1', category_id: 'k1', discounted_target_profit_rate: 99 },
    { platform_id: 'hb1', category_id: 'k2', is_active: false },
  ];
  esit('kategori kimligiyle',
    komisyonBul(komisyonlar, platformlar, { category_id: 'k1' })?.discounted_target_profit_rate, 18);
  esit('baska platform secilmez',
    komisyonBul(komisyonlar, platformlar, { category_id: 'k9' }), null);
  esit('pasif kayit secilmez',
    komisyonBul(komisyonlar, platformlar, { category_id: 'k2' }), null);
}
{
  const platformlar = [{ id: 'hb1', name: 'HepsiBurada' }];
  const komisyonlar = [{ platform_name: 'hepsiburada', category_name: 'Kargo Poşeti', discounted_target_profit_rate: 12 }];
  esit('platform ve kategori ADIYLA',
    komisyonBul(komisyonlar, platformlar, { category_name: 'kargo poşeti' })?.discounted_target_profit_rate, 12);
}
esit('bos urun', komisyonBul([], [], null), null);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
