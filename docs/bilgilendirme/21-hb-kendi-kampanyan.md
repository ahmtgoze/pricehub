# HepsiBurada — Kendi Kampanyanı Oluştur

**Route:** `/HBOwnCampaign`  
**Görünüm:** Sadece HepsiBurada platformu aktifse gösterilir.

## Ne yapar?

HepsiBurada'nın "Kendi Kampanyanı Oluştur" özelliği için kâr simülasyonu yapar. Kampanya türü ve parametrelerini girer, sistem tüm ürünlerde kâr etkisini hesaplar. Excel yüklemeye gerek yoktur; platformda HB fiyatı olan ürünler otomatik gelir.

## Kampanya türleri

| Tür | Açıklama |
|---|---|
| Sepette % indirim | Tüm sepete yüzde indirim |
| Sepette TL indirim | Tüm sepete sabit TL indirim |
| X al Y öde | Min. X ürün alana Y ürün bedeli |
| X. ürün % indirimi | Sepetin X. ürününe yüzde indirim |
| X. ürün TL indirimi | Sepetin X. ürününe TL indirim |

## Neler yapılabilir?

- Kampanya türünü seçmek
- İndirim oranı/tutarı ve isteğe bağlı komisyon indirimini girmek
- Tüm eşleşmiş ürünlerde kâr farkını (öncesi/sonrası) görmek
- Zarar eden ürünleri filtrelemek ve dışlamak
- Kâr etkisi en iyi olan ürünleri belirlemek

## Dikkat edilecekler

- Bu sayfa simülasyon aracıdır; kayıt tutmaz, Excel üretmez.
- "X al Y öde" türünde kâr hesabı, siparişteki ortalama birim fiyat üzerinden yapılır.
- Kampanya parametrelerini HB panelinde ayrıca girmeniz gerekir; bu sayfa sadece etkiyi modellerr.
