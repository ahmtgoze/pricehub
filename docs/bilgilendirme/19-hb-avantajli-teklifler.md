# HepsiBurada — Avantajlı Teklifler

**Route:** `/HBAdvantageOffers`
**Görünüm:** Sadece HepsiBurada platformu aktifse sidebar'da gösterilir.

## Ne yapar?

HepsiBurada'nın avantajlı teklif kampanyasını yönetir. HB, her ürün için 3 kademeli teklif sunar: fiyatı düşürdükçe komisyon oranı da düşer. Sistem hangi kademedeki fiyat-komisyon kombinasyonunun daha kârlı olduğunu hesaplar.

---

## İş Akışı (A'dan Z'ye)

1. HepsiBurada Satıcı Paneli'nden "Avantajlı Teklifler" Excel'i indirilir
2. Bu sayfaya yüklenir
3. Sistem ürünleriyle HB SKU / barkod / SKU eşleştirmesi yapılır
4. Her ürün için 3 teklif kademesi karşılaştırılır
5. Akıllı otomatik seç veya manuel seçim yapılır
6. Seçimler kaydedilir
7. Excel dışa aktarılır ve HepsiBurada paneline yüklenir

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Excel Yükle | HB Avantajlı Teklifler Excel'ini yükler |
| Akıllı Otomatik Seç | Tüm ürünler için en uygun teklif kademesini seçer |
| Toplu Seç | Görüntülenen ürünleri toplu işaretler |
| Seçimleri Kaydet | Seçimleri veritabanına kaydeder |
| Dışa Aktar | HepsiBurada'ya yüklenecek Excel indirir; "Fiyat Gir" sütunu doldurulmuş halde gelir |
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
| HB SKU | HepsiBurada ürün kodu |
| Barkod | |
| Kategori | |
| Ürün Adı | |
| Mevcut Stok | |
| Güncel Fiyat (₺) | Platformdaki mevcut fiyat |
| Güncel Komisyon (%) | Şu an uygulanan komisyon |
| **Teklif 1** | |
| Teklif 1 Fiyatı (₺) | HB'nin önerdiği 1. kademe fiyat |
| Teklif 1 Max Fiyat (₺) | Bu kademeye girebilecek max fiyat |
| Teklif 1 Komisyon (%) | 1. kademedeki komisyon (KDV hariç) |
| Teklif 1 KDV'li Komisyon (%) | Gerçek maliyet hesabında kullanılan oran |
| Teklif 1 Kâr (%) | Bu kademede elde edilecek kâr |
| **Teklif 2** | Aynı yapı |
| **Teklif 3** | Aynı yapı |
| Seçilen Teklif | Teklif 1 / Teklif 2 / Teklif 3 / Manuel / Seçme |
| Manuel Fiyat (₺) | "Manuel" seçilirse girilecek fiyat |
| Barem Önerisi | Fiyata göre kargo baremi |

---

## Akıllı Otomatik Seç Mantığı

- **En düşük indirimli teklif (Teklif 1)'den başlar**
- Komisyonlar sayfasındaki indirimli hedef kâra ulaşılıyorsa o teklif seçilir
- Ulaşılamıyorsa Teklif 2'ye, oradan Teklif 3'e geçilir
- Hiçbiri hedefi karşılamıyorsa ürün seçilmez

---

## HepsiBurada Komisyon Notu

HB komisyon oranları Excel'de **KDV hariç** gelir. Sistem %20 KDV'yi otomatik ekler:

```
gerçek komisyon yükü = excel'deki oran × 1,20
```

Tabloda hem "KDV hariç" hem "KDV dahil" oran gösterilir. Kâr hesabında KDV dahil oran kullanılır.

---

## Excel Formatı (HepsiBurada'dan İndirilen)

Beklenen sütunlar: `Teklif Kodu | Ürün Adı | SKU | Ürün ID | Kategori | Mevcut Stok | Başlangıç Tarihi | Bitiş Tarihi | Teklif Fiyatı 1 | Komisyon Teklifi 1 | Teklif 1 Katılabileceğiniz Maximum Fiyat | Teklif Fiyatı 2 | Komisyon Teklifi 2 | Teklif 2 Max Fiyat | Teklif Fiyatı 3 | Komisyon Teklifi 3 | Teklif 3 Max Fiyat | Güncel Fiyat | Güncel Komisyon | Uygulanacak Komisyon | Fiyat Gir`

Dışa aktarılan Excel'de "Fiyat Gir" sütunu seçilen fiyatla doldurulmuş olarak gelir.

---

## Dikkat edilecekler

- Max fiyat sınırının üstüne girilmesi engellidir; sistem bu durumda uyarı gösterir.
- Tarih sütunları Excel'de seri sayı (Excel date serial) formatında olabilir; sistem otomatik dönüştürür.
- Seçimler kaydedilmeden sayfa kapatılırsa kaybolur.
- Komisyon sayfasında indirimli hedef kâr tanımlı değilse akıllı seç doğru çalışmaz.
