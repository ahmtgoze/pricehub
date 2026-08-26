# Tema Geçişi — 26 Ağustos 2026

Bu belge, yeni PriceHub temasına geçişte ne yapıldığını ve **beğenmezsen nasıl
geri döneceğini** anlatır. Kod bilmene gerek yok; komutları olduğu gibi kopyala.

---

## 1. Yedeğin nerede?

Supabase veritabanında `yedek_20260826` adında bir şema var. İçinde **23 tablonun
tamamının** 26 Ağustos 2026 tarihli donmuş kopyası duruyor.

| Tablo | Satır |
|---|---|
| update_reports | 5.686 |
| product_prices | 1.743 |
| marketplace_products | 1.279 |
| products | 906 |
| shipping_rates | 668 |
| commissions | 121 |
| categories | 60 |
| trendyol_price_ranges | 54 |
| advantage_product_tags | 181 |
| flash_products | 172 |
| platforms | 12 |
| user_profiles | 3 |
| settings | 2 |
| app_config | 1 |
| *(kalan 9 tablo boş)* | 0 |
| **Toplam** | **10.888** |

Yedek şeması dışarıya kapalı: ne anonim ziyaretçi ne de giriş yapmış bir
kullanıcı erişebilir. Sadece veritabanı yöneticisi görür.

> **Not:** Tema değişikliği veritabanına HİÇ dokunmadı. Bu yedek "her ihtimale
> karşı" sigortadır. Aşağıdaki geri dönüş adımlarının hiçbirinde veriyi geri
> yüklemen gerekmez.

### Yedekten tek tablo geri yükleme (sadece gerçekten gerekirse)

```sql
begin;
truncate public.products;
insert into public.products select * from yedek_20260826.products;
commit;
```

### Yedeği silme (her şey yolundaysa, örn. 2 hafta sonra)

```sql
drop schema yedek_20260826 cascade;
```

---

## 2. Kodda ne değişti?

Sadece **2 dosya**:

| Dosya | Ne oldu |
|---|---|
| `src/index.css` | Renk/yazı/köşe ayarları yeni değerlerle değişti. İsimler aynı kaldı, o yüzden 52 hazır bileşen ve 27 sayfa otomatik yeni görünümü aldı. |
| `src/Layout.jsx` | Yan menü ve üst bar görünümü. Aynı sayfalar, aynı giriş/çıkış akışı, aynı bildirim merkezi. |

**Dokunulmayanlar:** 27 sayfanın iş mantığı, `src/api/db.js` veri katmanı,
`PriceCalculationEngine.jsx` fiyat motoru, `ImportExport.jsx` Excel aktarımı,
Supabase şeması ve RLS kuralları.

Menüden çıkarılan tek şey: **"Düzenlenen Maliyetler"**. Sayfanın kendisi duruyor,
`/UpdatedCosts` adresinden hâlâ açılıyor.

---

## 3. GERİ DÖNÜŞ — 3 seviye

Hepsi verilerini korur. Hiçbirinde veri kaybı yoktur.

### Seviye 1 — En hızlı: Vercel'den geri al (30 saniye)

1. https://vercel.com/ahmet-s-projects7/pricehub adresine gir
2. **Deployments** sekmesi
3. Eski bir "Production" deployment'ın yanındaki **⋯** → **Promote to Production**
4. Bitti. Eski tema anında geri gelir.

### Seviye 2 — Sadece iki dosyayı geri al

```bash
cd ~/Developer/pricehub
git checkout main
git checkout tema-oncesi-20260826 -- src/index.css src/Layout.jsx
git commit -m "Tema geri alindi"
git push
```

### Seviye 3 — Tamamen eski hale dön

```bash
cd ~/Developer/pricehub
git checkout main
git reset --hard tema-oncesi-main-20260826
git push --force-with-lease
```

### Geri dönüş noktaları (git etiketleri)

| Etiket | Ne demek |
|---|---|
| `tema-oncesi-main-20260826` | Tema öncesi canlıdaki hal |
| `tema-oncesi-20260826` | Temayı uygulamadan hemen önceki hal |

Bu etiketler GitHub'a da gönderildi — bilgisayarın bozulsa bile duruyorlar.

---

## 4. Güvenlik denetimi (26 Ağustos 2026)

Tema uygulandıktan sonra tüm sistem tarandı.

### Kullanıcıdan kullanıcıya sızıntı testi

21 tablo, 3 kullanıcı hesabı ile tek tek test edildi: "Bu kullanıcı giriş
yaptığında BAŞKASININ kaç satırını görüyor?"

**Sonuç: hepsinde 0. Hiçbir kullanıcı diğerinin verisini göremiyor.**

### Kasıtlı olarak paylaşılan iki şey (doğru çalışıyor)

| Ne | Kural |
|---|---|
| 606 sistem kargo tarifesi (`is_admin_created = true`) | Admin'in yüklediği tarifeleri tüm müşteriler görür. Müşterinin kendi anlaşmalı (manuel) tarifesini yalnızca kendisi görür — doğrulandı: her müşteri 606 + kendi 31'ini görüyor, başkasınınkinden 0. |
| 2 sistem platform şablonu (`is_system_admin = true`) | Tüm müşteriler okuyabilir. İçinde API anahtarı / gizli bilgi taşıyabilecek **hiçbir kolon yok** (tarandı). |

### Kapatılan açık

`shipping_rates` tablosundaki 606 sistem tarifesi, **giriş yapmamış internet
ziyaretçilerine de** açıktı. Kural `authenticated` rolüne daraltıldı
(migration: `sec_08_shipping_rates_anon_okumayi_kapat`).

Müşteri deneyiminde hiçbir değişiklik yok — sadece dışarıdan bakan kapandı.

Geri alma (gerekirse):

```sql
drop policy "sr_select" on public.shipping_rates;
create policy "sr_select" on public.shipping_rates for select
  using (is_admin_created = true or created_by = (auth.jwt() ->> 'email'));
```

### Anonim erişim testi (düzeltme sonrası)

23 tablonun tamamı dışarıdan yoklandı. **Sadece `app_config` yanıt veriyor** —
içinde tek bir alan var: marka adı (`PriceHub`). Giriş ekranında logo göstermek
için gerekli, gizli bilgi değil. Diğer 22 tablo: sıfır satır.

### Bilinen, kabul edilmiş uyarılar (değişmedi)

- `is_admin()` fonksiyonu dışarıdan çağrılabilir — RLS politikalarının çalışması
  için gerekli, kasıtlı.
- Sızdırılmış parola koruması kapalı — Supabase Pro plan gerektiriyor, opsiyonel.

---

## 5. Henüz YAPILMAYANLAR

Zip paketinde bir "Faz 2" bölümü var. İçindekiler **kurulmadı**:

- 3 yeni tablo (`user_settings`, `user_view_preferences`, `export_templates`)
- Tema seçici ve sütun ayarları yardımcı dosyaları
- 10 maddelik özellik listesi (üç görünümlü Fiyatlar, sütun sabitleme, Excel
  şablonları, rapor arşivi, POS hizmet bedeli, koyu tema anahtarı…)

Bunların kodu paketle birlikte GELMEDİ — sadece tarifi var, sıfırdan yazılması
gerekiyor.

Ayrıca paketin hazır gelen 2 yardımcı dosyasında, uygulanmadan önce
düzeltilmesi gereken iki hata tespit edildi:

1. Yeni tablolarda `created_by` sütunu yok, ama `db.js` her kayıtta onu yazıyor
   → her kayıt hata verirdi.
2. Vurgu rengi `#1d1d1f` (hex) olarak yazılıyor, ama Tailwind `hsl(...)` bekliyor
   → renkler bozulurdu.
