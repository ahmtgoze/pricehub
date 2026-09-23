import { ciftKargoMetni, ciftKargo, kuralHatasi, ciftKargoKurallari, promosyonKargosu, desiTarifesiBul } from '../src/lib/kargoHesabi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  if (JSON.stringify(olan) === JSON.stringify(beklenen)) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

const kurallar = [
  { min: 0, max: 10, yontem: 'sabit', tutar: 50 },
  { min: 10.5, max: 30, yontem: 'ayni' },
];
const cift = { double_shipping: true };

console.log('\n═══ CIFT KARGO ═══');
esit('isaretsiz urun tek yol', ciftKargo({}, 100, 5, kurallar).tutar, 100);
esit('sabit: 2 x tarife + tutar', ciftKargo(cift, 100, 5, kurallar).tutar, 250);
esit('ayni: 3 x tarife (100+100+100)', ciftKargo(cift, 100, 20, kurallar).tutar, 300);
esit('aralik disi: bugunku gibi 2 x', ciftKargo(cift, 100, 40, kurallar).tutar, 200);
esit('kural yoksa 2 x', ciftKargo(cift, 100, 5, []).tutar, 200);
esit('sinir dahil (10)', ciftKargo(cift, 100, 10, kurallar).yontem, 'sabit');

console.log('\n═══ ARALIK DOGRULAMA ═══');
esit('gecerli', kuralHatasi(kurallar), null);
esit('cakisma yakalanir', !!kuralHatasi([{ min: 0, max: 10, yontem: 'ayni' }, { min: 10, max: 20, yontem: 'ayni' }]), true);
esit('ters aralik', !!kuralHatasi([{ min: 10, max: 5, yontem: 'ayni' }]), true);
esit('sabitte tutar sart', !!kuralHatasi([{ min: 0, max: 5, yontem: 'sabit' }]), true);
esit('ayar okunur', ciftKargoKurallari([{ setting_key: 'cift_kargo_kurallari', setting_value: JSON.stringify(kurallar) }]).length, 2);
esit('bozuk ayar bos liste', ciftKargoKurallari([{ setting_key: 'cift_kargo_kurallari', setting_value: '{' }]), []);

console.log('\n═══ PROMOSYON KARGOSU ═══');
const tarifeler = [{ rate_type: 'desi', desi: 5, price: 80 }, { rate_type: 'desi', desi: 30, price: 150 }];
const web = { platform_type: 'website' };
esit('desi tarifesi', desiTarifesiBul(tarifeler, 12)?.price, 150);
esit('tarife ustu yok', desiTarifesiBul(tarifeler, 31), null);
esit('cift kargo sayfada da uygulanir', promosyonKargosu({ platform: web, urun: { double_shipping: true, desi: 3 }, fiyat: 500, tarifeler, kurallar }).shippingCost, 210);
esit('coklu paket paket paket', promosyonKargosu({ platform: web, urun: { double_shipping: true, multi_package: true, packages: '[{"desi":3},{"desi":20}]' }, fiyat: 500, tarifeler, kurallar }).shippingCost, 210 + 450);

console.log('\n═══ FIYAT DETAYI METNI ═══');
// 23 Eyl 2026: aralik yokken (sabit=null) metin hazirlanirken cokup beyaz ekran veriyordu
esit('kayit yok', ciftKargoMetni(undefined, 200).includes('2 × kargo'), true);
esit('aralik yok', ciftKargoMetni([{ desi: 5, yontem: 'iki', sabit: null, aralik: null }], 466), 'Depo → üretim ₺233.00 + depo → müşteri ₺233.00');
esit('tarifeyle ayni', ciftKargoMetni([{ desi: 5, yontem: 'ayni', sabit: null, aralik: [0, 10] }], 300).includes('üretim → depo ₺100.00'), true);
esit('sabit', ciftKargoMetni([{ desi: 5, yontem: 'sabit', sabit: 60, aralik: [0, 10] }], 260).includes('₺60.00 (sabit tutar)'), true);
esit('cok paket', ciftKargoMetni([{ desi: 3, yontem: 'iki', sabit: null }, { desi: 8, yontem: 'sabit', sabit: 40 }], 0).includes('8 desi → 2 × tarife + ₺40.00'), true);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan) process.exit(1);
