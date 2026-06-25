# Hesaplayıcı

**Route:** `/Calculator`

## Ne yapar?

Belirli bir ürün ve platform kombinasyonu için farklı fiyat senaryolarını test etmeye yarar. Hiçbir veri kaydetmez; denemek ve anlık sonuç görmek içindir.

---

## Çalışma Modları

| Mod | Açıklama |
|---|---|
| **Manuel Mod** | Tüm değerler elle girilir; sistemdeki ürünlerden bağımsız |
| **Ürün Modu** | Sistemdeki bir ürün seçilir; maliyet, desi ve baskı maliyeti otomatik dolar; komisyon kategoriden otomatik çekilir |

---

## Giriş Alanları

| Alan | Mod | Açıklama |
|---|---|---|
| Ürün seçimi | Ürün modu | Dropdown; seçilince diğer alanlar otomatik dolar |
| Maliyet (₺) | Her ikisi | KDV dahil alış maliyeti |
| KDV Oranı (%) | Manuel | |
| Desi | Her ikisi | Hacimsel ağırlık |
| Platform | Her ikisi | Hesaplamanın yapılacağı platform |
| Kargo Firması | Her ikisi | Dropdown — seçili platformun kargo firmaları |
| Kargo Modu | Her ikisi | "Firma tarifeleri kullan" veya "Manuel fiyat gir" toggle |
| Manuel Kargo (₺) | Manuel kargo modunda | Sabit kargo ücreti |
| Komisyon Oranı (%) | Manuel | Ürün modunda kategoriden otomatik gelir |
| Hedef Kâr (%) | Her ikisi | İstenen minimum kâr oranı |
| Paketleme Modu | Her ikisi | "Paket seç" veya "Manuel tutar" toggle |
| Paket seçimi | Paket modunda | Tanımlı paket gruplarından seçim |
| Paketleme Maliyeti (₺) | Manuel veya otomatik | |
| Baskı Maliyeti (₺) | Her ikisi | |
| Ekstra Maliyet (₺) | Her ikisi | |
| Çok Paket | Her ikisi | Toggle; açılınca her paket için desi + paket kalemi girilebilir |
| Aynı Gün Teslimat | Her ikisi | Toggle; açılınca aynı gün kargo tarifesi kullanılır |

---

## Buton

| Buton | Ne yapar |
|---|---|
| Hesapla | Girilen tüm değerlerle fiyat ve kâr hesaplar; sonuçları gösterir |

---

## Sonuç Ekranı

Hesaplama tamamlanınca şunlar görünür:

| Gösterge | Açıklama |
|---|---|
| Satış Fiyatı (₺) | Hedef kâra ulaşan hesaplanan fiyat |
| Net Kâr (₺) | Tüm kesintilerden sonra kalan |
| Kâr Oranı (%) | Net kâr / maliyet × 100 |

### Detaylı Döküm Kartı

| Kalem | Açıklama |
|---|---|
| Ürün maliyeti (KDV'li) | Ham maliyet |
| Baskı maliyeti | |
| Ekstra maliyet | |
| Paketleme maliyeti | |
| Kargo ücreti | Desi veya barem bazlı |
| Komisyon tutarı | Satış fiyatı × oran |
| Komisyon KDV'si | Komisyon × %20 |
| Hizmet bedeli | Platforma göre |
| Stopaj | Trendyol/HB'de |
| POS hizmet bedeli | HepsiBurada'da |
| Net KDV | Satış KDV'si eksi indirilecek KDV'ler |
| Kurumlar vergisi | Kâr pozitifse uygulanır |
| **Net Kâr** | |
| **Kâr Oranı (%)** | |

---

## Fiyat Bulma Algoritması

Sistem, girilen hedef kâr oranını sağlayan satış fiyatını **ikili arama** ile bulur:
- Tolerans: 0,01 ₺
- Maksimum deneme sayısı: 100 iterasyon
- Birden fazla kâr hedefi varsa (oran + tutar + minimum tutar) hepsini aynı anda sağlayan fiyat bulunur

---

## Dikkat edilecekler

- Hesaplayıcı hiçbir veri kaydetmez; her hesaplama geçicidir.
- Platformlar sayfasından yapılan ayarlar (stopaj, hizmet bedeli, barem aralıkları) hesaplamalarda otomatik uygulanır; bunları burada değiştiremezsin.
- Ürün modunda komisyon, ürünün kategorisine bağlı platformdan otomatik çekilir; oran doğru görünmüyorsa Komisyonlar sayfasını kontrol et.
