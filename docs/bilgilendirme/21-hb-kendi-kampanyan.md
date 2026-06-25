# HepsiBurada — Kendi Kampanyanı Oluştur

**Route:** `/HBCustomCampaign`
**Görünüm:** Sadece HepsiBurada platformu aktifse sidebar'da gösterilir.

## Ne yapar?

HepsiBurada'nın "Kendi Kampanyanı Oluştur" özelliğini yönetir. Satıcı, seçtiği ürünlere belirli bir indirim oranı uygular; karşılığında HepsiBurada o ürünleri kampanya listelerine alır. Sistem, indirimli fiyat ve indirimli komisyon birlikteliğinde kâr etkisini hesaplar.

---

## İş Akışı (A'dan Z'ye)

1. HepsiBurada Satıcı Paneli'nden "Kendi Kampanyanı Oluştur" Excel'i indirilir
2. Bu sayfaya yüklenir
3. Sistem ürünleriyle SKU / barkod / HB SKU eşleştirmesi yapılır
4. İndirim oranı ve kampanya komisyonu görülür
5. Her ürünün kampanya kârı hesaplanır
6. Akıllı otomatik seç veya manuel seçim yapılır
7. Seçimler kaydedilir
8. Excel dışa aktarılır ve HepsiBurada paneline yüklenir

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Excel Yükle | HB Kendi Kampanyanı Oluştur Excel'ini yükler |
| Akıllı Otomatik Seç | Hedef kâra ulaşan ürünleri otomatik seçer |
| Toplu Seç | Görüntülenen ürünleri toplu işaretler |
| Seçimleri Kaydet | Seçimleri veritabanına kaydeder |
| Dışa Aktar | HepsiBurada'ya yüklenecek Excel indirir |
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
| Satıcı SKU | |
| Kategori | |
| Ürün Adı | |
| Mevcut Stok | |
| Güncel Fiyat (₺) | Platformdaki mevcut fiyat |
| İndirim Oranı (%) | HB'nin belirlediği kampanya indirim oranı |
| Kampanya Fiyatı (₺) | Güncel fiyat × (1 − indirim oranı) — sistem hesaplar |
| Normal Komisyon (%) | Kampanya dışındaki komisyon (KDV hariç) |
| Kampanya Komisyonu (%) | Kampanya dönemindeki komisyon (KDV hariç) |
| Normal Komisyon KDV'li (%) | Gerçek maliyet (× 1,20) |
| Kampanya Komisyon KDV'li (%) | Kampanya dönemindeki gerçek maliyet (× 1,20) |
| Normal Kâr (%) | Güncel fiyat + normal komisyonla kâr |
| Kampanya Kârı (%) | Kampanya fiyatı + kampanya komisyonuyla kâr |
| Kâr Farkı (%) | İki senaryo arasındaki fark |
| Seç / Seçme | Ürünü kampanyaya dahil et / etme |
| Barem Önerisi | Fiyata göre kargo baremi |

---

## Akıllı Otomatik Seç Mantığı

- Komisyonlar sayfasındaki **indirimli hedef kâr** baz alınır
- Kampanya fiyatı (güncel fiyat − indirim) + kampanya komisyonuyla bu hedef karşılanıyorsa ürün **seçilir**
- Karşılanmıyorsa **seçilmez**

---

## HepsiBurada Komisyon Notu

Hem normal hem kampanya komisyon oranları Excel'de **KDV hariç** gelir. Sistem her ikisine de %20 KDV ekler:

```
gerçek komisyon yükü = excel'deki oran × 1,20
```

Tabloda her iki değer de gösterilir; kâr hesabında KDV dahil oran kullanılır.

---

## Excel Formatı (HepsiBurada'dan İndirilen)

Beklenen sütunlar: `HB SKU | Satıcı Stok Kodu | Barkod | Ürün Adı | Kategori | Stok | Güncel Fiyat | İndirim Oranı | Normal Komisyon | Kampanya Komisyonu | Kampanyanın Uygulanacağı Fiyat`

Dışa aktarılan Excel'de "Kampanyanın Uygulanacağı Fiyat" sütunu doldurulmuş olarak gelir.

---

## Dikkat edilecekler

- İndirim oranı HepsiBurada tarafından belirlenir; satıcı değiştiremez.
- Kampanya fiyatı otomatik hesaplanır; elle değiştirilemez.
- Seçimler kaydedilmeden sayfa kapatılırsa kaybolur.
- Komisyon sayfasında indirimli hedef kâr tanımlı değilse akıllı seç doğru çalışmaz.
