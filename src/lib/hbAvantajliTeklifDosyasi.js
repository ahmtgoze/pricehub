/**
 * HepsiBurada "Avantajlı Teklifler" Excel'i — sutun tanima ve satir okuma.
 *
 * HB 15 Eylul 2026'da dosya bicimini degistirdi (sayfa: "Teklifler"):
 *   ESKI: tek baslik satiri — "Güncel Fiyat", "Güncel Komisyon",
 *         "Teklif 1 Katılabileceğiniz Maximum Fiyat", "Komisyon Teklifi 1", …
 *         "Fiyat Gir"
 *   YENI: IKI baslik satiri — "Mevcut Fiyat", "Mevcut Komisyon",
 *         "Teklif 1" | (bos)  ust satirda, altinda "Üst Fiyat" | "Komisyon";
 *         "Fiyatı Güncelle"; ayrica her teklifin "Başlangıç" / "Bitiş"
 *         tarihi (Excel seri sayisi: 46274.0143 = 9 Eylul 2026 00:20).
 * Sayfa yalnizca eski basliklari aradigi icin yeni dosyada hicbir sey
 * okunmuyordu ("2 teklif yuklendi", hepsi 0 / -). Bu modul iki bicimi de
 * tanir. Import icermez — duz node ile test edilebilir.
 */

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const normL = (s) => norm(s).toLocaleLowerCase('tr');
const p2 = (n) => String(n).padStart(2, '0');

/**
 * Excel tarih hucresi -> { tarih: 'yyyy-mm-dd', saat: 'HH:MM' } | null.
 * Seri sayi (46274.0143), "09/09/2026 00:20", "2026-09-09T00:20" kabul edilir.
 */
export function excelTarihi(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return {
      tarih: `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`,
      saat: `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`,
    };
  }
  const m = String(v).trim().match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return { tarih: `${m[3]}-${p2(m[2])}-${p2(m[1])}`, saat: m[4] ? `${p2(m[4])}:${m[5]}` : '' };
  const iso = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (iso) return { tarih: `${iso[1]}-${iso[2]}-${iso[3]}`, saat: iso[4] ? `${iso[4]}:${iso[5]}` : '' };
  return null;
}

/**
 * Baslik satirini bulur, sutun indekslerini dondurur.
 * @param satirlar sheet_to_json(ws, { header: 1 }) ciktisi (dizi dizisi)
 * @returns null (SKU basligi yok) | { baslik, veri, ...indeksler, teklifler: {1:{fiyat,komisyon},…} }
 */
export function hbTeklifSutunlari(satirlar) {
  if (!Array.isArray(satirlar)) return null;
  const hIdx = satirlar.findIndex((r) => Array.isArray(r) && r.some((c) => normL(c) === 'sku'));
  if (hIdx < 0) return null;
  const h = satirlar[hIdx].map(normL);
  const altL = (satirlar[hIdx + 1] || []).map(normL);
  // Yeni bicimde ikinci satir alt baslik ("Üst Fiyat" / "Komisyon"), veri degil.
  const altBaslikMi = !altL.some((c) => c === 'sku') && altL.some((c) => c.includes('üst fiyat') || c.includes('komisyon'));
  const bul = (...adlar) => { for (const a of adlar) { const i = h.indexOf(a); if (i >= 0) return i; } return -1; };
  const s = {
    baslik: hIdx,
    veri: hIdx + (altBaslikMi ? 2 : 1),
    urunAdi: bul('ürün adı'),
    saticiStokKodu: bul('satıcı stok kodu'),
    sku: bul('sku'),
    barkod: bul('barkod'),
    kategori: bul('kategori'),
    stok: bul('stok', 'mevcut stok'),
    baslangic: bul('başlangıç', 'başlangıç tarihi'),
    bitis: bul('bitiş', 'bitiş tarihi'),
    mevcutFiyat: bul('mevcut fiyat', 'güncel fiyat'),
    mevcutKomisyon: bul('mevcut komisyon', 'güncel komisyon'),
    fiyatGuncelle: bul('fiyatı güncelle', 'fiyat gir'),
    teklifKodu: bul('teklif kodu'),
    teklifler: {},
  };
  for (const n of [1, 2, 3]) {
    const yeni = h.indexOf(`teklif ${n}`);
    if (yeni >= 0) { s.teklifler[n] = { fiyat: yeni, komisyon: yeni + 1 }; continue; }
    const eskiF = bul(`teklif ${n} katılabileceğiniz maximum fiyat`);
    const eskiK = bul(`komisyon teklifi ${n}`);
    if (eskiF >= 0) s.teklifler[n] = { fiyat: eskiF, komisyon: eskiK };
  }
  return s;
}

/**
 * Dosyadaki teklif satirlarini ham degerleriyle okur (sayi/yuzde cevirimi
 * sayfada yapilir). Tarihler 'yyyy-mm-dd' + 'HH:MM' olarak cozulur.
 * @returns { sutunlar, teklifler: [{ satir, sku, urunAdi, …, baslangic, bitis, teklif1Fiyat, teklif1Komisyon, … }] }
 */
export function hbTeklifleriOku(satirlar) {
  const s = hbTeklifSutunlari(satirlar);
  if (!s) return { sutunlar: null, teklifler: [] };
  const al = (r, i) => (i >= 0 ? r[i] : undefined);
  const teklifler = [];
  for (let R = s.veri; R < satirlar.length; R++) {
    const r = satirlar[R] || [];
    const sku = norm(al(r, s.sku));
    const urunAdi = norm(al(r, s.urunAdi));
    if (!sku && !urunAdi) continue;
    const bas = excelTarihi(al(r, s.baslangic));
    const bit = excelTarihi(al(r, s.bitis));
    const t = {
      satir: R, sku, urunAdi,
      saticiStokKodu: norm(al(r, s.saticiStokKodu)),
      barkod: norm(al(r, s.barkod)),
      kategori: norm(al(r, s.kategori)),
      stok: al(r, s.stok),
      mevcutFiyat: al(r, s.mevcutFiyat),
      mevcutKomisyon: al(r, s.mevcutKomisyon),
      teklifKodu: al(r, s.teklifKodu),
      baslangic: bas?.tarih || '', baslangicSaat: bas?.saat || '',
      bitis: bit?.tarih || '', bitisSaat: bit?.saat || '',
    };
    for (const n of [1, 2, 3]) {
      t[`teklif${n}Fiyat`] = al(r, s.teklifler[n]?.fiyat ?? -1);
      t[`teklif${n}Komisyon`] = al(r, s.teklifler[n]?.komisyon ?? -1);
    }
    teklifler.push(t);
  }
  return { sutunlar: s, teklifler };
}

/** Dosyadaki tekliflerin kapsadigi tarih araligi: en erken baslangic, en gec bitis. */
export function dosyaTarihAraligi(teklifler) {
  const bas = (teklifler || []).map((t) => t?.baslangic).filter(Boolean).sort();
  const bit = (teklifler || []).map((t) => t?.bitis).filter(Boolean).sort();
  if (bas.length === 0 || bit.length === 0) return null;
  return { baslangic: bas[0], bitis: bit[bit.length - 1] };
}

/**
 * Teklif secilen aralikta mi? Aralik secilmediyse ya da dosyada tarih yoksa
 * kisit yok (eski dosyalar tarih tasimiyor). Aralik disindaki teklif
 * secilemez — HB de sonraki haftanin tekliflerini erkenden listeleyebilir
 * (Flas Urunler'deki kuralla ayni, kullanici 15 Eylul 2026).
 */
export function teklifAralikta(teklif, aralik) {
  if (!aralik?.baslangic || !aralik?.bitis) return true;
  if (!teklif?.baslangic || !teklif?.bitis) return true;
  return teklif.baslangic >= aralik.baslangic && teklif.bitis <= aralik.bitis;
}
