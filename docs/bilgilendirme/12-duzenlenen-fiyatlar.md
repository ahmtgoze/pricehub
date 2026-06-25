# Düzenlenen Fiyatlar

**Route:** `/UpdatedPrices`

## Ne yapar?

Pazaryeri ürünleriyle eşleştirilmiş ürünlerin sistem fiyatlarını mevcut pazar fiyatlarıyla karşılaştırır ve platforma yüklemeye hazır Excel dosyası üretir.

## Neler yapılabilir?

- Sistem fiyatı ile mevcut fiyat arasındaki fark yüzde ve tutar olarak görmek
- Platforma göre filtrelemek
- Platforma özgü Excel formatında dışa aktarmak:
  - **Trendyol** — standart format
  - **HepsiBurada** — özel sheet yapısı
  - **Shopify** — CSV adapter
- İndirilen Excel'i doğrudan platforma yüklemek (ek düzenleme gerekmez)

## İş akışı

1. Fiyatlar sayfasında fiyatları hesapla
2. Pazaryeri Ürünleri sayfasında eşleştirmeleri kontrol et
3. Bu sayfadan Excel'i indir
4. İlgili platformun yönetim paneline yükle

## Dikkat edilecekler

- Fiyat hesaplanmamış ürünler bu listede "fiyat yok" olarak görünür.
- Her platformun Excel şablonu farklıdır; yanlış şablonu yüklemeye çalışmak platforma hata verebilir.
- Aynı anda birden fazla platformun Excel'i indirilebilir.
