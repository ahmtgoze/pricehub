// ─── Yüksek Doğruluklu Pazaryeri Eşleştirme Motoru ──────────────────────────
//
// Sektörden bağımsız, genel amaçlı eşleştirme motoru.
// Güven skoru 0-100 arasında üretilir.
// MIN_AUTO_SCORE altında kalan eşleşmeler otomatik uygulanmaz.

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

/**
 * Metinden anlamlı "token" listesi çıkarır.
 * Sayısal değerler ve ürün tipi kelimeleri dahil edilir.
 */
function tokenize(text) {
  return normalizeText(text)
    .split(/[\s\/\-_,;|]+/)
    .map(t => t.replace(/[^\w]/g, ''))
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Sayısal değerlerin (ölçü, miktar, kod) eşleşip eşleşmediğini kontrol eder.
 * MP'de geçen her sayısal token üründe de bulunmalı.
 */
function numericsMatch(mpTokens, pTokens) {
  const mpNums = mpTokens.filter(t => /^\d+$/.test(t));
  const pNums = new Set(pTokens.filter(t => /^\d+$/.test(t)));
  if (mpNums.length === 0) return true;
  return mpNums.every(n => pNums.has(n));
}

/**
 * İki ürün arasındaki güven skorunu hesaplar (0-100).
 * 
 * Temel fikir: ürün adındaki tokenların ne kadarı MP'de geçiyor (productCoverage)?
 * Bu, MP'nin daha uzun olmasından skoru olumsuz etkilemez.
 * 
 * @param {string} mpName - Pazaryeri ürün adı
 * @param {string} mpVariant - Pazaryeri varyant başlığı (opsiyonel)
 * @param {object} product - Master ürün kaydı {name, sku}
 * @returns {number} güven skoru (0-100)
 */
export function computeMatchScore(mpName, mpVariant, product) {
  const mpText = `${mpName} ${mpVariant || ''}`;
  const pText = `${product.name || ''} ${product.sku || ''}`;

  const mpTokens = tokenize(mpText);
  const pTokens = tokenize(pText);

  if (mpTokens.length === 0 || pTokens.length === 0) return 0;

  // ── 1. Sayısal token zorunlu eşleşmesi ────────────────────────────────────
  // Ölçü, miktar, kod gibi sayılar uyuşmuyorsa farklı üründür → eleme
  if (!numericsMatch(mpTokens, pTokens)) return 0;

  // ── 2. Intersection hesabı ─────────────────────────────────────────────────
  const setMP = new Set(mpTokens);
  const setP = new Set(pTokens);
  let intersection = 0;
  for (const t of setP) { if (setMP.has(t)) intersection++; }

  // ── 3. productCoverage: ürün tokenlarının kaçı MP'de geçiyor ──────────────
  // Bu metrik MP'nin uzun olmasına karşı dayanıklıdır.
  const productCoverage = intersection / setP.size;

  // ── 4. Jaccard: genel kelime örtüşmesi ────────────────────────────────────
  const union = new Set([...setMP, ...setP]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // ── 5. Ağırlıklı final skor ───────────────────────────────────────────────
  // productCoverage daha önemli: ürünün tüm karakteristik tokenleri MP'de varsa yüksek skor
  const rawScore = 0.65 * productCoverage + 0.35 * jaccard;

  // ── 6. Minimum kelime örtüşmesi kontrolü ─────────────────────────────────
  // Ürün adı uzunsa (3+ token) en az 1 alfanümerik token eşleşmeli
  const pAlpha = pTokens.filter(t => !/^\d+$/.test(t));
  if (pAlpha.length >= 2) {
    const alphaMatch = pAlpha.filter(t => setMP.has(t)).length;
    if (alphaMatch === 0) return 0;
  }

  return Math.round(rawScore * 100);
}

/**
 * Tüm master ürünler arasında en iyi eşleşmeyi bulur.
 * SKU tam eşleşmesi varsa önce onu döner (skor: 100).
 * @returns {{ product: object|null, score: number }}
 */
export function findBestMatch(mp, products) {
  // Adım 1: SKU tam eşleşmesi (en yüksek güven)
  const barkod = mp.barkod || '';
  const variantSku = mp.variant_sku || '';
  const modelCode = mp.model_code || '';
  const skuMatch = products.find(p =>
    p.sku && p.sku.trim() !== '' &&
    (p.sku === barkod || p.sku === variantSku || p.sku === modelCode)
  );
  if (skuMatch) return { product: skuMatch, score: 100 };

  // Adım 2: İsim tabanlı skor hesapla
  let best = null;
  let bestScore = 0;
  for (const p of products) {
    const s = computeMatchScore(mp.platform_product_name || '', mp.variant_title || '', p);
    if (s > bestScore) { bestScore = s; best = p; }
  }
  return { product: best, score: bestScore };
}

/**
 * En iyi N aday ürünü döner (öneri listesi için).
 * MIN_AUTO_SCORE altında olanlar da dahil edilir (kullanıcıya gösterim için).
 * @returns {{ product: object, score: number }[]}
 */
export function findTopMatches(mp, products, n = 3) {
  const barkod = mp.barkod || '';
  const variantSku = mp.variant_sku || '';
  const modelCode = mp.model_code || '';
  const skuMatch = products.find(p =>
    p.sku && p.sku.trim() !== '' &&
    (p.sku === barkod || p.sku === variantSku || p.sku === modelCode)
  );
  if (skuMatch) return [{ product: skuMatch, score: 100 }];

  return products
    .map(p => ({ product: p, score: computeMatchScore(mp.platform_product_name || '', mp.variant_title || '', p) }))
    .filter(x => x.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
