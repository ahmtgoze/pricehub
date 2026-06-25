# Güncelleme Raporları

**Route:** `/UpdateReports`

## Ne yapar?

Tüm fiyat güncellemelerinin audit logunu tutar. Kim ne zaman hangi ürünün fiyatını ne kadar değiştirdi, kâr oranı nasıl etkilendi — bunların hepsi burada izlenebilir.

## Neler yapılabilir?

- Tüm fiyat değişikliklerini listelemek (eski fiyat → yeni fiyat, kâr değişimi)
- Ürün adı veya SKU ile aramak
- Raporları arşivlemek (görünümden kaldırır, veriler silinmez)
- Arşivlenmiş raporları geri yüklemek
- Toplu silmek
- Excel'e aktarmak
- Bir ürünün tüm geçmişini zaman çizelgesiyle görmek (ürün geçmiş modali)

## Dikkat edilecekler

- Rapor silmek geri alınamaz; arşivleme daha güvenli bir alternatiftir.
- Raporlar fiyat hesaplama her çalıştırıldığında otomatik oluşur; elle oluşturulamaz.
- Uzun vadeli analiz için Excel dışa aktarmayı kullanın.
