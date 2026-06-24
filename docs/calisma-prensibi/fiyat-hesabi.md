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
- Komisyon oranına **%20 KDV eklenir**: gerçek komisyon = oran × 1,20.
- Motor bunu `commissionVatRate: 20` ile otomatik yapar ve bu KDV'yi indirilecek KDV olarak geri yazar.
- **Hepsiburada** komisyonları Excel'de **KDV hariç** gelir → ham oran motora verilir, motor ×1,20 yapar. **Önceden 1,20 ile çarpıp verme → çift KDV (yanlış) olur.**

## Kargo: Desi vs Barem
- **Desi:** ürünün desisine göre kargo tarifesi (`findDesiShippingRate`).
- **Barem:** fiyat aralığına göre sabit kargo (Trendyol mantığı): ~0–149,99 TL → Barem 1; 150–299,99 TL → Barem 2. Barem yalnızca uygun durumda ve barem tarifesi tanımlıysa devreye girer; yoksa desiye düşer.
- Özel kargo / çok paketli ürünlerde barem kullanılmaz, desi toplanır.

## Kargo tarifeleri: manuel vs sistem
- **Manuel tarife** (`is_manual=true`): kullanıcının kendi tarifesi, **sadece kendisi görür**, platform_id ile eşleşir.
- **Sistem tarifesi** (`is_admin_created=true`): admin'in tanımladığı **ortak/paylaşılan** tarife, herkes görür, platform_type ile eşleşir.

## Komisyon eşleştirme
Bir ürünün komisyonu, ürünün **kategorisi** + **platformu** ile `commissions` tablosundan bulunur. Kategori eklenince ilgili platformlar için komisyon satırları otomatik oluşur (veritabanı trigger'ı).

## Not (fresh code fırsatı)
`calculateProfit` benzeri hesap sarmalayıcısı birçok sayfada kopyalanmış (Trendyol + HB promosyon sayfaları). İleride tek bir paylaşılan fonksiyona toplanmalı → "tek yerden düzelt, her yerde düzelsin".
