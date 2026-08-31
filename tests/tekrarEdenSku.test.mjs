import { tekrarEdenSkular, sayimOzeti } from '../src/lib/tekrarEdenSku.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

const k = (sku, hesap = 'Web Sitesi', ek = {}) => ({ variant_sku: sku, platform_account: hesap, ...ek });

console.log('\n=== GERCEK VAKA (Web Sitesi 441 kayit / 440 urun) ===');
{
  const kayitlar = [k('CZRKPP-1825-400'), k('CZRKPP-1825-400'), k('BS-4555-100')];
  const r = tekrarEdenSkular(kayitlar);
  esit('bir tekrar bulundu', r.length, 1);
  esit('kod', r[0].sku, 'CZRKPP-1825-400');
  esit('adet', r[0].adet, 2);
  esit('sayim ozeti', sayimOzeti(kayitlar), { kayit: 3, benzersiz: 2, fazla: 1, tekrarSayisi: 1 });
}

console.log('\n=== AYNI KOD FARKLI PLATFORMDA ===');
{
  // Ayni urun hem Trendyol'da hem Web Sitesi'nde olabilir - bu TEKRAR DEGIL
  const r = tekrarEdenSkular([k('A1', 'Trendyol'), k('A1', 'Web Sitesi')]);
  esit('farkli hesap tekrar sayilmaz', r.length, 0);
}
{
  const r = tekrarEdenSkular([k('A1', 'Trendyol'), k('A1', 'Trendyol'), k('A1', 'Web Sitesi')]);
  esit('ayni hesapta tekrar yakalanir', r.length, 1);
  esit('dogru hesap', r[0].platformHesabi, 'Trendyol');
  esit('yalnizca o hesabin kayitlari', r[0].adet, 2);
}

console.log('\n=== BOSLUK VE BUYUK/KUCUK HARF ===');
esit('bosluk farki tekrar sayilir', tekrarEdenSkular([k('ABC'), k('  ABC  ')]).length, 1);
esit('harf farki tekrar sayilir', tekrarEdenSkular([k('abc'), k('ABC')]).length, 1);

console.log('\n=== KODU OLMAYANLAR ===');
// Kodu olmayan iki kayit birbirinin tekrari SAYILMAZ; farkli urunler olabilir
esit('bos kodlar tekrar degil', tekrarEdenSkular([k(''), k(''), k(null)]).length, 0);
esit('bos kod sayima girmez', sayimOzeti([k('A1'), k(''), k(null)]),
  { kayit: 3, benzersiz: 1, fazla: 0, tekrarSayisi: 0 });

console.log('\n=== SIRALAMA VE UC DURUMLAR ===');
{
  const r = tekrarEdenSkular([k('B'), k('B'), k('A'), k('A')]);
  esit('koda gore sirali', r.map((x) => x.sku), ['A', 'B']);
}
esit('uc kez tekrar', tekrarEdenSkular([k('A'), k('A'), k('A')])[0].adet, 3);
esit('tekrar yok', tekrarEdenSkular([k('A'), k('B')]).length, 0);
esit('bos liste', tekrarEdenSkular([]), []);
esit('gecersiz girdi', tekrarEdenSkular(null), []);
esit('ozel alan adi',
  tekrarEdenSkular([{ hb_sku: 'X', platform_account: 'HB' }, { hb_sku: 'X', platform_account: 'HB' }], 'hb_sku').length, 1);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
