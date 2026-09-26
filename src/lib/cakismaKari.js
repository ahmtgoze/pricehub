/**
 * Bir fiyat seçeneğinin DİĞER promosyonlarla birlikte kârı (eklenti çakışma uyarısı).
 *
 * Mantık PriceHub sayfalarıyla aynıdır (TrendyolPriceRange / AdvantageProductTag / FlashProducts):
 *   z = zincirKur(aday = bu seçenek, diğerleri = PriceHub'a KAYITLI seçimler)
 *   komisyon = z.komisyon (Plus tarifesi kazandıysa) ?? satıcıya kalan tutarın düştüğü tarife kademesi ?? seçeneğin kendi komisyonu
 *   kâr = satıcıya kalan tutar üzerinden. Yalnız satıcıya kalan tutar seçilen fiyattan DÜŞÜKSE sonuç vardır
 *   (çakışma seçeneği kötüleştirir); aynı ya da yüksekse sonuç yoktur.
 * Kâr hesabı `hesapla(fiyat, komisyonOrani)` ile dışarıdan verilir (motor bu dosyaya bağlanmaz).
 * Plus seçeneğinde (Plus'a özel fiyat) fiyat, Plus tarifesi kaydı olarak zincire konur; Plus müşterisi
 * ancak ürün bir Plus kampanyasında kayıtlıysa sayılır (zincir motorunun kuralı).
 */
import { zincirKur, KAYNAK } from './zincirHesabi.js';
import { kademeKomisyonu } from './tarifeKaydiSecimi.js';

const ADAY = { tarife: KAYNAK.TARIFE, etiket: KAYNAK.AVANTAJLI, flas: KAYNAK.FLAS };
export const CAKISMA_KAYNAKLARI = [...Object.keys(ADAY), 'plus'];

// Panelin kademeleri [birinci, ikinci, üçüncü, dördüncü] → tarife kaydı biçimi (kademeKomisyonu bunu okur).
// Eksik kademe/alan `undefined` kalır (isteğe bağlı zincirleme): kademeKomisyonu boş alanı 0 değil "yok" sayar.
// Birinci kademe yalnız alt sınırla ("ve üstü"), dördüncüsü yalnız üst sınırla ("ve altı") okunur.
export function kademeKaydi(kademeler) {
  if (!Array.isArray(kademeler) || !kademeler.some(Boolean)) return null;
  const [k1, k2, k3, k4] = kademeler;
  return {
    price_range_1_min: k1?.enAz ?? undefined, commission_1: k1?.komisyon,
    price_range_2_min: k2?.enAz ?? undefined, price_range_2_max: k2?.enCok ?? undefined, commission_2: k2?.komisyon,
    price_range_3_min: k3?.enAz ?? undefined, price_range_3_max: k3?.enCok ?? undefined, commission_3: k3?.komisyon,
    price_range_4_max: k4?.enCok ?? undefined, commission_4: k4?.komisyon,
  };
}

/**
 * @returns null (çakışma yok / hesaplanamaz) | { musteriFiyat, saticiNet, taban, genel, plus, kod, kupon, komisyonOrani, komisyonKaynagi, sonuc }
 *          `sonuc` = hesapla() çıktısı (durum 'tamam' olmayan sonuç null döner: rakam uydurulmaz).
 */
export function cakismaKari({ kaynak, barkod, fiyat, komisyonOrani, kademeler, urun, kaynaklar, bugun, platformAdi, hesapla }) {
  const plusMu = kaynak === 'plus';
  if (!plusMu && !ADAY[kaynak]) return null;
  const item = { barcode: barkod, category_name: urun?.category_name, category: urun?.category_name };
  let kayitlar = kaynaklar;
  let aday = { kaynak: ADAY[kaynak], fiyat };
  if (plusMu) {
    aday = null;
    kayitlar = { ...kaynaklar, plusTariffs: [{ barcode: barkod, platform_account: platformAdi, start_date: bugun, end_date: bugun, selected_type: 'manual', manual_price: fiyat, plus_commission_offer: komisyonOrani }] };
  }
  const z = zincirKur({ urun: item, kaynaklar: kayitlar, bugun, platform: platformAdi, aday });
  if (!z || !(z.saticiNet < fiyat - 0.005)) return null;
  // Plus fiyatı yalnız Plus müşterisi içindir: ürün Plus kampanyasında kayıtlı değilse (Plus tarifesi taban olmadıysa) bu seçenek uygulanmıyor.
  if (plusMu && z.komisyon == null) return null;

  const kademe = kademeKaydi(kademeler);
  const kademeOrani = kademe ? kademeKomisyonu(kademe, z.saticiNet) : null;
  const oran = z.komisyon ?? kademeOrani ?? komisyonOrani;
  const sonuc = hesapla(z.saticiNet, oran);
  if (!sonuc || sonuc.durum !== 'tamam') return null;
  return {
    musteriFiyat: z.musteriFiyat,
    saticiNet: z.saticiNet,
    taban: z.taban,
    genel: z.genel?.ad ?? null,
    plus: z.plus ? z.plus.oran : null,
    kod: z.kod?.ad ?? null,
    kupon: z.kupon?.ad ?? null,
    komisyonOrani: oran,
    komisyonKaynagi: z.komisyon != null ? 'plus_tarifesi' : kademeOrani != null ? 'kademe' : 'ayni',
    sonuc,
  };
}
