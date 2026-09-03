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
| 10 | POS hizmet bedeli | **yalnız HepsiBurada** (§5) |
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

> **Web Sitesi komisyonu aslında sanal POS komisyonudur.** Kendi sitende
> pazaryeri komisyonu yoktur; bankanın/sanal POS'un kestiği oran buraya
> kategori komisyonu olarak girilir. Sistem onu komisyon gibi işler.

> Örnek: HepsiBurada %17 diyorsa sisteme **20,4** girilir (17 × 1,20).
> Sistemde bu değer zaten böyle duruyor.

### HB Excel'inden okunan komisyonlar

Yukarıdaki kural **elle girilen** komisyonlar içindir. HepsiBurada'nın kendi
Excel'inden okunan oranlar da **KDV hariçtir** ve aynı şekilde ×1,20 yapılmalıdır:

| Sayfa | Komisyon nereden gelir | Çevrim |
|---|---|---|
| Sepet Kampanyaları | HB Excel'i (`Güncel/İndirimli Komisyon Oranı`) | **×1,20 gerekir** |
| Avantajlı Teklifler | HB Excel'i (`Güncel Komisyon`, `Komisyon Teklifi 1-3`) | **×1,20 gerekir** |
| Kendi Kampanyan | `commissions` tablosu (zaten KDV dahil) | çevrim YOK |

Çevrim Excel **okunduğu anda** yapılır; aşağıdaki tüm hesap ve etiketler KDV
dahil oranla çalışır. Her kullanım yerinde ayrı ayrı çarpmak, bir yeri
atlamaya açıktır.

Etikette her iki oran da gösterilir: **`%20,4 (HB %17)`**. Panelle
karşılaştırma yapılabilsin diye ham oran görünür kalmalıdır.

> **Geçmiş hata:** 2026-08-28'de etiketten "(KDV'li %20,4)" gösterimi
> *"komisyonlar sisteme zaten KDV dahil giriliyor"* gerekçesiyle kaldırıldı.
> Bu gerekçe tablodan okuyan sayfalar için doğru, **Excel'den okuyanlar için
> yanlıştı**. Hesap da baştan beri ham oranı kullanıyordu: komisyon eksik,
> kâr olduğundan yüksek çıkıyordu. 2026-08-31'de düzeltildi.

Kaynak: `src/lib/hbKomisyon.js` (testleri: `tests/hbKomisyon.test.mjs`)

### Eşleştirme

Komisyon **kategori × platform** kombinasyonuna bağlıdır:
1. Ürünün kategorisi alınır
2. Hedef platform belirlenir
3. `commissions` tablosunda `kategori + platform` satırı aranır
4. **Bulunamazsa fiyat hesaplanamaz** — ürün "fiyatlanmamış" kalır

Yeni kategori eklenince ilgili platformlar için komisyon satırları veritabanı
trigger'ı ile **sıfır değerle** otomatik açılır; doldurmak kullanıcıya kalır.

### Kategori silinirse

Kategori silindiğinde o kategorinin **komisyonları da silinir**. O kategoriye
bağlı ürünler komisyonsuz kalır ve fiyatlanamaz; hesaplamada
*"Kategori komisyonu tanımlı değil"* hatasına düşerler. Ürünlere yeni bir
kategori atanması gerekir.

### İki hedef kâr

- **Normal hedef kâr** — standart satışta hedeflenen oran
- **İndirimli hedef kâr** — promosyon sayfalarında kabul edilen alt sınır
- **Minimum kâr tutarı** — TL bazında alt sınır

**Nasıl birleşirler:** Her kısıt için ayrı bir fiyat hesaplanır ve **en
yüksek olan** seçilir; böylece hepsi birden sağlanır. Örnek: hedef kâr oranı
%X'ten 8 ₺ çıkıyorsa ama minimum 10 ₺ ise, fiyat 10 ₺ kârı verecek şekilde
yükseltilir. Hem hedef oran hem hedef tutar girilmişse zaten minimumun altına
düşülmez.

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

### Bugün Kargoda ve barem — platforma göre DEĞİŞİR

Bu, sistemin en kolay karıştırılan kuralı:

| Platform | Bugün Kargoda AÇIK | Bugün Kargoda KAPALI |
|---|---|---|
| **Trendyol** | indirimli barem (46,49 / 84,49 ₺) | normal barem (88,00 / 94,49 ₺) |
| **HepsiBurada** | barem (52,19 / 91,19 ₺) | **barem YOK → desi tarifesi** |

Yani **HepsiBurada'da barem yalnızca Bugün Kargoda gönderilerde geçerlidir.**
Bu yüzden sistemde HepsiBurada için sadece `same_day_delivery = true` barem
kaydı vardır — bu bir eksik değil, **kuralın kendisidir**. Trendyol'da her iki
kayıt da bulunur.

> ⚠️ Tarife aranırken bu ayrım yapılmazsa, Bugün Kargoda kapalı bir
> HepsiBurada ürününe de barem uygulanır ve **kâr olduğundan yüksek çıkar**.
> Motor bunu `findBaremShippingRate` ile, promosyon sayfaları
> `baremTarifesiSec` ile doğru yapar. İkisi de aynı mantıktadır.

### Desi tarifesi nasıl bulunur?

Kaynak: `findDesiShippingRate`

1. Aktif desi tarifeleri küçükten büyüğe sıralanır
2. Ürünün desisine **eşit veya ondan büyük en küçük** tarife seçilir
   (örn. 4,2 desi → 5 desi tarifesi)
3. **Ürünün desisi tüm tarifelerin üstündeyse tarife YOKTUR** — o ürün
   fiyatlanmaz ve kullanıcıya sebebiyle birlikte uyarı verilir:
   *"Kargo tarifesi yok (60 desi) — Trendyol"*

> Önceden burada en yüksek tarifeye düşülüyordu; 60 desilik ürün 40 desi
> ücretiyle hesaplanıyor ve gerçek kargo daha pahalı olduğu için **kâr
> olduğundan iyi görünüyordu.** Artık sessizce yanlış fiyat üretmek yerine
> ürün fiyatlanmıyor.

Çoklu pakette **paketlerden birinin** bile tarifesi yoksa ürün fiyatlanmaz.

Desi tarifesinde `same_day_delivery` alanına **bakılmaz** — Bugün Kargoda
ayrımı yalnızca baremde vardır.

### Web Sitesi tarifeleri MANUEL olmalıdır

Web Sitesi platformunda **sistem tarifeleri kullanılmaz**; yalnızca
kullanıcının kendi manuel tarifeleri (`is_manual = true`, `platform_id`
eşleşmeli) geçerlidir. Kendi kargo anlaşman olduğu için doğrusu budur.

> Web Sitesi'ne yalnızca sistem tarifesi tanımlıysa hiç tarife bulunamaz
> ve ürünler fiyatlanmaz.

### Kargo firması kilidi

Platform ayarında bir **kargo firması seçilmişse**, o platformda yalnızca
o firmanın tarifeleri kullanılır. Firma seçili değilse tüm tarifeler
değerlendirmeye girer.

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
- **Özel kargo:** her paket için desi ücreti **×2** + paket başına iade payı.
  Tutar **Genel Ayarlar → Hesaplama**'dan belirlenir (varsayılan 180,096 ₺).
  Senaryo: ürün müşterinin deposundan üretime, üretimden depoya, oradan
  müşteriye gider — yani fazladan yol kat eder.
- **Çift kargo:** üretimden depoya, depodan müşteriye giden ürünler için
  işaretlenir; hesaplanan kargo bedeli **×2** olur.
- **Paketleme maliyeti:** paket, içindeki **malzemeler tek tek girilerek**
  oluşturulur (Paketleme sayfası); paketin maliyeti malzeme maliyetlerinin
  toplamıdır. Çoklu pakette her paketin kendi maliyeti ayrıca toplanır.
- **Desi elle girilir.** Ürünün fiziksel ölçüsünden otomatik hesaplanmaz.
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

> **Vergilerin KDV'si olmaz.** Stopaj ve kurumlar vergisi birer vergidir;
> üzerlerine KDV eklenmez ve yukarıdaki Net KDV formülüne girmezler. KDV
> ayrıştırması yalnızca **maliyet ve bedeller** için yapılır (komisyon,
> hizmet bedeli, işlem bedeli, POS, kargo, paketleme...).

---

## 5. Platform ayarları

Barem, stopaj ve hizmet bedelleri **sistem yöneticisi** tarafından belirlenir;
kullanıcı yalnızca görür. Kullanıcı kendi web sitesi platformunu düzenleyebilir.

| Ayar | Davranış |
|---|---|
| Hizmet bedeli | `fixed_per_order` (sabit) veya `percent_of_sale` (yüzde). **Platformdan platforma değişir; web sitesinde yoktur.** |
| Bugün Kargoda hizmet bedeli | Bugün Kargoda açıksa **standart yerine** bu uygulanır |
| Stopaj | Bir **vergidir** — üzerine KDV eklenmez, Net KDV hesabına da girmez. Matrahı KDV'siz satış tutarıdır, oran %1. Yalnız pazaryerlerinde; **web sitesinde her zaman 0** (kodda ayrıca zorlanır) |
| Kurumlar vergisi | Yalnız **kâr pozitifse**. Limited şirket için **%25** varsayılan; kullanıcı değiştirebilir |
| POS hizmet bedeli | **Yalnız HepsiBurada'da vardır.** Kod `has_pos_service_fee` açık olan HepsiBurada ve Web Sitesi'ne izin verir, ama Web Sitesi'nde bu anahtar kapalıdır ve **açılmamalıdır** — sanal POS kesintisi orada zaten komisyon olarak giriliyor, ikisi birden çift kesinti olur |

**Bugünkü değerler** (sistem yöneticisi ayarları — değişebilir, kod bunları
veritabanından okur):

| | Trendyol | HepsiBurada | Web Sitesi |
|---|---|---|---|
| Stopaj | %1 | %1 | **yok** |
| Hizmet bedeli | 13,18 ₺ sipariş başına sabit | 12,60 ₺ sabit | **yok** |
| POS hizmet bedeli | **yok** | **%0,0096** | **yok** |
| Kurumlar vergisi | %25 | %25 | %25 |
| Barem | açık | açık | kapalı (manuel tarife) |

### Platform bazında maliyet kalemleri

Satış fiyatından sırayla düşülenler. **Sırası önemli değildir** (hepsi
toplanıp düşülür) ama hangi kalemin hangi platformda olduğu önemlidir.

**Trendyol**

1. Ürün maliyeti — *geçerli maliyet kuralı* (baz maliyet ≥ maliyet ise baz)
2. Baskı maliyeti + ek maliyet
3. Kargo — **barem** varsa barem tarifesi, yoksa desi tarifesi
4. Paketleme maliyeti
5. Komisyon — oran sisteme **KDV dahil** girilir
6. Stopaj %1 — KDV'siz satış üzerinden, **üzerine KDV eklenmez**
7. Hizmet bedeli — 13,18 ₺ sipariş başına (Bugün Kargoda açıksa indirimlisi)
8. Net KDV
9. Kurumlar vergisi %25 — **yalnız kâr pozitifse**

> **POS hizmet bedeli yalnızca HepsiBurada'ya aittir.** Trendyol'da yoktur —
> platform ayarında açılsa bile kod uygulamaz.

**HepsiBurada**

Trendyol'un aynısı, **iki fark** ile:

- **Komisyon KDV hariç gelir** → sisteme/hesaba **×1,20** yapılarak girer
  (HB "%17" diyorsa gerçek oran %20,4). Excel'den okunanlar için de geçerli.
- **POS hizmet bedeli vardır — bu kalem yalnızca HepsiBurada'da bulunur.**
  Satış fiyatının **%0,0096**'sı. Hizmet bedelinden **ayrı** bir kalemdir;
  ikisi birden düşülür, karıştırılmamalıdır.

Hizmet bedeli 12,60 ₺ sipariş başına.

**Web Sitesi**

1. Ürün maliyeti — *geçerli maliyet kuralı*
2. Baskı maliyeti + ek maliyet
3. Kargo — **barem yok**, tarifeler manuel girilir
4. Paketleme maliyeti
5. "Komisyon" — aslında **sanal POS komisyonudur**; kategori komisyonu
   olarak girilir, KDV dahil
6. Net KDV
7. Kurumlar vergisi %25 — yalnız kâr pozitifse

> Web Sitesi'nde **stopaj yoktur** (kodda ayrıca zorlanır), **hizmet bedeli
> yoktur** ve **POS hizmet bedeli de yoktur**. Sanal POS kesintisi zaten
> komisyon olarak giriliyor; ayrıca POS hizmet bedeli açmak çift kesinti olur.
> Kod bu anahtarı Web Sitesi için teknik olarak destekler ama **açılmamalıdır**.

> Kâr dökümü penceresinde bu kalemlerin hepsi tek tek görünür. **Geçmiş
> hata:** POS hizmet bedeli satırı, promosyon sayfaları pencereye bu değeri
> hiç göndermediği için görünmüyordu — kârdan düşülüyordu ama dökümde yoktu.
> 2026-09-01'de 8 sayfada düzeltildi.

### Bugün Kargoda

Ürün **aynı gün kargoya veriliyorsa** işaretlenir (satıcının o gün gönderim
taahhüdü). Hem **platform ayarında** hem **ürün bazında** açıksa devreye girer:
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
4. Fiyat yuvarlanır. **Kural platform ayarından gelir** (Platformlar →
   Tüm Ayarlar → Fiyat Yuvarlama):

   | Seçenek | Davranış |
   |---|---|
   | `49_99` (varsayılan) | kuruş < 0,50 → **,49** · değilse → **,99** |
   | `hep_99` | her zaman **,99** |
   | `yok` | yuvarlama yapılmaz |
5. Yuvarlanmış fiyatla kırılım **yeniden** hesaplanır (gösterilen rakam budur)

---

### Fiyatlar kendiliğinden güncellenmez

Ürün maliyeti, komisyon oranı veya hedef kâr değiştiğinde mevcut fiyatlar
**otomatik yeniden hesaplanmaz**. Kullanıcının **Fiyatları Hesapla** demesi
gerekir.

Fiyatlar sayfasına girildiğinde sistem, her fiyat kaydının
`calculation_details` alanındaki (hesaplama anındaki) değerleri bugünküyle
karşılaştırır ve bayat fiyat varsa uyarı gösterir: kaç ürün etkilendi ve ne
değişti (maliyet / komisyon / hedef kâr / baskı / ek maliyet).

### Ürün neden fiyatlanamaz?

"Fiyatları Hesapla" sonrası bir ürün listelenmiyorsa sebebi şunlardan biridir
ve kullanıcıya **sebebiyle birlikte** gösterilir:

| Sebep | Ne yapılmalı |
|---|---|
| Kargo tarifesi yok (N desi) | O platform için ürünün desisini kapsayan tarife eklenmeli |
| Kategori komisyonu tanımlı değil | Komisyonlar sayfasından oran girilmeli |

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

### Akıllı Otomatik Seç nasıl karar verir?

Komisyonlar sayfasındaki **indirimli** hedeflere bakar — normal hedeflere
değil: indirimli hedef kâr **oranı**, indirimli hedef kâr **tutarı** ve
indirimli **minimum** kâr tutarı.

1. Boş veya `0` olan hedef **tanımsız** sayılır — aksi halde 0 hedefi her
   koşul sağlar ve en indirimli kademe yanlışlıkla seçilirdi
2. Ürünün hiç indirimli hedefi tanımlı değilse ürün **atlanır**
3. Kademeler **en indirimliden** başlanarak denenir
4. İndirimli minimum kâr tutarının altında kalan kademeler **elenir**
5. **Tanımlı olan tüm hedefler birden** sağlanmalıdır (sıkı kontrol)
6. Koşulu sağlayan **ilk** kademede durulur

> Sonuç: hedefleri sağlayan **en indirimli** kademe seçilir — kârı en yüksek
> olan değil. Amaç, kâr hedefinden ödün vermeden en agresif indirimi bulmaktır.

### Bu kural hangi sayfalarda geçerli?

**Hepsinde.** "Akıllı Otomatik Seç" butonu bulunan yedi sayfanın tamamı aynı
üç hedefe bakar: indirimli hedef kâr **oranı**, indirimli hedef kâr **tutarı**,
indirimli **minimum** kâr tutarı.

| Sayfa | Kademe sırası |
|---|---|
| Sepet Kampanyaları | tek fiyat (girilebilecek max fiyat) |
| Avantajlı Teklifler | Teklif 1-2-3, **fiyata göre en ucuzdan** |
| Avantajlı Ürün Etiketi | Süper Avantaj → Çok Avantaj → Avantaj |
| Flaş Ürünler | kademeler en indirimliden |
| Plus Tarifesi | tek fiyat (Plus limiti) |
| Komisyon Tarifesi | kademeler en indirimliden |
| Kampanyalar | kampanya fiyatı (`isBelowFloor` ile aynı üç hedef) |

> **Geçmiş hata:** **Avantajlı Teklifler** sayfası bu kuralın dışında kalmıştı.
> Hedeflere hiç bakmıyor, kârı sıfırın üstünde olan kademelerden **kârı en
> yüksek** olanı seçiyordu — yani hem hedef denetimi yoktu, hem de kuralın
> tersine en az indirimli kademeyi seçme eğilimindeydi. 2026-09-01'de
> düzeltildi.

### Komisyon önceliği (SIRALAMA ÖNEMLİ)

Promosyon sayfalarında komisyon oranı şu sırayla aranır:

1. **Ürün komisyon tarifesi** — Excel'de `has_commission_tariff = "Var"` ise:
   ürünün barkodu ile tarife tablosuna bakılır ve **fiyatın hangi aralığa
   düştüğü** bulunur (4 aralığa kadar). O aralığın komisyonu kullanılır.
   *Yani aynı ürün, fiyatı değiştikçe farklı komisyon oranına tabi olabilir.*
2. Tarifede eşleşen aralık yoksa veya oran 0 ise → **kategori komisyonu**
3. O da yoksa → hesap yapılamaz

> Bu sıralama kâr rakamını doğrudan değiştirir. "Var" yazan bir üründe
> kategori komisyonunu kullanmak yanlış sonuç verir.

### Pazaryeri ürün eşleştirme (tekrar tespiti)

Aynı ürünün Excel'de iki kez gelmesi platform bazında farklı kurallarla
tespit edilir:

| Platform | Karşılaştırılan alanlar | Eşik |
|---|---|---|
| Trendyol | Barkod, Model Kodu, Marka, Kategori | **4'ten en az 3'ü** |
| HepsiBurada | Satıcı Stok Kodu, SKU, Kategori, Marka, Barkod, Ürün Adı | **6'dan en az 5'i** |
| Web Sitesi | Ürün adı **aynı olmalı** + (SKU / Barkod / Model Kodu'ndan en az biri) | — |

Boş alan eşleşme sayılmaz (iki taraf da dolu olmalı).

### Barem öneri sütunu

Seçili fiyat barem bandının üstündeyse (yani desi tarifesine düşüyorsa),
fiyatı **barem tavanına** çekmenin kârı artırıp artırmadığı hesaplanır.
Artırıyorsa öneri gösterilir. Tavan fiyatları platform ayarından gelir.

Öneri **yalnızca ekranda** gösterilir; sabit Excel şablonuna dahil değildir.

---

## 7b. Pazaryeri ürünleri ve Düzenlenen Fiyatlar

Pazaryerinden yüklenen ürünler sistemdeki **master ürünlerle eşleştirilir**
(bağlanır). Bu bağ kurulduktan sonra:

- **Düzenlenen Fiyatlar** sayfasında, pazaryeri ürününe bağlanmış master
  ürünün **sistemde hesaplanmış fiyatı** gösterilir
- Excel indirildiğinde de bu fiyat çıkar — dosya ilgili platforma yüklenerek
  yeni fiyata geçiş sağlanır

Yani akış şu: master üründe fiyat hesaplanır → pazaryeri ürünü ona bağlıdır →
Düzenlenen Fiyatlar o fiyatı gösterir → Excel ile platforma yüklenir.

## 7c. Sepet Kampanyaları — dışa aktarım kuralı

HepsiBurada "Sepet Kampanyaları" Excel'i dışa aktarılırken:

> **Dosyada yalnızca kampanyaya girecek ürünler kalır. Kampanyaya dahil
> edilmeyen ürünlerin satırı dosyadan SİLİNİR.**

Fiyat hücresini boş bırakıp satırı dosyada tutmak yeterli değildir — satır
dosyada durduğu sürece o ürün panele gönderilmiş olur. Kampanya dışında
kalmanın tek net ifadesi satırın silinmesidir.

Seçili olsa bile **kampanya fiyatı 0 veya geçersiz** olan ürün de silinir;
fiyatsız ürün kampanyaya giremez.

Hiç ürün seçilmemişse **dosya üretilmez**, uyarı verilir.

### Kampanya dönemi (tarih aralığı)

HepsiBurada sepet kampanyaları **belirli bir tarih aralığında** geçerlidir
(örn. 10.08.2026 – 30.09.2026). Sayfada bu aralık **zorunludur**: platform ve
tarih aralığı seçilmeden Excel yüklenemez.

Seçimler `platform + başlangıç + bitiş` anahtarıyla saklanır. Aynı aralık
tekrar seçildiğinde önceki çalışma **geri yüklenir** — Excel'i yeniden
yüklemeye gerek kalmaz. Yüklenen dosya da depoya alınır, çünkü dışa aktarım
HB'nin kendi şablonuna yazmak zorundadır; satırlardan yeniden kurmak şablonu
birebir korumaz.

Aynı döneme ikinci kez kaydedilirse önceki kayıtlar silinir, kopya bırakılmaz.

**Yükleme kendiliğinden kaydeder.** Excel yüklenir yüklenmez satırlar o döneme
yazılır; kullanıcı "Kaydet"e basmadan sayfadan ayrılsa bile çalışması durur.
"Seçimleri Kaydet" butonu sonradan yapılan fiyat/seçim değişikliklerini yazmak
içindir.

**Temizle** yalnızca ekranı boşaltmaz, o dönemin **kayıtlarını da siler** —
aksi halde sayfadan çıkıp dönünce temizlenen liste geri gelirdi.

Son seçilen dönem tarayıcıda hatırlanır; sayfaya dönüldüğünde tarih aralığını
yeniden seçmek gerekmez.

> Bu, **Plus Tarifesi** sayfasındaki desenin aynısıdır.

Tablo: `hb_basket_campaigns` (RLS ile `created_by` bazlı izoleli — kural 1)

### Sepet Kampanyaları — "Akıllı Otomatik Seç" nasıl karar verir?

Fiyat olarak HB'nin verdiği **girilebilecek max fiyat** yazılır (kampanyada
fiyat ne kadar yüksekse satıcıya o kadar çok kalır). Seçim ölçüsü ise
Komisyonlar sayfasındaki **indirimli hedeflerdir** — "Akıllı Otomatik Seç"
ile aynı mantık:

1. Elle seçilmiş ürünlere **dokunulmaz**
2. Sistem ürünüyle eşleşmeyen atlanır (maliyet bilinmeden kâr hesaplanamaz)
3. İndirimli hedef kâr oranı/tutarı **hiç tanımlı değilse ürün atlanır**
4. İndirimli minimum kâr tutarının altı elenir
5. **Tanımlı olan tüm hedefler birden** sağlanmalıdır
6. Sayfadaki **Min Kâr Oranı / Min Kâr Tutarı** alanları doldurulmuşsa
   bunlar da ayrıca sağlanmalıdır (komisyon hedeflerinin üstüne biner)

Kâr, sepet indirimi düşülmüş tutardan hesaplanır (bkz. bir üstteki bölüm).

> **Önceki hal:** buton "Max Fiyatla Seç" adındaydı ve ölçü yalnızca "kâr
> sıfırın üstünde mi" idi; 1 kuruş kârla bile ürün kampanyaya giriyordu.
> 2026-09-01'de hedef kâra bağlandı ve diğer sayfalarla aynı ada getirildi.

### Sepet indirimi kârı düşürür (komisyon indiriminden AYRIDIR)

Sepet kampanyası **iki ayrı şey** verir, karıştırılmamalıdır:

| | Ne yapar | Kime yarar |
|---|---|---|
| **Komisyon indirimi** | HB'nin aldığı oran düşer (örn. %17 → %9) | **Bize** |
| **Sepet indirimi** | Müşteri sepette daha az öder (örn. %15) | **Müşteriye** — bedelini satıcı karşılar |

> **Kâr, girilen fiyattan değil, müşterinin ÖDEDİĞİ tutardan hesaplanır.**
>
> ```
> ödenen = girilen fiyat × (1 − sepet indirimi)
> ```
>
> Örnek: 4.532,99 ₺ girilir, "Sepette %15 İndirim" varsa müşteri
> **3.853,04 ₺** öder. Kâr bu tutardan hesaplanır.

Sepet indirimi, HB Excel'inin **"Açıklamalar"** sayfasından okunur:

```
EK BİLGİLER
Kampanyanın İndirimi | Sepette %15 İndirim
```

Yüzde (`%15`) ve tutar (`50 TL`) biçimleri desteklenir. İndirim
**çözülemezse uydurulmaz**: kâr girilen fiyattan hesaplanır ve sayfada sarı
uyarı çıkar — gerçek kârın daha düşük olabileceği açıkça yazılır.

Dışa aktarılan Excel'e **girilen fiyat** yazılır, indirimli tutar değil;
indirimi HB kendisi uygular.

> **Geçmiş hata:** bu indirim hiç hesaba katılmıyordu; %15'lik bir kampanyada
> kâr olduğundan belirgin şekilde yüksek görünüyordu. 2026-09-01'de eklendi.

Kaynak: `src/lib/hbSepetIndirimi.js` (testleri: `tests/hbSepetIndirimi.test.mjs`)

### Dosya sıfırdan üretilir, yüklenen dosya düzenlenmez

Dışa aktarımda **yalnızca değerler** yazılır: iki sayfa (Açıklamalar + ürün
listesi), doğru başlıklar, doğru sütun sırası, içeriğe göre **otomatik sütun
genişliği**.

> **Neden yüklenen dosya düzenlenmiyor:** biçim korunsun diye önce HB'nin
> dosyası açılıp içinden satır siliniyordu. Ama o dosyada gömülü resim,
> açıklama balonları ve VML çizimleri var; kütüphane bunları yazarken
> referansları tutarsız bırakıyor ve Excel dosyayı *"Bazı öğelerde bir
> sorunla karşılaştık"* diye açıyordu. Renk/biçim de zaten kurtarılamıyordu.
> Renkler kaybolur — HB paneli renklere bakmaz, sorun değil.

### SKU başlığı elle geri yazılır (kütüphane okuyamıyor)

D sütununun başlığı şablonda **zengin metin** olarak saklanıyor (`<r>`
parçaları, her birinde `xmlns`). Excel kütüphanemiz bu yapıyı çözemiyor ve
hücreyi **değeri yokmuş gibi** okuyor. Şablondaki bütün hücreler içinde
**yalnızca bu biri** böyle; hiçbir okuma seçeneği (`cellStyles`, `cellText`)
kurtarmıyor.

Boş bırakılırsa HepsiBurada dosyayı **"Hatalı işlem — Şema hatası"** ile
reddeder. Bu yüzden başlık sabit olarak tutulur ve boş okunduğunda geri
yazılır:

```
SKU (Kampanyaya dahil etmek istemediğiniz ürün kodlarını excelden
silmeniz gerekmektedir)
```

Yalnızca "SKU" yazmak **yetmez** — panel metnin tamamını bekliyor (denendi,
reddedildi). Başlık düzgün okunabiliyorsa üzerine yazılmaz.

> Bu başlığın kendisi **satır silme kuralını doğrular**: kampanyaya
> girmeyecek ürünlerin satırları dosyadan silinmelidir.

> **Uyarı:** başka bir HB/Trendyol şablonunda da başlıklar boş okunuyorsa
> ilk şüpheli budur. Hücre `{ t: 's' }` ama `v` yoksa değer zengin metindir
> ve düşmüştür.

### Şablona dokunulmaz

- Sütun **eklenmez**, sütun **sırası değişmez**, başlık satırı **aynen** korunur
- HB'nin dosyadaki "Açıklamalar" sayfası olduğu gibi taşınır
- Panel dosyayı kendi şablonuna göre okur; şablon dışına çıkan dosya reddedilir

### Tarih bilgisi Excel'de YOKTUR

HB'nin sepet kampanyası Excel'inde kampanya başlangıç/bitiş tarihi **yer almaz**
(dosyanın kendi "Açıklamalar" sayfası da sütunları tek tek sayar, tarih geçmez).
Kampanya dönemi HepsiBurada panelinde, kampanyaya katılırken belirlenir. Bu
yüzden dosyaya tarih sütunu **eklenmemelidir**.

Kaynak: `src/lib/hbSepetDisaAktarim.js` (testleri: `tests/hbSepetDisaAktarim.test.mjs`)

## 7d. Trendyol Kampanyalar — kampanya türleri ve komisyon

Kaynak: Trendyol Partner → Promosyonlar → Katılabileceğim Kampanyalar
(3 Eylül 2026 ekran kaydı). Fiyat modeli `src/lib/trendyolKampanyaIndirimi.js`
(69 test), sayfa `src/pages/Campaigns.jsx`.

### Kampanya grupları (yeşil başlık satırları)
| Grup | Bizde | Not |
|---|---|---|
| Genel Kampanyalar (Tüm Ülkeler, Okul İhtiyaçları vb. dönemsel başlıklar dahil) | `all_countries` | dönemsel başlıklar ayrı grup DEĞİL (kullanıcı kararı) |
| Trendyol Plus — Ek İndirim | `trendyol_plus` | komisyon Plus Tarifesi'nden |
| Mikro İhracat | `mikro_ihracat` | seçilebilir; ülke bazlı komisyon/kargo modeli **henüz yok**, en son yapılacak — şimdilik genel gibi hesaplanır |

### İndirim türleri ("İndirim Detayı" satırı)
| Trendyol metni | `discount_kind` | Satıcıya etkisi (birim, karşılama hariç) |
|---|---|---|
| Net %15 İndirim | `net_percent` | fiyat × %15 |
| Sepette %40 İndirim | `cart_percent` | fiyat × %40 |
| 500 TL'ye 100 TL İndirim | `cart_tl` | fiyat ≥ 500 ise 100 TL; değilse fiyat × 100/500 (sepet tam eşikte, oransal dağılım) |
| 3 Al 2 Öde | `buy_x_pay_y` | fiyat × (3−2)/3 |
| 2 Adet ve Üzeri %15 İndirim | `qty_percent` | fiyat × %15 (tüm adetler) |

> `cart_tl`: Trendyol sepet indirimini siparişteki kampanya ürünlerine
> **tutarları oranında dağıtır** (kullanıcı, 3 Eyl 2026). En kötü durum sepetin
> tam eşikte olmasıdır: indirim oranı = tutar/eşik. Örn. 2000 TL'ye 150 TL →
> %7,5; 826,99 TL'lik ürün için 62,02 TL. Sepet eşiği aştıkça gerçek indirim
> bundan küçüktür; kâr en kötü duruma göre gösterilir.

### Ortak alanlar
- **Trendyol Karşılamalı (%)** — indirimin bu payı Trendyol'dan çıkar.
  Satıcı fiyatı = fiyat − indirim × (1 − karşılama/100).
- **Fiyat Kuralı** (`price_rule_min/max`) — "100 TL ve üzeri ürünler",
  "10 TL ve 700 TL arası ürünler", "800 TL ve altı ürünler". Aralık dışındaki
  ürün kampanyaya giremez; **Akıllı Otomatik Seç** bunları atlar ve sayar.
- **Katılım Koşulu** (`participation_condition`: `buybox` | `min_price`) —
  bilgi amaçlı; Trendyol'un Excel'indeki "girilebilecek max fiyat" bunu zaten
  uygular, ayrıca hesaba katılmaz.
- **Kampanya Adı** — isteğe bağlı; kartta grup adının yerine görünür.

### Eski kayıt uyumu
`discount_kind` eklenmeden önceki kampanyalar `discount_type` (percent | tl),
`discount_amount`, `cart_amount`, `cart_condition` ile okunur
(`kaydiKampanyayaCevir`): percent → `net_percent`; tl → `cart_tl`
(sepet "üzeri" ise eşik); percent + sepet "altı/üzeri" → fiyat kuralı.
Eski kampanyaların kâr hesabı **değişmez** (testle doğrulandı). Yeni kayıtta
`cart_amount/cart_condition` boş bırakılır; `discount_type` uyum için
doldurulur.

### Komisyon kaynağı: o gün geçerli tarife penceresi (4 Eyl 2026)
Trendyol'un tarife Excel'inde ayrı bir "7 günlük komisyon" **yoktur**; mavi
kutu fiyat kademeleri, yeşil 3 Gün ve kırmızı 4 Gün komisyon bloklarıdır.
"7 Günlük Fiyat" seçilince fiyat hafta boyu sabit kalır ama komisyon **ilk 3
gün 3 günlük, sonraki 4 gün 4 günlük** orandır (dosyanın formülü de böyle).

**Kullanıcı kararı (4 Eyl 2026):** ortalama ya da "en yüksek" yok. Avantajlı
Ürün Etiketi, Flaş Ürünler ve Kampanyalar komisyonu **o an geçerli
pencerenin** oranıyla hesaplar; kullanıcı her pencere değişiminde (3 gün
sonra, sonra 4 gün sonra) çıktıyı yeniden indirip yükler: "sonuç %100 doğru
olur". Aylık kampanyada her hafta yeni tarife dosyasıyla aynı düzen sürer.

Mekanizma (`src/lib/tarifeKaydiSecimi.js`): tarife yüklenirken pencerelerin
tarihleri `pencere_tarihleri` olarak kayda yazılır (`pencereTarihiCoz`:
"1 Eylül 08.00-4 Eylül 07.59" → ISO, yıl kaydın başlangıcından, +03:00).
`tarifeKomisyonu(kayıtlar, {barkod, platform, başlangıç, bitiş, an}, fiyat)`
dönemle örtüşen en güncel kaydı alır, `aktifPencere(kayıt, an)` ile o anın
penceresini bulur (pencerelerden önceyse ilk, sonraysa son) ve
`kademeKomisyonu(kayıt, fiyat, pencere)` ile kademenin o penceredeki oranını
verir. Kademe **kampanyalı satış fiyatına** göre. Eski kayıtta pencere tarihi
yoksa `commission_1..4` sütunları. Sayfa başlığının altında
`AktifPencereSatiri` bugünkü pencereyi ve tarihlerini gösterir.

**Hatırlatma bildirimi (4 Eyl 2026):** `bildirimler` tablosu (RLS
`created_by = auth.email()`, INSERT yalnızca fonksiyonla). Saatlik pg_cron
`tarife-pencere-bildirimi` → `tarife_pencere_bildirimi_uret()`: her pencere
için iki bildirim — **önceki gün 17:00** ("yarın … geçiliyor") ve **pencere
başladığında** ("… başladı, Excel'i şimdi yeniden indirip yükleyin").
Yalnızca `pencere_tarihleri` dolu tarife kaydı olan kullanıcılara gider
(kullanıcı: "herkese gitmesin, sadece girdiyi yapanlara"). Aynı olay
`anahtar` ile bir kez üretilir; 1 günden eski olaylar üretilmez. Zil
menüsünde "Hatırlatmalar" bölümü olarak duyuruların üstünde görünür,
okunmamışlar zil rozetine eklenir (`BildirimPanel`).

**Kampanyalar (Plus dışı) — kaynak kuralı:** kampanya Excel'indeki
`Ürün Komisyon Tarifesi` sütunu belirler. **Var** → 7 günlük tarife
komisyonu (bulunamazsa kategori komisyonu). **Yok** → doğrudan kategori
komisyonu (`commissions`). Tarife sayfasındaki seçim (`selected_range`)
hesaba katılmaz. Plus kampanyaları Plus Tarifesi'nden okur; Plus'ta 7 günlük
yok (kullanıcı inceleyecek).

### Tarife çıktısı: TEK dosya (3 Eyl 2026)
Ürün Komisyon Tarifesi ve Plus Ürün Komisyon Tarifesi'nde 3 günlük ve 4
günlük seçimler **ayrı ayrı yapılır ama tek Excel'e yazılır**; tarife başına
ayrı dosya ve "Excel İndir" açılır menüsü kaldırıldı. Trendyol'un dosyasında
ürün başına tek satır/tek fiyat/tek "Tarife Seçimi" var; dosyanın formülü
"7 Günlük Fiyat"ı iki pencere için birden hesaplar. Birleştirme
(`tekSatirSecimi`, `src/lib/trendyolPencereSecimi.js`):

| Seçim | Yazılan |
|---|---|
| yalnız 3 Gün | fiyat + `3 Günlük Fiyat` (Plus: 3 Gün Tarih Aralığı metni) |
| yalnız 4 Gün | fiyat + `4 Günlük Fiyat` (Plus: 4 Gün Tarih Aralığı metni) |
| ikisi de, aynı fiyat | fiyat + `7 Günlük Fiyat` (Plus: dosyanın `7 Gün Tarih Aralığı` hücresi) |
| ikisi de, farklı fiyat | **çatışma**: satır boş kalır, kullanıcıya barkodlarla söylenir |

Plus'ta 7 Gün seçildiğinde her iki `Hesaplanan Komisyon (N Gün)` sütunu da
o pencerenin teklifiyle dolar. Gönderim defteri (aynı fiyatı ikinci kez
göndermeme) pencere bazlıdır; 7 Gün için 3 ve 4'e de bakılır.

## 8. Excel içe/dışa aktarma

- Sütunlar **başlık adına göre** eşleştirilir; sıra önemli değildir
- Zorunlu alanı boş satırlar **aktarılmaz**, hata listesinde gösterilir —
  sessizce eksik veri oluşmaz
- Kullanıcı kendi şablonunu oluşturup kaydedebilir
- **Sabit (sistem) şablonları** aktif temadaki sayfaların kendi şablonlarıdır;
  kullanıcı bunları **silemez ve değiştiremez** — kendi şablonunu oluşturup
  hangi sütunun hangi sırayla çıkacağını belirleyebilir
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

## 11b. Ürün zinciri ve "zincir tutarsızlığı"

Aynı ürünün farklı **adetli** versiyonları (100'lük, 500'lük, 1000'lik gibi)
bir **zincire** bağlanır (`chain_group_id`). Zincir üyelerinin birim maliyeti
tutarlı olmalıdır:

```
birim maliyet = ürün maliyeti ÷ birim adet
```

Bir üyenin maliyeti güncellendiğinde diğer üyelerin maliyeti aynı oranda
güncellenir. Buna rağmen bir üyenin birim maliyeti diğerlerinden **%2'den
fazla** sapıyorsa, Güncelleme Raporları'na **"Zincir Tutarsızlığı"** kaydı
düşer ve hangi üyenin ne kadar saptığı yazılır.

> Amaç: 100'lük paket birim 1,20 ₺ iken 500'lük paketin birim 1,80 ₺ olması
> gibi durumların gözden kaçmaması.

### Geçerli maliyet (baz maliyet kuralı)

Hesaba giren maliyet her yerde şu kuralla bulunur:

```
geçerli maliyet = (referanslı VE baz maliyet > maliyet) ? baz maliyet : maliyet
```

Yani **baz maliyet daha yüksekse o**, **daha düşükse ürünün kendi maliyeti**
kullanılır. Ürünün referansı yoksa (`ref_product_id` ve `ref_product_id_size`
boşsa) baz maliyete **bakılmaz** — eski bir kayıttan kalmış olabilir.

Bu kural **bütün promosyon sayfalarında** geçerlidir: Sepet Kampanyaları,
Avantajlı Teklifler, Kendi Kampanyan, Flaş Ürünler, Avantajlı Ürün Etiketi,
Plus Tarifesi, Komisyon Tarifesi ve Kampanyalar.

> **Geçmiş hata:** kural fiyat motorunun ana yolunda uygulanıyordu ama
> promosyon sayfalarının hepsi kendi kâr hesabını yapıyor ve doğrudan
> `product.cost` okuyordu. Referanslı ürünlerde maliyet olduğundan düşük
> alınıyor, kâr olduğundan yüksek görünüyordu. Sistemde 510 ürün ölçüye göre
> referanslı olduğu için etki genişti. 2026-09-01'de 9 sayfada düzeltildi.

> Hesaplayıcı sayfası hariçtir: orada maliyeti kullanıcı elle girer.

Kaynak: `src/lib/gecerliMaliyet.js` (testleri: `tests/gecerliMaliyet.test.mjs`)

## 11c. Karma paketler (bundle)

Bazı ürünler **karma pakettir**: aynı ölçü ve tipteki poşetin birden fazla
renginden toplanıp tek ürün olarak satılır. Örnek: 18x25 cepsiz renkli
kargo poşetinden her renkten 100'er adet → 300'lük tek paket.

**Kural:**

```
karma paket maliyeti = birim maliyet × paket adedi
```

Buradaki birim maliyet, **tekli ürünün birim maliyetiyle aynıdır**. Karma
paket olduğu için ayrı/farklı bir birim maliyet oluşmaz.

**Sistemde nasıl kuruludur:** karma paketler ayrı bir mekanizmayla değil,
ilgili tekli ürünün **adet zincirine üye yapılarak** bağlanmıştır
(`chain_group_id`). Zincir zaten "birim maliyet eşittir" kuralını
işlettiği için karma paketin maliyeti kendiliğinden doğru hesaplanır ve
tekli üründe maliyet değişince karma paket de otomatik güncellenir.

**Hangi renge bağlanır:** **Lila-Pembe**. Sebep: bu renk neredeyse her
zaman stokta olduğu için zincirin kökü olarak en güvenilir olanıdır.
Renk seçimi maliyeti etkilemez — zincirdeki tüm renklerin birim maliyeti
zaten eşittir.

> Karma paketin adedi (`unit_quantity`) **paketteki toplam adet** olmalıdır,
> renk sayısı değil. Yanlış adet girilirse zincir birim maliyeti bozulur ve
> "Zincir Tutarsızlığı" kaydı düşer.

## 12. Bilinen sınırlar

- Kargo tarifesi "dosya/evrak" gönderisi kavramını içermez.
