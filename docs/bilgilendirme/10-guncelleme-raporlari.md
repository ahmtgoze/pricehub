# Güncelleme Raporları

**Route:** `/UpdateReports`

## Ne yapar?

Tüm fiyat değişikliklerinin denetim kaydını (audit log) tutar. Kim ne zaman hangi ürünün fiyatını ne kadar değiştirdi, kâr oranı nasıl etkilendi — hepsi burada izlenebilir.

---

## Sekmeler

| Sekme | Gösterilen |
|---|---|
| Aktif | Arşivlenmemiş, güncel raporlar |
| Arşivlenmiş | Arşive alınmış eski raporlar |

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Seçilenleri Arşivle | Seçili satırları arşive taşır (veriler silinmez, aktif listeden çıkar) |
| Seçilenleri Geri Yükle | Arşivden aktife geri alır (arşiv sekmesinde görünür) |
| Seçilenleri Sil | Seçili kayıtları kalıcı siler (geri alınamaz) |
| Dışa Aktar | Filtrelenmiş listeyi Excel olarak indirir |

---

## Filtreler

| Filtre | Açıklama |
|---|---|
| Metin arama | Ürün adı veya SKU ile arama |
| Platform filtresi | Belirli bir platforma ait değişiklikleri gösterir |
| Değişiklik Türü | Maliyet Güncellemesi / Kargo Güncellemesi / Komisyon Güncellemesi / Platform Güncellemesi / Manuel |
| Sayfalama | Sayfa başına 20 kayıt |

---

## Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| Tarih | Türkçe tarih-saat formatında |
| Ürün Adı | |
| Ürün SKU | |
| Platform | |
| Değişiklik Türü | Renk kodlu rozet |
| Eski Fiyat (₺) | Değişiklik öncesi fiyat |
| Yeni Fiyat (₺) | Değişiklik sonrası fiyat |
| Değişim | Ok ikonu + tutar + yüzde; yeşil yukarı ok (artış), kırmızı aşağı ok (düşüş), çizgi (değişim yok) |
| Değişim Nedeni | Sistem tarafından otomatik yazılır (örn. "Komisyon değişti") |

---

## Değişiklik Türü Rozet Renkleri

| Tür | Renk |
|---|---|
| Maliyet Güncellemesi | Mavi |
| Kargo Güncellemesi | Turuncu |
| Komisyon Güncellemesi | Mor |
| Platform Güncellemesi | Yeşil |
| Manuel | Gri |

---

## Ürün Geçmişi Modalı

Bir ürünün tüm fiyat değişim geçmişini zaman çizelgesiyle görmek için tablodaki ürün adına tıklanır.

Gösterilenler:
- Fiyat değişimlerinin grafik görünümü (tarih / fiyat eksenleri)
- Her değişim noktasında: tarih, eski fiyat → yeni fiyat, değişim nedeni

---

## Seçim ve Toplu İşlemler

- Üst satır onay kutusu: tüm sayfayı seçer (kısmi seçimde belirsiz durum)
- "Tümünü Seç" seçeneği: filtrelenmiş tüm kayıtları seçer
- Seçim sayısı rozette gösterilir

---

## Dikkat edilecekler

- Raporlar fiyat hesaplama her çalıştırıldığında **otomatik oluşur**; elle oluşturulamaz.
- Kayıt silmek **geri alınamaz**; emin değilsen arşivlemeyi tercih et.
- Arşivlenen raporlar veritabanında tutulur, aktif listede görünmez; istenince geri alınabilir.
- Uzun vadeli fiyat analizi için Excel dışa aktarmayı kullan.
