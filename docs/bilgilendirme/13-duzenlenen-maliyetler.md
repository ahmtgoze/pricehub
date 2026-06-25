# Düzenlenen Maliyetler

**Route:** `/UpdatedCosts`

## Ne yapar?

Pazaryeri ürünleriyle eşleştirilmiş ürünlerin maliyet verilerini görüntüler ve platforma yüklenecek formatta dışa aktarır. Maliyet alanlarını platformda güncel tutmak için kullanılır.

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Platform Seç | Dropdown — görüntülenecek platformu seçer |
| Dışa Aktar | Seçili platform formatında Excel indirir |
| Seçilenleri Sil | Seçili eşleşmeleri kaldırır (onay ister) |

---

## Filtreler ve Sıralama

| Seçenek | Açıklama |
|---|---|
| Metin arama | Ürün adı, barkod, model kodu veya SKU ile arama |
| Sıralama — Barkod | |
| Sıralama — Maliyet | |
| Sıralama — Tarih | Eşleştirme tarihine göre |

---

## Tablo Sütunları

| Sütun | Hangi platformda | Açıklama |
|---|---|---|
| ☐ | Her ikisi | Seçim kutusu |
| Barkod / HB SKU | Trendyol / HepsiBurada | Platforma göre değişir |
| Model Kodu | HepsiBurada | |
| Satıcı SKU / Varyant SKU | Her ikisi | |
| Kategori | Her ikisi | |
| Ürün Adı | Her ikisi | |
| Satış Fiyatı (₺) | Her ikisi | Platformdaki güncel satış fiyatı |
| Stok | Her ikisi | |
| Sistem Maliyeti (₺) | Her ikisi | PriceHub'daki KDV dahil maliyet |
| KDV Oranı (%) | Her ikisi | |
| Desi / Desi Aralığı | Her ikisi | Çok paket ürünlerde virgülle ayrılmış desi değerleri |
| Ekstra Maliyet (₺) | Her ikisi | Baskı + ekstra maliyetler birleştirilmiş |

---

## Platform Bazlı Excel Formatları

### Trendyol
`Barkod | Satıcı SKU | Kategori | Ürün Adı | Satış Fiyatı | Stok | Sistem Maliyeti | KDV Oranı | Desi | Ekstra Maliyet`

### HepsiBurada
`HB SKU | Model Kodu | Satıcı SKU | Kategori | Ürün Adı | Satış Fiyatı | Stok | Sistem Maliyeti | KDV Oranı | Desi | Ekstra Maliyet`

---

## Dikkat edilecekler

- Bu sayfa maliyet **değişikliği yapmaz**; sadece görüntüler ve dışa aktarır. Maliyeti değiştirmek için Ürünler sayfasını kullan.
- Eşleştirme olmayan ürünler bu sayfada görünmez; Pazaryeri Ürünleri sayfasından önce eşleştirme yapılmalıdır.
- Dışa aktarılan Excel doğrudan platforma yüklenebilir; ek düzenleme gerektirmez.
- Çok paketli ürünlerde desi sütununda birden fazla değer virgülle ayrılmış görünür (örn. "3, 3, 2").
