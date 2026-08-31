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

> **Web Sitesi komisyonu aslında sanal POS komisyonudur.** Kendi sitende
> pazaryeri komisyonu yoktur; bankanın/sanal POS'un kestiği oran buraya
> kategori komisyonu olarak girilir. Sistem onu komisyon gibi işler.

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
| POS hizmet bedeli | Yalnız HepsiBurada ve Web Sitesi'nde, `has_pos_service_fee` açıksa |

**Bugünkü değerler** (sistem yöneticisi ayarları — değişebilir, kod bunları
veritabanından okur):

| | Trendyol | HepsiBurada | Web Sitesi |
|---|---|---|---|
| Stopaj | %1 | %1 | **yok** |
| Hizmet bedeli | 13,18 ₺ sipariş başına sabit | 12,60 ₺ sabit | **yok** |
| Kurumlar vergisi | %25 | %25 | %25 |

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

Referanslı üründe **baz maliyet** ürün maliyetinden yüksekse hesaplamada baz
maliyet kullanılır.

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
