# Düzenlenen Fiyatlar

**Route:** `/UpdatedPrices`

## Ne yapar?

Pazaryeri ürünleriyle eşleştirilmiş ürünlerin sistem fiyatlarını mevcut pazar fiyatlarıyla karşılaştırır. Platforma doğrudan yüklenebilecek formatta Excel indirilmesini sağlar.

---

## İş Akışı

1. Fiyatlar sayfasında fiyatlar hesaplanır
2. Pazaryeri Ürünleri sayfasında eşleştirmeler yapılır
3. Bu sayfada güncel fiyatlar görünür
4. "Dışa Aktar" ile platforma özgü Excel indirilir
5. İlgili platformun yönetim paneline yüklenir

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Platform Seç | Dropdown — hangi platformun listesini görmek istediğini seçer |
| Yenile | Verileri veritabanından yeniden çeker; ilerleme modalı gösterilir |
| Dışa Aktar | Seçilen platforma özgü Excel formatında indirir |
| Seçilenleri Sil | Seçili eşleşmeleri kaldırır (onay ister) |
| Rehber (?) | O platform için platforma yükleme adımlarını gösterir |

---

## Filtreler ve Sıralama

| Seçenek | Açıklama |
|---|---|
| Metin arama | Ürün adı veya SKU |
| Sıralama — Ad | Ürün adına göre A-Z / Z-A |
| Sıralama — Değişim % | En yüksek fiyat değişiminden en düşüğe |
| Sıralama — Değişim Tutarı | Fark tutarına göre |

---

## Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| Ürün | Adı + SKU |
| Eski Fiyat (₺) | Platformdaki mevcut fiyat |
| Yeni Fiyat (₺) | Sistem tarafından hesaplanan fiyat |
| Değişim | Tutar farkı + yüzde farkı; renk kodlu (yeşil artış, kırmızı düşüş) |
| Sistem Fiyatı (₺) | PriceHub'ın hesapladığı nihai fiyat |

---

## Platform Bazlı Excel Formatları

### Trendyol

| Sütun | Açıklama |
|---|---|
| Merchant SKU | Satıcı ürün kodu |
| Barkod | |
| Ürün Adı | |
| Liste Fiyatı | Fiyat etiketi |
| Satış Fiyatı | Gerçek satış fiyatı |
| Stok | |

### HepsiBurada

| Sütun | Açıklama |
|---|---|
| HB SKU | HepsiBurada ürün kodu |
| Barkod | |
| Ürün Adı | |
| Liste Fiyatı (₺) | |
| Stok | |
| Model Kodu | İsteğe bağlı |

### Shopify (Web Sitesi)

| Sütun | Açıklama |
|---|---|
| Handle | Shopify ürün URL kimliği |
| Title | Ürün başlığı |
| Variant Title | Varyant adı |
| Price | Satış fiyatı |
| Compare At Price | Karşılaştırma fiyatı (üstü çizili fiyat) |
| Barcode | |

---

## Dikkat edilecekler

- Fiyat hesaplanmamış ürünler "fiyat yok" olarak görünür; Fiyatlar sayfasından önce hesaplama yapılmalıdır.
- Her platform için ayrı Excel indirilir; Trendyol Excel'ini HepsiBurada'ya yükleme — format uyumsuzluğu nedeniyle hata verir.
- Büyük fiyat değişimlerini (%30 üzeri gibi) Fiyatlar sayfasından detay modalı ile doğrula; hesap hatası olmadığından emin ol.
- Eşleştirme olmayan ürünler bu sayfada görünmez; Pazaryeri Ürünleri sayfasından önce eşleştirme yapılmalıdır.
