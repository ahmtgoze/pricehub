# Fiyat / Kâr Hesabı — Sistemin Kalbi

Tüm hesap `src/components/PriceCalculationEngine.jsx` içindeki **`calculatePriceBreakdown`** fonksiyonunda yapılır. Trendyol, Hepsiburada ve promosyon sayfalarının HEPSİ aynı motoru kullanır → tutarlılık.

> ⚠️ Bu mantık değişirse kârlar yanlış çıkar. Değiştirmeden önce iki kez düşün. İleride buraya **otomatik test** eklenecek (her değişiklik kârı yanlışlatırsa anında yakalansın).

## Hesaba giren kalemler
Bir satış fiyatından **net kâr** hesaplanırken şunlar düşülür:
- **Ürün maliyeti** (KDV'li) + **paketleme** + **baskı** + **ekstra** maliyetler
- **Kargo ücreti** — desi bazlı veya barem bazlı (aşağıya bak)
- **Komisyon** (+ KDV) — pazaryeri komisyonu
- **Hizmet bedeli**, **stopaj (withholding)**, **POS/işlem bedeli** — platforma göre
- **Net KDV** (satış KDV'si − indirilecek KDV'ler)
- **Kurumlar vergisi** (kâr pozitifse, platform ayarına göre)

Sonuç: `netProfit` (net kâr) ve `profitRate` (kâr oranı %).

## Komisyon + KDV (ÖNEMLİ)
- Komisyon oranı sisteme **KDV DAHİL** girilir; motor üstüne ikinci bir KDV **eklemez**.
- Motor içeride `(satış ÷ 1,20) × oran × 1,20` yazar; iki 1,20 birbirini götürür.
  Net sonuç: **komisyon = satış fiyatı (KDV dahil) × girilen oran**.
- Doğrulama: 5.408,99 ₺ × %12,83 = 693,97 ₺ → sistemdeki kayıtlı komisyon da 693,97 ₺.
- Komisyonun içindeki KDV (`tutar × 20/120`) indirilecek KDV olarak geri yazılır.
- **Hepsiburada** oranları platformun Excel'inde KDV hariç gelir; sisteme girilmeden
  önce ×1,20 yapılır (örn. %17 → 20,4). Trendyol oranları zaten KDV dahildir,
  olduğu gibi girilir.

> Ayrıntılı ve tek doğru kaynak: [`../00-sistem/is-kurallari.md`](../00-sistem/is-kurallari.md)

## Kargo: Desi vs Barem
- **Desi:** ürünün desisine göre kargo tarifesi (`findDesiShippingRate`).
- **Barem:** fiyat aralığına göre sabit kargo. Aralıklar **platform ayarından** okunur (koda yazılmaz): Trendyol 0–149,99 / 150–299,99 · HepsiBurada 0–199,99 / 200–399,99. Ayrıca ürünün desisi platformun `barem_max_desi` değerini aşmamalıdır. Koşullar sağlanmazsa desi tarifesine düşülür.
- Özel kargo / çok paketli ürünlerde barem kullanılmaz, desi toplanır.

## Kargo tarifeleri: manuel vs sistem
- **Manuel tarife** (`is_manual=true`): kullanıcının kendi tarifesi, **sadece kendisi görür**, platform_id ile eşleşir.
- **Sistem tarifesi** (`is_admin_created=true`): admin'in tanımladığı **ortak/paylaşılan** tarife, herkes görür, platform_type ile eşleşir.

## Komisyon eşleştirme
Bir ürünün komisyonu, ürünün **kategorisi** + **platformu** ile `commissions` tablosundan bulunur. Kategori eklenince ilgili platformlar için komisyon satırları otomatik oluşur (veritabanı trigger'ı).

## Not (fresh code fırsatı)
`calculateProfit` benzeri hesap sarmalayıcısı birçok sayfada kopyalanmış (Trendyol + HB promosyon sayfaları). İleride tek bir paylaşılan fonksiyona toplanmalı → "tek yerden düzelt, her yerde düzelsin".
