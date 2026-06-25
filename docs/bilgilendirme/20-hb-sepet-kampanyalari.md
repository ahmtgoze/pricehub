# HepsiBurada — Sepet Kampanyaları

**Route:** `/HBBasketCampaigns`
**Görünüm:** Sadece HepsiBurada platformu aktifse sidebar'da gösterilir.

## Ne yapar?

HepsiBurada sepet kampanyası Excel'ini yükler, indirimli komisyon uygulandığında her ürün için kâr etkisini hesaplar, kampanya fiyatlarını belirler ve platforma yüklenecek Excel üretir.

---

## İş Akışı (A'dan Z'ye)

1. HepsiBurada Satıcı Paneli'nden sepet kampanyası Excel'i indirilir (genellikle "Listelerim" sheet)
2. Bu sayfaya yüklenir
3. Sistem ürünleriyle Satıcı Stok Kodu (SKU) / barkod / HB SKU eşleştirmesi yapılır
4. Normal komisyon vs. kampanya komisyonu karşılaştırması görülür
5. Akıllı otomatik seç veya manuel fiyat girişi yapılır
6. Seçimler kaydedilir
7. Excel dışa aktarılır ve HepsiBurada paneline yüklenir

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Excel Yükle | HB sepet kampanyası Excel'ini yükler |
| Akıllı Otomatik Seç | Max fiyat sınırı içinde kalarak hedef kâra ulaşan fiyatı seçer |
| Toplu Seç | Görüntülenen ürünleri toplu işaretler |
| Seçimleri Kaydet | Seçimleri veritabanına kaydeder |
| Dışa Aktar | HepsiBurada'ya yüklenecek Excel indirir; "Kampanyanın uygulanacağı fiyat" sütunu dolu gelir |
| Min Kâr Oranı Uygula | Seçili ürünlere minimum kâr oranı filtresi uygular |
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
| HB SKU | |
| Barkod | |
| Kategori | |
| Ürün Adı | |
| Mevcut Stok | |
| Güncel Fiyat (₺) | Platformdaki mevcut fiyat |
| Normal Komisyon (%) | Kampanya dışında uygulanan oran (KDV hariç) |
| Kampanya Komisyonu (%) | Kampanya süresince uygulanan indirimli oran (KDV hariç) |
| Normal Komisyon KDV'li (%) | Gerçek maliyet (× 1,20) |
| Kampanya Komisyon KDV'li (%) | Kampanya dönemindeki gerçek maliyet (× 1,20) |
| Max Fiyat (₺) | "Girebileceğiniz max. fiyat" — HB'nin belirlediği üst sınır |
| Seçilen Kampanya Fiyatı (₺) | Kullanıcının belirlediği veya akıllı seçin bulduğu fiyat |
| Normal Kâr (%) | Güncel fiyat ve normal komisyonla kâr |
| Kampanya Kârı (%) | Kampanya fiyatı ve kampanya komisyonuyla kâr |
| Kâr Farkı (%) | İki senaryo arasındaki fark |
| Seç / Seçme | Ürünü kampanyaya dahil et / etme |
| Manuel Fiyat (₺) | Akıllı seç yerine elle fiyat girilebilir |
| Barem Önerisi | Fiyata göre kargo baremi |

---

## Akıllı Otomatik Seç Mantığı

- Her ürün için **Max fiyat sınırı içinde** kalarak Komisyonlar sayfasındaki indirimli hedef kâra ulaşan fiyat bulunur
- Max fiyatın altına kâr sağlamak mümkün değilse ürün seçilmez

---

## HepsiBurada Komisyon Notu

Hem normal hem kampanya komisyon oranları Excel'de **KDV hariç** gelir. Sistem her ikisine de %20 KDV ekleyerek gerçek maliyet hesaplar. Kâr dökümünde her ikisi de gösterilir.

---

## Excel Formatı (HepsiBurada'dan İndirilen)

"Listelerim" sheet'inde beklenen sütunlar: `HB SKU | Satıcı Stok Kodu | Barkod | Ürün Adı | Kategori | Stok | Güncel Fiyat | Normal Komisyon | Kampanya Komisyonu | Girebileceğiniz Max. Fiyat | Kampanyanın Uygulanacağı Fiyat`

Dışa aktarılan Excel'de "Kampanyanın Uygulanacağı Fiyat" sütunu doldurulmuş olarak gelir.

---

## Dikkat edilecekler

- Max fiyat sınırının üstüne girilmesi sistem tarafından engellenir ve uyarı gösterilir.
- Kampanya komisyonu sadece kampanya süresi boyunca geçerlidir; kampanya bitince normal komisyon devreye girer.
- Seçimler kaydedilmeden sayfa kapatılırsa kaybolur.
- Komisyon sayfasında indirimli hedef kâr tanımlı değilse akıllı seç doğru çalışmaz.
