import { tarifeKaydiSec, kademeKomisyonu, tarihlerOrtusuyorMu, yediGunTarifeKomisyonu, yediGunKademeKomisyonlari } from '../src/lib/tarifeKaydiSecimi.js';

let gecen = 0, kalan = 0;
const esit = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (ok) gecen++; else { kalan++; console.log(`  x ${ad}\n    beklenen: ${JSON.stringify(beklenen)}\n    olan:     ${JSON.stringify(olan)}`); }
};

const kayit = (ek = {}) => ({
  barcode: 'KPBŞ1', platform_account: 'Trendyol',
  start_date: '2026-09-01', end_date: '2026-09-07',
  price_range_1_min: 488.18, price_range_2_min: 441.76, price_range_2_max: 488.17,
  price_range_3_min: 393.59, price_range_3_max: 441.75, price_range_4_max: 393.58,
  commission_1: 20, commission_2: 19.3, commission_3: 17.6, commission_4: 15.5,
  selected_range: 'none', ...ek,
});

console.log('\n=== TARIH SUZGECI ===');
{
  const eski = kayit({ start_date: '2026-06-01', end_date: '2026-06-07', commission_2: 25 });
  const guncel = kayit({ commission_2: 19.3 });
  const s = tarifeKaydiSec([eski, guncel], { barkod: 'KPBŞ1', platform: 'Trendyol', baslangic: '2026-09-01', bitis: '2026-09-07' });
  esit('tarihi ortusen secilir', s.commission_2, 19.3);
}

console.log('\n=== SECIM DURUMU KAYIT SECIMINI ETKILEMEZ ===');
{
  // Komisyon Tarifesi sayfasinda secili olup olmamasi onemli DEGIL:
  // tarifenin aralaklari urunun kendi ozelligi
  const secili = kayit({ commission_2: 16.6, selected_range: 'range_2', updated_date: '2026-09-01T10:00:00Z' });
  const secilmemis = kayit({ commission_2: 19.3, selected_range: 'none', updated_date: '2026-09-03T10:00:00Z' });
  const s = tarifeKaydiSec([secili, secilmemis], { barkod: 'KPBŞ1', platform: 'Trendyol', baslangic: '2026-09-01', bitis: '2026-09-07' });
  esit('secim degil, tarih ve guncellik belirler', s.commission_2, 19.3);
}

console.log('\n=== ESITLIKTE EN YENI ===');
{
  const eski = kayit({ commission_2: 19.3, updated_date: '2026-09-01T10:00:00Z' });
  const yeni = kayit({ commission_2: 18.0, updated_date: '2026-09-03T10:00:00Z' });
  esit('en yeni', tarifeKaydiSec([eski, yeni], { barkod: 'KPBŞ1' }).commission_2, 18.0);
}

console.log('\n=== SUZGECLER ===');
esit('barkod eslesmezse yok', tarifeKaydiSec([kayit()], { barkod: 'YOK' }), null);
esit('platform eslesmezse yok', tarifeKaydiSec([kayit()], { barkod: 'KPBŞ1', platform: 'Baska' }), null);
esit('bos liste', tarifeKaydiSec([], { barkod: 'KPBŞ1' }), null);
esit('gecersiz girdi', tarifeKaydiSec(null, { barkod: 'KPBŞ1' }), null);
esit('barkodsuz olcut', tarifeKaydiSec([kayit()], {}), null);

console.log('\n=== TARIH ORTUSMESI ===');
esit('ortusur', tarihlerOrtusuyorMu('2026-09-01','2026-09-07','2026-09-04','2026-09-10'), true);
esit('ortusmez', tarihlerOrtusuyorMu('2026-09-01','2026-09-07','2026-09-08','2026-09-10'), false);
esit('sinirda ortusur', tarihlerOrtusuyorMu('2026-09-01','2026-09-07','2026-09-07','2026-09-10'), true);
esit('tarih bilinmiyorsa ortusur sayilir', tarihlerOrtusuyorMu(null,null,'2026-09-01','2026-09-07'), true);

console.log('\n=== KADEME KOMISYONU ===');
{
  const k = kayit();
  esit('1. kademe', kademeKomisyonu(k, 500), 20);
  esit('2. kademe', kademeKomisyonu(k, 488.17), 19.3);
  esit('2. kademe alt sinir', kademeKomisyonu(k, 441.76), 19.3);
  esit('3. kademe', kademeKomisyonu(k, 441.75), 17.6);
  esit('4. kademe', kademeKomisyonu(k, 300), 15.5);
  esit('fiyat 0', kademeKomisyonu(k, 0), null);
  esit('kayit yok', kademeKomisyonu(null, 500), null);
  esit('komisyon 0 ise null', kademeKomisyonu(kayit({ commission_1: 0 }), 500), null);
}

console.log('\n=== 7 GUNLUK TARIFE KOMISYONU (gercek KPBŞ1 kayitlari) ===');
{
  const olcut = { barkod: 'KPBŞ1', platform: 'Trendyol', baslangic: '2026-09-01', bitis: '2026-09-07' };
  const eskiKayit = kayit({ start_date: '2026-09-01', end_date: '2026-09-08', commission_2: 19.3, updated_date: '2026-09-01T08:00:00Z' });
  const yeniKayit = kayit({ start_date: '2026-09-01', end_date: '2026-09-07', commission_2: 16.6, updated_date: '2026-09-02T08:00:00Z' });
  // Temmuz kaydinda komisyonlar 0 — hesaba katilmamali
  const temmuz  = kayit({ start_date: '2026-07-21', end_date: '2026-07-28',
                          commission_1: 0, commission_2: 0, commission_3: 0, commission_4: 0 });
  // Haziran kaydi donem disi
  const haziran = kayit({ start_date: '2026-06-09', end_date: '2026-06-16', commission_2: 13.14 });

  esit('en guncel ortusen kayit alinir, en yuksek ARANMAZ',
    yediGunTarifeKomisyonu([eskiKayit, yeniKayit, temmuz, haziran], olcut, 488.17), 16.6);
  esit('donem disi kayit sayilmaz',
    yediGunTarifeKomisyonu([haziran], olcut, 488.17), null);
  esit('sifir komisyon sayilmaz',
    yediGunTarifeKomisyonu([temmuz], { ...olcut, baslangic: '2026-07-21', bitis: '2026-07-28' }, 488.17), null);
  esit('tek kayit', yediGunTarifeKomisyonu([yeniKayit], olcut, 488.17), 16.6);
  esit('fiyat hicbir kademeye girmezse null',
    yediGunTarifeKomisyonu([eskiKayit, yeniKayit], olcut, 0), null);
  esit('kayit yok', yediGunTarifeKomisyonu([], olcut, 488.17), null);
  esit('gecersiz girdi', yediGunTarifeKomisyonu(null, olcut, 100), null);
  esit('barkodsuz', yediGunTarifeKomisyonu([eskiKayit], {}, 100), null);
}

console.log('\n=== 7 GUNLUK: HARITADAKI "7 Gün" ANAHTARI, HESAP YOK ===');
{
  // Sutunlar 4 gunlugu tasiyor (ekranda o acikken kaydedilmis); harita uc
  // pencereyi de biliyor. Yalnizca "7 Gün" okunur; 3/4 gunun en yuksegi
  // ALINMAZ (kullanici karari).
  const k = kayit({
    commission_1: 17.3, commission_2: 16.6, commission_3: 14.9, commission_4: 12.8,
    pencere_komisyonlari: { '3 Gün': [20, 19.3, 17.6, 15.5], '4 Gün': [17.3, 16.6, 14.9, 12.8], '7 Gün': [18, 17, 16, 14] },
  });
  esit('7 Gün anahtari oldugu gibi', yediGunKademeKomisyonlari(k), [18, 17, 16, 14]);
  esit('kademe 2', kademeKomisyonu(k, 460), 17);
  esit('kademe 1', kademeKomisyonu(k, 500), 18);
  esit('kademe 4', kademeKomisyonu(k, 300), 14);
  esit('yediGunTarifeKomisyonu haritayi kullanir',
    yediGunTarifeKomisyonu([k], { barkod: 'KPBŞ1', platform: 'Trendyol', baslangic: '2026-09-01', bitis: '2026-09-07' }, 460), 17);
  esit('anahtar "7 gün" kucuk harfle de olur', yediGunKademeKomisyonlari(kayit({ pencere_komisyonlari: { '7 gün': [1, 2, 3, 4] } })), [1, 2, 3, 4]);
}
{
  // 7 Gün anahtari YOKSA en yuksek uydurulmaz: sutunlar kullanilir
  const k = kayit({
    commission_1: 17.3, commission_2: 16.6, commission_3: 14.9, commission_4: 12.8,
    pencere_komisyonlari: { '3 Gün': [20, 19.3, 17.6, 15.5], '4 Gün': [17.3, 16.6, 14.9, 12.8] },
  });
  esit('7 Gün yoksa sutunlar (en yuksek degil)', yediGunKademeKomisyonlari(k), [17.3, 16.6, 14.9, 12.8]);
  esit('harita yoksa sutunlar', yediGunKademeKomisyonlari(kayit({ commission_1: 21, commission_2: 19, commission_3: 17, commission_4: 15 })), [21, 19, 17, 15]);
  esit('harita bos nesne', yediGunKademeKomisyonlari(kayit({ pencere_komisyonlari: {} })), [20, 19.3, 17.6, 15.5]);
  esit('7 Gün sifirlarla dolu -> sutunlar', yediGunKademeKomisyonlari(kayit({ pencere_komisyonlari: { '7 Gün': [0, 0, 0, 0] } })), [20, 19.3, 17.6, 15.5]);
  esit('bozuk 7 Gün (3 eleman) yok sayilir', yediGunKademeKomisyonlari(kayit({ pencere_komisyonlari: { '7 Gün': [30, 30, 30] } })), [20, 19.3, 17.6, 15.5]);
  esit('metin sayilar', yediGunKademeKomisyonlari(kayit({ pencere_komisyonlari: { '7 Gün': ['22', '20', '18', '16'] } })), [22, 20, 18, 16]);
  esit('kayit yok', yediGunKademeKomisyonlari(null), [0, 0, 0, 0]);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
