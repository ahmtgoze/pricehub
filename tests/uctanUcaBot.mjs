/**
 * Uctan uca bot — sistemi gercek kullanici gibi kullanir.
 *
 * Sayfa botundan (sayfaBotu.mjs) farki: o sayfalari acip "beyaz ekran var mi"
 * diye bakar. Bu bot TIKLAR ve VERI YAZAR: kategori acar, komisyon girer,
 * urun ekler, "Fiyatlari Hesapla"ya basar, cikan fiyati dogrular.
 *
 * NICIN AYRI HESAP: veri yazdigi icin bos bir test kiracisinda calisir
 * (svsetiketplastik+bot@gmail.com). Izolasyon e-posta bazli oldugundan
 * gercek veriye dokunamaz. Once: npm run bot:test:giris
 *
 * KULLANIM
 *   npm run bot:test               → canli sistemde senaryolari kosar
 *   npm run bot:test -- --onizleme → dal onizlemesinde
 *   npm run bot:test -- --gorunur  → pencereyi goster (hata ayiklama)
 *   npm run bot:test -- --temizle  → yalnizca test verisini siler
 *
 * Cikis kodu: basarisiz adim varsa 1.
 */

import { writeFileSync, unlinkSync } from 'node:fs';
import { tarayiciAc, tabanSec, hataMetni, YOKSAY, bekle } from './tarayici.mjs';

const argv  = process.argv.slice(2);
const taban = tabanSec(argv);
const gorunur = argv.includes('--gorunur');

/* ── Test verisi: her kosuda benzersiz, birbirine karismasin ─────────── */
const damga    = new Date().toISOString().slice(5, 16).replace(/[-T:]/g, '');
const KATEGORI = `BOT Kategori ${damga}`;
const URUN     = `BOT Urun ${damga}`;
const SKU      = `BOT-${damga}`;

const sonuclar = [];
const kaydet = (ad, durum, not = '') => {
  sonuclar.push({ ad, durum, not });
  const isaret = { OK: '  ✓', HATA: '  ✗', ATLA: '  –' }[durum];
  console.log(`${isaret} ${ad.padEnd(38)} ${durum.padEnd(5)} ${not}`);
};

/* ── Sayfa yardimcilari ──────────────────────────────────────────────── */

/** Gercek kullanici tiklamasi. Radix pointerdown ile acilir; salt click yetmez. */
const TIKLA_TANIM = `
  window.__botTikla = (el) => {
    if (!el) return false;
    const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse' };
    el.scrollIntoView({ block: 'center' });
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  };
  window.__botYaz = (el, deger) => {
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set;
    setter.call(el, String(deger));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  window.__botBul = (metin) =>
    [...document.querySelectorAll('button, [role="menuitem"], [role="option"], a')]
      .find(b => b.textContent.trim() === metin || b.textContent.trim().startsWith(metin));

  // Modal acikken sayfanin arkasindaki alanlar da eslesiyordu (ornegin sayfa
  // ustundeki arama kutusu). Aramayi modalin icine hapsediyoruz.
  window.__botModal = () => document.querySelector('[role="dialog"]');

  // Alanlarin id'si yok, etiket bagi da yok; ayirt edici tek sey placeholder.
  window.__botAlan = (ph, sira = 0) => {
    const kok = window.__botModal() || document;
    return [...kok.querySelectorAll('input, textarea')]
      .filter(i => (i.placeholder || '') === ph)[sira];
  };

  // Kayit butonu ekleme modalinda "Ekle", duzenlemede "Kaydet".
  window.__botKaydet = () => {
    const kok = window.__botModal() || document;
    return [...kok.querySelectorAll('button')]
      .find(b => ['Ekle', 'Kaydet'].includes(b.textContent.trim()));
  };

  // Onay penceresindeki ONAY butonu. Sayfa arkasinda ayni metinli buton
  // olabiliyor ("Sil (13)" hem arac cubugunda hem onayda) — bu yuzden
  // arama alertdialog/dialog icine hapsedilir, Iptal de elenir.
  window.__botOnay = () => {
    const kok = document.querySelector('[role="alertdialog"]') || window.__botModal();
    if (!kok) return null;
    // Regex KULLANMA: bu blok bir template literal icinde tasiniyor ve
    // orada \b kelime siniri degil BACKSPACE karakteri oluyor. /^Sil\b/
    // bu yuzden hicbir zaman eslesmedi ve bot "buton yok" dedi.
    return [...kok.querySelectorAll('button')]
      .find(b => {
        const t = b.textContent.trim();
        return t === 'Sil' || t.startsWith('Sil (');
      });
  };
  'hazir';
`;

async function sayfayaGit(b, yol, beklenen) {
  b.olaylar.length = 0;
  await b.git(`${taban}${yol}`);
  await bekle(5000);
  await b.calistir(TIKLA_TANIM);
  const durum = await b.calistir(`JSON.stringify({
    adres: location.pathname,
    metin: (document.body.innerText || '')
  })`);
  const d = JSON.parse(durum);
  if (d.adres.toLowerCase() === '/login') {
    throw new Error('Oturum yok — once: npm run bot:test:giris');
  }
  if (beklenen && !d.metin.includes(beklenen)) {
    throw new Error(`"${beklenen}" ekranda yok`);
  }
  return d;
}

/** Sayfada biriken konsol hatalari (gurultu elenmis). */
const hatalar = (b) =>
  b.olaylar.map(hataMetni).filter(Boolean).filter(h => !YOKSAY.some(d => d.test(h)));

/** Kosul saglanana kadar bekle. */
async function bekleKosul(b, ifade, saniye = 12, aciklama = 'kosul') {
  for (let i = 0; i < saniye * 2; i++) {
    if (await b.calistir(ifade)) return true;
    await bekle(500);
  }
  throw new Error(`Zaman asimi: ${aciklama}`);
}

const metinVar = (s) => `(document.body.innerText || '').includes(${JSON.stringify(s)})`;

/**
 * Radix Select'ten deger secer. Baglanti kurulduktan sonra atanir.
 *
 * DIKKAT: sentetik PointerEvent'lerle liste ACILIYOR ama secim OLMUYOR —
 * Radix'in ic mantigi guvenilir (isTrusted) olay bekliyor. Bu yuzden
 * gercekTikla, yani CDP Input uzerinden gercek fare olayi kullaniliyor.
 * Bu fark yuzunden bot bir tur boyunca kategorisiz urun kaydetti.
 */
let sec;

/* ── Baglan ──────────────────────────────────────────────────────────── */
console.log(`\nUctan Uca Bot — ${taban}\n${'─'.repeat(74)}`);
console.log(`  Test verisi: ${KATEGORI} · ${SKU}\n`);

const b = await tarayiciAc({
  profilAdi: 'pricehub-bot-test-profili',
  port: 9335,
  gorunur,
});

sec = async (etiket, deger) => {
  await b.gercekTikla(
    `[...(window.__botModal() || document).querySelectorAll('[role=combobox]')]
       .find(c => c.textContent.includes(${JSON.stringify(etiket)}))`
  );
  await bekle(1000);
  const tiklandi = await b.gercekTikla(
    `[...document.querySelectorAll('[role=option]')]
       .find(o => o.textContent.trim() === ${JSON.stringify(deger)})`
  );
  await bekle(800);
  if (!tiklandi) throw new Error(`secilemedi: ${etiket} -> ${deger}`);
};

/**
 * Test kiracisindaki TUM urunleri toplu siler.
 *
 * Her kosu veri biraktigi icin "3 urun bekleniyordu" gibi dogrulamalar
 * zamanla anlamsizlasiyordu. Bastaki temizlik her koseyi ayni bos noktadan
 * baslatir. Yalnizca test kiracisinda calisir — izolasyon e-posta bazli
 * oldugundan gercek veriye erisemez.
 */
async function testVerisiniTemizle() {
  await sayfayaGit(b, '/Products', 'Ürünler');

  // Bos tabloda da bir satir kaliyor ("kayit yok" satiri). Veri satirini
  // onay kutusundan ayirt ediyoruz; aksi halde "tablo bosaldi mi" kosulu
  // hicbir zaman saglanmiyor ve temizlik zaman asimina ugruyordu.
  const VERI_SATIRI = `document.querySelectorAll('table tbody tr input[type=checkbox]').length`;

  const varMi = await b.calistir(`${VERI_SATIRI} > 0`);
  if (!varMi) return 0;

  await tikla(`document.querySelector('table thead input[type=checkbox]')
            || document.querySelector('table thead button[role=checkbox]')`,
    'tumunu sec kutucugu');
  await bekle(1500);

  const kacTane = await b.calistir(`(() => {
    const m = (document.body.innerText || '').match(/(\\d+)\\s*ürün seçili/);
    return m ? parseInt(m[1], 10) : 0;
  })()`);
  if (!kacTane) return 0;

  await tikla(`[...document.querySelectorAll('button')]
    .find(x => x.offsetParent && /^Sil \\(\\d+\\)$/.test(x.textContent.trim()))`,
    'arac cubugu Sil (n)');
  await bekle(1500);

  await tikla(`window.__botOnay()`, 'onay penceresi Sil');

  // "kac tanesini sectik" silindigi anlamina GELMEZ. Tablonun gercekten
  // bosaldigini dogrula — aksi halde bot silmedigi seyi silindi sanar.
  await bekleKosul(b, `${VERI_SATIRI} === 0`, 40, 'tablo bosalsin');

  // Kategoriler de temizlenir. Onceden yalnizca urunler siliniyordu ve her
  // kosu bir kategori birakiyordu; 24 tane birikip yeni kaydin listede
  // gorunmesini engelledi.
  await eskiKategorileriSil();
  return kacTane;
}

/** Onceki kosulardan kalan "BOT " kategorilerini siler. */
async function eskiKategorileriSil() {
  await sayfayaGit(b, '/Categories', 'Kategoriler');
  for (let tur = 0; tur < 40; tur++) {
    const bulundu = await b.gercekTikla(
      `[...document.querySelectorAll('table tbody tr')]
         .find(tr => tr.innerText.startsWith('BOT '))
         ?.querySelector('.lucide-trash2')?.closest('button')`,
      1,
    );
    if (!bulundu) return tur;          // kalmadi
    await bekle(900);
    if (!(await b.gercekTikla(`window.__botOnay()`, 2))) return tur;
    await bekle(1200);
  }
  return 40;
}

/**
 * Tiklar; bulamazsa HATA VERIR.
 *
 * gercekTikla false donuyor ama donusu yok sayilinca bot sonraki adimda
 * "pencere cikmadi" gibi yaniltici bir yerde patliyordu. Asil sebep bir
 * onceki tiklamanin hic gerceklesmemis olmasiydi.
 */
async function tikla(secici, ad) {
  const oldu = await b.gercekTikla(secici);
  if (!oldu) {
    // Ekranda ne oldugunu hata mesajina koy: yoksa "tiklanamadi" deyip
    // sebebi ayri bir hata ayiklama turu gerektiriyor.
    const goruntu = await b.calistir(`JSON.stringify({
      roller: [...document.querySelectorAll('[role]')]
        .map(e => e.getAttribute('role'))
        .filter((v, i, a) => a.indexOf(v) === i),
      pencere: document.querySelector('[role="alertdialog"], [role="dialog"]')
        ?.innerText?.replace(/\\n+/g, ' / ').slice(0, 160) || 'pencere yok',
      butonlar: [...document.querySelectorAll('[role="alertdialog"] button, [role="dialog"] button')]
        .map(x => x.textContent.trim())
    })`).catch(() => '(okunamadi)');
    throw new Error(`tiklanamadi: ${ad} — ${goruntu}`);
  }
  return true;
}

let kritikHata = false;

try {
  /* ── 1. Oturum ve Dashboard ────────────────────────────────────────── */
  try {
    await sayfayaGit(b, '/Dashboard', 'Dashboard');
    kaydet('Oturum ve Dashboard', 'OK', 'test hesabi acildi');
  } catch (e) {
    kaydet('Oturum ve Dashboard', 'HATA', e.message);
    throw e;   // oturum yoksa devami anlamsiz
  }

  /* ── 1b. Onceki kosulardan kalan test verisini temizle ─────────────── */
  try {
    const silinen = await testVerisiniTemizle();
    kaydet('Eski test verisini temizle', 'OK',
      silinen ? `${silinen} urun silindi` : 'zaten bostu');
  } catch (e) {
    kaydet('Eski test verisini temizle', 'HATA', e.message);
  }

  if (argv.includes('--temizle')) {
    console.log('\n--temizle verildi: yalnizca temizlik yapildi, senaryolar atlandi.\n');
    b.kapat();
    process.exit(0);
  }

  /* ── 2. Kategori olustur ───────────────────────────────────────────── */
  try {
    await sayfayaGit(b, '/Categories', 'Kategoriler');
    await b.gercekTikla(`window.__botBul('Yeni Kategori')`);
    await bekle(1200);

    const yazildi = await b.calistir(`(() => {
      if (!window.__botModal()) return 'modal-acilmadi';
      const ad = window.__botAlan('Kategori adını girin');
      if (!ad) return 'ad-alani-yok';
      window.__botYaz(ad, ${JSON.stringify(KATEGORI)});
      return 'ok';
    })()`);
    if (yazildi !== 'ok') throw new Error(yazildi);

    await b.gercekTikla(`window.__botKaydet()`);
    await bekle(2500);

    // Liste uzunsa yeni kayit ilk sayfada gorunmeyebilir (her kosu bir
    // kategori birakiyor, 23 tane birikmisti). Once ARA, sonra dogrula.
    await b.calistir(`(() => {
      const ara = [...document.querySelectorAll('input')].find(i => (i.placeholder || '').includes('ara'));
      if (ara) window.__botYaz(ara, ${JSON.stringify(KATEGORI)});
      return 'ok';
    })()`);
    await bekleKosul(b, metinVar(KATEGORI), 15, 'kategori listede gorunsun');
    kaydet('Kategori olusturma', 'OK', KATEGORI);
  } catch (e) {
    kaydet('Kategori olusturma', 'HATA', e.message);
    kritikHata = true;
  }

  /* ── 3. Ürün ekle ──────────────────────────────────────────────────── */
  try {
    await sayfayaGit(b, '/Products', 'Ürünler');
    await b.gercekTikla(`window.__botBul('Yeni Ürün')`);
    await bekle(1500);

    // Alanlarin id'si yok; placeholder ile ayirt ediliyor.
    // "0.00" uc kez geciyor: 0=maliyet, 1=baski, 2=ek maliyet.
    const sonuc = await b.calistir(`(() => {
      if (!window.__botModal()) return 'modal-acilmadi';
      const ad   = window.__botAlan('Ürün adını girin');
      const sku  = window.__botAlan('SKU-001');
      const mal  = window.__botAlan('0.00', 0);
      const desi = window.__botAlan('1.0');
      if (!ad || !mal || !desi) return 'zorunlu-alan-bulunamadi';
      window.__botYaz(ad, ${JSON.stringify(URUN)});
      if (sku) window.__botYaz(sku, ${JSON.stringify(SKU)});
      window.__botYaz(mal, '100');
      window.__botYaz(desi, '2');
      return 'ok';
    })()`);
    if (sonuc !== 'ok') throw new Error(sonuc);

    // Kategori zorunlu: secilmezse urun sessizce hic fiyatlanmiyor.
    await sec('Kategori seçin', KATEGORI);

    await b.gercekTikla(`window.__botKaydet()`);
    await bekleKosul(b, metinVar(URUN), 20, 'urun listede gorunsun');
    kaydet('Ürün ekleme (manuel)', 'OK', `${URUN} · 100 ₺ · 2 desi`);
  } catch (e) {
    kaydet('Ürün ekleme (manuel)', 'HATA', e.message);
    kritikHata = true;
  }

  /* ── 4. Komisyon gir ───────────────────────────────────────────────── */
  // Komisyonsuz kategoride urun FIYATLANMAZ. Bu adim atlanirsa bir sonraki
  // adim "0 urun hesaplandi" deyip yesil yanar — sahte basari.
  try {
    await sayfayaGit(b, '/Commissions', 'Komisyon');
    await b.gercekTikla(`window.__botBul('Yeni Komisyon')`);
    await bekle(1500);

    await sec('Platform seçin', 'Trendyol');
    await sec('Kategori seçin', KATEGORI);

    const yazildi = await b.calistir(`(() => {
      const oran   = window.__botAlan('15');   // Komisyon Oranı (%)
      const hedef  = window.__botAlan('30');   // Hedef Kâr Oranı (%)
      if (!oran) return 'oran-alani-yok';
      window.__botYaz(oran, '15');
      if (hedef) window.__botYaz(hedef, '30');
      return 'ok';
    })()`);
    if (yazildi !== 'ok') throw new Error(yazildi);

    await b.gercekTikla(`window.__botKaydet()`);
    await bekle(2500);
    kaydet('Komisyon girme', 'OK', 'Trendyol · %15 komisyon · %30 hedef kâr');
  } catch (e) {
    kaydet('Komisyon girme', 'HATA', e.message);
    kritikHata = true;
  }

  /* ── 5. CSV ile toplu ürün yükleme ─────────────────────────────────── */
  // Dosya alani gizli; isletim sistemi penceresi otomatize edilemez.
  // CDP DOM.setFileInputFiles dosyayi dogrudan alana koyar.
  const CSV_YOLU = '/tmp/pricehub-bot-urunler.csv';
  try {
    await sayfayaGit(b, '/Products', 'Ürünler');
    await b.gonder('DOM.enable');

    // BOM olmadan Excel Turkce karakterleri bozuyor.
    writeFileSync(CSV_YOLU, '\ufeff' + [
      'SKU,Ürün Adı,Maliyet,Desi,Kategori,KDV Oranı',
      `${SKU}-CSV1,${URUN} CSV 1,50,1,${KATEGORI},20`,
      `${SKU}-CSV2,${URUN} CSV 2,75,3,${KATEGORI},20`,
    ].join('\n'), 'utf8');

    const kondu = await b.dosyaSec('input[type=file]', CSV_YOLU);
    if (!kondu) throw new Error('dosya alani bulunamadi');

    await bekleKosul(b, metinVar(`${URUN} CSV 1`), 25, 'CSV urunleri listede gorunsun');
    const ikisiDe = await b.calistir(metinVar(`${URUN} CSV 2`));
    if (!ikisiDe) throw new Error('CSV satirlarindan yalnizca biri aktarildi');

    kaydet('CSV ile toplu yükleme', 'OK', '2 satir aktarildi');
  } catch (e) {
    kaydet('CSV ile toplu yükleme', 'HATA', e.message);
  } finally {
    try { unlinkSync(CSV_YOLU); } catch { /* yoksay */ }
  }

  /* ── 6. Ürün arama / filtre ────────────────────────────────────────── */
  try {
    await sayfayaGit(b, '/Products', 'Ürünler');
    const yazildi = await b.calistir(`(() => {
      const ara = [...document.querySelectorAll('input')]
        .find(i => (i.placeholder || '').includes('ara'));
      if (!ara) return 'arama-kutusu-yok';
      window.__botYaz(ara, ${JSON.stringify(SKU + '-CSV1')});
      return 'ok';
    })()`);
    if (yazildi !== 'ok') throw new Error(yazildi);
    await bekle(2000);

    // Arama daraltmali: yalnizca CSV1 kalmali, CSV2 elenmelidir.
    const durum = await b.calistir(`JSON.stringify({
      csv1: ${metinVar(`${URUN} CSV 1`)},
      csv2: ${metinVar(`${URUN} CSV 2`)}
    })`);
    const { csv1, csv2 } = JSON.parse(durum);
    if (!csv1) throw new Error('aranan urun listede yok');
    if (csv2) throw new Error('arama filtrelemiyor — eslesmeyen urun de listede');
    kaydet('Ürün arama filtresi', 'OK', 'daraltma dogru');
  } catch (e) {
    kaydet('Ürün arama filtresi', 'HATA', e.message);
  }

  /* ── 7. Fiyatları Hesapla ──────────────────────────────────────────── */
  try {
    const d = await sayfayaGit(b, '/Prices', 'Fiyatlar');

    // Bayatlama modali cikarsa kapat
    await b.gercekTikla(`window.__botBul('Sonra')`);
    await bekle(800);

    // DIKKAT: burada 'Hesapla' diye genel arama YAPMA — kenar cubugundaki
    // "Hesaplayıcı" baglantisi da eslesiyor ve bot baska sayfaya gidiyor.
    // Butonun tam metni duyarli tasarim yuzunden "Fiyatları HesaplaHesapla".
    await b.gercekTikla(`window.__botBul('Fiyatları Hesapla')`);

    // Sonuc modalda degil, sayfanin icinde beliriyor.
    await bekleKosul(b,
      `${metinVar('hesaplandı')} || ${metinVar('hesaplanamadı')}`,
      60, 'hesaplama sonucu');

    const ozet = await b.calistir(`(() => {
      const t = document.body.innerText || '';
      const satir = t.split('\\n').find(s => /hesaplan(dı|amadı)/.test(s));
      return (satir || '').trim().slice(0, 90);
    })()`);

    // "0 ürün için hesaplandı" BASARI DEGILDIR. Komisyon ya da kargo tarifesi
    // eksikse motor urunu sessizce atlar; bot bunu yesil gostermemeli.
    const adet = parseInt((ozet.match(/(\d+)\s*ürün/) || [])[1] ?? '0', 10);
    if (!adet) throw new Error(`hic fiyat uretilmedi — ${ozet}`);
    // 1 manuel + 2 CSV urunu bekleniyor. Eksikse bir urun sessizce
    // atlanmis demektir (komisyon yok, kargo tarifesi yok, kategori bos...).
    if (adet < 3) throw new Error(`3 urun bekleniyordu, ${adet} hesaplandi — biri sessizce atlandi`);

    kaydet('Fiyatları Hesapla', 'OK', ozet);
  } catch (e) {
    kaydet('Fiyatları Hesapla', 'HATA', e.message);
    kritikHata = true;
  }

  /* ── 8. Ürün silme ─────────────────────────────────────────────────── */
  // Hem silmenin calistigini dogrular hem de her kosuda biriken test
  // verisini azaltir. Silinecek satir once arama ile tekillestirilir;
  // aksi halde yanlis satirin cop kutusuna basilabilir.
  try {
    await sayfayaGit(b, '/Products', 'Ürünler');
    const hedef = `${URUN} CSV 2`;

    await b.calistir(`(() => {
      const ara = [...document.querySelectorAll('input')].find(i => (i.placeholder || '').includes('ara'));
      if (ara) window.__botYaz(ara, ${JSON.stringify(hedef)});
      return 'ok';
    })()`);
    await bekle(2500);

    await tikla(`document.querySelector('table tbody tr .lucide-trash2')?.closest('button')`,
      'satir cop kutusu');
    await bekle(1500);

    // Onay penceresine hapset: sayfa arkasinda ayni metinli buton var.
    await tikla(`window.__botOnay()`, 'onay penceresi Sil');
    await bekleKosul(b, `!${metinVar(hedef)}`, 20, 'urun listeden kalksin');
    kaydet('Ürün silme', 'OK', 'CSV 2 silindi, liste guncellendi');
  } catch (e) {
    kaydet('Ürün silme', 'HATA', e.message);
  }

  /* ── 9. Promosyon sayfası açılıyor mu ──────────────────────────────── */
  for (const [yol, ad, bek] of [
    ['/campaigns',           'Kampanyalar',          'Kampanyalar'],
    ['/AdvantageProductTag', 'Avantajlı Ürün Etiketi', 'Avantajlı'],
    ['/FlashProducts',       'Flaş Ürünler',         'Flaş Ürünler'],
  ]) {
    try {
      await sayfayaGit(b, yol, bek);
      const h = hatalar(b);
      if (h.length) throw new Error(h[0]);
      kaydet(`Promosyon: ${ad}`, 'OK', 'hatasiz acildi');
    } catch (e) {
      kaydet(`Promosyon: ${ad}`, 'HATA', e.message);
    }
  }

} catch (e) {
  if (!sonuclar.length) kaydet('Baslangic', 'HATA', e.message);
} finally {
  b.kapat();
}

/* ── Rapor ───────────────────────────────────────────────────────────── */
const bozuk = sonuclar.filter(r => r.durum === 'HATA');
console.log('─'.repeat(74));
console.log(`Toplam ${sonuclar.length} adim · ${sonuclar.filter(r => r.durum === 'OK').length} basarili · ${bozuk.length} BOZUK`);

if (bozuk.length) {
  console.log('\nDUZELTILMESI GEREKENLER');
  for (const r of bozuk) console.log(`  • ${r.ad}\n    ${r.not}`);
}
console.log(`\nTest verisi test hesabinda kaldi: ${KATEGORI} · ${SKU}`);
console.log('Gercek veri hesabina dokunulmadi (izolasyon e-posta bazli).\n');

process.exit(bozuk.length || kritikHata ? 1 : 0);
