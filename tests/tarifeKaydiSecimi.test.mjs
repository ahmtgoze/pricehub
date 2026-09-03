import { tarifeKaydiSec, kademeKomisyonu, tarihlerOrtusuyorMu, enYuksekTarifeKomisyonu } from '../src/lib/tarifeKaydiSecimi.js';

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

console.log('\n=== EN YUKSEK KOMISYON (gercek KPBŞ1 kayitlari) ===');
{
  const olcut = { barkod: 'KPBŞ1', platform: 'Trendyol', baslangic: '2026-09-01', bitis: '2026-09-07' };
  const ucGun   = kayit({ start_date: '2026-09-01', end_date: '2026-09-08', commission_2: 19.3 });
  const dortGun = kayit({ start_date: '2026-09-01', end_date: '2026-09-07', commission_2: 16.6 });
  // Temmuz kaydinda komisyonlar 0 — hesaba katilmamali
  const temmuz  = kayit({ start_date: '2026-07-21', end_date: '2026-07-28',
                          commission_1: 0, commission_2: 0, commission_3: 0, commission_4: 0 });
  // Haziran kaydi donem disi
  const haziran = kayit({ start_date: '2026-06-09', end_date: '2026-06-16', commission_2: 13.14 });

  esit('en kotu durum alinir',
    enYuksekTarifeKomisyonu([dortGun, ucGun, temmuz, haziran], olcut, 488.17), 19.3);
  esit('donem disi kayit sayilmaz',
    enYuksekTarifeKomisyonu([haziran], olcut, 488.17), null);
  esit('sifir komisyon sayilmaz',
    enYuksekTarifeKomisyonu([temmuz], { ...olcut, baslangic: '2026-07-21', bitis: '2026-07-28' }, 488.17), null);
  esit('tek pencere', enYuksekTarifeKomisyonu([dortGun], olcut, 488.17), 16.6);
  esit('fiyat hicbir kademeye girmezse null',
    enYuksekTarifeKomisyonu([ucGun, dortGun], olcut, 0), null);
  esit('kayit yok', enYuksekTarifeKomisyonu([], olcut, 488.17), null);
  esit('gecersiz girdi', enYuksekTarifeKomisyonu(null, olcut, 100), null);
  esit('barkodsuz', enYuksekTarifeKomisyonu([ucGun], {}, 100), null);
}

console.log(`\nGECEN: ${gecen}   KALAN: ${kalan}`);
process.exit(kalan ? 1 : 0);
