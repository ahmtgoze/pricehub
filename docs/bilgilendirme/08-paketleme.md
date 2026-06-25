# Paketleme

**Route:** `/PackageManagement`

## Ne yapar?

Kargo poşeti, kutu, etiket gibi paketleme malzemelerinin maliyetini tanımlar. Bu maliyetler fiyat hesaplamasına otomatik eklenir.

## Neler yapılabilir?

- Paket grubu oluşturmak ve desi aralığı atamak (örn. 0–5 desi için "küçük kutu")
- Grup içine bireysel malzeme kalemleri eklemek (poşet: 2 TL, etiket: 0,5 TL vb.)
- Toplam paket maliyetini otomatik hesaplattırmak
- Birden fazla paket grubu tanımlamak (farklı desi aralıkları için farklı paket yapıları)

## Nasıl çalışır?

Ürünün desisi hangi grubun aralığına denk geliyorsa o grubun toplam maliyeti fiyat hesaplamasına eklenir. Desi aralığı dışında kalan ürünler için paketleme maliyeti sıfır kabul edilir.

## Dikkat edilecekler

- Paketleme sayfası opsiyoneldir; tanımlanmazsa fiyat hesaplaması çalışmaya devam eder, sadece paketleme maliyeti sıfır alınır.
- Aynı desi aralığını kapsayan iki farklı grup tanımlanmamalıdır; çakışma durumunda ilk bulunan grup kullanılır.
