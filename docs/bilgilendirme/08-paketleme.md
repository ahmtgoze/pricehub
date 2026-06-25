# Paketleme

**Route:** `/PackageManagement`

## Ne yapar?

Ürünlerin kargoya hazırlanmasında kullanılan paket malzemelerinin (kutu, poşet, bant, etiket vb.) maliyetini tanımlar. Bu maliyet fiyat hesaplamasına otomatik eklenir.

---

## Sayfa Yapısı

İki bölümden oluşur:
1. **Üst bölüm:** Paket grupları listesi
2. **Alt bölüm:** Seçili grubun malzeme kalemleri

---

## Üst Bölüm — Paket Grupları

### Butonlar
| Buton | Ne yapar |
|---|---|
| Yeni Paket | PackageModal açar; yeni grup oluşturulur |

### Tablo Sütunları
| Sütun | Açıklama |
|---|---|
| Paket Adı | Örn. "Küçük Kutu", "Standart Poşet" |
| Grup | İsteğe bağlı gruplama etiketi |
| Desi Aralığı | Bu grubun geçerli olduğu min – max desi aralığı |
| Toplam Maliyet (₺) | Gruptaki tüm malzemelerin toplamı (otomatik hesaplanır) |
| Aktif | Açık / Kapalı |
| Malzeme Ekle | O gruba yeni malzeme kalemi eklemek için tıklanır |
| Düzenle / Sil | |

### Paket Oluşturma/Düzenleme Modalı (PackageModal)
| Alan | Açıklama |
|---|---|
| Paket Adı | Zorunlu |
| Grup | İsteğe bağlı |
| Min Desi | Bu grubun başladığı desi değeri |
| Max Desi | Bu grubun bittiği desi değeri |
| Aktif | Toggle |

---

## Alt Bölüm — Malzeme Kalemleri

Üstten bir paket grubu seçilince o gruba ait malzeme kalemleri burada listelenir.

### Butonlar
| Buton | Ne yapar |
|---|---|
| Malzeme Ekle | ItemModal açar; yeni kalem eklenir |

### Tablo Sütunları
| Sütun | Açıklama |
|---|---|
| Malzeme Adı | Örn. "Köpük", "Naylon Poşet", "Koli Bandı" |
| Birim Maliyet (₺) | Bir adet malzemenin maliyeti |
| Adet | Kaç adet kullanıldığı |
| Toplam (₺) | Birim × adet (otomatik hesaplanır) |
| Düzenle / Sil | |

### Malzeme Oluşturma/Düzenleme Modalı (ItemModal)
| Alan | Açıklama |
|---|---|
| Malzeme Adı | Zorunlu |
| Birim Maliyet (₺) | Zorunlu |
| Adet | Zorunlu; kaç adet kullanıldığı |

---

## Nasıl Çalışır?

Fiyat hesaplaması sırasında:
1. Ürünün desisi belirlenir
2. Hangi paket grubunun desi aralığına denk geldiği bulunur
3. O grubun **toplam malzeme maliyeti** kâr hesabına eklenir

Çakışan desi aralığı olan iki grup varsa ilk bulunan kullanılır.

---

## Dikkat edilecekler

- Paketleme sayfası **opsiyoneldir**; tanımlanmazsa fiyat hesaplaması çalışmaya devam eder ve paketleme maliyeti sıfır alınır.
- Ürün Paketleme sayfasında tanımlanmayan bir desi aralığına denk gelirse paketleme maliyeti yine sıfır alınır.
- Aynı desi aralığını kapsayan iki farklı grup tanımlamaktan kaçın; çakışma mantık hatalarına yol açar.
- Bir malzeme kalemini silmek, o grubun toplam maliyetini anında düşürür ve tüm o desi aralığındaki ürünlerin fiyatlarını etkiler.
