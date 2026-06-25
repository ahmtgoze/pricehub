# Kargo Tarifeleri

**Route:** `/ShippingRates`

## Ne yapar?

Desi ve barem bazlı kargo ücretlerini tanımlar. Fiyat hesaplama motoru bu tarifeleri kullanarak her ürünün kargo maliyetini belirler.

## Neler yapılabilir?

- Kargo firması ve platform kombinasyonuna göre tarife eklemek/düzenlemek/silmek
- Excel ile toplu yüklemek (akıllı duplicate tespiti ile)
- Platform, tip, firma ve kaynak (admin/kullanıcı) bazında filtrelemek
- Admin kaynaklı (sistem) tarifeleri görüntülemek (sadece yönetici düzenleyebilir)

## Tarife türleri

| Tür | Açıklama |
|---|---|
| Sabit | Her desi için aynı ücret |
| Desi bazlı | Desi aralığına göre kademeli ücret |
| Barem | Üst platformda barem açıksa Platformlar sayfasındaki barem ayarları devreye girer |

## Dikkat edilecekler

- Admin kaynaklı tarifeler sistem genelinde geçerlidir; kullanıcı kaynaklı tarifeler kendi hesabına özeldir.
- Barem sistemini kullanmak için Platformlar sayfasından barem özelliğinin açılmış olması gerekir.
- Tanımlı kargo tarifesi olmayan bir platform × desi kombinasyonu için hesaplama yapılamaz.
