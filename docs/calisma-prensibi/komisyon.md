# Komisyon Sistemi — Nasıl Çalışır?

## Temel mantık

Komisyon, platformun bir satıştan aldığı pay oranıdır. PriceHub'da komisyon **kategori × platform** kombinasyonuna göre tanımlanır; aynı ürün farklı kategorilerde farklı komisyon taşıyabilir.

Kaynak: `commissions` tablosu → `src/components/PriceCalculationEngine.jsx`

## Komisyon KDV'si (ÖNEMLİ)

Her platformda komisyon üzerine **%20 KDV** eklenir. Motor bunu otomatik yapar:

```
gerçek komisyon yükü = komisyon_oranı × 1,20
```

Bu KDV aynı zamanda **indirilecek KDV** olarak geri yazılır, yani net etkisi sadece komisyon oranı kadardır. Buna rağmen nakit akışı hesabında ayrı görünür.

> ⚠️ HepsiBurada komisyon oranları Excel'de **KDV hariç** gelir. Ham oranı motora ver; motor ×1,20 ekler. Önceden elle çarpıp verme → çift KDV hatası olur.

## Platform farkları

| Platform | Komisyon formatı | KDV durumu |
|---|---|---|
| Trendyol | % (KDV dahil gibi görünür) | Motor ekler |
| HepsiBurada | % (KDV hariç) | Motor ekler |
| Web Sitesi | % (manuel) | Motor ekler |

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
