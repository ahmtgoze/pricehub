# Fiyatlar

**Route:** `/Prices`

## Ne yapar?

Sistemin temel çıktı sayfasıdır. Tüm ürünlerin her platform için hesaplanan satış fiyatlarını gösterir. Platforma göre hangi fiyata satmak gerektiği burada görülür.

## Neler yapılabilir?

- **Fiyatları Hesapla** butonu ile tüm ürünler için toplu hesaplama başlatmak
- Kategori, platform veya kâr aralığına göre filtreleme yapmak
- Bir ürüne tıklayarak detaylı kâr dökümünü görmek (komisyon, stopaj, KDV, kargo, paketleme)
- Seçilen ürünleri CSV olarak dışa aktarmak
- Hesaplama ilerlemesini progress bar ile takip etmek

## Dikkat edilecekler

- Hesaplama yapmadan önce Kategoriler, Platformlar, Komisyonlar ve Kargo Tarifeleri dolu olmalıdır.
- Hesaplama arka planda çalışır; sayfayı kapatmak hesaplamayı durdurmaz.
- Kâr oranı düşük veya negatif çıkan ürünler kırmızı/sarı renkte vurgulanır.
