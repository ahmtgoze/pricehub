import { kayitlariTeklestir, enIyiKayit, secimYapilmis, ayiklananSayisi } from '../src/lib/kayitTeklestirme.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n=== GERCEK VAKA (1-8 Eylul, iki pencere seti) ===');
{
  // 3 Gün seti secili, 4 Gün seti secimsiz; ikisi ayni tarihte yuklenmis
  const ucGun  = { barcode: 'KPBŞ1', tarife_penceresi: '3 Gün', selected_range: 'range_2',
                   selected_price: 488.17, secimler: { '3 Gün': { kademe: 'range_2', fiyat: 488.17 } },
                   updated_date: '2026-09-03T10:00:00Z' };
  const dortGun = { barcode: 'KPBŞ1', tarife_penceresi: '4 Gün', selected_range: 'none',
                    selected_price: 0, updated_date: '2026-09-03T11:00:00Z' };

  // 4 Gün DAHA YENI ama secimi yok — secili olan kazanmali
  const r = kayitlariTeklestir([dortGun, ucGun]);
  esit('tek kayit kaldi', r.length, 1);
  esit('secili olan secildi', r[0].tarife_penceresi, '3 Gün');
  esit('fiyat korundu', r[0].selected_price, 488.17);
  esit('ayiklanan', ayiklananSayisi([dortGun, ucGun]), 1);
}

console.log('\n=== SIRA KORUNUR ===');
{
  const k = (b, s = 'none') => ({ barcode: b, selected_range: s });
  const r = kayitlariTeklestir([k('A'), k('B'), k('A', 'range_1'), k('C')]);
  esit('sira bozulmadi', r.map((x) => x.barcode), ['A', 'B', 'C']);
  esit('A icin secili olan alindi', r[0].selected_range, 'range_1');
}

console.log('\n=== ESITLIKTE EN YENI ===');
{
  const eski = { barcode: 'X', selected_range: 'none', updated_date: '2026-09-01T00:00:00Z' };
  const yeni = { barcode: 'X', selected_range: 'none', updated_date: '2026-09-03T00:00:00Z' };
  esit('en yeni', kayitlariTeklestir([eski, yeni])[0].updated_date, '2026-09-03T00:00:00Z');
}

console.log('\n=== SECIM ALGILAMA ===');
esit('selected_range', secimYapilmis({ selected_range: 'range_2' }), true);
esit('selected_type (flash)', secimYapilmis({ selected_type: 'flash_3h' }), true);
esit('none', secimYapilmis({ selected_range: 'none' }), false);
esit('manuel fiyat da secimdir', secimYapilmis({ selected_range: 'none', manual_price: 120 }), true);
esit('manuel 0', secimYapilmis({ selected_range: 'none', manual_price: 0 }), false);
esit('bos kayit', secimYapilmis({}), false);
esit('null', secimYapilmis(null), false);

console.log('\n=== PENCERE SECIMLERI IKINCI OLCUT ===');
{
  const a = { barcode: 'Y', selected_range: 'none', secimler: { '3 Gün': { kademe: 'range_2', fiyat: 5 } } };
  const b = { barcode: 'Y', selected_range: 'none', updated_date: '2027-01-01T00:00:00Z' };
  esit('secimler dolu olan kazanir', kayitlariTeklestir([b, a])[0].secimler !== undefined, true);
}

console.log('\n=== UC DURUMLAR ===');
esit('bos liste', kayitlariTeklestir([]), []);
esit('gecersiz girdi', kayitlariTeklestir(null), []);
esit('tek kayit', kayitlariTeklestir([{ barcode: 'A' }]).length, 1);
esit('barkodsuz kayitlar korunur', kayitlariTeklestir([{ barcode: '' }, { barcode: '' }]).length, 2);
esit('ozel anahtar',
  kayitlariTeklestir([{ variant_sku: 'S1' }, { variant_sku: 'S1' }], 'variant_sku').length, 1);
esit('enIyiKayit bos', enIyiKayit([]), null);
esit('enIyiKayit gecersiz', enIyiKayit(null), null);
esit('ayiklanan yok', ayiklananSayisi([{ barcode: 'A' }, { barcode: 'B' }]), 0);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
