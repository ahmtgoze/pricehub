# Trendyol — Ürün Komisyon Tarifesi

**Route:** `/TrendyolPriceRange`
**Görünüm:** Sadece Trendyol platformu aktifse sidebar'da gösterilir.

## Ne yapar?

Trendyol'un 4 kademeli fiyat–komisyon tarifesini yönetir. Her kademe farklı bir indirim ve buna karşılık düşen komisyon oranı içerir; sistem hangi kademedeki fiyatın daha kârlı olduğunu hesaplar.

---

## İş Akışı (A'dan Z'ye)

1. Trendyol Satıcı Paneli'nden "Ürün Komisyon Tarifesi" Excel'i indirilir
2. Bu sayfada tarih aralığı seçilir
3. Excel yüklenir; sistem ürünlerle SKU/barkod eşleştirmesi yapılır
4. Akıllı otomatik seç veya manuel seçim yapılır
5. Seçimler kaydedilir
6. Excel dışa aktarılır ve Trendyol paneline yüklenir

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Tarih Aralığı Seç | Kampanya dönemi seçilir; bu tarih dışı ürünler gösterilmez |
| Excel Yükle | Trendyol'dan indirilen tarife Excel'ini yükler; ilerleme gösterilir |
| Akıllı Otomatik Seç | Tüm eşleşmiş ürünler için en uygun kademe seçilir |
| Seçimleri Kaydet | Seçilen kademeleri veritabanına kaydeder |
| Dışa Aktar | Platforma yüklenecek Excel indirir |
| Min Kâr Oranı Uygula | Seçili ürünlere minimum kâr oranı filtresi uygular |
| Min Kâr Tutarı Uygula | Seçili ürünlere minimum kâr tutarı filtresi uygular |

---

## Filtreler

| Filtre | Açıklama |
|---|---|
| Metin arama | Ürün adı veya SKU |
| Kategori | Belirli kategoriye ait ürünler |
| Marka | |
| Stok aralığı | Min – Max stok filtresi |
| Sıralama | |

---

## Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| Barkod | |
| Model Kodu | |
| Satıcı SKU | |
| Kategori | |
| Ürün Adı | |
| Mevcut Stok | |
| Sistem Fiyatı (₺) | PriceHub'ın hesapladığı fiyat |
| Önerilen Fiyat (₺) | Trendyol'un önerdiği fiyat |
| Komisyon (%) | Seçilen kademedeki komisyon oranı |
| Min Fiyat | Trendyol'un izin verdiği minimum fiyat |
| Max Fiyat | Trendyol'un izin verdiği maksimum fiyat |
| Sistem Kârı (%) | Seçilen fiyatla elde edilecek kâr oranı |
| Değişim (%) | Sistem fiyatına göre değişim yüzdesi |
| Kademe Seçimi | 4 kademe arasından seçim: Kademe 1 / 2 / 3 / 4 veya Manuel |
| Manuel Fiyat (₺) | "Manuel" seçilirse girilecek fiyat |
| Barem Önerisi | Seçilen fiyata göre hangi kargo bareminin geçerli olduğu |

---

## 4 Kademe Komisyon Mantığı

Her ürün için Trendyol 4 farklı fiyat–komisyon kombinasyonu sunar (örneğin):

| Kademe | Uygulama | Komisyon Oranı |
|---|---|---|
| Kademe 1 (normal) | — | %17 |
| Kademe 2 | %5 indirim | %12 |
| Kademe 3 | %10 indirim | %9 |
| Kademe 4 | %15 indirim | %7 |

Akıllı otomatik seç, **en düşük indirimden (Kademe 1) başlayarak** Komisyonlar sayfasındaki indirimli hedef kâra ulaşan ilk kademeyi seçer.

---

## Barem Önerisi

Seçilen fiyatın hangi kargo barem kademesine (Barem 1, Barem 2) girdiği gösterilir. Bu, fiyatı barem sınırına göre optimize etmek için kullanılır — örneğin fiyatı 148 ₺'den 150 ₺'ye çıkarmak Barem 2'yi tetikler ve kargo maliyetini değiştirebilir.

---

## Dikkat edilecekler

- Tarife Excel'i kampanya dönemine özeldir; yanlış tarih aralığı seçilirse ürünler görünmez.
- Seçimler kaydedilmeden sayfa kapatılırsa kaybolur; mutlaka "Seçimleri Kaydet" butonuna basılmalıdır.
- Min fiyat sınırının altına girilmesi hata gösterir ve o fiyat dışa aktarılamaz.
- Komisyon sayfasında indirimli hedef kâr tanımlı değilse akıllı seç doğru çalışmaz.
