# HepsiBurada — Sepet Kampanyaları

**Route:** `/HBBasketCampaigns`  
**Görünüm:** Sadece HepsiBurada platformu aktifse gösterilir.

## Ne yapar?

HepsiBurada sepet kampanyası Excel'ini yükler, indirimli komisyon uygulandığında kâr etkisini hesaplar ve kampanya fiyatını belirleyip platforma yüklenecek Excel üretir.

## Neler yapılabilir?

- HB'den indirilen sepet kampanyası Excel'ini yüklemek (genellikle "Listelerim" sheet)
- Sistem ürünleriyle SKU/barkod eşleştirmesi görmek
- Mevcut komisyon vs kampanya komisyonu karşılaştırmak
- **Akıllı otomatik seç** ile max fiyat sınırına en uygun fiyatı seçmek
- Manuel fiyat girmek
- Seçimleri kaydetmek ve Excel'e aktarmak

## İş akışı

1. HB yönetim panelinden sepet kampanyası Excel'ini indir
2. Bu sayfaya yükle
3. Hangi ürünlerin kampanyaya dahil edilmesi kârlı olduğunu gör
4. Seçimleri yap ve Excel'i indir
5. HB paneline yükle

## Dikkat edilecekler

- "Girebileceğiniz max. fiyat" sınırı her ürün için farklıdır; sistem bu sınırı otomatik uygular.
- Komisyon indirimi kampanya boyunca geçerlidir; kampanya bitince normal komisyon döner.
- Seçimleri kaydetmeden sayfayı kapatmayın.
