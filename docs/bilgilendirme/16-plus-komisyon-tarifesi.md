# Trendyol — Plus Ürün Komisyon Tarifesi

**Route:** `/PlusProductCommissionTariff`
**Görünüm:** Sadece Trendyol platformu aktifse sidebar'da gösterilir.

## Ne yapar?

Trendyol Plus üyelerine sunulan özel tekliflerin komisyon tarifesini yönetir. Ürün Komisyon Tarifesi ile aynı yapıda çalışır ancak Plus'a özel fiyat limitleri ve tek kademe komisyon oranı içerir.

---

## Ürün Komisyon Tarifesi'nden Farkı

| Özellik | Ürün Komisyon Tarifesi | Plus Komisyon Tarifesi |
|---|---|---|
| Kademe sayısı | 4 | 1 (tek teklif) |
| Hedef kitle | Tüm alıcılar | Yalnızca Plus üyeleri |
| Excel formatı | Standart tarife | Plus'a özel format |

---

## İş Akışı (A'dan Z'ye)

1. Trendyol Satıcı Paneli'nden "Plus Ürün Komisyon Tarifesi" Excel'i indirilir
2. Bu sayfada tarih aralığı seçilir
3. Excel yüklenir; sistem ürünleriyle SKU/barkod eşleştirmesi yapılır
4. Akıllı otomatik seç veya manuel seçim yapılır
5. Seçimler kaydedilir
6. Excel dışa aktarılır ve Trendyol paneline yüklenir

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Tarih Aralığı Seç | Kampanya dönemi; bu tarih dışı ürünler görünmez |
| Excel Yükle | Plus tarife Excel'ini yükler |
| Akıllı Otomatik Seç | Hedef kâra ulaşan ürünleri seçer |
| Seçimleri Kaydet | Seçimleri veritabanına kaydeder |
| Dışa Aktar | Platforma yüklenecek Excel indirir |
| Min Kâr Oranı Uygula | Seçili ürünlere minimum kâr filtresi uygular |
| Min Kâr Tutarı Uygula | Seçili ürünlere minimum kâr tutarı filtresi uygular |

---

## Filtreler

Ürün Komisyon Tarifesi ile aynıdır: metin arama, kategori, marka, stok aralığı, sıralama.

---

## Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| Barkod | |
| Model Kodu | |
| Satıcı SKU | |
| Kategori | |
| Ürün Adı | |
| Mevcut Stok | |
| Plus Fiyat Limiti (₺) | Trendyol'un bu ürün için belirlediği max fiyat |
| Teklif Komisyonu (%) | Plus teklifinin komisyon oranı |
| Sistem Fiyatı (₺) | PriceHub'ın hesapladığı fiyat |
| Sistem Kârı (%) | Teklif fiyatıyla elde edilecek kâr |
| Seç / Seçme | Ürünü Plus teklifine dahil et / etme |
| Manuel Fiyat (₺) | Manuel fiyat girilmek istenirse |
| Barem Önerisi | Fiyata göre kargo baremi |

---

## Akıllı Otomatik Seç

- Komisyonlar sayfasındaki **indirimli hedef kâr** değeri baz alınır
- Teklif fiyatı bu hedefi karşılıyorsa ürün **seçilir**
- Karşılamıyorsa **seçilmez**
- Plus'ta tek kademe olduğundan "kademeler arası geçiş" yoktur; ya bu teklif kârlıdır ya değildir

---

## Dikkat edilecekler

- Plus Excel formatı standart Ürün Komisyon Tarifesi Excel'inden farklıdır; doğru dosyayı yükle.
- Plus fiyat limitinin üstüne çıkılamaz; sistem bu durumda uyarı gösterir.
- Seçimler kaydedilmeden sayfa kapatılırsa kaybolur.
- Komisyon sayfasında indirimli hedef kâr tanımlı değilse akıllı seç doğru çalışmaz.
