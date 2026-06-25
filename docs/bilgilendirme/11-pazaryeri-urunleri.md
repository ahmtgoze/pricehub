# Pazaryeri Ürünleri

**Route:** `/MarketplaceProducts`

## Ne yapar?

Trendyol, HepsiBurada veya Shopify'dan indirilen ürün listesini sisteme yükler ve sistem ürünleriyle eşleştirir. Eşleşme kurulduktan sonra "Düzenlenen Fiyatlar" ve "Düzenlenen Maliyetler" sayfaları çalışmaya başlar.

## Neler yapılabilir?

- Platform seçip Excel yüklemek
- Otomatik eşleştirme sonuçlarını görmek (güven skoru ile)
- Otomatik eşleşemeyen ürünleri arama ile manuel eşleştirmek
- Hatalı eşleşmeleri düzeltmek
- Eşleşmeleri silmek

## Eşleştirme nasıl çalışır?

Sistem önce SKU, ardından barkod ile eşleştirme dener. Eşleşme bulunamazsa güven skoru düşük olarak işaretlenir ve manuel müdahale istenir.

## Dikkat edilecekler

- Her platformun Excel formatı farklıdır; yüklemeden önce sayfadaki rehberi kontrol edin.
- Güven skoru düşük eşleşmeler sarı renkte gösterilir; bunları mutlaka kontrol edin.
- Bir ürün birden fazla platformdaki pazaryeri ürünüyle eşleştirilebilir.
- Eşleşme silinince o ürünün "Düzenlenen Fiyatlar" ve "Düzenlenen Maliyetler"deki satırı da kalkar.
