import { stiliCevir, stilleriYazmayaHazirla } from '../src/lib/excelStil.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  ✗ ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

console.log('\n═══ DOLGU (HB dosyasindaki gercek stil) ═══');
esit('turuncu dolgu',
  stiliCevir({ patternType: 'solid', fgColor: { rgb: 'ED7D31' }, bgColor: { rgb: 'ED7D31' } }),
  { fill: { patternType: 'solid', fgColor: { rgb: 'ED7D31' }, bgColor: { rgb: 'ED7D31' } } });
// "none" dolgu bir sey ifade etmez; cevrilirse yazici gereksiz stil uretir
esit('patternType none atlanir', stiliCevir({ patternType: 'none' }), null);
esit('tema rengi', stiliCevir({ patternType: 'solid', fgColor: { theme: 0 } }),
  { fill: { patternType: 'solid', fgColor: { theme: 0 } } });

console.log('\n═══ YAZI TIPI / HIZALAMA / KENARLIK ═══');
esit('kalin yazi', stiliCevir({ bold: true, sz: 12, name: 'Calibri' }),
  { font: { name: 'Calibri', sz: 12, bold: true } });
esit('hizalama', stiliCevir({ horizontal: 'center', wrapText: true }),
  { alignment: { horizontal: 'center', wrapText: true } });
esit('kenarlik', stiliCevir({ top: { style: 'thin' } }),
  { border: { top: { style: 'thin' } } });
esit('hepsi birden',
  stiliCevir({ patternType: 'solid', fgColor: { rgb: 'FF0000' }, bold: true, horizontal: 'center' }),
  { fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } }, font: { bold: true }, alignment: { horizontal: 'center' } });

console.log('\n═══ ZATEN YAZMA BICIMINDE OLANLAR ═══');
{
  // Bizim elle verdigimiz stiller bozulmamali
  const hazir = { fill: { fgColor: { rgb: '112233' } } };
  esit('oldugu gibi kalir', stiliCevir(hazir), hazir);
}
esit('font varsa dokunulmaz', stiliCevir({ font: { bold: true } }), { font: { bold: true } });

console.log('\n═══ GECERSIZ GIRDI ═══');
esit('null', stiliCevir(null), null);
esit('bos nesne', stiliCevir({}), null);
esit('metin', stiliCevir('abc'), null);

console.log('\n═══ TUM KITAP ═══');
{
  const kitap = {
    SheetNames: ['Açıklamalar', 'Listelerim'],
    Sheets: {
      'Açıklamalar': {
        '!ref': 'A1:B2',
        '!cols': [{ wpx: 100 }],
        A1: { v: 'x', s: { patternType: 'solid', fgColor: { rgb: 'ED7D31' } } },
        A2: { v: 'y', s: { patternType: 'none' } },
      },
      'Listelerim': {
        '!ref': 'A1:A1',
        A1: { v: 'z' },
      },
    },
  };
  const cevrilen = stilleriYazmayaHazirla(kitap);
  esit('cevrilen sayisi', cevrilen, 1);
  esit('dolgu ic ice oldu', kitap.Sheets['Açıklamalar'].A1.s,
    { fill: { patternType: 'solid', fgColor: { rgb: 'ED7D31' } } });
  esit('anlamsiz stil silindi', kitap.Sheets['Açıklamalar'].A2.s, undefined);
  // Sayfa ayarlari hucre degildir, ellenmemeli
  esit('!cols korundu', kitap.Sheets['Açıklamalar']['!cols'], [{ wpx: 100 }]);
  esit('stilsiz hucre bozulmadi', kitap.Sheets['Listelerim'].A1, { v: 'z' });
}
esit('kitap yoksa', stilleriYazmayaHazirla(null), 0);
esit('bos kitap', stilleriYazmayaHazirla({ SheetNames: [], Sheets: {} }), 0);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
