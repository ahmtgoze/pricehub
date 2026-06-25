# Kategoriler

**Route:** `/Categories`

## Ne yapar?

Ürün gruplarını ve her grubun KDV oranını tanımlar. Komisyon hesaplamasının temeli kategorilerdir; kategori yanlış veya eksikse o ürün için fiyat hesaplanamaz.

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Yeni Kategori | CategoryModal'ı açar; ad ve KDV oranı girilerek yeni kategori oluşturulur |
| Dışa Aktar | Tüm kategorileri Excel olarak indirir |
| İçe Aktar | Dosya seçici açılır; Excel yükleyerek toplu kategori ekler/günceller |
| Toplu Sil | Seçili kategorileri siler (seçim varsa görünür) |

---

## Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| Kategori Adı | |
| Varsayılan KDV (%) | Bu kategorideki ürünlerin satış KDV oranı |
| Ürün Sayısı | Kategoride kaç ürün var; 0 ise soluk görünür |
| Durum | Aktif / Pasif rozeti |
| Düzenle | CategoryModal'ı düzenleme modunda açar |
| Sil | Silme onayı ister; ürün içeren kategori silinmeye çalışılırsa uyarı gösterilir |

---

## Arama ve Sayfalama

- Metin arama: kategori adına göre (Türkçe karakter desteğiyle)
- Sayfalama: sayfa başına 20 kayıt

---

## Seçim ve Toplu İşlemler

- Üst satır onay kutusu: tüm sayfayı seçer (kısmi seçimde belirsiz durum gösterilir)
- Bireysel satır onay kutuları
- Seçim sayısı ekranda gösterilir
- **Toplu Sil:** seçili kategorileri siler; kaç ürünün etkileneceğini uyarıyla bildirir
- Seçimi Temizle butonu

---

## Kategori Oluşturma/Düzenleme Modalı (CategoryModal)

| Alan | Açıklama |
|---|---|
| Kategori Adı | Zorunlu |
| Varsayılan KDV Oranı (%) | Zorunlu; genellikle %10 veya %20 |

---

## Excel İçe/Dışa Aktarma

**Dışa aktarma sütunları:** `Kategori Adı | Varsayılan KDV (%)`

**İçe aktarma sütunları:** `Kategori Adı | Varsayılan KDV (%)`

**İçe aktarma mantığı:**
- Aynı adda kategori yoksa → **yeni oluşturulur**
- Aynı adda kategori varsa ve KDV farklıysa → **güncellenir**
- Aynı adda kategori varsa ve KDV aynıysa → **atlanır**

Yükleme sonucunda: oluşturulan / güncellenen / atlanan kayıt sayısı gösterilir.

---

## Dikkat edilecekler

- Kategori silinirse o kategorideki ürünlerin komisyon hesaplaması bozulur; önce ürünleri başka kategoriye taşı.
- Yeni kategori eklenince Komisyonlar sayfasında bu kategori için her platform adına komisyon satırı **otomatik oluşturulur** (sıfır değerle). Oranlara gidip doldurman gerekir.
- KDV oranı yanlış girilirse tüm fiyat hesaplamaları hatalı sonuç verir; değiştirmeden önce Fiyatlar sayfasında etki edilecek ürün sayısını kontrol et.
