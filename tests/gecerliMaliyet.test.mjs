import { gecerliMaliyet } from '../src/lib/gecerliMaliyet.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = olan === beklenen;
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${beklenen}\n    olan:     ${olan}`); }
};

console.log('\n═══ ANA KURAL ═══');
esit('baz maliyet YUKSEKSE o kullanilir',
  gecerliMaliyet({ cost: 180, base_cost: 222, ref_product_id_size: 'x' }), 222);
esit('baz maliyet DUSUKSE kendi maliyeti',
  gecerliMaliyet({ cost: 276, base_cost: 222, ref_product_id_size: 'x' }), 276);
esit('esitse fark etmez',
  gecerliMaliyet({ cost: 200, base_cost: 200, ref_product_id_size: 'x' }), 200);

console.log('\n═══ REFERANS SARTI ═══');
// Referansi olmayan uruncte base_cost eski kayittan kalmis olabilir
esit('referans yoksa baz maliyet kullanilmaz',
  gecerliMaliyet({ cost: 100, base_cost: 500 }), 100);
esit('ozellige gore referans',
  gecerliMaliyet({ cost: 100, base_cost: 150, ref_product_id: 'a' }), 150);
esit('olcuye gore referans',
  gecerliMaliyet({ cost: 100, base_cost: 150, ref_product_id_size: 'b' }), 150);
esit('iki referans birden',
  gecerliMaliyet({ cost: 100, base_cost: 150, ref_product_id: 'a', ref_product_id_size: 'b' }), 150);

console.log('\n═══ METIN GELEN SAYILAR (Supabase numeric) ═══');
// "3420" > "640.42" metin karsilastirmasi YANLIS sonuc verir
esit('metin karsilastirma tuzagi',
  gecerliMaliyet({ cost: '640.42', base_cost: '3420', ref_product_id: 'a' }), 3420);
esit('metin, baz daha kucuk',
  gecerliMaliyet({ cost: '3420', base_cost: '640.42', ref_product_id: 'a' }), 3420);

console.log('\n═══ EKSIK/BOZUK VERI ═══');
esit('urun yok', gecerliMaliyet(null), 0);
esit('maliyet yok', gecerliMaliyet({ base_cost: 100, ref_product_id: 'a' }), 100);
esit('baz maliyet null', gecerliMaliyet({ cost: 50, base_cost: null, ref_product_id: 'a' }), 50);
esit('baz maliyet bos metin', gecerliMaliyet({ cost: 50, base_cost: '', ref_product_id: 'a' }), 50);
esit('ikisi de yok', gecerliMaliyet({}), 0);
esit('sayi olmayan maliyet', gecerliMaliyet({ cost: 'abc', base_cost: 90, ref_product_id: 'a' }), 90);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
