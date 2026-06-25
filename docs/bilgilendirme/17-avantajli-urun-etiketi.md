# Trendyol — Avantajlı Ürün Etiketi

**Route:** `/AdvantageProductTag`
**Görünüm:** Sadece Trendyol platformu aktifse sidebar'da gösterilir.

## Ne yapar?

Trendyol'un "Avantaj", "Çok Avantaj" ve "Süper Avantaj" etiket kampanyasını yönetir. Her etiket farklı bir indirim oranı ve buna karşılık düşen komisyon tarifesi içerir. Sistem hangi etiketin daha kârlı olduğunu hesaplar.

---

## İş Akışı (A'dan Z'ye)

1. Trendyol Satıcı Paneli'nden "Avantajlı Ürün Etiketi" Excel'i indirilir
2. Bu sayfaya yüklenir
3. Sistem ürünleriyle SKU/barkod eşleştirmesi yapılır
4. Her ürün için 3 etiketten hangisinin hedef kârı karşıladığı hesaplanır
5. Akıllı otomatik seç veya manuel seçim yapılır
6. Seçimler kaydedilir
7. Excel dışa aktarılır ve Trendyol paneline yüklenir

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Excel Yükle | Trendyol Avantajlı Ürün Etiketi Excel'ini yükler |
| Akıllı Otomatik Seç | Tüm ürünler için en uygun etiketi seçer |
| Toplu Seç | Görüntülenen ürünleri toplu işaretler |
| Seçimleri Kaydet | Seçilen etiketleri veritabanına kaydeder |
| Dışa Aktar | Platforma yüklenecek Excel indirir |
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
| HB SKU / Barkod | |
| Kategori | |
| Ürün Adı | |
| Mevcut Stok | |
| Güncel Fiyat (₺) | Şu anki platformdaki fiyat |
| Önerilen Fiyat (₺) | Trendyol'un önerisi |
| Etiket Seçimi | Avantaj / Çok Avantaj / Süper Avantaj / Manuel / Seçme |
| Seçilen Komisyon (%) | Seçilen etiketteki komisyon oranı (KDV hariç gösterilir) |
| KDV'li Komisyon (%) | Aynı oran + %20 KDV (gerçek maliyet) |
| Sistem Kârı (%) | Seçilen fiyat ve komisyonla elde edilecek kâr |
| Manuel Fiyat (₺) | "Manuel" seçilirse girilecek fiyat |
| Barem Önerisi | Fiyata göre kargo baremi |

---

## 3 Etiket Kademesi

| Etiket | İndirim Seviyesi | Komisyon |
|---|---|---|
| Avantaj | En az | En yüksek |
| Çok Avantaj | Orta | Orta |
| Süper Avantaj | En fazla | En düşük |

**Akıllı seç:** En yüksek indirimli etiketten (Süper Avantaj) başlar ve aşağı doğru iner; indirimli hedef kâra ilk ulaşan etiketi seçer.

---

## Komisyon Notu

Trendyol Avantajlı Ürün Etiketi komisyon oranları **KDV hariç** gelir. Tabloda her iki değer de gösterilir:
- "Komisyon (%)" → Excel'deki ham oran
- "KDV'li Komisyon (%)" → Gerçek maliyet hesabında kullanılan oran (ham × 1,20)

---

## Dikkat edilecekler

- Seçimler kaydedilmeden sayfa kapatılırsa kaybolur.
- Komisyon sayfasında indirimli hedef kâr tanımlı değilse akıllı seç doğru çalışmaz.
- "Seçme" seçeneği ürünü kampanyadan çıkarır; o ürün dışa aktarılan Excel'e dahil edilmez.
