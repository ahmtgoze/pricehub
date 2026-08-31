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
| Min Kâr Oranı / Min Kâr Tutarı | Akıllı Otomatik Seç'e ek alt sınır verir; komisyon hedeflerinin üstüne biner |

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

- Fiyat, HB'nin verdiği **girilebilecek max fiyata** çekilir (fiyat ne kadar yüksekse satıcıya o kadar çok kalır)
- Seçim ölçüsü Komisyonlar sayfasındaki **indirimli hedeflerdir**: hedef kâr oranı, hedef kâr tutarı, minimum kâr tutarı
- Boş veya `0` olan hedef **tanımsız** sayılır; hiç hedefi olmayan ürün **atlanır**
- **Tanımlı olan tüm hedefler birden** sağlanmalıdır
- Sayfadaki Min Kâr Oranı / Min Kâr Tutarı alanları doldurulmuşsa ayrıca onlar da sağlanmalıdır
- Elle seçilmiş ürünlere **dokunulmaz**
- Kâr, **sepet indirimi düşülmüş** tutardan ve **geçerli maliyetten** (baz maliyet kuralı) hesaplanır

---

## HepsiBurada Komisyon Notu

Hem normal hem kampanya komisyon oranları Excel'de **KDV hariç** gelir. Sistem okuduğu anda her ikisini de ×1,20 yaparak KDV dahil hale getirir; motor komisyon oranını KDV dahil bekler.

Etikette iki oran birden gösterilir: **`%20,4 (HB %17)`** — soldaki hesaba giren gerçek oran, parantezdeki HB panelinde görünen ham oran.

---

## Excel Formatı (HepsiBurada'dan İndirilen)

"Listelerim" sayfasındaki sütunlar (gerçek dosyadan, sırasıyla):

`Ürün Adı | Marka | Satıcı stok kodu | SKU | Barkod | Kategori | Stok | Girebileceğiniz max. fiyat | Mevcut satış fiyatı | Güncel Komisyon Oranı | İndirimli Komisyon Oranı | Kampanyanın uygulanacağı fiyat`

Dosyanın ikinci sayfası **"Açıklamalar"**: her sütunun ne olduğunu anlatır ve
`EK BİLGİLER → Kampanyanın İndirimi` satırında **sepet indirimi** yazar
(örn. "Sepette %15 İndirim"). Sistem bu satırı okuyup kâra yansıtır.

Dışa aktarılan Excel'de "Kampanyanın uygulanacağı fiyat" sütunu doldurulur ve
**yalnızca kampanyaya alınan ürünler** kalır; diğer satırlar silinir.

---

## Dikkat edilecekler

- Max fiyat sınırının üstüne girilmesi sistem tarafından engellenir ve uyarı gösterilir.
- Kampanya komisyonu sadece kampanya süresi boyunca geçerlidir; kampanya bitince normal komisyon devreye girer.
- Seçimler kaydedilmeden sayfa kapatılırsa kaybolur.
- Komisyon sayfasında indirimli hedef kâr tanımlı değilse akıllı seç doğru çalışmaz.
