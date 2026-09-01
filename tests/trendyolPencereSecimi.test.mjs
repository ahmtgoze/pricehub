import { komisyonHaritasi, pencereKomisyonlariniAl, pencereUygula, pencereAdlari, kademeKarsilastir }
  from '../src/lib/trendyolPencereSecimi.js';
import { pencereleriBul } from '../src/lib/trendyolTarifePenceresi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

// urunkomisyontarifesi-1eylul-7eylul.xlsx dosyasindan GERCEK satir (KPBŞ1).
// Fiyat limitleri IKI pencerede de ayni; yalnizca komisyonlar farkli.
const SATIR = {
  'BARKOD': 'KPBŞ1',
  '1.Fiyat Alt Limit': 488.18, '2.Fiyat Üst Limiti': 488.17,
  '2.Fiyat Alt Limit': 441.76, '3.Fiyat Üst Limiti': 441.75,
  '3.Fiyat Alt Limit': 393.59, '4.Fiyat Üst Limiti': 393.58,
  'Tarih aralığı (3 Gün)': '1 Eylül 08.00-4 Eylül 07.59',
  '1.KOMİSYON': 20, '2.KOMİSYON': 19.3, '3.KOMİSYON': 17.6, '4.KOMİSYON': 15.5,
  'Tarih aralığı (4 Gün)': '4 Eylül 08.00-8 Eylül 07.59',
  '1.KOMİSYON_1': 20, '2.KOMİSYON_1': 16.6, '3.KOMİSYON_1': 14.7, '4.KOMİSYON_1': 12.2,
};
const PENCERELER = pencereleriBul(SATIR);

console.log('\n=== KOMISYON HARITASI: IKI PENCERE DE SAKLANIR ===');
{
  const h = komisyonHaritasi(SATIR, PENCERELER);
  esit('iki pencere', Object.keys(h), ['3 Gün', '4 Gün']);
  esit('3 gunluk', h['3 Gün'], [20, 19.3, 17.6, 15.5]);
  esit('4 gunluk', h['4 Gün'], [20, 16.6, 14.7, 12.2]);
}

console.log('\n=== PENCERE UYGULAMA ===');
{
  const urun = { barcode: 'KPBŞ1', pencere_komisyonlari: komisyonHaritasi(SATIR, PENCERELER),
                 selected_range: 'range_2', selected_price: 488.17 };
  const uc = pencereUygula(urun, '3 Gün');
  esit('3 gunluk komisyonlar', [uc.commission_1, uc.commission_2, uc.commission_3, uc.commission_4], [20, 19.3, 17.6, 15.5]);
  esit('pencere adi yazilir', uc.tarife_penceresi, '3 Gün');

  const dort = pencereUygula(urun, '4 Gün');
  esit('4 gunluk komisyonlar', [dort.commission_1, dort.commission_2, dort.commission_3, dort.commission_4], [20, 16.6, 14.7, 12.2]);

  // Limitler ortak oldugu icin secili kademe ve fiyat KORUNUR; yalnizca kar degisir.
  esit('secim korunur', [dort.selected_range, dort.selected_price], ['range_2', 488.17]);
  esit('ayni urun tekrar 3 gunluge donebilir', pencereUygula(dort, '3 Gün').commission_2, 19.3);
}

console.log('\n=== AYNI DOSYADA URUN URUN FARKLI PENCERE ===');
{
  // Istenen davranis: bir urun 3 gunluk, digeri 4 gunluk, ikisi TEK dosyada
  const harita = komisyonHaritasi(SATIR, PENCERELER);
  const a = pencereUygula({ barcode: 'A', pencere_komisyonlari: harita }, '3 Gün');
  const b = pencereUygula({ barcode: 'B', pencere_komisyonlari: harita }, '4 Gün');
  esit('birbirini etkilemez', [a.tarife_penceresi, b.tarife_penceresi], ['3 Gün', '4 Gün']);
  esit('komisyonlar ayri', [a.commission_2, b.commission_2], [19.3, 16.6]);
}

console.log('\n=== KADEME KARSILASTIRMA (ucuzdan pahaliya) ===');
{
  const urun = { pencere_komisyonlari: komisyonHaritasi(SATIR, PENCERELER) };
  esit('2. kademe', kademeKarsilastir(urun, 2), [{ ad: '4 Gün', komisyon: 16.6 }, { ad: '3 Gün', komisyon: 19.3 }]);
  esit('1. kademe esit', kademeKarsilastir(urun, 1), [{ ad: '3 Gün', komisyon: 20 }, { ad: '4 Gün', komisyon: 20 }]);
  esit('gecersiz kademe', kademeKarsilastir(urun, 9), []);
}

console.log('\n=== TEK PENCERELI ESKI DOSYA BOZULMAZ ===');
{
  const eski = { 'Tarih aralığı (3 Gün)': '1-4 Eylül', '1.KOMİSYON': 20, '2.KOMİSYON': 18, '3.KOMİSYON': 16, '4.KOMİSYON': 14 };
  const h = komisyonHaritasi(eski, pencereleriBul(eski));
  esit('tek pencere', Object.keys(h), ['3 Gün']);
  const u = pencereUygula({ pencere_komisyonlari: h }, '3 Gün');
  esit('komisyonlar', [u.commission_1, u.commission_4], [20, 14]);
}

console.log('\n=== UC DURUMLAR ===');
esit('bos satir', komisyonHaritasi({}, []), {});
esit('null', komisyonHaritasi(null, PENCERELER), {});
esit('pencere listesi degilse', komisyonHaritasi(SATIR, null), {});
esit('olmayan pencere sifirlanir', pencereKomisyonlariniAl({ '3 Gün': [1, 2, 3, 4] }, '9 Gün'), [0, 0, 0, 0]);
esit('harita yoksa', pencereKomisyonlariniAl(undefined, '3 Gün'), [0, 0, 0, 0]);
esit('urun yoksa degismez', pencereUygula(null, '3 Gün'), null);
esit('pencere adi yoksa degismez', pencereUygula({ a: 1 }, ''), { a: 1 });
esit('harita yoksa komisyon 0', pencereUygula({ a: 1 }, '3 Gün').commission_1, 0);
esit('pencere adlari', pencereAdlari({ pencere_komisyonlari: { '3 Gün': [], '4 Gün': [] } }), ['3 Gün', '4 Gün']);
esit('haritasiz urun', pencereAdlari({}), []);

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
