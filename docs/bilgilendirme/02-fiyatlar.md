# Fiyatlar

**Route:** `/Prices`

## Ne yapar?

Sistemin ana çıktı sayfasıdır. Tüm ürünlerin platform bazlı hesaplanmış satış fiyatlarını, kâr oranlarını ve detaylı maliyet dökümlerini gösterir. Platforma göre hangi fiyata satmak gerektiği buradan okunur.

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Fiyatları Hesapla | Tüm ürünler için toplu hesaplama başlatır; ilerleme çubuğu gösterilir |
| Başarısızları Yeniden Hesapla | Önceki hesaplamada hata veren ürünleri tekrar hesaplar |
| Tüm Fiyatları Sıfırla | Tüm fiyat kayıtlarını siler (onay ister) |
| Filtrelenenleri Dışa Aktar | Aktif filtreye uyan ürünleri CSV olarak indirir |
| Seçilenleri Dışa Aktar | Sadece seçili satırları CSV olarak indirir (seçim varsa görünür) |
| Filtre Paneli Aç/Kapat | Gelişmiş filtre bölümünü gösterir/gizler |

---

## Arama ve Filtreler

| Filtre | Açıklama |
|---|---|
| Metin arama | Ürün adı veya SKU ile filtreler (Türkçe karakter normalizasyonu dahil) |
| Kategori | Belirli bir kategoriye ait ürünleri gösterir |
| Kâr Tutarı (₺) | Min / Max net kâr aralığı |
| Kâr Oranı (%) | Min / Max kâr oranı aralığı |
| Hedef Kâr Tutarı (₺) | Min / Max hedef kâr aralığı |
| Platform görünürlüğü | Göz ikonu ile her platformu ayrı ayrı gizle/göster |
| Fiyatsız ürünler | Dashboard'dan gelince otomatik aktif olur |

---

## Tablo Sütunları (Masaüstü)

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| SKU | Ürün kodu; yanında tek ürün hesapla butonu ve geçmiş (grafik) butonu |
| Ürün Adı + Kategori | |
| Maliyet (₺) | Ürünün KDV'li maliyeti |
| Baskı Maliyeti (₺) | Etiket, sticker vb. |
| Ekstra Maliyet (₺) | Diğer ek maliyetler |
| Desi 1–5 | Çok paketli ürünlerde her paketin desisi |
| *(Her platform için tekrar eden sütunlar)* | |
| Satış Fiyatı (₺) | Hesaplanan önerilen satış fiyatı (kalın) |
| Kâr Oranı (%) | Renk kodlu rozet: kırmızı < %10, turuncu %10–20, sarı %20–30, yeşil ≥ %30 |
| Barem | Hangi kargo bareminin kullanıldığı: B1, B2 veya Desi etiketi |
| Net Kâr (₺) | Tüm kesintilerden sonra kalan tutar |
| Paketleme Maliyeti (₺) | > 0 ise gösterilir |
| Detay butonu (ℹ) | PriceDetailModal'ı açar |

---

## Kâr Detay Modalı (PriceDetailModal)

Bir ürün × platform kombinasyonunun tüm maliyet kalemlerini gösterir:

**Maliyet kalemleri:**

| Kalem | Açıklama |
|---|---|
| Ürün maliyeti (KDV'li) | Ham maliyet |
| Baskı maliyeti | Etiket, paket baskısı |
| Ekstra maliyet | Diğer ek maliyetler |
| Paketleme maliyeti | Kutu, poşet, bant vb. (Paketleme sayfasından) |
| Kargo ücreti | Desi veya barem bazlı kargo tarifesinden |
| Komisyon | Satış fiyatı × komisyon oranı |
| Komisyon KDV'si | Komisyon × %20 KDV |
| Hizmet bedeli | Platforma göre sabit veya yüzdelik |
| Stopaj (withholding) | Trendyol/HB'de satış fiyatından kesilen vergi |
| POS hizmet bedeli | HepsiBurada'ya özel |
| İşlem ücreti | Web sitesi için |
| Net KDV | Satış KDV'si eksi indirilecek KDV'ler |
| Kurumlar vergisi | Net kâr pozitifse uygulanır (%25) |
| **Net Kâr** | Tüm kesintilerden sonra kalan |
| **Kâr Oranı (%)** | Net kâr / ürün maliyeti × 100 |

---

## Ürün Geçmişi Modalı

SKU hücresindeki grafik ikonuna tıklayınca açılır. Ürünün tüm fiyat değişikliklerini zaman çizelgesiyle gösterir (tarih, eski fiyat, yeni fiyat, değişim nedeni).

---

## Dışa Aktarma (CSV) Sütunları

`SKU | Ürün Adı | Kategori | Maliyet (₺) | Baskı Maliyeti | Paketleme Maliyeti | Desi | Platform | Satış Fiyatı | Kâr Oranı (%) | Net Kâr`

---

## Mobil Görünüm

Masaüstü tablo yerine kart görünümü gösterilir. Her kart: ürün adı + SKU + kategori başlığı, platform bazında satış fiyatı + kâr oranı + barem etiketi, detay butonu.

---

## Seçim ve Toplu İşlemler

- Tüm sayfayı veya filtrelenenleri seçmek için üst satır onay kutusu
- Seçim sayısı ekranda gösterilir
- Seçilenleri dışa aktar butonu seçim varsa aktif olur
- Seçimi temizle butonu

---

## Dikkat edilecekler

- Hesaplama başlatmadan önce Kategoriler, Platformlar, Komisyonlar ve Kargo Tarifeleri eksiksiz tanımlanmış olmalıdır.
- Hesaplama arka planda çalışır; sayfa kapatılabilir, hesaplama durumaz.
- Kâr oranı kırmızı çıkan ürünler zarar ettiriyor olabilir; PriceDetailModal ile hangi kalemin yüksek çıktığını kontrol et.
- Barem etiketi (B1/B2), fiyatın hangi kargo barem aralığına girdiğini gösterir; fiyat değişince barem kademesi de değişebilir.
