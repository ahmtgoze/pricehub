import { baremKullanilabilir, baremBandi, baremSec, baremTavanFiyatlari } from '../src/lib/baremKurali.js';

let gecen = 0, kalan = 0;
const esit = (ad, bulunan, beklenen) => {
  const a = JSON.stringify(bulunan), b = JSON.stringify(beklenen);
  if (a === b) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}\n     bulunan : ${a}\n     beklenen: ${b}`); }
};

// Gercek platform ayarlari (veritabanindan)
const TY = { platform_type:'trendyol', use_barem:true, barem_max_desi:10,
             barem1_min:0, barem1_max:149.99, barem2_min:150, barem2_max:299.99 };
const HB = { platform_type:'hepsiburada', use_barem:true, barem_max_desi:40,
             barem1_min:0, barem1_max:199.99, barem2_min:200, barem2_max:399.99 };
const WEB = { platform_type:'website', use_barem:true, barem_max_desi:40,
              barem1_min:0, barem1_max:199.99, barem2_min:200, barem2_max:399.99 };
const U = { desi:5 };

// --- kullanilabilirlik ---
esit('1 normal urun', baremKullanilabilir(TY, U, 5), true);
esit('2 web sitesinde barem yok', baremKullanilabilir(WEB, U, 5), false);
esit('3 use_barem kapali', baremKullanilabilir({...TY, use_barem:false}, U, 5), false);
esit('4 ozel kargo', baremKullanilabilir(TY, {...U, special_shipping:true}, 5), false);
esit('5 coklu paket', baremKullanilabilir(TY, {...U, multi_package:true}, 5), false);
esit('6 desi tavani tam sinirda gecerli', baremKullanilabilir(TY, U, 10), true);
esit('7 desi tavani asilinca gecersiz', baremKullanilabilir(TY, U, 11), false);
esit('8 HB tavani 40', [baremKullanilabilir(HB,U,40), baremKullanilabilir(HB,U,41)], [true,false]);
esit('9 tavan tanimsizsa varsayilan 5', [baremKullanilabilir({...TY,barem_max_desi:null},U,5),
                                          baremKullanilabilir({...TY,barem_max_desi:null},U,6)], [true,false]);
esit('10 platform/urun yoksa false', [baremKullanilabilir(null,U,5), baremKullanilabilir(TY,null,5)], [false,false]);

// --- bant secimi ---
esit('11 TY barem1 alt sinir', baremBandi(TY, 0.01), 'barem1');
esit('12 TY barem1 ust sinir', baremBandi(TY, 149.99), 'barem1');
esit('13 TY barem2 alt sinir', baremBandi(TY, 150), 'barem2');
esit('14 TY barem2 ust sinir', baremBandi(TY, 299.99), 'barem2');
esit('15 TY bant disi', baremBandi(TY, 300), null);

// HepsiBurada bantlari Trendyol'dan FARKLI — eski kod bunu kariştiriyordu
esit('16 HB 180 TL barem1 (eski kod barem2 diyordu)', baremBandi(HB, 180), 'barem1');
esit('17 HB 199,99 barem1', baremBandi(HB, 199.99), 'barem1');
esit('18 HB 200 barem2', baremBandi(HB, 200), 'barem2');
esit('19 HB 350 barem2 (eski kod desi tarifesine dusuyordu)', baremBandi(HB, 350), 'barem2');
esit('20 HB 399,99 barem2', baremBandi(HB, 399.99), 'barem2');
esit('21 HB 400 bant disi', baremBandi(HB, 400), null);

esit('22 sifir/negatif fiyat', [baremBandi(TY,0), baremBandi(TY,-5)], [null,null]);
esit('23 sinirlar tanimsizsa barem yok', baremBandi({platform_type:'trendyol'}, 100), null);

// --- birlesik ---
esit('24 desi tavani asilinca bant bakilmaz', baremSec(TY, U, 100, 25), null);
esit('25 uygun urun + uygun fiyat', baremSec(TY, U, 100, 5), 'barem1');
esit('26 HB 350 + 20 desi', baremSec(HB, U, 350, 20), 'barem2');
esit('27 web sitesi her zaman null', baremSec(WEB, U, 100, 5), null);

// --- oneri icin tavan fiyatlari ---
esit('28 TY tavanlari buyukten kucuge', baremTavanFiyatlari(TY), [299.99, 149.99]);
esit('29 HB tavanlari', baremTavanFiyatlari(HB), [399.99, 199.99]);
esit('30 tanimsiz platform bos liste', baremTavanFiyatlari({}), []);

console.log(`GECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
