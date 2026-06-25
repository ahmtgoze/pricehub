# Komisyonlar

**Route:** `/Commissions`

## Ne yapar?

Her platform × kategori kombinasyonu için komisyon oranı ve kâr hedefleri belirlenir. Fiyat hesaplama motoru bu değerleri kullanarak satış fiyatlarını türetir.

---

## Butonlar

| Buton | Ne yapar |
|---|---|
| Yeni Komisyon | CommissionModal'ı açar; yeni kural oluşturulur |
| Şablon İndir | Doldurulabilir Excel şablonu indirir |
| İçe Aktar | Excel ile toplu komisyon yükler; ilerleme modalı gösterilir |
| Dışa Aktar | Tüm komisyon kurallarını Excel olarak indirir |
| Toplu Sil | Seçili satırları siler (seçim varsa görünür) |

---

## Filtreler ve Arama

| Filtre | Açıklama |
|---|---|
| Metin arama | Platform adı veya kategori adında arama |
| Platform filtresi | Belirli bir platforma ait kuralları gösterir |
| Kategori filtresi | Belirli bir kategoriye ait kuralları gösterir |
| Sıralama | Kategori A-Z / Z-A, Platform A-Z / Z-A |
| Eksik Oranlar | Komisyon oranı %0 olan kayıtları vurgulu gösterir; kaç tane olduğu rozette yazar |

---

## Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| ☐ | Seçim kutusu |
| Platform | |
| Kategori | |
| Komisyon (%) | Platforma ödenen oran; 0 ise kırmızı uyarı ikonu |
| Komisyon KDV (%) | Komisyon üzerindeki KDV oranı (genellikle %20) |
| Min Tutar (₺) | Kâr bu tutarın altına düşemez |
| Hedef Oran (%) | Normal satışta hedeflenen kâr yüzdesi |
| Hedef Tutar (₺) | Hedef orana karşılık gelen ₺ tutarı |
| İndirimli Min Tutar (₺) | Kampanyalarda kabul edilen minimum kâr tutarı |
| İndirimli Oran (%) | Kampanyalarda kabul edilen daha düşük kâr hedefi |
| İndirimli Tutar (₺) | İndirimli hedefe karşılık gelen ₺ tutarı |
| Durum | Aktif / Pasif |
| Düzenle / Sil | |

---

## Komisyon Oluşturma/Düzenleme Modalı (CommissionModal)

| Alan | Açıklama |
|---|---|
| Platform | Dropdown — sistem platformları |
| Kategori | Dropdown — tanımlı kategoriler |
| Komisyon Oranı (%) | Zorunlu |
| Komisyon KDV (%) | Varsayılan %20 |
| Min Kâr Tutarı (₺) | İsteğe bağlı |
| Hedef Kâr Oranı (%) | İsteğe bağlı |
| Hedef Kâr Tutarı (₺) | İsteğe bağlı |
| İşlem Ücreti (₺) | Sadece Web Sitesi platformunda |
| İndirimli Min Kâr Tutarı (₺) | Kampanya sayfaları için |
| İndirimli Hedef Kâr Oranı (%) | Kampanya sayfaları için |
| İndirimli Hedef Kâr Tutarı (₺) | Kampanya sayfaları için |

---

## Excel İçe Aktarma

**Desteklenen sütun başlıkları:** Sistem, farklı isimlendirmeleri (örn. "Kom. KDV %" veya "Commission VAT") otomatik eşleştirir.

**Zorunlu sütunlar:** Platform, Kategori, Komisyon Oranı

**İçe aktarma mantığı:**
- Platform ve kategori adları normalize edilmiş eşleştirmeyle bulunur (büyük/küçük harf, Türkçe karakter fark etmez)
- "Elektronik Aksesuarları" → "Elektronik" gibi kısmi eşleştirme desteklenir
- Hata veren satırlar loglanır, geri kalanlar eklenir

**Dışa aktarma sütunları:**
`Platform | Kategori | Komisyon Oranı | Komisyon KDV | Min Kâr Tutarı | Hedef Kâr Oranı | Hedef Kâr Tutarı | İşlem Ücreti | İndirimli Min Kâr Tutarı | İndirimli Hedef Kâr Oranı | İndirimli Hedef Kâr Tutarı`

---

## Dikkat edilecekler

- Komisyon oranı %0 bırakılan kombinasyonlar için fiyat hesaplaması yapılır ama kâr yanlış çıkar; "Eksik Oranlar" filtresiyle kontrol et.
- Yeni kategori eklenince her platform için komisyon satırları **otomatik oluşturulur** (değer sıfır); burada doldurulması gerekir.
- HepsiBurada komisyon oranlarını Excel'de **KDV hariç** görürsün; sisteme ham oranı gir, motor %20 KDV'yi otomatik ekler.
- İndirimli hedef kâr tanımlı değilse kampanya sayfalarının "akıllı otomatik seç" özelliği doğru çalışmaz.
