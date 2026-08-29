/**
 * Sayfa Botu — her sayfayı gerçek kullanıcı gibi açıp çalışıp çalışmadığını
 * raporlar.
 *
 * NİÇİN VAR: Bu projede sayfalar birkaç kez "beyaz ekran" olarak bozuldu
 * (tanımsız değişken, kapsam hatası, TDZ). `npm run build` bunların HİÇBİRİNİ
 * yakalamıyor — çünkü hepsi çalışma anında patlıyor. Bot tam olarak bunu
 * yakalar: sayfayı açar, konsolu dinler, ekranda içerik oluşmuş mu bakar.
 *
 * KULLANIM
 *   npm run bot:giris     → Chrome'u görünür açar; bir kez giriş yaparsın.
 *                           Oturum profile kaydedilir, sonraki çalışmalar
 *                           giriş istemez.
 *   npm run bot           → Tüm sayfaları sırayla test eder, rapor basar.
 *   npm run bot -- --yerel → Önizleme yerine http://localhost:5173 test eder.
 *
 * Çıkış kodu: hata varsa 1 (CI/otomasyon için).
 */

import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { setTimeout as bekle } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFIL = '/tmp/pricehub-bot-profili';
const PORT = 9333;

const ONIZLEME = 'https://pricehub-git-tema-apple-v2-ahmet-s-projects7.vercel.app';
const YEREL = 'http://localhost:5173';

/** Test edilecek sayfalar. Yeni sayfa eklenince buraya da eklenir. */
const SAYFALAR = [
  { yol: '/Dashboard',                   ad: 'Dashboard',                    beklenen: 'Dashboard' },
  { yol: '/Platforms',                   ad: 'Platformlar',                  beklenen: 'Platformlar' },
  { yol: '/Categories',                  ad: 'Kategoriler',                  beklenen: 'Kategoriler' },
  { yol: '/Commissions',                 ad: 'Komisyonlar',                  beklenen: 'Komisyon' },
  { yol: '/Products',                    ad: 'Ürünler',                      beklenen: 'Ürünler' },
  { yol: '/ShippingRates',               ad: 'Kargo Tarifeleri',             beklenen: 'Kargo Tarifeleri' },
  { yol: '/PackageManagement',           ad: 'Paketleme',                    beklenen: 'Paketleme' },
  { yol: '/Prices',                      ad: 'Fiyatlar',                     beklenen: 'Fiyatlar' },
  { yol: '/Calculator',                  ad: 'Hesaplayıcı',                  beklenen: 'Hesaplayıcı' },
  { yol: '/UpdateReports',               ad: 'Güncelleme Raporları',         beklenen: 'Güncelleme Raporları' },
  { yol: '/MarketplaceProducts',         ad: 'Pazaryeri Ürünleri',           beklenen: 'Pazaryeri Ürünleri' },
  { yol: '/UpdatedPrices',               ad: 'Düzenlenen Fiyatlar',          beklenen: 'Düzenlenen Fiyatlar' },
  { yol: '/campaigns',                   ad: 'Kampanyalar',                  beklenen: 'Kampanyalar' },
  { yol: '/TrendyolPriceRange',          ad: 'Komisyon Tarifesi',            beklenen: 'Tarife' },
  { yol: '/PlusProductCommissionTariff', ad: 'Plus Tarifesi',                beklenen: 'Plus' },
  { yol: '/AdvantageProductTag',         ad: 'Avantajlı Ürün Etiketi',       beklenen: 'Avantajlı' },
  { yol: '/FlashProducts',               ad: 'Flaş Ürünler',                 beklenen: 'Flaş Ürünler' },
  { yol: '/HBAdvantageOffers',           ad: 'HB Avantajlı Teklifler',       beklenen: 'Avantajlı' },
  { yol: '/HBBasketCampaigns',           ad: 'HB Sepet Kampanyaları',        beklenen: 'Sepet' },
  { yol: '/HBOwnCampaign',               ad: 'HB Kendi Kampanyan',           beklenen: 'Kampanya' },
  { yol: '/Help',                        ad: 'Kullanım Kılavuzu',            beklenen: 'Kullanım Kılavuzu' },
  { yol: '/Settings',                    ad: 'Genel Ayarlar',                beklenen: 'Genel Ayarlar' },
  { yol: '/ViewCustomize',               ad: 'Görünümü Özelleştir',          beklenen: 'Görünümü Özelleştir' },
  { yol: '/landing',                     ad: 'Tanıtım Sayfası',              beklenen: 'PriceHub', girissiz: true },
];

const argv = process.argv.slice(2);
const girisModu = argv.includes('--giris');
const taban = argv.includes('--yerel') ? YEREL : ONIZLEME;

/* ── Chrome başlat ───────────────────────────────────────────────────── */
if (!existsSync(PROFIL)) mkdirSync(PROFIL, { recursive: true });

const chromeArgs = [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFIL}`,
  '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling',
];
if (!girisModu) chromeArgs.push('--headless=new', '--window-size=1440,900');

const chrome = spawn(CHROME, chromeArgs, { stdio: 'ignore', detached: false });
process.on('exit', () => { try { chrome.kill(); } catch { /* yoksay */ } });

/* ── CDP bağlantısı ──────────────────────────────────────────────────── */
async function hedefBul() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const liste = await r.json();
      const sayfa = liste.find((t) => t.type === 'page');
      if (sayfa?.webSocketDebuggerUrl) return sayfa.webSocketDebuggerUrl;
    } catch { /* henuz acilmadi */ }
    await bekle(250);
  }
  throw new Error('Chrome hata ayıklama portuna bağlanılamadı');
}

class Baglanti {
  constructor(ws) { this.ws = ws; this.id = 0; this.bekleyen = new Map(); this.olaylar = []; }
  static async ac(url) {
    const ws = new WebSocket(url);
    await new Promise((c, r) => { ws.onopen = c; ws.onerror = () => r(new Error('WS acilamadi')); });
    const b = new Baglanti(ws);
    ws.onmessage = (m) => {
      const v = JSON.parse(m.data);
      if (v.id && b.bekleyen.has(v.id)) { b.bekleyen.get(v.id)(v); b.bekleyen.delete(v.id); }
      else if (v.method) b.olaylar.push(v);
    };
    return b;
  }
  gonder(method, params = {}) {
    const id = ++this.id;
    return new Promise((c) => { this.bekleyen.set(id, c); this.ws.send(JSON.stringify({ id, method, params })); });
  }
}

/* ── Yardımcılar ─────────────────────────────────────────────────────── */
const hataMetni = (o) => {
  if (o.method === 'Runtime.exceptionThrown') {
    const d = o.params?.exceptionDetails;
    return d?.exception?.description?.split('\n')[0] || d?.text || 'Bilinmeyen istisna';
  }
  if (o.method === 'Runtime.consoleAPICalled' && o.params?.type === 'error') {
    return (o.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').split('\n')[0];
  }
  return null;
};

// Gurultuyu ele: uygulamanin kendi hatasi olmayanlar
const YOKSAY = [/favicon/i, /net::ERR_/i, /Failed to load resource/i, /ResizeObserver/i];

async function sayfaTest(b, url, beklenen) {
  b.olaylar.length = 0;
  await b.gonder('Page.navigate', { url });
  await bekle(4500);                       // ilk cizim + veri cekme

  const hatalar = b.olaylar.map(hataMetni)
    .filter(Boolean)
    .filter((h) => !YOKSAY.some((d) => d.test(h)));

  const { result } = await b.gonder('Runtime.evaluate', {
    expression: `JSON.stringify({
      metin: (document.body.innerText || '').trim().length,
      baslik: (document.body.innerText || '').slice(0, 400),
      adres: location.pathname
    })`,
    returnByValue: true,
  });
  const durum = JSON.parse(result.result.value);

  if (durum.adres.toLowerCase() === '/login') return { sonuc: 'GIRIS', not: 'Oturum yok — once: npm run bot:giris' };
  if (hatalar.length) return { sonuc: 'HATA', not: hatalar[0] };
  if (durum.metin < 40) return { sonuc: 'BOS', not: `Ekranda icerik yok (${durum.metin} karakter) — beyaz sayfa` };
  if (beklenen && !durum.baslik.includes(beklenen)) {
    return { sonuc: 'SUPHE', not: `"${beklenen}" ekranda gorulmedi` };
  }
  return { sonuc: 'OK', not: `${durum.metin} karakter icerik` };
}

/* ── Ana akış ────────────────────────────────────────────────────────── */
const wsUrl = await hedefBul();
const b = await Baglanti.ac(wsUrl);
await b.gonder('Runtime.enable');
await b.gonder('Page.enable');
await b.gonder('Log.enable');

if (girisModu) {
  await b.gonder('Page.navigate', { url: `${taban}/login` });
  console.log(`\nChrome acildi. ${taban} adresinde giris yap.`);
  console.log('Giris bitince Ctrl+C ile cikabilirsin; oturum profile kaydedilir.');
  console.log('Pencere 45 dakika acik kalir.');
  console.log('Oturum kaydedildi; sonra "npm run bot" calistir.\n');
  await bekle(1000 * 60 * 45);   // pencere 45 dk acik kalir
  process.exit(0);
}

console.log(`\nSayfa Botu — ${taban}\n${'─'.repeat(74)}`);
const sonuclar = [];
for (const s of SAYFALAR) {
  const r = await sayfaTest(b, `${taban}${s.yol}`, s.beklenen);
  sonuclar.push({ ...s, ...r });
  const isaret = { OK: '  ✓', HATA: '  ✗', BOS: '  ✗', SUPHE: '  ?', GIRIS: '  !' }[r.sonuc];
  console.log(`${isaret} ${s.ad.padEnd(28)} ${r.sonuc.padEnd(6)} ${r.not}`);
}

const bozuk = sonuclar.filter((r) => r.sonuc === 'HATA' || r.sonuc === 'BOS');
const supheli = sonuclar.filter((r) => r.sonuc === 'SUPHE');
const girissiz = sonuclar.filter((r) => r.sonuc === 'GIRIS');

console.log('─'.repeat(74));
console.log(`Toplam ${sonuclar.length} sayfa · ${sonuclar.filter(r=>r.sonuc==='OK').length} calisiyor · ${bozuk.length} BOZUK · ${supheli.length} supheli`);

if (girissiz.length) {
  console.log(`\n!! ${girissiz.length} sayfa giris istedi. Once: npm run bot:giris`);
}
if (bozuk.length) {
  console.log('\nDUZELTILMESI GEREKENLER');
  for (const r of bozuk) console.log(`  • ${r.ad} (${r.yol})\n    ${r.not}`);
}
console.log('');
chrome.kill();
process.exit(bozuk.length ? 1 : 0);
