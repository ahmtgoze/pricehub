/**
 * Fiyat güncelliği — hangi fiyatlar bayatladı?
 *
 * Her fiyat kaydının `calculation_details` alanında, o fiyat HESAPLANIRKEN
 * kullanılan maliyet/komisyon/hedef değerleri saklanır. Bugünkü değerlerle
 * karşılaştırarak "bu fiyat artık güncel değil" diyebiliriz.
 *
 * Kullanıcı ürün maliyetini değiştirdiğinde fiyatlar kendiliğinden
 * güncellenmiyor; "Fiyatları Hesapla" demesi gerekiyor. Bu modül, Fiyatlar
 * sayfasına girildiğinde neyin değiştiğini söylemek için kullanılır.
 *
 * Import icermez — duz node ile test edilebilir.
 */

const sayi = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** calculation_details hem metin hem nesne gelebilir. */
export function detayCoz(detay) {
  if (!detay) return null;
  if (typeof detay === 'object') return detay;
  if (typeof detay !== 'string') return null;
  try {
    const c = JSON.parse(detay);
    return typeof c === 'string' ? detayCoz(c) : c;
  } catch {
    return null;
  }
}

/**
 * Motordaki effectiveCost ile AYNI kural: referanslı üründe baz maliyet
 * daha yüksekse o kullanılır.
 */
export function gecerliMaliyet(urun) {
  const maliyet = sayi(urun?.cost) ?? 0;
  const bazMaliyet = sayi(urun?.base_cost) ?? 0;
  const referansli = !!(urun?.ref_product_id || urun?.ref_product_id_size);
  return referansli && bazMaliyet > maliyet ? bazMaliyet : maliyet;
}

/** İki tutar kuruş farkına kadar aynı mı? */
const ayni = (a, b) => {
  if (a === null || b === null) return true;   // bilinmiyorsa değişmiş sayma
  return Math.abs(a - b) < 0.005;
};

/**
 * fiyatlar: [{ product_id, platform_id, calculation_details }]
 * urunler:  [{ id, cost, base_cost, printing_cost, extra_cost, ... }]
 * komisyonlar: [{ platform_id, category_id, commission_rate, target_profit_rate, is_active }]
 *
 * Döner: { bayatSayisi, sebepler: { maliyet, komisyon, hedefKar, baski, ekMaliyet },
 *          urunler: [{ product_id, sebepler: [...] }] }
 */
export function bayatFiyatlariBul(fiyatlar, urunler, komisyonlar, ek = {}) {
  const { kargoTarifeleri, platformlar, paketMaliyeti = null } = ek;
  // Veri VERILMEDIYSE yargilama. Bos liste ile "verilmedi" ayirt edilmezse
  // cagiran taraf tarifeleri gecmediginde her fiyat "tarife silinmis" diye
  // bayat gorunurdu.
  const kargoBilinen = Array.isArray(kargoTarifeleri) && kargoTarifeleri.length > 0;
  const platformBilinen = Array.isArray(platformlar) && platformlar.length > 0;

  const urunHaritasi = new Map((urunler || []).map((u) => [u.id, u]));
  const tarifeHaritasi = new Map((kargoTarifeleri || []).map((t) => [t.id, t]));
  const platformHaritasi = new Map((platformlar || []).map((p) => [p.id, p]));

  const sebepSayaci = {
    maliyet: 0, komisyon: 0, hedefKar: 0, baski: 0, ekMaliyet: 0,
    kargo: 0, paketleme: 0, hizmetBedeli: 0, kurumlarVergisi: 0,
  };
  const bayatUrunler = new Map();

  for (const fiyat of fiyatlar || []) {
    const detay = detayCoz(fiyat.calculation_details);
    if (!detay) continue;                       // eski kayıt, karşılaştırılamaz
    const urun = urunHaritasi.get(fiyat.product_id);
    if (!urun) continue;

    const sebepler = [];

    if (!ayni(sayi(detay.productCost), gecerliMaliyet(urun))) sebepler.push('maliyet');
    if (!ayni(sayi(detay.printingCost), sayi(urun.printing_cost) ?? 0)) sebepler.push('baski');
    if (!ayni(sayi(detay.extraCost), sayi(urun.extra_cost) ?? 0)) sebepler.push('ekMaliyet');

    const komisyon = (komisyonlar || []).find(
      (c) => c.platform_id === fiyat.platform_id &&
             c.category_id === urun.category_id &&
             c.is_active !== false
    );
    if (komisyon) {
      if (!ayni(sayi(detay.commissionRate), sayi(komisyon.commission_rate))) sebepler.push('komisyon');
      if (!ayni(sayi(detay.targetProfitRate), sayi(komisyon.target_profit_rate))) sebepler.push('hedefKar');
    }

    // ── Paketleme maliyeti ──────────────────────────────────────────────
    if (paketMaliyeti) {
      const simdi = sayi(paketMaliyeti(urun)) ?? 0;
      if (!ayni(sayi(detay.packagingCost), simdi)) sebepler.push('paketleme');
    }

    // ── Kargo tarifesi ──────────────────────────────────────────────────
    // Tarife SECME mantigi burada tekrar edilmez; fiyat hesaplanirken hangi
    // tarifelerin kullanildigi kaydedilmisti. Zam gelince o tarifenin
    // bugunku ucreti kayitliyla tutmaz.
    if (kargoBilinen && Array.isArray(detay.kullanilanTarifeler) && detay.kullanilanTarifeler.length) {
      for (const t of detay.kullanilanTarifeler) {
        const guncel = tarifeHaritasi.get(t.id);
        if (!guncel || guncel.is_active === false || !ayni(sayi(t.price), sayi(guncel.price))) {
          sebepler.push('kargo');
          break;
        }
      }
    }

    // ── Platform ayarlari: hizmet bedeli ve kurumlar vergisi ────────────
    const platform = platformBilinen ? platformHaritasi.get(fiyat.platform_id) : null;
    if (platform) {
      if (detay.serviceFeeType !== undefined) {
        const tipDegisti = (detay.serviceFeeType ?? null) !== (platform.service_fee_type ?? null);
        const tutarDegisti = !ayni(sayi(detay.serviceFeeAmount), sayi(platform.service_fee_amount));
        const bkDegisti = !ayni(sayi(detay.sameDayServiceFeeAmount), sayi(platform.same_day_delivery_service_fee));
        if (tipDegisti || tutarDegisti || bkDegisti) sebepler.push('hizmetBedeli');
      }
      if (detay.corporateTaxRate !== undefined
          && !ayni(sayi(detay.corporateTaxRate), sayi(platform.corporate_tax_rate))) {
        sebepler.push('kurumlarVergisi');
      }
    }

    if (sebepler.length > 0) {
      for (const s of sebepler) sebepSayaci[s] += 1;
      const mevcut = bayatUrunler.get(fiyat.product_id) || new Set();
      for (const s of sebepler) mevcut.add(s);
      bayatUrunler.set(fiyat.product_id, mevcut);
    }
  }

  return {
    bayatSayisi: bayatUrunler.size,
    sebepler: sebepSayaci,
    urunler: [...bayatUrunler].map(([id, s]) => ({ product_id: id, sebepler: [...s] })),
  };
}

export const SEBEP_ETIKETLERI = {
  maliyet: 'ürün maliyeti',
  komisyon: 'komisyon oranı',
  hedefKar: 'hedef kâr oranı',
  baski: 'baskı maliyeti',
  ekMaliyet: 'ek maliyet',
  kargo: 'kargo tarifesi',
  paketleme: 'paketleme maliyeti',
  hizmetBedeli: 'hizmet bedeli',
  kurumlarVergisi: 'kurumlar vergisi',
};
