# Pazaryeri Ürünleri

**Route:** `/MarketplaceProducts`

## Ne yapar?

Trendyol, HepsiBurada veya Shopify'dan indirilen ürün listesini sisteme yükler ve sistem ürünleriyle eşleştirir. Eşleşme kurulduktan sonra "Düzenlenen Fiyatlar" ve "Düzenlenen Maliyetler" sayfaları kullanılabilir hale gelir.

---

## İş Akışı (A'dan Z'ye)

1. İlgili platformun yönetim panelinden ürün listesi Excel olarak indirilir
2. PriceHub'da platform seçilip Excel yüklenir
3. Sistem otomatik eşleştirme yapar (güven skoru ile)
4. Güven skoru düşük veya eşleşemeyen ürünler için manuel eşleştirme yapılır
5. Eşleşmeler kaydedilir
6. Düzenlenen Fiyatlar sayfasından platforma yüklenecek Excel alınır

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Platform Seç | Dropdown — hangi platformun Excel'i yükleneceğini seçer |
| Rehber (?) | O platforma ait yükleme talimatlarını gösterir/gizler |
| Excel Yükle | Dosya seçici açılır; seçilen Excel işlenir |
| Otomatik Eşleştir | Tüm yüklü ürünleri SKU/barkod/ad puanlama sistemiyle eşleştirmeye çalışır |
| Seçilenleri Sil | Seçili eşleşmeleri kaldırır (onay ister) |
| Stok Senkronizasyonu | Sistemdeki stok miktarlarını platforma gönderir |

---

## Platform Bazlı Beklenen Excel Formatları

| Platform | Beklenen sütunlar |
|---|---|
| Trendyol | Ürün Adı, Model Kodu (SKU), Barkod, Stok |
| HepsiBurada | Ürün Adı, Satıcı Stok Kodu (SKU), Barkod, Stok, Kategori |
| Shopify | Ürün Başlığı, Varyant, Barkod, Stok |

---

## Yükleme Sonrası Özet Modalı

Excel yüklenince şunlar gösterilir:
- Yeni eklenen ürün sayısı
- Güncellenen ürün sayısı
- Sıfır stoklu ürün sayısı
- Stok değişen ürün sayısı
- Sistemde eşleşmeyen ürünler (eksik ürünler listesi)

---

## Eşleştirme Durumları

| Durum | Görünüm |
|---|---|
| Eşleşti | Yeşil; sistem ürünü bağlı |
| Eşleşmedi | Kırmızı; manuel eşleştirme gerekli |
| Beklemede | Sarı; düşük güven skoru |

---

## Eşleştirme Nasıl Çalışır?

Otomatik eşleştirme puanlama algoritması:
1. SKU (Model Kodu / Satıcı Stok Kodu) ile tam eşleşme → en yüksek puan
2. Barkod ile tam eşleşme → yüksek puan
3. Ürün adı benzerliği → düşük puan

Puan minimum eşiğin üzerindeyse otomatik eşleştirilir. Altındaysa manuel müdahale istenir.

---

## Manuel Eşleştirme

Her eşleşmemiş satırın yanında arama dropdown'u bulunur. Buraya ürün adı, SKU veya barkod yazılarak sistem ürünleri arasında arama yapılır ve "Eşleştir" butonuyla bağlantı kurulur.

---

## Filtreler

| Filtre | Açıklama |
|---|---|
| Durum | Tümü / Eşleşti / Eşleşmedi |
| Metin arama | Ürün adı, SKU veya barkod |

---

## Dikkat edilecekler

- Bir ürün birden fazla platformdaki pazaryeri ürünüyle eşleştirilebilir.
- Eşleşme silinince o ürünün "Düzenlenen Fiyatlar" ve "Düzenlenen Maliyetler"deki satırı da kalkar.
- Her platformun Excel formatı farklıdır; yanlış platform seçilip Excel yüklenmesi eşleştirmeleri bozabilir.
- Otomatik eşleştirme sonucundaki düşük güven skorlu (sarı) kayıtları mutlaka kontrol et; yanlış eşleştirme yanlış fiyat aktarımına yol açar.
