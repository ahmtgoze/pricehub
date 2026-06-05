// ─── Yüksek Doğruluklu Pazaryeri Eşleştirme Motoru (v2) ─────────────────────
//
// Sektörden bağımsız, genel amaçlı eşleştirme motoru.
// Güven skoru 0-100 arasında üretilir.
// MIN_AUTO_SCORE altında kalan eşleşmeler otomatik uygulanmaz.
//
// v2 düzeltmeleri:
//  - Tek haneli sayılar artık SİLİNMİYOR (1 Adet, 6 Adet, 9 Adet ayırt edilir).
//  - "100x100" gibi ebatlar "100100" olarak normalize edilir (SKU ile uyumlu).
//  - Sayı eşleşmesi ÇİFT YÖNLÜ: ebat/sarım/adet birebir uyuşmazsa otomatik eleme.
//  - Aday listede (öneri) sayı uyuşmazsa skor 40'ı geçemez (asla otomatik eşleşmez).

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

// "100x100" / "100 x 100" → "100100" (SKU kodlamasıyla uyumlu olsun diye)
function unifyNumbers(text) {
  return normalizeText(text).replace(/(\d)\s*[x×]\s*(\d)/g, '$1$2');
}

/**
 * Metinden TÜM sayıları çıkarır (tek haneli dahil), kanonik hale getirir.
 * Örn "100x100 / 500 Sarım / 1 Adet" → ["100100", "500", "1"]
 */
function extractNumbers(text) {
  const t = unifyNumbers(text);
  const matches = t.match(/\d+/g) || [];
  return matches.map(n => String(parseInt(n, 10)));
}

/**
 * Metinden anlamlı KELIME (alfabetik) tokenları çıkarır.
 * Saf sayılar buraya dahil edilmez (onlar ayrı ele alınır).
 */
function tokenizeAlpha(text) {
  return unifyNumbers(text)
    .split(/[\s\/\-_,;|]+/)
    .map(t => t.replace(/[^\w]/g, ''))
    .filter(t => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * İki sayı kümesi arasında çakışma var mı?
 * Çift yönlü: bir tarafta olup diğerinde olmayan herhangi bir sayı = çakışma.
 * (ebat/sarım/adet farklıysa true döner → farklı üründür)
 */
function numbersConflict(mpNums, pNums) {
  const setMP = new Set(mpNums);
  const setP = new Set(pNums);
  for (const n of setMP) if (!setP.has(n)) return true;
  for (const n of setP) if (!setMP.has(n)) return true;
  return false;
}

/**
 * İki ürün arasındaki güven skorunu hesaplar (0-100).
 *
 * @param {string} mpName - Pazaryeri ürün adı
 * @param {string} mpVariant - Pazaryeri varyant başlığı (opsiyonel)
 * @param {object} product - Master ürün kaydı {name, sku}
 * @param {boolean} strict - true ise sayı çakışmasında direkt 0 döner (otomatik eşleşme için)
 * @returns {number} güven skoru (0-100)
 */
export function computeMatchScore(mpName, mpVariant, product, strict = true) {
  const mpText = `${mpName} ${mpVariant || ''}`;
  const pText = `${product.name || ''} ${product.sku || ''}`;

  const mpAlpha = tokenizeAlpha(mpText);
  const pAlpha = tokenizeAlpha(pText);

  if (mpAlpha.length === 0 || pAlpha.length === 0) return 0;

  const mpNums = extractNumbers(mpText);
  const pNums = extractNumbers(pText);

  // ── 1. Sayı çakışması: ebat/sarım/adet birebir uyuşmuyorsa ────────────────
  const conflict = numbersConflict(mpNums, pNums);
  if (conflict && strict) return 0;

  // ── 2. Alfabetik token örtüşmesi ──────────────────────────────────────────
  const setMP = new Set(mpAlpha);
  const setP = new Set(pAlpha);
  let intersection = 0;
  for (const t of setP) { if (setMP.has(t)) intersection++; }

  // En az bir anlamlı kelime örtüşmeli (örn. "dikkat", "termal", "etiket")
  if (intersection === 0) return 0;

  // ── 3. productCoverage: ürün tokenlarının kaçı MP'de geçiyor ──────────────
  const productCoverage = intersection / setP.size;

  // ── 4. Jaccard: genel kelime örtüşmesi ────────────────────────────────────
  const union = new Set([...setMP, ...setP]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // ── 5. Ağırlıklı final skor ───────────────────────────────────────────────
  const rawScore = 0.65 * productCoverage + 0.35 * jaccard;
  let score = Math.round(rawScore * 100);

  // ── 6. Sayı uyuşmuyorsa (strict değilse) skor 40'ı geçemez ────────────────
  // Böylece aday olarak görünür ama ASLA otomatik eşleşme eşiğine (65) ulaşmaz.
  if (conflict) score = Math.min(score, 40);

  return score;
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

  // Adım 2: İsim tabanlı skor hesapla (strict: sayı çakışması = eleme)
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
 * Sayı uyuşmayan adaylar da gösterilir ama skorları 40 ile sınırlıdır
 * (kullanıcıya gösterim için; otomatik asla uygulanmaz).
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
    .map(p => ({ product: p, score: computeMatchScore(mp.platform_product_name || '', mp.variant_title || '', p, false) }))
    .filter(x => x.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
