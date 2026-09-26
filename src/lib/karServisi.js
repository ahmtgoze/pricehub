/**
 * Trendyol panel eklentisinin hesap servisi — iş mantığı.
 *
 * Sözleşme: pricehub-eklenti/docs/faz2-servis-sozlesmesi.md (sürüm 1).
 * Bu dosya AĞ ve KİMLİK bilmez: veriyi dışarıdan verilen `veri` nesnesinden
 * okur (Edge Function kabuğu bunu kullanıcının oturumuyla, RLS altında
 * kurar). Böylece tüm kurallar veritabanı olmadan Node'da test edilir.
 *
 * İlke: emin olunmayan her durumda RAKAM DÖNDÜRME, durum kodu dön.
 *
 * `veri` arayüzü (hepsi async):
 *   platformlar() → Trendyol platform kayıtları (kullanıcının + yönetici şablonu)
 *   tarifeler()   → Trendyol kargo tarifeleri
 *   ayarlar()     → [{setting_key, setting_value}] (Çift Kargo kuralları)
 *   komisyonlar() → kullanıcının Trendyol komisyon kayıtları
 *   urunler(barkodlar) → Map(küçük harf barkod → { urun, eslesme: 'barkod'|'model_kodu' })
 */
import { fiyattaKar } from './karHesabi.js';
import { hedefleriCoz, hedefVarMi, hedefTutuyorMu, komisyonBul } from './hedefKarSecimi.js';

export const SINIRLAR = { EN_FAZLA_SATIR: 200, EN_FAZLA_BAYT: 65536, EN_FAZLA_FIYAT: 10_000_000 };
const KAYNAKLAR = ['tarife', 'plus', 'etiket', 'flas', 'buybox'];

const sonlu = (d) => typeof d === 'number' && Number.isFinite(d);
const metin = (d, en) => typeof d === 'string' && d.length > 0 && d.length <= en;
const yuvarla = (x) => Math.round(x * 100) / 100;

// Yalnız izin verilen alanlar alınır; gelen fazlalık (ad, adres, telefon vb.) burada düşer.
// Kimlik eklentinin sonucu eşleştirme anahtarı: eksik/bozuksa satır geçersiz, yanıtta `#sıra` döner.
function satirTemizle(s, sira) {
  const idTamam = !!s && metin(s.id, 64);
  const temiz = { id: idTamam ? s.id : `#${sira}`, gecerli: false, tur: s?.tur, barkod: s?.barkod };
  if (!idTamam || typeof s !== 'object' || !metin(s.barkod, 128)) return temiz;
  if (s.tur === 'siparis') return { ...temiz, gecerli: true };
  if (s.tur !== 'fiyat') return temiz;
  const kaynakTamam = s.kaynak === undefined || KAYNAKLAR.includes(s.kaynak);
  const tamam = sonlu(s.fiyat) && s.fiyat > 0 && s.fiyat <= SINIRLAR.EN_FAZLA_FIYAT
    && sonlu(s.komisyonOrani) && s.komisyonOrani >= 0 && s.komisyonOrani <= 100 && kaynakTamam;
  return { ...temiz, gecerli: tamam, fiyat: s.fiyat, komisyonOrani: s.komisyonOrani };
}

export function istekiDogrula(govde) {
  if (!govde || typeof govde !== 'object' || Array.isArray(govde)) return { tamam: false, hata: 'gecersiz_istek' };
  if (govde.surum !== 1) return { tamam: false, hata: 'desteklenmeyen_surum' };
  if (govde.platform !== 'trendyol') return { tamam: false, hata: 'desteklenmeyen_platform' };
  if (!Number.isSafeInteger(govde.saticiNo) || govde.saticiNo <= 0) return { tamam: false, hata: 'gecersiz_satici_no' };
  const s = govde.satirlar;
  if (!Array.isArray(s) || s.length === 0 || s.length > SINIRLAR.EN_FAZLA_SATIR) return { tamam: false, hata: 'gecersiz_satir_sayisi' };
  return { tamam: true, istek: { saticiNo: govde.saticiNo, satirlar: s.map(satirTemizle) } };
}

// Paket maliyeti (packages / package_items) bu sürümde desteklenmiyor: eksik hesap yerine rakam yok.
const paketliMi = (urun) => {
  if (urun.package_id || urun.auto_package_id) return true;
  if (!urun.multi_package || !urun.packages) return false;
  try {
    const liste = typeof urun.packages === 'string' ? JSON.parse(urun.packages) : urun.packages;
    return Array.isArray(liste) && liste.some((p) => p?.package_id);
  } catch {
    return true;
  }
};

function satirHesapla(s, ctx) {
  if (!s.gecerli) return { id: s.id, durum: 'veri_gecersiz' };
  if (s.tur === 'siparis') return { id: s.id, durum: 'desteklenmiyor' };

  const eslesme = ctx.eslesmeler.get(s.barkod.toLowerCase());
  if (!eslesme) return { id: s.id, durum: 'eslesmedi' };
  const { urun } = eslesme;
  if (paketliMi(urun)) return { id: s.id, durum: 'hesaplanamadi', neden: 'paket_maliyeti' };

  const r = fiyattaKar({
    urun, platform: ctx.kullanici, sablonlar: ctx.sablonlar, fiyat: s.fiyat, komisyonOrani: s.komisyonOrani,
    tarifeler: ctx.tarifeler, ayarlar: ctx.ayarlar,
  });
  if (r.durum !== 'tamam') return { id: s.id, durum: r.durum };

  const hedefler = hedefleriCoz(komisyonBul(ctx.komisyonlar, [ctx.kullanici], urun));
  const hedefAlti = hedefVarMi(hedefler) ? !hedefTutuyorMu(r.netKar, r.karOrani, hedefler).uygun : null;

  return {
    id: s.id,
    durum: 'tamam',
    netKar: yuvarla(r.netKar),
    vergiOncesiKar: yuvarla(r.vergiOncesiKar),
    karOrani: yuvarla(r.karOrani),
    karMarji: yuvarla(r.karMarji),
    kalemler: Object.fromEntries(Object.entries(r.kalemler).map(([k, v]) => [k, yuvarla(v)])),
    hedefAlti,
    not: `fiyat: kutudaki ${s.fiyat} ₺; komisyon: panelden %${s.komisyonOrani}; kargo: ${r.baremUsed}`
      + (eslesme.eslesme === 'model_kodu' ? '; ürün model koduyla eşleşti' : ''),
  };
}

export async function isle(istek, veri) {
  const platformlar = await veri.platformlar();
  const adaylar = platformlar.filter((p) => p.platform_type === 'trendyol' && !p.is_system_admin && p.is_active !== false);
  const kullanici = adaylar.find((p) => Number(p.satici_no) === istek.saticiNo);
  if (!kullanici) {
    const bagliVar = adaylar.some((p) => p.satici_no !== null && p.satici_no !== undefined);
    return { surum: 1, magaza: { durum: bagliVar ? 'uyusmuyor' : 'bagli_degil' }, satirlar: [] };
  }

  const hesaplanacak = istek.satirlar.filter((s) => s.gecerli && s.tur === 'fiyat');
  let ctx = { kullanici, sablonlar: platformlar.filter((p) => p.is_system_admin), tarifeler: [], ayarlar: [], komisyonlar: [], eslesmeler: new Map() };
  if (hesaplanacak.length) {
    const barkodlar = [...new Set(hesaplanacak.map((s) => s.barkod))];
    const [tarifeler, ayarlar, komisyonlar, eslesmeler] = await Promise.all([
      veri.tarifeler(), veri.ayarlar(), veri.komisyonlar(), veri.urunler(barkodlar),
    ]);
    const firma = (kullanici.shipping_company_name || '').trim();
    ctx = { ...ctx, ayarlar, komisyonlar, eslesmeler, tarifeler: firma ? tarifeler.filter((t) => t.shipping_company === firma) : tarifeler };
  }

  const satirlar = istek.satirlar.map((s) => {
    try {
      return satirHesapla(s, ctx);
    } catch {
      return { id: s.id, durum: 'hesaplanamadi' };
    }
  });
  return { surum: 1, magaza: { durum: 'eslesti' }, satirlar };
}
