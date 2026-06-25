# Kargo ve Barem Sistemi — Nasıl Çalışır?

## İki kargo hesaplama yöntemi

Sistem ürünün kargo maliyetini iki farklı yöntemle hesaplayabilir:

### 1. Desi bazlı (varsayılan)

Ürünün **desisine** (hacimsel ağırlık) göre kargo tarifesinden ücret bulunur.

```
desi → kargo_tarifeleri tablosu → ücret
```

Fonksiyon: `findDesiShippingRate()` — `PriceCalculationEngine.jsx` içinde.

### 2. Barem bazlı (Trendyol mantığı)

**Satış fiyatı aralığına** göre sabit kargo ücreti uygulanır. Platformlar sayfasında barem açıksa ve barem tarifesi tanımlıysa devreye girer.

Tipik barem yapısı:

| Satış fiyatı | Kargo |
|---|---|
| 0 — 149,99 TL | Barem 1 ücreti |
| 150 — 299,99 TL | Barem 2 ücreti |
| 300 TL ve üzeri | Ücretsiz / farklı tarife |

Barem tarifesi yoksa sistem otomatik olarak **desi bazlı** yönteme döner.

## Hangi yöntem ne zaman kullanılır?

```
barem açık mı? (Platformlar sayfası)
  ├── EVET → barem tarifesi var mı? (Kargo Tarifeleri)
  │     ├── EVET → barem kullan
  │     └── HAYIR → desi bazlıya dön
  └── HAYIR → desi bazlı kullan
```

Çok paketli ürünlerde ve özel kargo durumlarında barem **hiçbir zaman** kullanılmaz; desi toplanır.

## Tarife kaynakları

| Kaynak | Kimler görür | Nasıl tanımlanır |
|---|---|---|
| **Sistem tarifesi** (`is_admin_created=true`) | Tüm kullanıcılar | Admin tanımlar, platform_type ile eşleşir |
| **Kullanıcı tarifesi** (`is_manual=true`) | Sadece o kullanıcı | Kargo Tarifeleri sayfasından eklenir, platform_id ile eşleşir |

Aynı desi/fiyat aralığı için ikisi de varsa **kullanıcı tarifesi** önceliklidir.

## Kargo tarifesi bulunamazsa

Ürünün desisi hiçbir tarife satırına denk gelmiyorsa kargo maliyeti **sıfır** kabul edilir ve fiyat hesabı devam eder. Bu durumda hesap yanlış sonuç verir — tarife eksiğini Kargo Tarifeleri sayfasından kontrol edin.

## Paketleme maliyeti

Kargo maliyetinin yanı sıra **paketleme maliyeti** de eklenir (Paketleme sayfasından tanımlanmışsa). Ürünün desisi hangi paket grubunun aralığına denk geliyorsa o grubun maliyeti hesaba dahil edilir. Paketleme tanımlı değilse sıfır alınır.
