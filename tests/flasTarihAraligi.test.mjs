import { flasTeklifAralikta, flasTeklifleriAyikla } from '../src/lib/flasTarihAraligi.js';
let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};
const A = { baslangic: '2026-09-15', bitis: '2026-09-22' };
console.log('\n=== TEKLIF ARALIKTA MI ===');
esit('icinde', flasTeklifAralikta({ fiyat: 100, baslangic: '2026-09-17', bitis: '2026-09-17' }, A), true);
esit('sinirda (ilk gun)', flasTeklifAralikta({ fiyat: 100, baslangic: '2026-09-15', bitis: '2026-09-15' }, A), true);
esit('sinirda (son gun)', flasTeklifAralikta({ fiyat: 100, baslangic: '2026-09-22', bitis: '2026-09-22' }, A), true);
esit('sonraki hafta (24 Eylul) -> disi', flasTeklifAralikta({ fiyat: 100, baslangic: '2026-09-24', bitis: '2026-09-24' }, A), false);
esit('tarihi yok -> disi', flasTeklifAralikta({ fiyat: 100, baslangic: '', bitis: '' }, A), false);
esit('fiyati yok -> disi', flasTeklifAralikta({ fiyat: 0, baslangic: '2026-09-17', bitis: '2026-09-17' }, A), false);
esit('bitis araligi asar -> disi', flasTeklifAralikta({ fiyat: 100, baslangic: '2026-09-22', bitis: '2026-09-23' }, A), false);

console.log('\n=== SATIR AYIKLAMA ===');
esit('24h 24 Eylul, 3h bos -> ATLA', flasTeklifleriAyikla({ price_24h: 212.94, start_24h: '2026-09-24', end_24h: '2026-09-24', price_3h: 0, start_3h: '', end_3h: '' }, A).atla, true);
{
  const r = flasTeklifleriAyikla({ price_24h: 212.94, start_24h: '2026-09-24', end_24h: '2026-09-24', price_3h: 190, start_3h: '2026-09-18', end_3h: '2026-09-18' }, A);
  esit('24h disi, 3h icinde -> kalir', r.atla, false);
  esit('24h fiyati sifirlanir', r.degerler.price_24h, 0);
  esit('24h tarihi gosterim icin kalir', r.degerler.aralik_disi_24h, '2026-09-24');
  esit('3h fiyati kalir', r.degerler.price_3h, 190);
  esit('3h aralik disi degil', r.degerler.aralik_disi_3h, null);
}
{
  const r = flasTeklifleriAyikla({ price_24h: 212.94, start_24h: '2026-09-16', end_24h: '2026-09-16', price_3h: 190, start_3h: '2026-09-18', end_3h: '2026-09-18' }, A);
  esit('ikisi de icinde -> dokunulmaz', [r.atla, r.degerler.price_24h, r.degerler.price_3h], [false, 212.94, 190]);
}
esit('tarihsiz fiyat -> ATLA (onceden iceri giriyordu)', flasTeklifleriAyikla({ price_24h: 100, start_24h: '', end_24h: '', price_3h: 0 }, A).atla, true);
console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`); if (kalan) process.exit(1);
