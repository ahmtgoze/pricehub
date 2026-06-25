# Platformlar

**Route:** `/Platforms`

## Ne yapar?

Trendyol, HepsiBurada ve Web Sitesi platformlarının yapılandırmasını yönetir. Hangi platformun aktif olduğu, kargo firması seçimi, barem/vergi ayarları burada yapılır.

---

## Platform Kartları (3 adet)

Her platform için ayrı bir kart bulunur. Kartta şunlar görünür:

| Bilgi | Açıklama |
|---|---|
| Platform adı + ikon | Trendyol / HepsiBurada / Web Sitesi |
| Aktif/Pasif toggle | Platformu etkinleştirme/devre dışı bırakma |
| Kargo firması | Seçili kargo firması adı (seçilmemişse "belirtilmemiş") |
| Barem durumu | Aktif mi? (✓ / ✗) |
| Aynı gün teslimat | Aktif mi? (✓ / ✗) |
| Sistem yönetimi notu | Pazaryeri platformlarında bazı ayarların admin tarafından belirlendiğini belirtir |

---

## Butonlar

| Buton | Nerede görünür | Ne yapar |
|---|---|---|
| Aktif/Pasif Toggle | Her kart | Platformu açar/kapatır; kapanan platform sidebar'dan gizlenir |
| Tüm Ayarlar | Web Sitesi kartı (mavi) | PlatformSettingsModal'ı tam düzenleme modunda açar |
| Kargo & Seçenekler | Pazaryeri kartları (gri) | PlatformSettingsModal'ı kısıtlı modda açar |

---

## Platform Ayarları Modalı (PlatformSettingsModal)

### Web Sitesi için (tam düzenleme):

| Alan | Açıklama |
|---|---|
| Web sitesi adaptörü | Shopify, WooCommerce vb. entegrasyon seçimi |
| Kargo firması | Dropdown ile kargo firması seçimi |
| Manuel kargo fiyatı | Toggle açılınca sabit TL kargo ücreti girilebilir |
| Aynı gün teslimat | Toggle + ek ücret (₺) |
| Kurumlar vergisi | Toggle + oran (%) |
| Barem kullan | Toggle — açılınca desi yerine fiyat aralığına göre kargo hesaplanır |
| Barem max desi | Baremi devreye alan desi sınırı |
| Barem 1 min–max | 1. kademedeki fiyat aralığı (örn. 0–149 ₺) |
| Barem 2 min–max | 2. kademedeki fiyat aralığı (örn. 150–299 ₺) |
| POS hizmet bedeli | Toggle + oran (%) |

### Pazaryeri platformları için (kısıtlı — bazı alanlar salt okunur):

| Alan | Durum | Açıklama |
|---|---|---|
| Stopaj oranı | Salt okunur | Admin tarafından belirlenir |
| Hizmet bedeli türü | Salt okunur | Sabit veya yüzdelik |
| Hizmet bedeli tutarı | Salt okunur | |
| Hizmet bedeli KDV oranı | Salt okunur | |
| Aynı gün teslimat ücreti | Salt okunur | |
| POS hizmet bedeli (HB) | Salt okunur | Sadece HepsiBurada'da |
| Kargo firması | Düzenlenebilir | |
| Barem ayarları | Salt okunur | |
| Kurumlar vergisi | Düzenlenebilir | Tüm platformlara eş zamanlı uygulanır |

---

## Sayfanın altındaki bilgi kutusu

Barem ve aynı gün teslimat ücretinin nasıl çalıştığını, manuel ile sistem kargo tarifelerinin farkını açıklar.

---

## Dikkat edilecekler

- Trendyol'u pasif yapmak → Trendyol'a özel tüm sayfalar (Ürün Komisyon Tarifesi, Plus, Flaş, Avantajlı Ürün Etiketi) sidebar'dan gizlenir.
- HepsiBurada'yı pasif yapmak → HB sayfaları (Avantajlı Teklifler, Sepet Kampanyaları, Kendi Kampanyanı Oluştur) gizlenir.
- Kurumlar vergisi bir platformdan değiştirilince tüm platformlara yansır.
- Her platform türü yalnızca bir kez eklenebilir; aynı tip ikinci platform oluşturulamaz.
