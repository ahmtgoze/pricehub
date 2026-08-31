import { skuSayfasi, ACIKLAMA_SATIRLARI, ACIKLAMA_SAYFASI, SKU_SAYFASI }
  from '../src/lib/hbSkuSablonu.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n═══ SABLON YAPISI (HB dosyasindan birebir) ═══');
esit('sayfa adları', [ACIKLAMA_SAYFASI, SKU_SAYFASI], ['Açıklama', 'Skus']);
esit('açıklama başlığı', ACIKLAMA_SATIRLARI[0], ['Excel Kolon Adı', 'Karşılığı', 'Örnek']);
esit('açıklama SKU satırı', ACIKLAMA_SATIRLARI[1][0], 'SKU');
esit('örnek değer', ACIKLAMA_SATIRLARI[1][2], 'HBV000000012');

console.log('\n═══ SKU SAYFASI ═══');
{
  const r = skuSayfasi(['HBCV000077XIZW', 'HBCV000077XHZN']);
  esit('başlık + 2 satır', r.satirlar, [['SKU'], ['HBCV000077XIZW'], ['HBCV000077XHZN']]);
  esit('yazılan', r.yazilan, 2);
  esit('atlanan', r.atlanan, 0);
}
{
  // Ayni SKU iki kez giderse HB tekrarli kayit gorur
  const r = skuSayfasi(['A1', 'A1', 'A2']);
  esit('tekrar atlandı', r.satirlar, [['SKU'], ['A1'], ['A2']]);
  esit('atlanan sayısı', r.atlanan, 1);
}
{
  // Bos satir sema hatasi cikarabilir
  const r = skuSayfasi(['A1', '', null, undefined, '   ']);
  esit('boşlar atlandı', r.satirlar, [['SKU'], ['A1']]);
  esit('atlanan', r.atlanan, 4);
}
esit('boşluklu SKU kırpılır', skuSayfasi(['  A1  ']).satirlar, [['SKU'], ['A1']]);
esit('hiç SKU yok', skuSayfasi([]), { satirlar: [['SKU']], yazilan: 0, atlanan: 0 });
esit('geçersiz girdi', skuSayfasi(null).yazilan, 0);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
