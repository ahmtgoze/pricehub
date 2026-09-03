/**
 * Trendyol tarife dosyasinda URUN BASINA zaman penceresi secimi.
 *
 * Dosyada iki pencere var (ornek: 3 Gun = 1-4 Eylul, 4 Gun = 4-8 Eylul).
 * ONEMLI YAPI: fiyat limitleri (1./2./3./4. Fiyat Alt/Ust) IKI PENCEREDE
 * ORTAK; yalnizca KOMISYONLAR farkli. Yani ayni fiyat, pencereye gore
 * farkli komisyon ve farkli kar demek. 4 gunluk pencere tipik olarak
 * 2-3 puan daha ucuz komisyon veriyor.
 *
 * Dosyanin "Tarife Secimi" sutunu SATIR BAZLI oldugu icin bir urun 3 gunluk,
 * baska bir urun 4 gunluk pencereye yazilabilir ve hepsi TEK dosyada
 * indirilebilir. Sayfa onceden tum sayfa icin tek pencere okuyordu; ikinci
 * pencereye gecmek icin Excel'i yeniden yuklemek gerekiyordu ve iki pencere
 * ayni dosyada birlestirilemiyordu.
 *
 * Burasi her satir icin TUM pencerelerin komisyonlarini saklar ve secilen
 * pencerenin komisyonlarini urune uygular.
 *
 * Yalnizca saf lib import eder — duz node ile test edilebilir.
 */

import { pencereKomisyonlari } from './trendyolTarifePenceresi.js';

/** Komisyonu okunamayan pencere icin donen deger. */
const BOS = [0, 0, 0, 0];

/**
 * Bir Excel satirindaki TUM pencerelerin komisyonlarini haritalar.
 *
 * @param satir     sheet_to_json satiri
 * @param pencereler pencereleriBul(...) ciktisi
 * @returns { '3 Gün': [k1,k2,k3,k4], '4 Gün': [...] }
 */
export function komisyonHaritasi(satir, pencereler) {
  if (!satir || !Array.isArray(pencereler)) return {};
  const harita = {};
  for (const p of pencereler) {
    if (!p || !p.ad) continue;
    harita[p.ad] = pencereKomisyonlari(satir, p.sonek);
  }
  return harita;
}

/** Haritadan bir pencerenin komisyonlarini alir; yoksa [0,0,0,0]. */
export function pencereKomisyonlariniAl(harita, pencereAdi) {
  const k = harita?.[pencereAdi];
  return Array.isArray(k) && k.length === 4 ? k : [...BOS];
}

/**
 * Urunun istenen pencereye ait komisyonlari var mi?
 *
 * Bu alan eklenmeden ONCE kaydedilmis kayitlarda harita bostur. O kayitlarda
 * pencere degistirmek komisyonlari SIFIRLARDI ve fiyatlar/karlar bozuk
 * gorunurdu; degisiklik yapmamak dogrusu.
 */
export function pencereDegistirilebilir(urun, pencereAdi) {
  const k = urun?.pencere_komisyonlari?.[pencereAdi];
  return Array.isArray(k) && k.length === 4 && k.some((x) => x > 0);
}

/**
 * Secilen pencerenin komisyonlarini urune uygular.
 *
 * FIYAT SECIMI KORUNUR: limitler iki pencerede ayni oldugu icin secili
 * kademe gecerliligini yitirmez; yalnizca komisyon — dolayisiyla kar —
 * degisir. Secimi silmek kullaniciyi bos yere yeniden secmeye zorlardi.
 *
 * Komisyonlar okunamiyorsa urun OLDUGU GIBI birakilir; sifirlanmis komisyon
 * sessizce yanlis kar hesaplatir.
 */
export function pencereUygula(urun, pencereAdi) {
  if (!urun || !pencereAdi) return urun;
  if (!pencereDegistirilebilir(urun, pencereAdi)) return urun;
  const k = pencereKomisyonlariniAl(urun.pencere_komisyonlari, pencereAdi);
  return {
    ...urun,
    tarife_penceresi: pencereAdi,
    commission_1: k[0],
    commission_2: k[1],
    commission_3: k[2],
    commission_4: k[3],
  };
}

/** Bir urunun secebilecegi pencere adlari. */
export function pencereAdlari(urun) {
  const h = urun?.pencere_komisyonlari;
  return h && typeof h === 'object' ? Object.keys(h) : [];
}

/**
 * Bir kademede pencereler arasindaki komisyon farki.
 * Kullaniciya "4 gunluk 2,7 puan daha ucuz" diye gostermek icin.
 *
 * @returns [{ ad, komisyon }] — kademe komisyonuna gore ARTAN sirali
 */
export function kademeKarsilastir(urun, kademeNo) {
  const sira = Number(kademeNo);
  if (!urun || !(sira >= 1 && sira <= 4)) return [];
  return pencereAdlari(urun)
    .map((ad) => ({ ad, komisyon: pencereKomisyonlariniAl(urun.pencere_komisyonlari, ad)[sira - 1] }))
    .filter((x) => x.komisyon > 0)
    .sort((a, b) => a.komisyon - b.komisyon);
}

/* ------------------------------------------------------------------ *
 * HER TARIFENIN KENDI SECIMI
 *
 * Kullanici 3 gunluk tarifede secim yapiyor, 4 gunluge gecince SIFIRDAN
 * seciyor. Secimler pencere basina ayri tutulur; ayni urun hem 3 gunlukte
 * hem 4 gunlukte secilebilir. Cikti TEK DOSYADIR (kullanici karari, 3 Eylul
 * 2026): urun basina tek satir oldugu icin iki pencerenin secimi
 * tekSatirSecimi ile tek satira indirgenir (bkz. asagida).
 *
 * Secimler urunun uzerinde pencere adina gore saklanir:
 *   secimler: { '3 Gün': { kademe: 'range_2', fiyat: 488.17 },
 *               '4 Gün': { kademe: 'range_3', fiyat: 441.75 } }
 *
 * Ekranda calisan kod tek bir secimle ugrassin diye, acik olan pencerenin
 * secimi ayrica selected_range / selected_price alanlarinda tutulur.
 *
 * ALAN ADI SAYFAYA GORE DEGISIR: Komisyon Tarifesi "selected_range",
 * Plus tarifesi "selected_type" kullaniyor. Bu yuzden fonksiyonlar alan
 * adini parametre aliyor.
 * ------------------------------------------------------------------ */

const BOS_SECIM = { kademe: 'none', fiyat: 0, manuel: 0 };

/**
 * Urunun verilen tarifedeki secimi.
 *
 * MANUEL FIYAT da pencereye aittir. Onceden manual_price pencereden bagimsiz
 * tutuluyordu; 3 gunlukte girilen manuel fiyat 4 gunluk gorunumde "zaten
 * secili/manuel" sayilip Akilli Sec'in o urunu atlamasina yol aciyordu.
 */
export function secimiOku(urun, pencereAdi) {
  const s = urun?.secimler?.[pencereAdi];
  if (!s) return { ...BOS_SECIM };
  const manuel = Number(s.manuel) || 0;
  if (!s.kademe || s.kademe === 'none') return { ...BOS_SECIM, manuel };
  return { kademe: s.kademe, fiyat: Number(s.fiyat) || 0, manuel };
}

/** Urun bu tarifede secili mi? (manuel fiyat da secim sayilir) */
export function secimVarMi(urun, pencereAdi) {
  const s = secimiOku(urun, pencereAdi);
  return s.kademe !== 'none' || s.manuel > 0;
}

/** Urunun secili oldugu tarifelerin adlari. */
export function seciliPencereler(urun) {
  const h = urun?.secimler;
  if (!h || typeof h !== 'object') return [];
  return Object.keys(h).filter((ad) => secimVarMi(urun, ad));
}

/**
 * Ekrandaki secimi (selected_range/selected_price) verilen tarifenin
 * kutusuna yazar. Pencere degistirmeden ONCE cagrilir.
 */
export function acikSecimiSakla(urun, pencereAdi, alan = 'selected_range') {
  if (!urun || !pencereAdi) return urun;
  const kademe = urun[alan] || 'none';
  const manuel = Number(urun.manual_price) || 0;
  const secimler = { ...(urun.secimler || {}) };
  if (kademe === 'none' && manuel <= 0) delete secimler[pencereAdi];
  else secimler[pencereAdi] = { kademe, fiyat: Number(urun.selected_price) || 0, manuel };
  return { ...urun, secimler };
}

/**
 * Verilen tarifenin secimini ekrana getirir. Secimi yoksa SIFIRDAN baslar —
 * diger tarifede secili olmasi burayi etkilemez.
 */
export function secimiEkranaAl(urun, pencereAdi, alan = 'selected_range') {
  if (!urun) return urun;
  const s = secimiOku(urun, pencereAdi);
  return {
    ...urun,
    [alan]: s.kademe,
    selected_price: s.fiyat,
    manual_price: s.manuel,
    secim_penceresi: pencereAdi || null,
  };
}

/** Once acik secimi saklar, sonra yeni tarifenin secimini ekrana alir. */
export function pencereyeGec(urun, eskiPencere, yeniPencere, alan = 'selected_range') {
  if (!urun) return urun;
  return secimiEkranaAl(acikSecimiSakla(urun, eskiPencere, alan), yeniPencere, alan);
}

/**
 * Tarife basina kac urun secili?
 * Acik olan tarifenin secimi henuz kutusuna yazilmamis olabilir; bu yuzden
 * disaridan verilir.
 * @returns { '3 Gün': 11, '4 Gün': 2, toplam: 13 }
 */
export function secimOzeti(urunler, acikPencere, alan = 'selected_range') {
  const ozet = { toplam: 0 };
  if (!Array.isArray(urunler)) return ozet;
  for (const u of urunler) {
    const guncel = acikPencere ? acikSecimiSakla(u, acikPencere, alan) : u;
    for (const ad of seciliPencereler(guncel)) {
      ozet[ad] = (ozet[ad] || 0) + 1;
      ozet.toplam++;
    }
  }
  return ozet;
}

/* ------------------------------------------------------------------ *
 * BIRLESIK PENCERE ("7 Günlük Fiyat")
 *
 * Dosyanin "Hesaplanan Komisyon" formulleri sunu soyluyor:
 *   AC (3 Gün) -> "3 Günlük" VEYA "7 Günlük" secilirse hesaplar
 *   AD (4 Gün) -> "4 Günlük" VEYA "7 Günlük" secilirse hesaplar
 *
 * Yani "7 Günlük Fiyat" = HER IKI PENCERE BIRDEN. Tek fiyat konur; 1-4
 * Eylul'de 3 gunlugun, 4-8 Eylul'de 4 gunlugun komisyonu isler. 3+4=7.
 *
 * Komisyonu KADEME BAZINDA EN YUKSEK olan alinir. Hafta boyunca iki oran da
 * isleyecegi icin dusuk olani gostermek kari oldugundan yuksek gosterir.
 * Gercek dosyada 3 gunluk hicbir kademede 4 gunlugun altina dusmuyor
 * (66 kademede yuksek, 22 kademede esit), yani pratikte 3 gunlugun orani.
 * ------------------------------------------------------------------ */

/** Pencere adindaki gun sayisi: "3 Gün" -> 3, bulunamazsa null. */
export function pencereGunu(ad) {
  const m = String(ad ?? '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Pencerelerin tamamini kapsayan birlesik pencereyi uretir.
 * Yalnizca gun sayilari toplami Trendyol'un kabul ettigi bir secenege
 * denk geliyorsa (3+4=7) uretilir; yoksa null.
 *
 * @param pencereler pencereleriBul ciktisi
 * @returns { ad, gun } veya null
 */
export function birlesikPencere(pencereler) {
  if (!Array.isArray(pencereler) || pencereler.length < 2) return null;
  const gunler = pencereler.map((p) => pencereGunu(p?.ad));
  if (gunler.some((g) => g === null)) return null;
  const toplam = gunler.reduce((a, b) => a + b, 0);
  // Trendyol'un acilir listesinde yalnizca 3 / 4 / 7 Günlük Fiyat var
  if (![7].includes(toplam)) return null;
  return { ad: `${toplam} Gün`, gun: toplam };
}

/**
 * Komisyon haritasina birlesik pencereyi ekler.
 * Kademe bazinda EN YUKSEK oran alinir (en kotu durum).
 */
export function birlesikPencereEkle(harita, pencereler) {
  const b = birlesikPencere(pencereler);
  if (!b || !harita) return harita;
  const adlar = pencereler.map((p) => p.ad).filter((ad) => Array.isArray(harita[ad]));
  if (adlar.length < 2) return harita;
  const enYuksek = [0, 1, 2, 3].map((i) =>
    Math.max(...adlar.map((ad) => Number(harita[ad][i]) || 0))
  );
  return { ...harita, [b.ad]: enYuksek };
}

/* ------------------------------------------------------------------ *
 * TEK DOSYA (kullanici karari, 3 Eylul 2026)
 *
 * "3 ve 4'u ayri ayri seciyoruz ama ayni Excel'e isliyoruz artik."
 * Trendyol'un dosyasinda urun basina TEK satir, tek fiyat ve tek
 * "Tarife Seçimi" var. Dosyanin kendi formulu "7 Günlük Fiyat" secilince
 * hem 3 gunluk hem 4 gunluk komisyonu hesapliyor; yani 7 Günlük = iki
 * pencere birden. Buna gore:
 *
 *   yalniz 3 Gün secili                 -> "3 Günlük Fiyat", o fiyat
 *   yalniz 4 Gün secili                 -> "4 Günlük Fiyat", o fiyat
 *   ikisi de secili, fiyatlar AYNI      -> "7 Günlük Fiyat", o fiyat
 *   ikisi de secili, fiyatlar FARKLI    -> CATISMA: satir bos birakilir,
 *                                          kullaniciya soylenir
 * ------------------------------------------------------------------ */

const ayniFiyat = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

/**
 * Urunun pencere secimlerini tek satira indirger.
 *
 * @param urun        secimler haritasi olan urun
 * @param pencereler  dosyadaki pencere adlari, orn. ['3 Gün', '4 Gün']
 * @returns { pencere, fiyat, catisma }
 *   pencere  '3 Gün' | '4 Gün' | '7 Gün' | null (secim yok ya da catisma)
 *   fiyat    yazilacak fiyat (secim yoksa 0)
 *   catisma  null, ya da { '3 Gün': 488.17, '4 Gün': 441.75 } gibi fiyatlar
 */
export function tekSatirSecimi(urun, pencereler) {
  const adlar = Array.isArray(pencereler) ? pencereler.filter(Boolean) : [];
  const seciliOlanlar = adlar
    .map((ad) => ({ ad, ...secimiOku(urun, ad) }))
    .filter((s) => s.kademe !== 'none' && s.fiyat > 0);

  if (seciliOlanlar.length === 0) return { pencere: null, fiyat: 0, catisma: null };
  if (seciliOlanlar.length === 1) {
    return { pencere: seciliOlanlar[0].ad, fiyat: seciliOlanlar[0].fiyat, catisma: null };
  }

  const ilk = seciliOlanlar[0].fiyat;
  if (seciliOlanlar.every((s) => ayniFiyat(s.fiyat, ilk))) {
    const birlesik = birlesikPencere(seciliOlanlar.map((s) => ({ ad: s.ad })));
    // 3+4 disinda bir bilesim (Trendyol'un listesinde yok): ilk pencere
    return { pencere: birlesik ? birlesik.ad : seciliOlanlar[0].ad, fiyat: ilk, catisma: null };
  }

  const catisma = {};
  for (const s of seciliOlanlar) catisma[s.ad] = s.fiyat;
  return { pencere: null, fiyat: 0, catisma };
}

/**
 * Tek dosyaya yazilacak satirlarin ozeti: pencere basina adet ve catisan
 * urunler. Butonun yanindaki sayi ve indirmeden onceki uyari icin.
 * @returns { '3 Gün': 5, '4 Gün': 2, '7 Gün': 3, toplam: 10, catisanlar: [barkod...] }
 */
export function tekDosyaOzeti(urunler, pencereler) {
  const ozet = { toplam: 0, catisanlar: [] };
  for (const u of urunler || []) {
    const s = tekSatirSecimi(u, pencereler);
    if (s.catisma) { ozet.catisanlar.push(u?.barcode ?? ''); continue; }
    if (!s.pencere) continue;
    ozet[s.pencere] = (ozet[s.pencere] || 0) + 1;
    ozet.toplam++;
  }
  return ozet;
}
