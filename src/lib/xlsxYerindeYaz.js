/**
 * Bir XLSX sayfasinin XML'ini YERINDE degistirir.
 *
 * NEDEN: Dosyayi SheetJS ile yeniden yazdigimizda Trendyol
 * "Yüklenen excel formatı hatalıdır" deyip hic islemiyordu. Sebebi sutunlar
 * degil, HUCRE BICIMIYDI:
 *
 *   Trendyol'un dosyasi : <c r="A1" s="2" t="inlineStr"><is><t>BARKOD</t></is></c>
 *   SheetJS'in yazdigi  : <c r="A1" t="str"><v>BARKOD</v></c>
 *
 * OOXML'de t="str" FORMUL SONUCU demektir, duz metin degil. Okuyucu (Java
 * tarafinda POI) bu hucreleri formul sanip bos gorur; sonuc raporunda BARKOD
 * sutununun bos gelmesi de bununla birebir uyusuyor. Ayrica yeniden yazim
 * sharedStrings, dataValidation (24 kural) ve <cols> tanimlarini da
 * dusuruyordu.
 *
 * Bu yuzden dosyayi YENIDEN URETMIYORUZ. Yuklenen dosyanin XML'i alinip
 * yalnizca ilgili hucreler degistiriliyor; geri kalan her sey — stiller,
 * dogrulama listeleri, formuller, kimlik sutunlari — oldugu gibi kaliyor.
 *
 * Import icermez — duz node ile test edilebilir.
 */

/** "AB" -> 28 (1 tabanli sutun numarasi) */
export function sutunNo(harfler) {
  let n = 0;
  for (const h of String(harfler || '').toUpperCase()) {
    const k = h.charCodeAt(0) - 64;
    if (k < 1 || k > 26) return 0;
    n = n * 26 + k;
  }
  return n;
}

/** 28 -> "AB" */
export function sutunHarfi(no) {
  let n = Number(no) || 0, s = '';
  while (n > 0) { const k = (n - 1) % 26; s = String.fromCharCode(65 + k) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** "AB4" -> { sutun: 28, satir: 4 } */
export function adresiCoz(adres) {
  const m = String(adres || '').match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return null;
  return { sutun: sutunNo(m[1]), satir: Number(m[2]) };
}

/** XML'de ozel karakterler kacirilir. */
export function xmlKacir(metin) {
  return String(metin ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Bir satirin XML'ini bulur. Bos satir <row .../> seklinde kapali olabilir. */
function satiriBul(xml, satirNo) {
  const acilis = new RegExp(`<row[^>]*\\sr="${satirNo}"[^>]*?(/?)>`);
  const m = acilis.exec(xml);
  if (!m) return null;
  if (m[1] === '/') return { bas: m.index, son: m.index + m[0].length, ic: '', kapali: true, acilisEtiketi: m[0] };
  const kapanis = xml.indexOf('</row>', m.index);
  if (kapanis === -1) return null;
  return {
    bas: m.index, son: kapanis + 6,
    icBas: m.index + m[0].length, icSon: kapanis,
    ic: xml.slice(m.index + m[0].length, kapanis),
    kapali: false, acilisEtiketi: m[0],
  };
}

/** Satir icinde bir hucreyi bulur. */
function hucreyiBul(satirIci, adres) {
  const re = new RegExp(`<c[^>]*\\sr="${adres}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`);
  const m = re.exec(satirIci);
  return m ? { bas: m.index, son: m.index + m[0].length, metin: m[0] } : null;
}

/** Var olan hucrenin stil numarasini (s="12") korumak icin okur. */
function stiliOku(hucreMetni) {
  const m = /\ss="(\d+)"/.exec(hucreMetni || '');
  return m ? ` s="${m[1]}"` : '';
}

/**
 * Tek bir hucreyi yazar veya siler.
 *
 * @param xml    sheet XML'i
 * @param adres  "AB4"
 * @param deger  sayi veya metin; null/undefined ise hucre SILINIR
 * @param tip    'n' (sayi) | 's' (metin, inlineStr olarak yazilir)
 */
export function hucreYaz(xml, adres, deger, tip = 's') {
  const coz = adresiCoz(adres);
  if (!coz) return xml;
  const satir = satiriBul(xml, coz.satir);
  if (!satir) return xml;                    // satir yoksa dokunma
  const mevcut = satir.kapali ? null : hucreyiBul(satir.ic, adres);
  const siliniyor = deger === null || deger === undefined || deger === '';

  if (siliniyor) {
    if (!mevcut) return xml;
    const yeniIc = satir.ic.slice(0, mevcut.bas) + satir.ic.slice(mevcut.son);
    return xml.slice(0, satir.icBas) + yeniIc + xml.slice(satir.icSon);
  }

  const stil = stiliOku(mevcut?.metin);
  const yeniHucre = tip === 'n'
    ? `<c r="${adres}"${stil}><v>${Number(deger)}</v></c>`
    // Trendyol'un dosyasindaki bicimin AYNISI: t="str" DEGIL, inlineStr
    : `<c r="${adres}"${stil} t="inlineStr"><is><t>${xmlKacir(deger)}</t></is></c>`;

  if (mevcut) {
    const yeniIc = satir.ic.slice(0, mevcut.bas) + yeniHucre + satir.ic.slice(mevcut.son);
    return xml.slice(0, satir.icBas) + yeniIc + xml.slice(satir.icSon);
  }

  // Hucre yok: sutun sirasini bozmadan araya sokulur
  if (satir.kapali) {
    const acik = satir.acilisEtiketi.replace(/\/>$/, '>');
    return xml.slice(0, satir.bas) + acik + yeniHucre + '</row>' + xml.slice(satir.son);
  }
  let ekleNoktasi = satir.ic.length;
  const hucreRe = /<c[^>]*\sr="([A-Z]+)\d+"/g;
  let m;
  while ((m = hucreRe.exec(satir.ic)) !== null) {
    if (sutunNo(m[1]) > coz.sutun) { ekleNoktasi = m.index; break; }
  }
  const yeniIc = satir.ic.slice(0, ekleNoktasi) + yeniHucre + satir.ic.slice(ekleNoktasi);
  return xml.slice(0, satir.icBas) + yeniIc + xml.slice(satir.icSon);
}

/**
 * Bircok hucreyi tek seferde yazar.
 * @param degisiklikler [{ adres, deger, tip }]
 */
export function hucreleriYaz(xml, degisiklikler) {
  if (!Array.isArray(degisiklikler)) return xml;
  let sonuc = xml;
  for (const d of degisiklikler) {
    if (!d || !d.adres) continue;
    sonuc = hucreYaz(sonuc, d.adres, d.deger, d.tip || 's');
  }
  return sonuc;
}

/**
 * Baslik satirindan "baslik -> sutun harfi" haritasi cikarir.
 * Basliklar inlineStr (<is><t>) veya sharedStrings (t="s") olabilir.
 * @param paylasilan sharedStrings.xml'den cikarilmis metin dizisi
 */
export function baslikHaritasi(xml, satirNo = 1, paylasilan = []) {
  const satir = satiriBul(xml, satirNo);
  const harita = {};
  if (!satir || satir.kapali) return harita;
  const re = /<c([^>]*)\sr="([A-Z]+)\d+"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = re.exec(satir.ic)) !== null) {
    const nitelikler = `${m[1]} ${m[3]}`;
    const harf = m[2];
    const govde = m[4] || '';
    let metin = null;
    if (/t="inlineStr"/.test(nitelikler)) {
      metin = [...govde.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('');
    } else if (/t="s"/.test(nitelikler)) {
      const v = /<v>(\d+)<\/v>/.exec(govde);
      if (v) metin = paylasilan[Number(v[1])] ?? null;
    } else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(govde);
      if (v) metin = v[1];
    }
    if (metin !== null) harita[cozXml(metin).trim()] = harf;
  }
  return harita;
}

/** XML kacislarini geri cevirir. */
export function cozXml(metin) {
  return String(metin ?? '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

/** sharedStrings.xml icindeki metinleri sirayla cikarir. */
export function paylasilanMetinler(sharedXml) {
  if (!sharedXml) return [];
  return [...String(sharedXml).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    cozXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''))
  );
}

/**
 * Calisilacak sayfanin zip icindeki yolunu bulur.
 * Trendyol dosyalarinda tek sayfa var; yine de tek sayfa varsa o secilir,
 * yoksa sheet1'e dusulur.
 */
export function sayfaXmlYolu(parcalar) {
  const yollar = Object.keys(parcalar || {}).filter((y) => /^xl\/worksheets\/[^/]+\.xml$/.test(y));
  if (yollar.length === 1) return yollar[0];
  return yollar.find((y) => y.endsWith('sheet1.xml')) || yollar[0] || null;
}

/**
 * NOT: baslikHaritasi TEKRAR EDEN basliklarda SON sutunu verir. Trendyol
 * dosyasinda "1.KOMİSYON".."4.KOMİSYON" iki pencerede de gectigi icin 35
 * sutun 31 anahtara duser. Bizim kullandigimiz basliklar (BARKOD,
 * "YENİ TSF (FİYAT GÜNCELLE)", "Tarife Seçimi") benzersiz oldugundan
 * sorun cikarmaz; komisyon sutunlarina adresle erisilmemeli.
 */

/**
 * Bir sutunun TUM satirlardaki degerlerini okur.
 *
 * Satir eslesmesi bunun uzerinden yapilir. sheet_to_json'un sirasina
 * guvenmek TEHLIKELI: bos satirlari atlayabilir ve fiyat YANLIS URUNE
 * yazilabilir. Burada satir numarasi dogrudan XML'den gelir.
 *
 * @returns { 2: '8681511336912', 3: 'KCL3545', ... }
 */
export function sutunDegerleri(xml, harf, paylasilan = []) {
  const sonuc = {};
  if (!xml || !harf) return sonuc;
  const re = new RegExp(`<c([^>]*)\\sr="${harf}(\\d+)"([^>]*)(?:/>|>([\\s\\S]*?)</c>)`, 'g');
  let m;
  while ((m = re.exec(xml)) !== null) {
    const nitelikler = `${m[1]} ${m[3]}`;
    const satirNo = Number(m[2]);
    const govde = m[4] || '';
    let metin = null;
    if (/t="inlineStr"/.test(nitelikler)) {
      metin = [...govde.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('');
    } else if (/t="s"/.test(nitelikler)) {
      const v = /<v>(\d+)<\/v>/.exec(govde);
      if (v) metin = paylasilan[Number(v[1])] ?? null;
    } else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(govde);
      if (v) metin = v[1];
    }
    if (metin !== null) sonuc[satirNo] = cozXml(metin).trim();
  }
  return sonuc;
}

