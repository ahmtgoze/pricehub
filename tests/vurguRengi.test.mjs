import { hexCoz, hexToHslDegiskeni, okunakliYaziRengi, renkBul, VURGU_RENKLERI, VARSAYILAN_VURGU } from '../src/lib/vurguRengi.js';

let gecen = 0, kalan = 0;
const esit = (ad, bulunan, beklenen) => {
  const a = JSON.stringify(bulunan), b = JSON.stringify(beklenen);
  if (a === b) gecen++;
  else { kalan++; console.log(`  ✗ ${ad}\n     bulunan : ${a}\n     beklenen: ${b}`); }
};

// --- hexCoz ---
esit('1 6 haneli hex', hexCoz('#0071e3'), { r: 0, g: 113, b: 227 });
esit('2 diyezsiz calisir', hexCoz('0071e3'), { r: 0, g: 113, b: 227 });
esit('3 3 haneli hex genisler', hexCoz('#fff'), { r: 255, g: 255, b: 255 });
esit('4 buyuk harf', hexCoz('#F27A1B'), { r: 242, g: 122, b: 27 });
esit('5 gecersizler null', [hexCoz('#12345'), hexCoz('kirmizi'), hexCoz(''), hexCoz(null)], [null, null, null, null]);

// --- hexToHslDegiskeni ---
esit('6 siyah', hexToHslDegiskeni('#000000'), '0 0% 0%');
esit('7 beyaz', hexToHslDegiskeni('#ffffff'), '0 0% 100%');
esit('8 saf kirmizi', hexToHslDegiskeni('#ff0000'), '0 100% 50%');
esit('9 saf yesil', hexToHslDegiskeni('#00ff00'), '120 100% 50%');
esit('10 saf mavi', hexToHslDegiskeni('#0000ff'), '240 100% 50%');
esit('11 gri doygunlugu sifir', hexToHslDegiskeni('#808080'), '0 0% 50.2%');
esit('12 gecersiz null', hexToHslDegiskeni('bozuk'), null);

// index.css'teki --primary degeri "240 3% 11.8%"; PriceHub rengi buna denk gelmeli
esit('13 PriceHub rengi index.css ile ortusur', hexToHslDegiskeni('#1d1d1f'), '240 3.3% 11.8%');

// --- okunakli yazi rengi ---
esit('14 koyu zeminde beyaz yazi', okunakliYaziRengi('#1d1d1f'), '0 0% 100%');
esit('15 acik zeminde koyu yazi', okunakliYaziRengi('#F27A1B'), '240 3% 11.8%');
esit('16 beyaz zeminde koyu yazi', okunakliYaziRengi('#ffffff'), '240 3% 11.8%');
esit('17 gecersizde beyaza duser', okunakliYaziRengi('bozuk'), '0 0% 100%');

// --- renkBul ---
esit('18 bilinen id', renkBul('mavi').hex, '#0071e3');
esit('19 bilinmeyen id varsayilana duser', renkBul('yok-boyle').id, VARSAYILAN_VURGU);
esit('20 bos id varsayilana duser', renkBul(undefined).id, VARSAYILAN_VURGU);

// --- liste tutarliligi ---
esit('21 tum renkler cozulebilir', VURGU_RENKLERI.every(r => hexToHslDegiskeni(r.hex) !== null), true);
esit('22 id tekrari yok', new Set(VURGU_RENKLERI.map(r => r.id)).size, VURGU_RENKLERI.length);
esit('23 varsayilan listede var', VURGU_RENKLERI.some(r => r.id === VARSAYILAN_VURGU), true);

console.log(`GECEN: ${gecen}   KALAN: ${kalan}`);
if (kalan > 0) process.exit(1);
