# Dashboard

**Route:** `/Dashboard` (ana sayfa)

## Ne yapar?

Sistemin genel durumunu tek bakışta gösterir. Ürün, platform, fiyat ve kâr özetleri burada bir araya gelir. Veri girmek veya değiştirmek için değil; mevcut durumu izlemek için kullanılır.

---

## Özet Kartlar (4 adet)

| Kart | Gösterilen |
|---|---|
| Aktif Ürünler | Sistemdeki toplam aktif ürün sayısı |
| Platformlar | Aktif platform sayısı |
| Hesaplanan Fiyatlar | Fiyatı hesaplanmış ürün kaydı sayısı |
| Fiyatsız Ürünler | Henüz fiyatı hesaplanmamış ürün sayısı (varsa kırmızı, yoksa yeşil) |

"Fiyatsız Ürünler" kartına tıklamak, Fiyatlar sayfasını fiyatsız ürün filtresiyle açar.

---

## Kâr Özeti Bölümü

- Ortalama kâr oranı (%)
- Toplam fiyatlı kayıt sayısı
- Negatif kârlı ürün sayısı (uyarı ikonu ile)
- Tanımlı kategori sayısı
- Aktif komisyon kuralı sayısı

---

## Kâr Dağılımı Grafiği

Ürünlerin kâr marjı aralıklarına göre dağılımını bar grafik olarak gösterir.

**Aralıklar:** `< 0%` | `0–10%` | `10–20%` | `20–30%` | `30–40%` | `40–50%` | `50–75%` | `75–100%` | `100–200%` | `200–300%` | `> 300%`

**Renkler:** Kırmızı (negatif) → Turuncu → Sarı → Yeşil (yüksek kâr)

**Tıklanabilir:** Bir bara tıklamak, Fiyatlar sayfasını o kâr aralığı filtresiyle açar.

**Özel Aralık Filtresi:** Min % ve Max % girerek kendi aralığını oluşturabilirsin; "Uygula" butonuyla Fiyatlar sayfasına yönlendirir.

---

## Platform Bazlı Kâr Tablosu (masaüstünde)

Her aktif platform için bir satır gösterir.

| Sütun | Açıklama |
|---|---|
| Platform Adı | Trendyol / HepsiBurada / Web Sitesi |
| Fiyat Sayısı | O platformda hesaplanan fiyat adedi |
| Ortalama Kâr | Tüm ürünlerin ortalaması |
| Minimum Kâr | En düşük kâr oranı |
| Maksimum Kâr | En yüksek kâr oranı |
| Negatif Kâr Sayısı | Kâr < 0 olan ürün sayısı |

Platform satırına tıklamak, detaylı ürün listesini göstermek için genişler.

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Fiyatları Hesapla | Tüm ürünler için toplu fiyat hesaplama başlatır |
| Başarısızları Yeniden Hesapla | Son hesaplamada hata veren ürünleri tekrar hesaplar |
| Tüm Fiyatları Sıfırla | Tüm fiyat kayıtlarını siler (onay ister) |
| Filtrelenenleri Dışa Aktar | Aktif filtreye göre CSV indirir |
| Seçilenleri Dışa Aktar | Seçili ürünleri CSV indirir (sadece seçim varsa görünür) |

---

## Tarih Filtresi

Belirli tarih aralığında eklenen yeni ürünleri görmek için başlangıç/bitiş tarihi girilebilir.

---

## Dikkat edilecekler

- Dashboard salt görüntüleme amaçlıdır; burada veri değiştirilemez.
- Fiyat hesaplaması yapılmamışsa kâr kartları boş görünür.
- Negatif kâr sayısı > 0 ise uyarı ikonu ile vurgulanır; bu ürünleri Fiyatlar sayfasında incele.
