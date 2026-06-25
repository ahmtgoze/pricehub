# Kampanyalar

**Route:** `/Campaigns`

## Ne yapar?

Trendyol kampanyaları (Tüm Ülkeler ve Plus) oluşturulur, ürünler seçilir, kâr analizi yapılır ve platforma yüklenecek Excel hazırlanır.

---

## Kampanya Listesi

Sayfanın üst kısmında mevcut kampanyalar kart veya liste halinde gösterilir. Her kampanya kartında:

- Kampanya türü rozeti (Tüm Ülkeler / Plus)
- Başlangıç – bitiş tarihi
- İndirim tipi ve tutarı
- Durum (Aktif / Pasif)
- Düzenle ve Sil butonları

---

## Yeni Kampanya Oluşturma

| Alan | Açıklama |
|---|---|
| Kampanya Türü | **Tüm Ülkeler** — genel kampanya / **Trendyol Plus** — Plus üyelerine özel |
| Başlangıç Tarihi | Takvim seçici |
| Bitiş Tarihi | Takvim seçici |
| İndirim Tipi | Yüzde (%) veya Sabit Tutar (₺) toggle |
| İndirim Miktarı | % veya ₺ olarak |
| Sepet Tutarı (Tüm Ülkeler için) | Minimum sepet tutarı (₺) + Koşul (Üzerinde / Altında) |
| Trendyol Karşılama Oranı (%) | Plus kampanyalarında Trendyol'un ne kadar katkı verdiği |

---

## Kampanya Yönetimi (Ürün Ekleme)

Kampanya oluşturulduktan sonra ürün listesi yüklenir:

### Butonlar

| Buton | Ne yapar |
|---|---|
| Excel Yükle | Trendyol'dan indirilen kampanya ürün listesini yükler |
| Otomatik Seç | Akıllı otomatik seç çalıştırır |
| Min Kâr Oranı Uygula | Seçili ürünlere minimum kâr oranı filtresi uygular |
| Min Kâr Tutarı Uygula | Seçili ürünlere minimum kâr tutarı filtresi uygular |
| Dışa Aktar | Platforma yüklenecek Excel indirir |

### Filtreler

| Filtre | Açıklama |
|---|---|
| Metin arama | Ürün adı veya SKU |
| Kategori filtresi | Belirli kategoriye ait ürünler |
| Min Kâr Oranı (%) | Bu oranın altındaki ürünleri gösterme |
| Min Kâr Tutarı (₺) | Bu tutarın altındaki ürünleri gösterme |
| Sıralama | Farklı alanlara göre |

### Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| SKU / Barkod | |
| Ürün Adı | Kategori bilgisi ile |
| Mevcut Stok | |
| Sistem Fiyatı (₺) | PriceHub'ın hesapladığı normal fiyat |
| Kampanya Fiyatı (₺) | İndirim uygulanmış fiyat |
| Kâr Oranı (%) | Kampanya fiyatıyla kâr; renk kodlu |
| Net Kâr (₺) | |
| Detay (ℹ) | PriceDetailModal açar; kampanya fiyatıyla tam döküm gösterir |
| Seç / Seçme toggle | Bu ürünü kampanyaya dahil et / etme |

---

## Akıllı Otomatik Seç

Komisyonlar sayfasındaki **indirimli hedef kâr** değerini baz alır:
- İndirimli hedef kâr oranının üzerinde kalan ürünler → kampanyaya **dahil edilir**
- Altında kalan ürünler → **dışarıda bırakılır**

---

## Yüklenen Excel Formatı

Trendyol'dan indirilen kampanya Excel'inde beklenen sütunlar:
`Ürün Adı | SKU / Model Kodu | Barkod | Önerilen Fiyat | Adet`

---

## Kâr Detay Modalı (PriceDetailModal)

Kampanya fiyatı üzerinden tam maliyet dökümü gösterilir:
- Normal sistem fiyatı vs. kampanya fiyatı karşılaştırması
- Kampanya sonrası kâr marjı
- Tüm kesintiler (komisyon, stopaj, kargo, KDV vb.)

---

## Dikkat edilecekler

- Kampanya bitiş tarihi geçen ürünler listeden otomatik filtrelenir.
- Komisyon sayfasında "indirimli hedef kâr" tanımlı değilse akıllı seç doğru çalışmaz.
- Kampanya kaydedilince sayfa yenilendiğinde kaldığı yerden devam edilir.
- Plus kampanyalarında "Trendyol karşılama oranı" kâr hesabında Trendyol'un katkısını dahil eder; bu değer yanlışsa hesaplar hatalı olur.
