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

Toplam **58 dosya**, 1.441 ekleme / 1.380 silme — hepsi görünüm.

### Adım adım ne yapıldı

| Adım | Kapsam |
|---|---|
| 1. Tema token'ları + kabuk | `src/index.css`, `src/Layout.jsx` |
| 2. Ortak bileşenler | `ui/button`, `ui/card`, `ui/input`, `ui/table`, `ui/badge`, `ui/select`, `ui/textarea`, `ui/SearchInput`, `ui/StatCard`, `ui/DataTable` |
| 3. Dashboard | Prototipteki ikonsuz istatistik kutuları, 38px iri sayılar |
| 4. 24 sayfa mekanik geçiş | Sayfa kabuğu, başlık, kart iskeletleri |
| 5. Palet geçişi | 1.237 nötr gri sınıfı → tasarım token'ı |
| 6. Son temizlik | 77 ham siyah zemin, 35 `text-white`, sayfa içi gölgeler |
| 7. Giriş ekranı | `Login.jsx` yeni palete alındı |

### Prototipten alınan ölçüler

- Yan menü 272px, üst bar 52px, sayfa zemini `#f5f5f7`
- Kart: 18px köşe, 22px iç boşluk, gölge yok, `#ececee` kenar
- Buton/girdi: 38px yükseklik, 11px köşe, 13.5px yazı
- Tablo başlığı: 11px, büyük harf, 0.06em harf aralığı, `#a1a1a6`
- Sayfa başlığı: 30px/600, alt metin 14px `#86868b`

### Renk kararı

Prototip monokrom. Renk **yalnızca uyarı için** kullanılıyor: negatif kâr
kırmızı (`#d70015`), düşük kâr amber, sağlıklı kâr nötr siyah. Eski temadaki
yeşil tonları kaldırıldı. Trendyol turuncusu (`#F27A1B`) ve HepsiBurada moru
(`#7B2D9B`) marka rengi olarak korundu.

Kâr dağılımı grafiğinde bilgi kaybı olmasın diye monokrom palet **kademeli**
kullanıldı: kâr arttıkça sütun koyulaşıyor (açık gri → siyah), negatif kırmızı.

### Yan kazanç

Tüm renkler artık token üzerinden geldiği için sayfalar **koyu temayla da
uyumlu**. `.dark` token'ları `index.css`'te hazır; ileride bir anahtar eklenirse
sayfalara tekrar dokunmak gerekmez.

### DEĞİŞMEYEN dosyalar (doğrulandı)

`src/api/db.js` · `src/api/supabaseClient.js` · `PriceCalculationEngine.jsx` ·
`ImportExport.jsx` · `lib/AuthContext.jsx` · `lib/matchingEngine.js` ·
`lib/platformAdapters.js` · `src/pages.config.js` — hepsi bit bazında aynı.

Hiçbir veri sorgusu, react-query anahtarı, hesap formülü veya RLS kuralı
değişmedi.

### İlk aşamada (Faz 1) değişen 2 dosya:

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

---

## 6. Faz 2 — yapılanlar (28 Ağustos 2026)

### Önce: "sayfalar kayıp" sorunu çözüldü

Yeni temada sol menüdeki gruplar (Tanımlar / Fiyat / Raporlar / Promosyonlar)
**kapalı** başlıyordu. Başlıklar soluk gri olduğu için tıklanabilir oldukları
anlaşılmıyor, sayfalar silinmiş gibi görünüyordu.

Ölçüm yapıldı: eski ve yeni sürümdeki tüm sayfa/bileşen etiketleri
karşılaştırıldı — **783 etiketten 0 tanesi kaybolmuş, 7 tanesi eklenmiş.**
Menü içeriği de birebir aynı; tek fark daha önce çıkarılan
"Düzenlenen Maliyetler".

Düzeltme: gruplar açık başlıyor, başlık kontrastı artırıldı, aktif sayfayı
içeren grup artık kapatılabiliyor.

### Not: menüde hiç olmayan iki sayfa (eskiden beri)

`Maliyet Senkronizasyonu` (`/CostSynchronization`) ve
`Fiyat Senkronizasyonu` (`/PriceSynchronization`) sayfaları çalışıyor ama
hiçbir menüde linkleri yok — eski temada da yoktu. Sadece adres yazılarak
açılıyorlar. İstenirse menüye eklenebilir.

### Madde 7 — Bildirimler tıklanabilir

Duyuruya tıklayınca ilgili sayfaya gidiyor.

Veritabanı değişikliği (**sadece ekleme**, migration
`duyurulara_ilgili_sayfa_alani_ekle`):

```sql
alter table public.announcements add column if not exists link_page text;
```

Mevcut satırlar değişmedi, veri silinmedi. Eski duyurularda kolon boş kaldığı
için davranışları aynı. Duyuru yazarken açılır listeden sayfa seçiliyor;
seçilmezse duyuru eskisi gibi tıklanmaz kalır.

Geri alma: `alter table public.announcements drop column link_page;`

### Madde 8 — Sayfa içi "Nasıl kullanılır?"

Üst bardaki **(?)** düğmesi, bulunduğun sayfanın özetini, detayını ve sıkça
sorulanlarını sağdan açılan panelde gösterir. Esc ile kapanır.

Kullanım Kılavuzu'ndaki metinler `src/lib/helpContent.js`'e taşındı; hem
kılavuz sayfası hem panel oradan okuyor (tek doğru kaynak). Yeni sayfa
eklenince yardım metnini tek yere yazmak yeterli.

### Madde 10 — Koyu tema anahtarı

Üst bardaki **ay/güneş** düğmesi. Tercih tarayıcıda saklanıyor
(`localStorage`), **veritabanına dokunmuyor**. `index.css`'teki `.dark`
token'ları tema geçişinde zaten hazırlanmıştı; yeni renk tanımlanmadı.
`index.html`'e küçük bir betik eklendi: tema React yüklenmeden uygulanıyor,
böylece koyu temada açılışta beyaz parlama olmuyor.

### Henüz yapılmayanlar (Faz 2'nin kalanı)

1. Fiyatlar: üç görünüm · 2. Sütun sabitleme + Görünümü Özelleştir ·
3. Excel şablonları · 4. Rapor arşivleme · 5. POS hizmet bedeli ·
6. Promosyon toplu seçim/barem önerisi · 9. Rol sadeleştirme

Bunların 2, 3, 4, 5 ve 9'u için Supabase'e yeni tablo/kolon gerekiyor.
