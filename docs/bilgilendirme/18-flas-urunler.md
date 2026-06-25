# Trendyol — Flaş Ürünler

**Route:** `/FlashProducts`
**Görünüm:** Sadece Trendyol platformu aktifse sidebar'da gösterilir.

## Ne yapar?

Trendyol'un 3 saat ve 24 saat flaş indirim kampanyalarını yönetir. Her ürün için iki farklı süre seçeneği (ve buna bağlı farklı komisyon oranı) sunulur; sistem hangisinin daha kârlı olduğunu hesaplar.

---

## İş Akışı (A'dan Z'ye)

1. Trendyol Satıcı Paneli'nden "Flaş Ürünler" Excel'i indirilir
2. Bu sayfada tarih aralığı seçilir
3. Excel yüklenir; sistem ürünleriyle SKU/barkod eşleştirmesi yapılır
4. Tarih aralığı dışındaki ürünler otomatik filtrelenir
5. Akıllı otomatik seç veya manuel seçim yapılır
6. Seçimler kaydedilir
7. Excel dışa aktarılır ve Trendyol paneline yüklenir

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Tarih Aralığı Seç | Flaş kampanya dönemi; bu tarih dışı ürünler görünmez |
| Excel Yükle | Trendyol Flaş Ürünler Excel'ini yükler |
| Akıllı Otomatik Seç | Tüm ürünler için en uygun flaş süresini seçer |
| Toplu Seç | Görüntülenen ürünleri toplu işaretler |
| Seçimleri Kaydet | Seçimleri veritabanına kaydeder |
| Dışa Aktar | Platforma yüklenecek Excel indirir |
| Min Kâr Oranı Uygula | Seçili ürünlere minimum kâr filtresi uygular |
| Min Kâr Tutarı Uygula | Seçili ürünlere minimum kâr tutarı filtresi uygular |

---

## Filtreler

| Filtre | Açıklama |
|---|---|
| Metin arama | Ürün adı veya SKU |
| Kategori | |
| Sıralama | |

---

## Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| Barkod | |
| SKU | |
| Ürün Adı | |
| Kategori | |
| Mevcut Stok | |
| Flaş Fiyatı (3 saat) (₺) | Trendyol'un önerdiği 3 saatlik flaş fiyatı |
| Komisyon (3 saat) (%) | 3 saatlik flaştaki komisyon oranı |
| Kâr (3 saat) (%) | 3 saatlik flaşla elde edilecek kâr |
| Flaş Fiyatı (24 saat) (₺) | Trendyol'un önerdiği 24 saatlik flaş fiyatı |
| Komisyon (24 saat) (%) | 24 saatlik flaştaki komisyon oranı |
| Kâr (24 saat) (%) | 24 saatlik flaşla elde edilecek kâr |
| Süre Seçimi | 3 Saat / 24 Saat / Manuel / Seçme |
| Manuel Fiyat (₺) | "Manuel" seçilirse girilecek fiyat |
| Zaman Aralığı | Kampanyanın geçerli olacağı saat dilimi (otomatik belirlenir) |
| Barem Önerisi | Fiyata göre kargo baremi |

---

## Akıllı Otomatik Seç Mantığı

- **Önce 3 saatlik** flaşı dener; indirimli hedef kâra ulaşılıyorsa 3 saatlik seçilir
- Ulaşılamıyorsa **24 saatliğe** geçer; o da hedefi karşılamıyorsa ürün seçilmez

---

## Dikkat edilecekler

- Tarih aralığı dışındaki ürünler liste yüklense bile gösterilmez; tarih seçimi kritiktir.
- Zaman aralığı (saat dilimi) genellikle Excel'den otomatik gelir; görüntülenen değeri kontrol et.
- Seçimler kaydedilmeden sayfa kapatılırsa kaybolur.
- Komisyon sayfasında indirimli hedef kâr tanımlı değilse akıllı seç doğru çalışmaz.
