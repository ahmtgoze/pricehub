import { komisyonHaritasi, pencereKomisyonlariniAl, pencereUygula, pencereAdlari, kademeKarsilastir, pencereDegistirilebilir,
         secimiOku, secimVarMi, seciliPencereler, acikSecimiSakla, secimiEkranaAl, pencereyeGec, secimOzeti,
         pencereGunu, birlesikPencere, birlesikPencereEkle }
  from '../src/lib/trendyolPencereSecimi.js';
import { pencereleriBul, tarifeSecimDegeri } from '../src/lib/trendyolTarifePenceresi.js';

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
// Komisyon okunamiyorsa urun DEGISTIRILMEZ; sifirlamak yanlis kar hesaplatirdi.
esit('harita yoksa urun korunur', pencereUygula({ a: 1 }, '3 Gün'), { a: 1 });
esit('eski kayit (harita null) korunur',
  pencereUygula({ commission_2: 19.3, pencere_komisyonlari: null }, '4 Gün'),
  { commission_2: 19.3, pencere_komisyonlari: null });
esit('degistirilebilir mi — var', pencereDegistirilebilir({ pencere_komisyonlari: { '4 Gün': [20, 16.6, 14.7, 12.2] } }, '4 Gün'), true);
esit('degistirilebilir mi — yok', pencereDegistirilebilir({ pencere_komisyonlari: null }, '4 Gün'), false);
esit('degistirilebilir mi — hepsi sifir', pencereDegistirilebilir({ pencere_komisyonlari: { '4 Gün': [0, 0, 0, 0] } }, '4 Gün'), false);
esit('pencere adlari', pencereAdlari({ pencere_komisyonlari: { '3 Gün': [], '4 Gün': [] } }), ['3 Gün', '4 Gün']);
esit('haritasiz urun', pencereAdlari({}), []);

console.log('\n=== HER TARIFENIN KENDI SECIMI ===');
{
  const bos = { barcode: 'A' };

  // 3 gunlukte sec
  let u = { ...bos, selected_range: 'range_2', selected_price: 488.17 };
  u = acikSecimiSakla(u, '3 Gün');
  esit('3 gunluk secim saklandi', secimiOku(u, '3 Gün'), { kademe: 'range_2', fiyat: 488.17 });

  // 4 gunluge gec: SIFIRDAN baslamali
  u = secimiEkranaAl(u, '4 Gün');
  esit('4 gunlukte ekran bos', [u.selected_range, u.selected_price], ['none', 0]);
  esit('ama 3 gunluk secim duruyor', secimVarMi(u, '3 Gün'), true);
  esit('4 gunlukte secim yok', secimVarMi(u, '4 Gün'), false);

  // 4 gunlukte FARKLI kademe sec — 3 gunluge dokunmamali
  u = acikSecimiSakla({ ...u, selected_range: 'range_3', selected_price: 441.75 }, '4 Gün');
  esit('4 gunluk secim', secimiOku(u, '4 Gün'), { kademe: 'range_3', fiyat: 441.75 });
  esit('3 gunluk bozulmadi', secimiOku(u, '3 Gün'), { kademe: 'range_2', fiyat: 488.17 });
  esit('ayni urun iki tarifede de secili', seciliPencereler(u).sort(), ['3 Gün', '4 Gün']);

  // 3 gunluge geri don: kendi secimi geri gelmeli
  u = secimiEkranaAl(u, '3 Gün');
  esit('3 gunluk geri geldi', [u.selected_range, u.selected_price], ['range_2', 488.17]);
}

console.log('\n=== PENCEREYE GECIS ===');
{
  const u = pencereyeGec({ selected_range: 'range_1', selected_price: 100 }, '3 Gün', '4 Gün');
  esit('eski saklandi', secimiOku(u, '3 Gün'), { kademe: 'range_1', fiyat: 100 });
  esit('yeni bos', [u.selected_range, u.selected_price], ['none', 0]);
  esit('acik pencere yazildi', u.secim_penceresi, '4 Gün');

  // Secim kaldirilirsa kutudan da silinir
  const v = acikSecimiSakla({ selected_range: 'none', secimler: { '3 Gün': { kademe: 'range_2', fiyat: 5 } } }, '3 Gün');
  esit('secim kaldirilinca silinir', secimVarMi(v, '3 Gün'), false);
  esit('gecis — urun yoksa', pencereyeGec(null, '3 Gün', '4 Gün'), null);
}

console.log('\n=== TARIFE BASINA SAYIM ===');
{
  const yap = (p3, p4) => ({ secimler: {
    ...(p3 ? { '3 Gün': { kademe: 'range_2', fiyat: 1 } } : {}),
    ...(p4 ? { '4 Gün': { kademe: 'range_2', fiyat: 1 } } : {}) } });
  esit('ayri ayri sayilir',
    secimOzeti([yap(1, 0), yap(1, 0), yap(0, 1), yap(1, 1), yap(0, 0)]),
    { toplam: 5, '3 Gün': 3, '4 Gün': 2 });
  // Acik pencerenin HENUZ saklanmamis secimi de sayilir
  esit('acik secim de sayilir',
    secimOzeti([{ selected_range: 'range_1', selected_price: 9 }], '4 Gün'),
    { toplam: 1, '4 Gün': 1 });
  esit('bos liste', secimOzeti([]), { toplam: 0 });
  esit('gecersiz girdi', secimOzeti(null), { toplam: 0 });
}

console.log('\n=== SECIM UC DURUMLARI ===');
esit('secimsiz urun', secimiOku({}, '3 Gün'), { kademe: 'none', fiyat: 0 });
esit('null urun', secimiOku(null, '3 Gün'), { kademe: 'none', fiyat: 0 });
esit('kademe none ise secim yok', secimVarMi({ secimler: { '3 Gün': { kademe: 'none' } } }, '3 Gün'), false);
esit('fiyat okunamazsa 0', secimiOku({ secimler: { '3 Gün': { kademe: 'range_1', fiyat: 'abc' } } }, '3 Gün').fiyat, 0);
esit('secili pencere yok', seciliPencereler({}), []);
esit('sakla — pencere adi yoksa', acikSecimiSakla({ a: 1 }, ''), { a: 1 });

console.log('\n=== ALAN ADI SAYFAYA GORE DEGISIR ===');
{
  // Plus tarifesi "selected_type" kullaniyor
  let u = { selected_type: 'plus', selected_price: 184.48 };
  u = acikSecimiSakla(u, '3 Gün', 'selected_type');
  esit('selected_type saklandi', secimiOku(u, '3 Gün'), { kademe: 'plus', fiyat: 184.48 });

  u = secimiEkranaAl(u, '4 Gün', 'selected_type');
  esit('4 gunlukte bos', [u.selected_type, u.selected_price], ['none', 0]);
  esit('selected_range kirletilmedi', u.selected_range, undefined);
  esit('3 gunluk duruyor', secimVarMi(u, '3 Gün'), true);

  const geri = pencereyeGec(u, '4 Gün', '3 Gün', 'selected_type');
  esit('geri donunce gelir', [geri.selected_type, geri.selected_price], ['plus', 184.48]);
  esit('ozet alan adiyla',
    secimOzeti([{ selected_type: 'plus', selected_price: 1 }], '4 Gün', 'selected_type'),
    { toplam: 1, '4 Gün': 1 });
}

console.log('\n=== BIRLESIK PENCERE (7 Günlük Fiyat) ===');
{
  esit('gun sayisi', [pencereGunu('3 Gün'), pencereGunu('4 Gün'), pencereGunu('Pencere')], [3, 4, null]);
  esit('3+4 = 7', birlesikPencere(PENCERELER), { ad: '7 Gün', gun: 7 });
  esit('tek pencerede yok', birlesikPencere([{ ad: '3 Gün' }]), null);
  // Toplam listede yoksa uretilmez (Trendyol yalnizca 3/4/7 kabul ediyor)
  esit('3+3 = 6 kabul edilmez', birlesikPencere([{ ad: '3 Gün' }, { ad: '3 Gün' }]), null);
  esit('adsiz pencere', birlesikPencere([{ ad: 'A' }, { ad: 'B' }]), null);

  const h = birlesikPencereEkle(komisyonHaritasi(SATIR, PENCERELER), PENCERELER);
  esit('7 Gün eklendi', Object.keys(h), ['3 Gün', '4 Gün', '7 Gün']);
  // Kademe bazinda EN YUKSEK: 3 gunluk hicbir kademede 4 gunlugun altinda degil
  esit('en kotu durum', h['7 Gün'], [20, 19.3, 17.6, 15.5]);
  esit('kaynak pencereler bozulmadi', [h['3 Gün'], h['4 Gün']], [[20, 19.3, 17.6, 15.5], [20, 16.6, 14.7, 12.2]]);
  // Secim degeri listede olmali
  esit('secim degeri', tarifeSecimDegeri('7 Gün'), '7 Günlük Fiyat');
  esit('harita yoksa dokunmaz', birlesikPencereEkle(null, PENCERELER), null);
  esit('tek pencerede eklemez', birlesikPencereEkle({ '3 Gün': [1,2,3,4] }, [{ ad: '3 Gün' }]), { '3 Gün': [1,2,3,4] });
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
