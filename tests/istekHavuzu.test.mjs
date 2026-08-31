import { havuzdaCalistir, tekrarDene } from '../src/lib/istekHavuzu.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n═══ ES ZAMANLILIK SINIRI ═══');
{
  let acik = 0, enYuksek = 0;
  const isler = Array.from({ length: 50 }, (_, i) => i);
  const r = await havuzdaCalistir(isler, 8, async () => {
    acik++; enYuksek = Math.max(enYuksek, acik);
    await new Promise(c => setTimeout(c, 5));
    acik--;
  });
  // ASIL KURAL: 900 istegi birden gondermek canlida "Failed to fetch" verdi.
  esit('ayni anda en fazla 8 istek', enYuksek <= 8, true);
  esit('hepsi islendi', r.basarili, 50);
  esit('hata yok', r.basarisiz.length, 0);
}

console.log('\n═══ TEK HATA HER SEYI COKERTMESIN ═══');
{
  const isler = [1, 2, 3, 4, 5];
  const r = await havuzdaCalistir(isler, 2, async (n) => {
    if (n === 3) throw new Error('ag kopmasi');
  });
  esit('digerleri tamamlandi', r.basarili, 4);
  esit('basarisiz sayisi', r.basarisiz.length, 1);
  esit('hangisi oldugu biliniyor', r.basarisiz[0].oge, 3);
}

console.log('\n═══ ILERLEME BILDIRIMI ═══');
{
  let sayac = 0;
  await havuzdaCalistir([1,2,3,4], 2, async () => {}, () => sayac++);
  esit('her oge icin bir kez', sayac, 4);
  // Hata alsa da ilerleme saymali; aksi halde cubuk takilip kalir.
  let sayac2 = 0;
  await havuzdaCalistir([1,2,3], 2, async (n) => { if (n === 2) throw new Error('x'); }, () => sayac2++);
  esit('hatada da sayiyor', sayac2, 3);
}

console.log('\n═══ BOS GIRDI ═══');
esit('bos dizi', await havuzdaCalistir([], 8, async () => {}), { basarili: 0, basarisiz: [] });
esit('null girdi', await havuzdaCalistir(null, 8, async () => {}), { basarili: 0, basarisiz: [] });

console.log('\n═══ TEKRAR DENEME ═══');
{
  let deneme = 0;
  const sonuc = await tekrarDene(async () => {
    deneme++;
    if (deneme < 3) throw new Error('Failed to fetch');
    return 'tamam';
  }, 3, 1);
  esit('gecici hatadan sonra basarili', sonuc, 'tamam');
  esit('uc kez denendi', deneme, 3);

  let d2 = 0;
  let hataMesaji = '';
  try {
    await tekrarDene(async () => { d2++; throw new Error('kalici hata'); }, 3, 1);
  } catch (e) { hataMesaji = e.message; }
  esit('kalici hata sonunda firlatilir', hataMesaji, 'kalici hata');
  esit('gereksiz deneme yok', d2, 3);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
