import { kdvDahilOran, hamOrana, komisyonEtiketi, HB_KOMISYON_KDV } from '../src/lib/hbKomisyon.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n═══ KULLANICININ VERDIGI ORNEKLER ═══');
esit('%17 -> %20,4', kdvDahilOran(17), 20.4);
esit('%9 -> %10,8', kdvDahilOran(9), 10.8);

console.log('\n═══ KDV ORANI ═══');
esit('sabit %20', HB_KOMISYON_KDV, 20);
esit('%10 -> %12', kdvDahilOran(10), 12);
esit('%12,5 -> %15', kdvDahilOran(12.5), 15);
esit('%21,5 -> %25,8', kdvDahilOran(21.5), 25.8);
// 9 x 1,2 = 10.799999999999999 — kurusa yuvarlanmali
esit('kayan nokta kaymasi yuvarlanir', kdvDahilOran(9), 10.8);
esit('metin gelirse', kdvDahilOran('17'), 20.4);

console.log('\n═══ GECERSIZ DEGERLER ═══');
// Komisyonsuz urun hesaplanamaz; uydurma oran uretilmez.
esit('sifir', kdvDahilOran(0), 0);
esit('negatif', kdvDahilOran(-5), 0);
esit('bos', kdvDahilOran(''), 0);
esit('null', kdvDahilOran(null), 0);
esit('undefined', kdvDahilOran(undefined), 0);
esit('sayi olmayan', kdvDahilOran('abc'), 0);

console.log('\n═══ GERI CEVRIM (gosterim icin) ═══');
esit('20,4 -> 17', hamOrana(20.4), 17);
esit('10,8 -> 9', hamOrana(10.8), 9);
esit('15 -> 12,5', hamOrana(15), 12.5);
esit('gecersiz', hamOrana(0), 0);
// Gidip gelme kayip vermemeli
esit('17 gidip geldi', hamOrana(kdvDahilOran(17)), 17);
esit('9 gidip geldi', hamOrana(kdvDahilOran(9)), 9);
esit('12,5 gidip geldi', hamOrana(kdvDahilOran(12.5)), 12.5);

console.log('\n═══ ETIKET (girdi KDV DAHIL orandir) ═══');
esit('20,4 etiketi', komisyonEtiketi(20.4), '%20,4 (HB %17)');
esit('10,8 etiketi', komisyonEtiketi(10.8), '%10,8 (HB %9)');
esit('12 etiketi', komisyonEtiketi(12), '%12 (HB %10)');
esit('15 etiketi', komisyonEtiketi(15), '%15 (HB %12,5)');
esit('sifir etiketi', komisyonEtiketi(0), '%0');
esit('gecersiz etiketi', komisyonEtiketi(null), '%0');

console.log('\n═══ MOTORLA TUTARLILIK ═══');
{
  // Motor: komisyon = satis x oran (iki 1,20 birbirini goturur)
  // HB %17 diyorsa 5.000 TL'lik satista kasadan cikan komisyon:
  const satis = 5000;
  const beklenenKomisyon = satis * 17 / 100 * 1.2;          // 1020
  const motorSonucu = satis * kdvDahilOran(17) / 100;        // 5000 x 20,4%
  esit('KDV dahil oranla motor dogru komisyonu bulur', motorSonucu, beklenenKomisyon);
  esit('ham oranla eksik cikardi (eski hata)', satis * 17 / 100, 850);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
