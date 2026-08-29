# PriceHub — İş Kuralları (Tek Doğru Kaynak)

> **Bu dosya niçin var?**
> Bir istek geldiğinde önce buraya bakılır. Buradaki bir kural, tahmin veya
> genel bilgiyle değiştirilemez. Burada yazmayan bir kural gerekiyorsa
> **koddan doğrulanır ve buraya eklenir** — uydurulmaz.
>
> Yeni bir yazılımcı da sistemi buradan öğrenir.
>
> Her kuralın yanında kaynağı yazar. Kural ile kod çelişirse **kod doğrudur**;
> bu dosya düzeltilir (tersi değil).

Son doğrulama: 2026-08-28 · gerçek veriyle (svsetiketplastik hesabı) test edilerek.

---

## 0. Asla bozulmayacak dört kural

1. **Kiracı izolasyonu.** Hiçbir kullanıcı diğerinin verisini göremez.
   Tüm kullanıcı tabloları RLS ile `created_by = auth.email()` izoleli
   (23 tablo, 31 politika). Yeni tablo RLS'siz açılmaz. Gevşetilmez.
2. **Veri ≠ kod.** Kod değişikliği veriye dokunmaz. DELETE/UPDATE eden
   migration'dan kaçınılır; zorunluysa önce yedek alınır.
3. **Fiyat motoruna dikkat.** `src/components/PriceCalculationEngine.jsx`
   değişirse tüm kârlar değişir. Değiştirmeden önce onay alınır.
4. **Her push öncesi** `npm run lint`, `npm run build` ve `npm test` temiz olmalı.
   `no-undef` açıktır: tanımsız değişken derlemede değil **lint'te** yakalanır
   (bu kural kapalıyken iki kez sayfa çöktü).

---

## 1. Fiyat ve kâr hesabı

Kaynak: `PriceCalculationEngine.jsx` → `calculatePriceBreakdown`
Tüm sayfalar (Fiyatlar, Hesaplayıcı, promosyonlar) **aynı** motoru kullanır.

### Sıra

Satış fiyatı **KDV dahil** verilir. Sırasıyla düşülür:

| # | Kalem | Not |
|---|---|---|
| 1 | Ürün maliyeti | KDV dahil girilir |
| 2 | Baskı maliyeti | KDV dahil, opsiyonel |
| 3 | Ek maliyet | KDV dahil, opsiyonel |
| 4 | Paketleme maliyeti | KDV dahil, paket seçiminden gelir |
| 5 | Kargo ücreti | barem veya desi (§3) |
| 6 | Komisyon | §2 |
| 7 | Stopaj | yalnız pazaryerlerinde (§5) |
| 8 | Hizmet bedeli | platform ayarına göre (§5) |
| 9 | İşlem bedeli | platformda tanımlıysa |
| 10 | POS hizmet bedeli | HepsiBurada ve Web Sitesi (§5) |
| 11 | **Net KDV** | §4 |
| = | **Vergi öncesi net kâr** | |
| 12 | Kurumlar (gelir) vergisi | yalnız kâr POZİTİFSE (§5) |
| = | **Net kâr** | |

### Kâr oranı

```
Kâr Oranı = Net Kâr / ÜRÜN MALİYETİ × 100
```

⚠️ Payda **satış fiyatı değil, ürün maliyetidir**. Bu yüzden kâr oranı
%100'ü aşabilir (Dashboard'da %109 görülmesi normaldir).

---

## 2. Komisyon

Kaynak: `calculateCommission`

### Altın kural

**Komisyon oranı sisteme KDV DAHİL girilir. Motor üstüne ikinci bir KDV eklemez.**

Motor içeride şöyle yazar:
```
komisyon = (satış ÷ 1,20) × oran × 1,20
```
İki 1,20 birbirini götürür, sonuç:
```
komisyon tutarı = satış fiyatı (KDV dahil) × girilen oran
```

Doğrulama (gerçek kayıt): 5.408,99 ₺ × %12,83 = **693,97 ₺** — sistemdeki
kayıtlı komisyon da 693,97 ₺.

Komisyonun içindeki KDV (`tutar × 20/120`) **indirilecek KDV** olarak Net KDV
satırında geri yazılır.

### Platform bazında oran girişi

| Platform | Platformun verdiği oran | Sisteme girilecek |
|---|---|---|
| Trendyol | KDV **dahil** | olduğu gibi |
| HepsiBurada | KDV **hariç** | **×1,20 yapılarak** KDV dahil |
| Web Sitesi | — (kendi belirlersin) | KDV dahil |

> Örnek: HepsiBurada %17 diyorsa sisteme **20,4** girilir (17 × 1,20).
> Sistemde bu değer zaten böyle duruyor.

### Eşleştirme

Komisyon **kategori × platform** kombinasyonuna bağlıdır:
1. Ürünün kategorisi alınır
2. Hedef platform belirlenir
3. `commissions` tablosunda `kategori + platform` satırı aranır
4. **Bulunamazsa fiyat hesaplanamaz** — ürün "fiyatlanmamış" kalır

Yeni kategori eklenince ilgili platformlar için komisyon satırları veritabanı
trigger'ı ile **sıfır değerle** otomatik açılır; doldurmak kullanıcıya kalır.

### İki hedef kâr

- **Normal hedef kâr** — standart satışta hedeflenen oran
- **İndirimli hedef kâr** — promosyon sayfalarında kabul edilen alt sınır
- **Minimum kâr tutarı** — oran iyi görünse bile TL bazında alt sınır

---

## 3. Kargo: barem ve desi

Kaynak: motor içi `findBaremShippingRate` / `findDesiShippingRate`,
promosyon sayfaları için `src/lib/baremKurali.js`

### Barem ne zaman devreye girer?

**Hepsi birden** sağlanmalı:
1. Platform **web sitesi değil** (web sitesinde barem yoktur)
2. Platformda `use_barem` açık
3. Ürün **özel kargo** değil
4. Ürün **çoklu paket** değil
5. Ürünün desisi ≤ platformun `barem_max_desi` değeri
6. Satış fiyatı barem bandına düşüyor
7. O barem için tarife tanımlı

Biri bile sağlanmazsa **desi tarifesi** uygulanır.

### Bantlar platform ayarından okunur

Sabit yazılmaz. `barem1_min/max`, `barem2_min/max`, `barem_max_desi`
sistem yöneticisinin platform ayarlarından gelir.

Bugünkü değerler:

| Platform | Barem 1 | Barem 2 | Desi tavanı |
|---|---|---|---|
| Trendyol | 0 – 149,99 ₺ | 150 – 299,99 ₺ | 10 |
| HepsiBurada | 0 – 199,99 ₺ | 200 – 399,99 ₺ | 40 |
| Web Sitesi | — barem yok — | | |

> ⚠️ Bu rakamlar **koda yazılmaz.** Promosyon sayfalarında bir dönem yazılmıştı
> ve HepsiBurada sayfaları Trendyol'un bantlarını uyguluyordu → kâr yanlış
> çıkıyordu. Artık hepsi `baremKurali.js` üzerinden platformdan okur.

### Tarife tipleri

- **Sistem tarifesi** (`is_admin_created`) — admin tanımlar, herkes görür,
  `platform_type` ile eşleşir
- **Manuel tarife** (`is_manual`) — kullanıcının kendi anlaşması, yalnız
  kendisi görür, `platform_id` ile eşleşir
- Manuel tarife seçiliyse **barem devre dışı kalır**

### Ücret KDV dahildir

`shipping_rates.price` **KDV dahil** tutulur; motor `removeVat` ile ayrıştırır.

### Çoklu paket ve özel kargo

- **Çoklu paket:** her paketin desisi ayrı hesaplanıp **toplanır**, barem yok
- **Özel kargo:** her paket için desi ücreti **×2** + paket başına iade payı
  (`return_cost_per_package`, varsayılan 180,096 ₺)
- **Çift kargo** (`double_shipping`): hesaplanan kargo bedeli **×2**

---

## 4. KDV mantığı

Girilen tüm tutarlar **KDV dahildir** (maliyet, baskı, ek, paketleme, kargo).
Motor her birinden KDV'yi ayrıştırır ve:

```
Net KDV = Satış KDV'si
        − ürün KDV − baskı KDV − ek maliyet KDV − kargo KDV
        − paketleme KDV − komisyon KDV − hizmet bedeli KDV
        − işlem bedeli KDV − POS KDV
```

Net KDV bir **gider** olarak kârdan düşülür (devlete ödenen fark).

---

## 5. Platform ayarları

Barem, stopaj ve hizmet bedelleri **sistem yöneticisi** tarafından belirlenir;
kullanıcı yalnızca görür. Kullanıcı kendi web sitesi platformunu düzenleyebilir.

| Ayar | Davranış |
|---|---|
| Hizmet bedeli | `fixed_per_order` (sabit) veya `percent_of_sale` (yüzde) |
| Bugün Kargoda hizmet bedeli | Bugün Kargoda açıksa **standart yerine** bu uygulanır |
| Stopaj | Yalnız pazaryerlerinde; **web sitesinde her zaman 0** |
| Kurumlar vergisi | Yalnız **kâr pozitifse**; varsayılan %25 |
| POS hizmet bedeli | Yalnız HepsiBurada ve Web Sitesi'nde, `has_pos_service_fee` açıksa |

### Bugün Kargoda

Hem **platform ayarında** hem **ürün bazında** açıksa devreye girer:
- indirimli barem/desi tarifesi kullanılır
- standart hizmet bedeli yerine indirimli hizmet bedeli uygulanır

---

## 6. Hedef kârdan fiyat üretimi

Kaynak: `findSalePriceForTargetProfit`, `calculateProductPrice`

1. Hedef kâr **oranı** ve/veya **tutarı** ve varsa **minimum tutar** için
   ayrı ayrı fiyat aranır (ikili arama, 100 adım)
2. Hepsini birden sağlaması için **en yüksek** fiyat seçilir
3. Uygun barem seçenekleri denenir; **en düşük satış fiyatını** veren kazanır
   (eşitlikte Barem 1 tercih edilir)
4. Fiyat yuvarlanır:
   ```
   kuruş < 0,50  →  ,49
   kuruş ≥ 0,50  →  ,99
   ```
5. Yuvarlanmış fiyatla kırılım **yeniden** hesaplanır (gösterilen rakam budur)

---

## 7. Promosyon sayfaları

Sekiz sayfa: Kampanyalar, Komisyon Tarifesi, Plus Tarifesi, Avantajlı Ürün
Etiketi, Flaş Ürünler (Trendyol) · Avantajlı Teklifler, Sepet Kampanyaları,
Kendi Kampanyan (HepsiBurada).

### Ortak mantık

1. Platformdan Excel yüklenir
2. Satırlar **barkod/SKU** ile sistemdeki master ürünle eşleştirilir
3. Eşleşen ürünün maliyeti + kategorisinin komisyonu alınır
4. Excel'deki her fiyat kademesi için net kâr hesaplanır
5. Kullanıcı kârlı kademeyi seçer (tek tek veya "Akıllı Otomatik Seç")

### Komisyon önceliği

Ürün **komisyon tarifesine** girmişse oradan gelen oran esas alınır;
girmemişse kategori komisyonu kullanılır.

### Barem öneri sütunu

Seçili fiyat barem bandının üstündeyse (yani desi tarifesine düşüyorsa),
fiyatı **barem tavanına** çekmenin kârı artırıp artırmadığı hesaplanır.
Artırıyorsa öneri gösterilir. Tavan fiyatları platform ayarından gelir.

Öneri **yalnızca ekranda** gösterilir; sabit Excel şablonuna dahil değildir.

---

## 8. Excel içe/dışa aktarma

- Sütunlar **başlık adına göre** eşleştirilir; sıra önemli değildir
- Zorunlu alanı boş satırlar **aktarılmaz**, hata listesinde gösterilir —
  sessizce eksik veri oluşmaz
- Kullanıcı kendi şablonunu oluşturup kaydedebilir
- **Sistem şablonları kullanıcı tarafından silinemez**
- İndirme özelliği yalnızca veri indirilen sayfalarda bulunur

---

## 9. Görünüm ve kişiselleştirme

Kullanıcı bazında saklanır (`user_view_preferences`), hesaplamayı etkilemez:

- Tablo sütunları: sıra (sürükle-bırak), genişlik, gizleme, sabitleme
- Satır seçme sütunu **her zaman en solda** ve gizlenemez
- Dashboard kutuları: taşınabilir, boyutlandırılabilir (Dar/Orta/Geniş/Tam), gizlenebilir
- Tema (açık/koyu/sistem) ve vurgu rengi: **tarayıcıda** saklanır, veritabanına yazılmaz

---

## 10. Roller

- **Yönetici (hesap sahibi)** — barem, stopaj, hizmet bedelleri, sistem
  tarifeleri, kullanıcı yönetimi
- **Kullanıcı** — ürün, maliyet, fiyat, kampanya işlemleri; tarife ayarları
  salt okunur
- Sınır: 1 yönetici + en fazla 3 kullanıcı

> **Açık konu:** Kullanıcı *ekleme* (davet) henüz yok. Mevcut izolasyon
> e-posta bazlı olduğu için eklenen kullanıcı boş sistem görür. Çalışır hale
> gelmesi için izolasyonun hesap bazlı olması gerekir (23 tablo, 31 politika).
> Yapılmadan önce ayrıca karar verilecek.

---

## 11. Kayıt ve izlenebilirlik

Her fiyat değişimi `update_reports` tablosuna **sebebiyle** yazılır:
maliyet, kargo, komisyon, platform, zincir tutarsızlığı veya manuel.
Raporlar arşivlenebilir.

`update_type` sütunu **kullanılmıyor** (tamamen boş); kaynak ayrımı
`change_type = 'manual'` ile yapılır.

---

## 12. Bilinen sınırlar

- HepsiBurada'da **normal gönderi için barem kaydı yok** — yalnız "Bugün
  Kargoda" kayıtları var. Bugün Kargoda kapalıyken motor barem bulamaz ve
  desi tarifesine düşer. Trendyol'da her iki kayıt da mevcut.
  *Kasıtlı değilse HepsiBurada maliyetleri olduğundan yüksek hesaplanıyor.*
- Kargo tarifesi "dosya/evrak" gönderisi kavramını içermez.
