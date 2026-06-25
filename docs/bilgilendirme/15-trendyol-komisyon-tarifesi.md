# Trendyol — Ürün Komisyon Tarifesi

**Route:** `/TrendyolPriceRange`  
**Görünüm:** Sadece Trendyol platformu aktifse gösterilir.

## Ne yapar?

Trendyol'un fiyat aralığı ve 4 kademeli komisyon tarifesini yükler, ürün bazında en uygun kademeyi seçer ve platforma yüklenecek Excel üretir.

## Neler yapılabilir?

- Tarih aralığı seçip Trendyol'dan indirilen Excel'i yüklemek
- Sistem ürünleriyle otomatik eşleştirmeyi görmek
- **Akıllı otomatik seç** ile her ürün için en kârlı kademeyi sistem seçsin
- Manuel fiyat girmek veya akıllı seçimi düzenlemek
- Barem önerisini görmek (desi aralığına göre önerilen kargo)
- Seçimleri kaydetmek ve Excel'e aktarmak

## 4 kademe komisyon mantığı

Her ürün için Trendyol 4 farklı fiyat-komisyon kombinasyonu sunar (örn. normal %17, indirim 1 %12, indirim 2 %9, indirim 3 %7). Fiyatı düşürdükçe komisyon da düşer. Akıllı seç, hedef kâra ulaşan ilk kademeyi seçer.

## Dikkat edilecekler

- Trendyol'dan indirilen Excel tarih aralığına özeldir; tarih dışı ürünler gösterilmez.
- Seçimler kaydedilmeden sayfa kapatılırsa kaybolur; mutlaka kaydet butonuna basın.
