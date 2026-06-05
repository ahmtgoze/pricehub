// ─── Yüksek Doğruluklu Pazaryeri Eşleştirme Motoru (v3) ─────────────────────
//
// Sektörden bağımsız, genel amaçlı eşleştirme motoru.
// Güven skoru 0-100 arasında üretilir.
// MIN_AUTO_SCORE altında kalan eşleşmeler otomatik uygulanmaz.
//
// v3 düzeltmeleri:
//  - Tek haneli sayılar artık SİLİNMİYOR (1 Adet, 6 Adet, 9 Adet ayırt edilir).
//  - "100x100" gibi ebatlar "100100" olarak, "1.000" gibi sayılar "1000" olarak normalize edilir.
//  - Sayı eşleşmesi ÇİFT YÖNLÜ: ebat/sarım/adet birebir uyuşmazsa otomatik eleme.
//  - KRİTİK: SKU birebir eşleşse bile, ürün adındaki sayılar master ile uyuşmuyorsa
//    o SKU eşleşmesine GÜVENİLMEZ (Shopify'da aynı SKU birden çok varyantta tekrarlanabiliyor).

export const MIN_AUTO_SCORE = 65;

// Sadece gerçekten anlamsız bağlaçlar — ürün tipi/miktar kelimeleri KALDIRMA
const STOPWORDS = new Set([
  've', 'ile', 'bir', 'için', 'bu', 'da', 'de', 'ta', 'te',
  'li', 'lu', 'lik', 'luk'
]);

export function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u');
}

// "100x100" → "100100", "1.000" → "1000" (SKU/ad kodlamasıyla uyumlu olsun diye)
function unifyNumbers(text) {
  let t = normalizeText(text);
  // rakam x rakam  →  birleştir (ebatlar)
  t = t.replace(/(\d)\s*[x×]\s*(\d)/g, '$1$2');
  t = t.replace(/(\d)\s*[x×]\s*(\d)/g, '$1$2');
  // binlik ayıracı (1.000 / 1,000) → birleştir
  t = t.replace(/(\d)[.,](\d)/g, '$1$2');
  t = t.replace(/(\d)[.,](\d)/g, '$1$2');
  return t;
}

/**
 * Metinden TÜM sayıları çıkarır (tek haneli dahil), kanonik hale getirir.
 */
function extractNumbers(text) {
  const t = unifyNumbers(text);
  const matches = t.match(/\d+/g) || [];
  return matches.map(n => String(parseInt(n, 10)));
}

/**
 * Metinden anlamlı KELIME (alfabetik) tokenları çıkarır.
 */
function tokenizeAlpha(text) {
  return unifyNumbers(text)
    .split(/[\s\/\-_,;|]+/)
    .map(t => t.replace(/[^\w]/g, ''))
    .filter(t => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * İki sayı kümesi arasında GERÇEK çakışma var mı?
 * Çakışma YOK sayılır eğer biri diğerinin alt kümesiyse (fazladan/eksik açıklama).
 * Çakışma VAR sayılır eğer her iki tarafta da diğerinde olmayan sayı varsa
 * (örn. 250 Sarım vs 500 Sarım → aynı yerde farklı değer).
 */
function numbersConflict(aNums, bNums) {
  const setA = new Set(aNums);
  const setB = new Set(bNums);
  let aSubsetB = true;
  for (const n of setA) if (!setB.has(n)) { aSubsetB = false; break; }
  let bSubsetA = true;
  for (const n of setB) if (!setA.has(n)) { bSubsetA = false; break; }
  // Biri diğerinin alt kümesiyse çakışma yok
  return !(aSubsetB || bSubsetA);
}

/**
 * Pazaryeri ürün adı ile master ürün adındaki sayılar uyuşuyor mu?
 * (SKU eşleşmesini doğrulamak için kullanılır)
 */
function nameNumbersAgree(mp, product) {
  const mpNums = extractNumbers(`${mp.platform_product_name || ''} ${mp.variant_title || ''}`);
  const pNums = extractNumbers(`${product.name || ''}`);
  // İki taraftan biri hiç sayı içermiyorsa engelleme (isim eşleşmesine bırak)
  if (mpNums.length === 0 || pNums.length === 0) return true;
  return !numbersConflict(mpNums, pNums);
}

/**
 * İki ürün arasındaki güven skorunu hesaplar (0-100).
 * @param {boolean} strict - true ise sayı çakışmasında direkt 0 döner.
 */
export function computeMatchScore(mpName, mpVariant, product, strict = true) {
  const mpText = `${mpName} ${mpVariant || ''}`;
  const pText = `${product.name || ''} ${product.sku || ''}`;

  const mpAlpha = tokenizeAlpha(mpText);
  const pAlpha = tokenizeAlpha(pText);

  if (mpAlpha.length === 0 || pAlpha.length === 0) return 0;

  const mpNums = extractNumbers(`${mpName} ${mpVariant || ''}`);
  const pNumsName = extractNumbers(`${product.name || ''}`);

  // Sayı çakışması: ebat/sarım/adet birebir uyuşmuyorsa (ürün adı bazında)
  const conflict = (mpNums.length > 0 && pNumsName.length > 0) && numbersConflict(mpNums, pNumsName);
  if (conflict && strict) return 0;

  const setMP = new Set(mpAlpha);
  const setP = new Set(pAlpha);
  let intersection = 0;
  for (const t of setP) { if (setMP.has(t)) intersection++; }

  if (intersection === 0) return 0;

  const productCoverage = intersection / setP.size;
  const union = new Set([...setMP, ...setP]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  const rawScore = 0.65 * productCoverage + 0.35 * jaccard;
  let score = Math.round(rawScore * 100);

  // Sayı uyuşmuyorsa skor 40'ı geçemez (asla otomatik eşleşmez)
  if (conflict) score = Math.min(score, 40);

  return score;
}

/**
 * Tüm master ürünler arasında en iyi eşleşmeyi bulur.
 * SKU tam eşleşmesi varsa VE sayılar uyuşuyorsa onu döner (skor: 100).
 */
export function findBestMatch(mp, products) {
  const barkod = mp.barkod || '';
  const variantSku = mp.variant_sku || '';
  const modelCode = mp.model_code || '';
  const skuMatch = products.find(p =>
    p.sku && p.sku.trim() !== '' &&
    (p.sku === barkod || p.sku === variantSku || p.sku === modelCode)
  );

  // SKU eşleşse bile ürün adındaki sayılar (ebat/sarım/adet) master ile uyuşmalı.
  if (skuMatch && nameNumbersAgree(mp, skuMatch)) {
    return { product: skuMatch, score: 100 };
  }

  // İsim tabanlı skor (strict: sayı çakışması = eleme)
  let best = null;
  let bestScore = 0;
  for (const p of products) {
    const s = computeMatchScore(mp.platform_product_name || '', mp.variant_title || '', p, true);
    if (s > bestScore) { bestScore = s; best = p; }
  }
  return { product: best, score: bestScore };
}

/**
 * En iyi N aday ürünü döner (öneri listesi için).
 */
export function findTopMatches(mp, products, n = 3) {
  const barkod = mp.barkod || '';
  const variantSku = mp.variant_sku || '';
  const modelCode = mp.model_code || '';
  const skuMatch = products.find(p =>
    p.sku && p.sku.trim() !== '' &&
    (p.sku === barkod || p.sku === variantSku || p.sku === modelCode)
  );
  if (skuMatch && nameNumbersAgree(mp, skuMatch)) {
    return [{ product: skuMatch, score: 100 }];
  }

  return products
    .map(p => ({ product: p, score: computeMatchScore(mp.platform_product_name || '', mp.variant_title || '', p, false) }))
    .filter(x => x.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
