# Kargo Tarifeleri

**Route:** `/ShippingRates`

## Ne yapar?

Desi veya barem (fiyat aralığı) bazlı kargo ücretlerini tanımlar. Fiyat hesaplama motoru her ürün için bu tarifelerden kargo maliyetini bulur.

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Yeni Kargo Tarifesi | ShippingRateModal açar; tek tarife eklemek için |
| İçe Aktar | Excel ile toplu yükleme; ilerleme modalı gösterilir |
| Dışa Aktar | Mevcut tarifeleri Excel olarak indirir |
| Toplu Sil | Seçili satırları siler (seçim varsa görünür) |

---

## Filtreler

| Filtre | Açıklama |
|---|---|
| Platform | Trendyol / HepsiBurada / Web Sitesi |
| Tarife türü | Desi / Barem 1 / Barem 2 |
| Kargo firması | Belirli firmaya ait tarifeleri gösterir |
| Kaynak | Sistem (admin) / Kullanıcı (manuel) |
| Metin arama | Platform adı veya firma adında arama |
| Sayfalama | Sayfa başına 20 kayıt |

---

## Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| Platform | |
| Tarife Türü | Desi / Barem 1 / Barem 2 |
| Desi | Sadece Desi türündeyse gösterilir |
| Fiyat (₺) | Kargo ücreti |
| KDV Oranı (%) | Kargo KDV'si |
| Kargo Firması | |
| Aynı Gün Teslimat | Evet / Hayır |
| Durum | Aktif / Pasif |
| Düzenle / Sil | |

---

## Tarife Oluşturma/Düzenleme Modalı (ShippingRateModal)

| Alan | Açıklama |
|---|---|
| Platform | Dropdown |
| Tarife Türü | Desi / Barem 1 / Barem 2 |
| Desi | Tarife türü "Desi" ise zorunlu |
| Fiyat (₺) | Zorunlu |
| KDV Oranı (%) | |
| Kargo Firması | |
| Aynı Gün Teslimat | Toggle |
| Durum | Aktif / Pasif |

---

## Tarife Türleri

| Tür | Açıklama | Hangi durum |
|---|---|---|
| **Desi** | Ürünün desi değerine göre fiyatlandırma | Her zaman kullanılabilir |
| **Barem 1** | Satış fiyatı düşük aralıktaysa (örn. 0–149 ₺) uygulanan kargo | Platformda barem açıksa |
| **Barem 2** | Satış fiyatı yüksek aralıktaysa (örn. 150–299 ₺) uygulanan kargo | Platformda barem açıksa |

**Web Sitesi platformu Barem 1 ve Barem 2 kullanamaz.** Web sitesinde sadece Desi türü kullanılır.

---

## Tarife Kaynakları

| Kaynak | Kimler görür | Eşleştirme |
|---|---|---|
| **Sistem tarifesi** (`is_admin_created=true`) | Tüm kullanıcılar | `platform_type` ile eşleşir |
| **Kullanıcı tarifesi** (`is_manual=true`) | Sadece oluşturan kullanıcı | `platform_id` ile eşleşir |

Aynı desi/aralık için ikisi de varsa **kullanıcı tarifesi önceliklidir.**

---

## Excel İçe Aktarma

**Sütunlar:** `Platform | Tarife Türü | Desi | Fiyat | KDV Oranı | Kargo Firması | Aynı Gün Teslimat`

**İçe aktarma mantığı:**
- Platform adı normalize eşleştirmeyle bulunur
- Aynı platform + tür + desi + aynı gün kombinasyonu zaten varsa → hata verilir (duplicate)
- 100'lük gruplar halinde işlenir

---

## Dikkat edilecekler

- Hiçbir tarifenin ürünün desisiyle eşleşmediği durumda kargo maliyeti **sıfır** kabul edilir; hesaplama devam eder ama sonuç hatalı olur.
- Barem 1 ve Barem 2 tarifelerinin devreye girmesi için Platformlar sayfasında o platform için barem özelliğinin açık olması gerekir.
- Aynı gün teslimat tarifeleri yalnızca pazaryeri (Trendyol, HepsiBurada) platformlarında geçerlidir.
- Farklı kargo firmaları için farklı tarifeler tanımlanabilir; Platformlar sayfasından seçilen firma esas alınır.
