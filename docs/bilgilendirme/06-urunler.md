# Ürünler

**Route:** `/Products`

## Ne yapar?

Ana ürün kataloğunu yönetir. Sistemdeki tüm ürünler buradan eklenir, düzenlenir ve silinir. Fiyat hesaplamalarının başlangıç noktasıdır.

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Yeni Ürün | ProductModal'ı açar; tek ürün eklemek için |
| Toplu İşlemler | BulkOperationsModal'ı açar (seçim varsa aktif) |
| İçe Aktar / Dışa Aktar | Excel ile toplu yükleme veya indirme |
| Fiyatları Hesapla | Seçili ürünlerin fiyatlarını hesaplar; Fiyatlar sayfasına yönlendirir |

---

## Filtreler ve Arama

| Filtre | Açıklama |
|---|---|
| Metin arama | Ürün adı, SKU veya barkod ile arama |
| Kategori filtresi | Belirli kategoriye ait ürünleri gösterir |
| Durum filtresi | Aktif / Pasif / Tümü |
| Sıralama | Oluşturma tarihi, ad, maliyet |
| Sayfalama | Sayfa başına 20 kayıt |

---

## Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| SKU | Ürün kodu |
| Barkod | |
| Ürün Adı | |
| Kategori | |
| Maliyet (₺) | KDV dahil maliyet |
| Baskı Maliyeti (₺) | Etiket, sticker vb. |
| Ekstra Maliyet (₺) | Diğer ek maliyetler |
| Desi | Hacimsel ağırlık (veya çok paket için desi 1–5) |
| Durum | Aktif / Pasif rozeti |
| Düzenle / Sil | |

---

## Ürün Oluşturma/Düzenleme Modalı (ProductModal)

| Alan | Açıklama |
|---|---|
| Ürün Adı | Zorunlu |
| SKU | Zorunlu; benzersiz olmalı |
| Barkod | İsteğe bağlı |
| Kategori | Dropdown — tanımlı kategoriler |
| Maliyet (₺) | KDV dahil alış maliyeti |
| Baskı Maliyeti (₺) | Etiket, ambalaj baskısı vb. |
| Ekstra Maliyet (₺) | Diğer ek maliyetler |
| Desi | Hacimsel ağırlık (tek paket için) |
| Çok Paket | Toggle — açılınca her paket için ayrı desi girilebilir |
| Desi 1–5 | Çok paket açıksa her paketin desisi |
| Paket Seçimi | Paketleme sayfasından tanımlı paket grubunu atar |
| Referans Ürün | Aynı ürünün farklı adetli versiyonlarını birbirine bağlar (maliyet zinciri) |
| Durum | Aktif / Pasif |

---

## Çok Paketli Ürünler

Aynı ürünün 1'li, 2'li, 3'lü vb. paketlerini birbirine bağlayan zincir kurulabilir. Referans ürün seçildiğinde maliyet oranlaması otomatik yapılır (örn. 2'li paketin maliyeti = 1'li × 2). Bu ürünlerde barem kullanılmaz; her paketin desisi ayrı girilir ve kargo desiler toplanarak hesaplanır.

---

## Toplu İşlemler Modalı (BulkOperationsModal)

Seçili ürünler için toplu:
- Kategori değiştirme
- Maliyet güncelleme (sabit tutar veya yüzde artış/azalış)
- Durum değiştirme (aktif/pasif)
- Silme

---

## Excel İçe/Dışa Aktarma

**Zorunlu sütunlar:** `Ürün Adı | SKU | Maliyet`

**İsteğe bağlı sütunlar:** `Barkod | Kategori | Desi | Baskı Maliyeti | Ekstra Maliyet`

**İçe aktarma mantığı:**
- SKU veya barkod çakışırsa → mevcut ürün **güncellenir**
- Yeni SKU/barkod → **oluşturulur**
- Hata veren satırlar loglanır, geri kalanlar işlenir; sonunda özet gösterilir

---

## Dikkat edilecekler

- Ürün silinince o ürünün tüm fiyat geçmişi, pazaryeri eşleşmeleri ve güncelleme raporları da silinir.
- Desi yanlış girilirse kargo maliyeti hatalı hesaplanır; bu da satış fiyatını ve kâr oranını doğrudan etkiler.
- Kategori atanmamış ürünler için komisyon bulunamaz → fiyat hesaplanamaz.
- Çok paketli ürünlerde her paketin desisini ayrı ayrı gir; sistem toplam desiyi kargo hesabında kullanır.
