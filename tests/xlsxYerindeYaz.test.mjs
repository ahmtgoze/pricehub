import { sutunNo, sutunHarfi, adresiCoz, xmlKacir, cozXml, hucreYaz, hucreleriYaz, baslikHaritasi, paylasilanMetinler }
  from '../src/lib/xlsxYerindeYaz.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n=== SUTUN ADRESLERI ===');
esit('A', sutunNo('A'), 1);
esit('Z', sutunNo('Z'), 26);
esit('AA', sutunNo('AA'), 27);
esit('AB', sutunNo('AB'), 28);
esit('AI', sutunNo('AI'), 35);
esit('geri cevirme', [1, 26, 27, 28, 35].map(sutunHarfi), ['A', 'Z', 'AA', 'AB', 'AI']);
esit('adres', adresiCoz('AB4'), { sutun: 28, satir: 4 });
esit('gecersiz adres', adresiCoz('4AB'), null);
esit('bos', adresiCoz(''), null);

console.log('\n=== KACIS ===');
esit('kacir', xmlKacir('a & b < c "d"'), 'a &amp; b &lt; c &quot;d&quot;');
esit('coz', cozXml('a &amp; b &lt; c'), 'a & b < c');
esit('sayisal kacis', cozXml('&#220;R&#220;N'), 'ÜRÜN');
esit('cift kacis', cozXml('&amp;lt;'), '&lt;');

const XML = `<sheetData>
<row r="1"><c r="A1" s="2" t="inlineStr"><is><t>BARKOD</t></is></c><c r="AB1" s="4" t="inlineStr"><is><t>YENİ TSF</t></is></c><c r="AE1" s="6" t="inlineStr"><is><t>Tarife Seçimi</t></is></c></row>
<row r="2"><c r="A2" s="1" t="inlineStr"><is><t>KPBŞ1</t></is></c><c r="AB2" s="9"><v>100</v></c></row>
<row r="3"/>
</sheetData>`;

console.log('\n=== SAYI YAZMA ===');
{
  const y = hucreYaz(XML, 'AB2', 488.17, 'n');
  esit('deger degisti', /<c r="AB2" s="9"><v>488.17<\/v><\/c>/.test(y), true);
  esit('diger hucre bozulmadi', y.includes('<c r="A2" s="1" t="inlineStr"><is><t>KPBŞ1</t></is></c>'), true);
}

console.log('\n=== METIN YAZMA (inlineStr, t="str" DEGIL) ===');
{
  const y = hucreYaz(XML, 'AE2', '3 Günlük Fiyat', 's');
  esit('inlineStr olarak yazildi', y.includes('<c r="AE2" t="inlineStr"><is><t>3 Günlük Fiyat</t></is></c>'), true);
  esit('t="str" KULLANILMADI', y.includes('t="str"'), false);
  esit('sutun sirasi korundu', y.indexOf('r="AB2"') < y.indexOf('r="AE2"'), true);
}

console.log('\n=== HUCRE SILME ===');
{
  const y = hucreYaz(XML, 'AB2', null);
  esit('hucre gitti', y.includes('r="AB2"'), false);
  esit('satir duruyor', y.includes('<row r="2">'), true);
  esit('olmayan hucreyi silmek zararsiz', hucreYaz(XML, 'AE2', null), XML);
}

console.log('\n=== BOS SATIR ===');
{
  const y = hucreYaz(XML, 'AB3', 5, 'n');
  esit('kapali satir acildi', y.includes('<row r="3"><c r="AB3"><v>5</v></c></row>'), true);
}

console.log('\n=== TOPLU YAZMA ===');
{
  const y = hucreleriYaz(XML, [
    { adres: 'AB2', deger: 441.75, tip: 'n' },
    { adres: 'AE2', deger: '4 Günlük Fiyat', tip: 's' },
  ]);
  esit('ikisi de yazildi', [/AB2" s="9"><v>441.75</.test(y), y.includes('4 Günlük Fiyat')], [true, true]);
  esit('gecersiz girdi', hucreleriYaz(XML, null), XML);
  esit('adressiz atlanir', hucreleriYaz(XML, [{ deger: 1 }]), XML);
}

console.log('\n=== OLMAYAN SATIR/HUCRE ===');
esit('olmayan satir', hucreYaz(XML, 'AB9', 1, 'n'), XML);
esit('gecersiz adres', hucreYaz(XML, 'ZZZ', 1, 'n'), XML);

console.log('\n=== BASLIK HARITASI ===');
{
  esit('inlineStr basliklar', baslikHaritasi(XML), { BARKOD: 'A', 'YENİ TSF': 'AB', 'Tarife Seçimi': 'AE' });
  const paylasimli = '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row></sheetData>';
  esit('sharedStrings basliklar',
    baslikHaritasi(paylasimli, 1, ['ÜRÜN İSMİ', 'BARKOD']), { 'ÜRÜN İSMİ': 'A', BARKOD: 'B' });
  esit('bos sayfa', baslikHaritasi('<sheetData></sheetData>'), {});
}

console.log('\n=== PAYLASILAN METINLER ===');
esit('sirayla okunur',
  paylasilanMetinler('<sst><si><t>BARKOD</t></si><si><t>STOK</t></si></sst>'), ['BARKOD', 'STOK']);
esit('zengin metin birlestirilir',
  paylasilanMetinler('<sst><si><r><t>Tarife </t></r><r><t>Seçimi</t></r></si></sst>'), ['Tarife Seçimi']);
esit('bos', paylasilanMetinler(''), []);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
