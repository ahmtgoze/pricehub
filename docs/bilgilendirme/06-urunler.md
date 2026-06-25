# Ürünler

**Route:** `/Products`

## Ne yapar?

Ana ürün kataloğunu yönetir. Sistemdeki tüm ürünler buradan eklenir, düzenlenir ve silinir. Fiyat hesaplamalarının başladığı yer burasıdır.

## Neler yapılabilir?

- Tekil ürün eklemek (modal ile)
- Excel ile toplu ürün yüklemek (duplicate tespiti ve retry mantığı dahil)
- Ürün düzenlemek ve silmek
- Paket yönetimi — birden fazla ürünün bir arada kargo paketini tanımlamak
- Referans ürün ayarlamak — farklı adetlerin (x1, x2, x3) birbirine bağlanması
- Ürün zinciri kurgulamak (aynı ürünün 1'li/2'li/3'lü paketleri arası maliyet ilişkisi)

## Excel yükleme formatı

Temel alanlar: `Ürün Adı`, `SKU`, `Barkod`, `Maliyet`, `Kategori`, `Ağırlık (Desi)`.

Yükleme sırasında:
- Yeni ürünler → eklenir
- SKU/barkod çakışanlar → güncellenir
- Hata veren satırlar → log gösterilir, geri kalanlar eklenir

## Dikkat edilecekler

- Kategori alanı Kategoriler sayfasındaki listeden seçilir; kategori tanımlı değilse komisyon hesaplanamaz.
- Desi (hacimsel ağırlık) kargo ücretini doğrudan etkiler; doğru girilmesi önemlidir.
- Ürün silinirse o ürünün tüm fiyat geçmişi ve pazaryeri eşleşmeleri de silinir.
