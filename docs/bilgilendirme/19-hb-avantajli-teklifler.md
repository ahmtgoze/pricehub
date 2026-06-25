# HepsiBurada — Avantajlı Teklifler

**Route:** `/HBAdvantageOffers`  
**Görünüm:** Sadece HepsiBurada platformu aktifse gösterilir.

## Ne yapar?

HepsiBurada'nın avantajlı teklif kampanyasını yönetir. HB, satıcıya 3 kademeli teklif sunar; fiyatı düşürdükçe komisyon oranı da düşer. Sistem her ürün için hangi kademenin kârlı olduğunu hesaplar.

## Neler yapılabilir?

- HB'den indirilen "Avantajlı Teklifler" Excel'ini yüklemek
- 3 teklif kademesini karşılaştırmalı görmek
- **Akıllı otomatik seç** ile en kârlı kademeyi seçmek
- Manuel fiyat/kademe seçimi yapmak
- Seçimleri kaydetmek ve Excel'e aktarmak (doğrudan HB'ye yüklenebilir)

## Excel formatı

Teklif dosyasında her ürün için: `Teklif Fiyatı 1/2/3`, `Komisyon Teklifi 1/2/3`, `Teklif Max Fiyat 1/2/3`, `Güncel Fiyat`, `Fiyat Gir` sütunları bulunur. Sistem "Fiyat Gir" sütununu doldurur.

## HB komisyon notu

HepsiBurada komisyon oranları KDV hariç gelir. Sistem %20 KDV'yi otomatik ekleyerek gerçek komisyon yükünü hesaplar. Kâr dökümünde her ikisi de gösterilir.

## Dikkat edilecekler

- Max fiyat sınırının üstüne çıkılamaz; sistem bu durumda uyarı verir.
- Seçimleri kaydetmeden sayfayı kapatmayın.
