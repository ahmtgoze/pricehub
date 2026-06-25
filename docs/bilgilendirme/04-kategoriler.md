# Kategoriler

**Route:** `/Categories`

## Ne yapar?

Ürün gruplarını ve her grubun KDV oranını tanımlar. Kategori bilgisi, komisyon hesaplamalarının temel girdisidir — doğru kategori = doğru komisyon oranı.

## Neler yapılabilir?

- Tek tek kategori eklemek/düzenlemek/silmek
- Excel ile toplu kategori yüklemek (yeni → ekle, mevcut → güncelle, çakışan → atla mantığıyla)
- Her kategoride kaç ürün olduğunu görmek
- Ürün içeren kategoriyi silmeye çalışınca uyarı almak

## Excel yükleme formatı

| Kategori Adı | KDV Oranı |
|---|---|
| Elektronik | 20 |
| Giyim | 10 |

## Dikkat edilecekler

- Kategori silmeden önce o kategorideki ürünleri başka bir kategoriye taşımak gerekir.
- KDV oranı yanlış girilirse tüm fiyat hesaplamaları hatalı sonuç verir.
- Komisyon sayfasında kategori seçimi bu listeden gelir; yeni kategori eklenince komisyon sayfasında da tanımlanmalıdır.
