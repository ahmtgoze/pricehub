import {
  tarifeKaydiSec, kademeKomisyonu, kademeKomisyonlari, tarihlerOrtusuyorMu,
  pencereTarihiCoz, pencereTarihleri, aktifPencere, tarifeKomisyonu, aktifPencereOzeti,
} from '../src/lib/tarifeKaydiSecimi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

// Gercek dosya (298954-01-09-2026): pencereler ve komisyonlar
const TARIHLER = {
  '3 Gün': { baslangic: '2026-09-01T08:00:00+03:00', bitis: '2026-09-04T07:59:00+03:00' },
  '4 Gün': { baslangic: '2026-09-04T08:00:00+03:00', bitis: '2026-09-08T07:59:00+03:00' },
};
const kayit = (ek = {}) => ({
  barcode: 'KPBŞ1', platform_account: 'Trendyol',
  start_date: '2026-09-01', end_date: '2026-09-07',
  price_range_1_min: 488.18, price_range_2_min: 441.76, price_range_2_max: 488.17,
  price_range_3_min: 393.59, price_range_3_max: 441.75, price_range_4_max: 393.58,
  commission_1: 20, commission_2: 19.3, commission_3: 17.6, commission_4: 15.5,
  pencere_komisyonlari: { '3 Gün': [20, 19.3, 17.6, 15.5], '4 Gün': [20, 16.6, 14.9, 12.8] },
  pencere_tarihleri: TARIHLER,
  selected_range: 'none', ...ek,
});
const OLCUT = { barkod: 'KPBŞ1', platform: 'Trendyol', baslangic: '2026-09-01', bitis: '2026-09-07' };

console.log('\n=== TARIH METNI COZUMU ===');
{
  esit('3 gun', pencereTarihiCoz('1 Eylül 08.00-4 Eylül 07.59', 2026), TARIHLER['3 Gün']);
  esit('4 gun', pencereTarihiCoz('4 Eylül 08.00-8 Eylül 07.59', 2026), TARIHLER['4 Gün']);
  esit('iki nokta ayraci', pencereTarihiCoz('4 Eylül 08:00-8 Eylül 07:59', 2026), TARIHLER['4 Gün']);
  esit('saatsiz', pencereTarihiCoz('1 Eylül-4 Eylül', 2026), { baslangic: '2026-09-01T00:00:00+03:00', bitis: '2026-09-04T00:00:00+03:00' });
  esit('yil gecisi', pencereTarihiCoz('30 Aralık 08.00-2 Ocak 07.59', 2026), { baslangic: '2026-12-30T08:00:00+03:00', bitis: '2027-01-02T07:59:00+03:00' });
  esit('buyuk harf / bosluk', pencereTarihiCoz('  1 EYLÜL 08.00 - 4 EYLÜL 07.59 ', 2026), TARIHLER['3 Gün']);
  esit('bozuk metin', pencereTarihiCoz('yarın-öbür gün', 2026), null);
  esit('bos', pencereTarihiCoz('', 2026), null);
  esit('yil yok', pencereTarihiCoz('1 Eylül 08.00-4 Eylül 07.59', null), null);
  esit('dosya pencerelerinden harita', pencereTarihleri([
    { ad: '3 Gün', tarihAraligi: '1 Eylül 08.00-4 Eylül 07.59' },
    { ad: '4 Gün', tarihAraligi: '4 Eylül 08.00-8 Eylül 07.59' },
    { ad: 'X', tarihAraligi: '' },
  ], '2026-09-01'), TARIHLER);
}

console.log('\n=== AKTIF PENCERE ===');
{
  const k = kayit();
  esit('2 Eylul -> 3 Gün', aktifPencere(k, '2026-09-02T12:00:00+03:00'), '3 Gün');
  esit('4 Eylul 07:00 -> hala 3 Gün', aktifPencere(k, '2026-09-04T07:00:00+03:00'), '3 Gün');
  esit('4 Eylul 08:00 -> 4 Gün', aktifPencere(k, '2026-09-04T08:00:00+03:00'), '4 Gün');
  esit('6 Eylul -> 4 Gün', aktifPencere(k, '2026-09-06T10:00:00+03:00'), '4 Gün');
  esit('pencereden once -> ilk', aktifPencere(k, '2026-08-30T10:00:00+03:00'), '3 Gün');
  esit('pencereden sonra -> son', aktifPencere(k, '2026-09-09T10:00:00+03:00'), '4 Gün');
  esit('tarih yok -> null', aktifPencere(kayit({ pencere_tarihleri: null }), '2026-09-02'), null);
  esit('bos harita -> null', aktifPencere(kayit({ pencere_tarihleri: {} }), '2026-09-02'), null);
  esit('gecersiz an', aktifPencere(k, 'dun'), null);
}

console.log('\n=== KADEME KOMISYONU (pencereye gore) ===');
{
  const k = kayit();
  esit('2. kademe, 3 Gün', kademeKomisyonu(k, 488.17, '3 Gün'), 19.3);
  esit('2. kademe, 4 Gün', kademeKomisyonu(k, 488.17, '4 Gün'), 16.6);
  esit('1. kademe (fark yok)', kademeKomisyonu(k, 500, '4 Gün'), 20);
  esit('4. kademe, 4 Gün', kademeKomisyonu(k, 300, '4 Gün'), 12.8);
  esit('pencere yok -> sutunlar', kademeKomisyonu(k, 488.17), 19.3);
  esit('haritada olmayan pencere -> sutunlar', kademeKomisyonu(k, 488.17, '9 Gün'), 19.3);
  esit('fiyat 0', kademeKomisyonu(k, 0, '3 Gün'), null);
  esit('kayit yok', kademeKomisyonu(null, 500), null);
  esit('komisyon 0 ise null', kademeKomisyonu(kayit({ commission_1: 0, pencere_komisyonlari: null }), 500), null);
  esit('sutunlar', kademeKomisyonlari(kayit({ pencere_komisyonlari: null })), [20, 19.3, 17.6, 15.5]);
  esit('bozuk pencere (3 eleman) -> sutunlar', kademeKomisyonlari(kayit({ pencere_komisyonlari: { '3 Gün': [1, 2, 3] } }), '3 Gün'), [20, 19.3, 17.6, 15.5]);
  esit('metin sayilar', kademeKomisyonlari(kayit({ pencere_komisyonlari: { '3 Gün': ['22', '20', '18', '16'] } }), '3 Gün'), [22, 20, 18, 16]);
}

console.log('\n=== TARIFE KOMISYONU: O GUN GECERLI PENCERE ===');
{
  const k = kayit();
  esit('2 Eylul: 3 gunluk oran', tarifeKomisyonu([k], { ...OLCUT, an: '2026-09-02T12:00:00+03:00' }, 488.17).oran, 19.3);
  esit('6 Eylul: 4 gunluk oran', tarifeKomisyonu([k], { ...OLCUT, an: '2026-09-06T12:00:00+03:00' }, 488.17).oran, 16.6);
  esit('pencere adi doner', tarifeKomisyonu([k], { ...OLCUT, an: '2026-09-06T12:00:00+03:00' }, 488.17).pencere, '4 Gün');
  // Eski kayit: pencere tarihi yok -> sutunlar, pencere null
  const eski = kayit({ pencere_tarihleri: null, commission_2: 16.6 });
  esit('eski kayit sutunlari', tarifeKomisyonu([eski], { ...OLCUT, an: '2026-09-02' }, 488.17), { oran: 16.6, pencere: null, kayit: eski });
  // Donem disi / sifir komisyon
  const temmuz = kayit({ start_date: '2026-07-21', end_date: '2026-07-28', pencere_komisyonlari: null, pencere_tarihleri: null,
                         commission_1: 0, commission_2: 0, commission_3: 0, commission_4: 0 });
  const haziran = kayit({ start_date: '2026-06-09', end_date: '2026-06-16', commission_2: 13.14 });
  esit('donem disi sayilmaz', tarifeKomisyonu([haziran], OLCUT, 488.17).oran, null);
  esit('sifir komisyon sayilmaz', tarifeKomisyonu([temmuz], { ...OLCUT, baslangic: '2026-07-21', bitis: '2026-07-28' }, 488.17).oran, null);
  // En guncel kayit once
  const eskiKayit = kayit({ updated_date: '2026-09-01T08:00:00Z', pencere_komisyonlari: { '3 Gün': [20, 30, 30, 30], '4 Gün': [20, 30, 30, 30] } });
  const yeniKayit = kayit({ updated_date: '2026-09-02T08:00:00Z' });
  esit('en guncel kayit', tarifeKomisyonu([eskiKayit, yeniKayit, temmuz, haziran], { ...OLCUT, an: '2026-09-06' }, 488.17).oran, 16.6);
  esit('fiyat kademeye girmezse', tarifeKomisyonu([k], OLCUT, 0).oran, null);
  esit('kayit yok', tarifeKomisyonu([], OLCUT, 488.17).oran, null);
  esit('gecersiz girdi', tarifeKomisyonu(null, OLCUT, 100).oran, null);
  esit('barkodsuz', tarifeKomisyonu([k], {}, 100).oran, null);
}

console.log('\n=== TARIH SUZGECI / KAYIT SECIMI ===');
{
  const eski = kayit({ start_date: '2026-06-01', end_date: '2026-06-07', commission_2: 25 });
  const guncel = kayit({ commission_2: 19.3 });
  esit('tarihi ortusen secilir', tarifeKaydiSec([eski, guncel], OLCUT).commission_2, 19.3);
  const secili = kayit({ commission_2: 16.6, selected_range: 'range_2', updated_date: '2026-09-01T10:00:00Z' });
  const secisiz = kayit({ commission_2: 19.3, selected_range: 'none', updated_date: '2026-09-02T10:00:00Z' });
  esit('secim durumu etkilemez, en guncel', tarifeKaydiSec([secili, secisiz], OLCUT).commission_2, 19.3);
  esit('ortusme: sinir bilinmiyor', tarihlerOrtusuyorMu(null, null, '2026-09-01', '2026-09-07'), true);
  esit('ortusme: yok', tarihlerOrtusuyorMu('2026-06-01', '2026-06-07', '2026-09-01', '2026-09-07'), false);
}

console.log('\n=== EKRAN OZETI ===');
{
  const k = kayit();
  esit('6 Eylul', aktifPencereOzeti([k], 'Trendyol', '2026-09-06T12:00:00+03:00'), { pencere: '4 Gün', ...TARIHLER['4 Gün'] });
  esit('platform uyusmaz', aktifPencereOzeti([k], 'Hepsiburada', '2026-09-06'), null);
  esit('tarihsiz kayit', aktifPencereOzeti([kayit({ pencere_tarihleri: null })], 'Trendyol', '2026-09-06'), null);
  esit('bos', aktifPencereOzeti([], 'Trendyol'), null);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
