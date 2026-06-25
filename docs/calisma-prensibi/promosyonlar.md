# Promosyon Sayfaları — Nasıl Çalışır?

## Genel yapı

Tüm promosyon sayfaları (Trendyol + HepsiBurada) aynı `PriceCalculationEngine` motorunu kullanır. Fark sadece **girdilerde**: her platform farklı bir Excel formatı ve farklı komisyon yapısı getirir.

Ortak akış:
1. Platformdan Excel indirilir
2. PriceHub'a yüklenir
3. Sistem ürünlerle SKU/barkod eşleştirmesi yapılır
4. Her ürün için kâr hesabı yapılır (indirimli komisyon ile)
5. Akıllı otomatik seç veya manuel seçim yapılır
6. Excel'e aktarılır ve platforma yüklenir

## Akıllı otomatik seç mantığı

Her promosyon sayfasında "Akıllı Otomatik Seç" butonu şöyle çalışır:

- Komisyon sayfasındaki **indirimli hedef kâr** değerini hedef alır
- Her ürün için en düşük indirimli seçenekten başlar
- Hedefe ulaşan ilk seçeneği seçer
- Hedefe ulaşılamıyorsa ürünü seçmez (kayıp olur)

## Platform bazlı özellikler

### Trendyol

| Sayfa | Kaç seçenek | Seçim mantığı |
|---|---|---|
| Ürün Komisyon Tarifesi | 4 kademe | En düşük indirimden başla, hedefe ulaşan ilk kademe |
| Plus Komisyon Tarifesi | 1 teklif | Hedefi karşılıyorsa seç, karşılamıyorsa seçme |
| Avantajlı Ürün Etiketi | 3 etiket (Avantaj/Çok/Süper) | Süper'den başla, hedefe ulaşan ilk etiket |
| Flaş Ürünler | 2 süre (3 saat / 24 saat) | 3 saatten başla, hedefe ulaşan ilk süre |

### HepsiBurada

| Sayfa | Kaç seçenek | Seçim mantığı |
|---|---|---|
| Avantajlı Teklifler | 3 kademe | En düşük indirimden başla, hedefe ulaşan ilk kademe |
| Sepet Kampanyaları | 1 seçenek (max fiyat sınırı var) | Max fiyat içinde kalarak hedefi karşıla |
| Kendi Kampanyanı Oluştur | Kampanya türü seçimi | Simülasyon — seçim kaydedilmez, Excel üretilmez |

## HepsiBurada komisyon notu

HB komisyon oranları Excel'de **KDV hariç** gelir. Motor %20 KDV'yi otomatik ekler. Bu hesaplama tüm HB sayfalarında tutarlı uygulanır:

```
gerçek komisyon yükü = excel'deki oran × 1,20
```

Kâr dökümünde hem "KDV hariç komisyon" hem "KDV dahil komisyon" gösterilir.

## Max fiyat sınırı (HB)

HB bazı kampanyalarda ürün başına maksimum girilebilecek fiyat belirler. Sistem bu sınırın üstüne çıkılamaz; üste çıkan elle yazılan fiyatlar hata olarak işaretlenir.

## Seçimleri kaydet

Tüm promosyon sayfalarında seçimler **veritabanına kaydedilir**. Sayfayı kapatıp tekrar açınca kaldığı yerden devam eder. Yeni Excel yüklenince önceki seçimler sıfırlanır.

## Barem önerisi

Trendyol promosyon sayfalarında "barem önerisi" özelliği bulunur: seçilen fiyata göre hangi kargo barem kademesine girildiği gösterilir. Bu, fiyat belirlerken kargo maliyetini optimize etmeye yardımcı olur.
