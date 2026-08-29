# Komisyon Sistemi — Nasıl Çalışır?

## Temel mantık

Komisyon, platformun bir satıştan aldığı pay oranıdır. PriceHub'da komisyon **kategori × platform** kombinasyonuna göre tanımlanır; aynı ürün farklı kategorilerde farklı komisyon taşıyabilir.

Kaynak: `commissions` tablosu → `src/components/PriceCalculationEngine.jsx`

## Komisyon KDV'si

Komisyon oranı sisteme **KDV dahil** girilir. Motor bu oranın üzerine ikinci bir KDV **eklemez**:

```
komisyon tutarı = satış fiyatı × girilen oran        (oran KDV dahildir)
komisyonun içindeki KDV = komisyon tutarı × 20 / 120  → indirilecek KDV
```

Örnek: satış 699,00 ₺, oran %21,5 → komisyon 150,29 ₺. İçindeki 25,05 ₺ KDV, "Net KDV" satırında indirilecek KDV olarak geri yazılır. Oranın bir daha 1,20 ile çarpılması (180,35 ₺) **hatalıdır**.

> ⚠️ Hepsiburada komisyon oranları platformun Excel'inde **KDV hariç** gelir. Bu oranlar sisteme girilmeden önce ×1,20 ile KDV dahil hale getirilir; motora her zaman KDV dahil oran verilir. Motor ayrıca KDV eklemediği için çift KDV oluşmaz.

## Platform farkları

| Platform | Excel'den gelen oran | Sisteme girilen oran |
|---|---|---|
| Trendyol | KDV dahil | Olduğu gibi |
| HepsiBurada | KDV hariç | ×1,20 yapılarak KDV dahil |
| Web Sitesi | — (manuel) | KDV dahil |

## Eşleştirme mantığı

Bir ürün için komisyon şöyle bulunur:

1. Ürünün kategorisi alınır
2. Hedef platform belirlenir
3. `commissions` tablosunda `kategori + platform` satırı aranır
4. Bulunamazsa hesaplama yapılamaz (fiyat boş kalır)

Yeni kategori eklenince ilgili platformlar için komisyon satırları **veritabanı trigger'ı** ile otomatik oluşturulur — sıfır değerle. Doldurmak kullanıcıya kalır.

## İndirimli hedef kâr

Komisyon sayfasında her kombinasyon için iki hedef kâr tanımlanır:

- **Normal hedef kâr** — standart satışta hedeflenen oran
- **İndirimli hedef kâr** — kampanya/promosyon sayfalarında kabul edilen alt sınır

Promosyon sayfalarının "akıllı otomatik seç" özelliği indirimli hedef kârı baz alır.

## Minimum kâr tutarı

Kâr oranı yüksek olsa bile belirli bir TL'nin altına düşmesini engelleyen alt sınır. Düşük maliyetli ürünlerde kâr oranı iyi görünse bile tutar küçük olabilir; bu alan bunu önler.
