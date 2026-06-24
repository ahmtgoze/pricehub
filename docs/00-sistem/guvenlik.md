# Güvenlik Modeli — Kullanıcı İzolasyonu

**En önemli kural: Hiçbir kullanıcı, başka bir kullanıcının verisini göremez.** PriceHub çok-kullanıcılı (multi-tenant) bir sistemdir; her satıcı yalnızca kendi verisini görür/değiştirir.

## Nasıl sağlanıyor (RLS)
Supabase'de her tabloda **Row Level Security (RLS)** açık. Her kullanıcı-verisi tablosu `created_by = giriş yapan kullanıcının e-postası` kuralıyla izole. Yani veritabanı seviyesinde, bir kullanıcı diğerinin satırlarını **fiziksel olarak** okuyamaz.

- Tüm 22 public tabloda RLS **açık**.
- Özel veri (ürünler, fiyatlar, komisyonlar, kategoriler, paketler, kampanyalar, marketplace ürünleri, ayarlar...) → sadece sahibi + admin.
- Bilerek paylaşılan (gizli değil): duyurular (yayın), kargo firma listesi (referans), platform/kargo **sistem şablonları** (admin'in tanımladığı ortak varsayılanlar).
- Veritabanında **hiç gizli bilgi kolonu yok** (API anahtarı/şifre/token). Paylaşılan şablonlar bile sır içermez.

## ⛔ Yeni tablo/özellik eklerken
- RLS'i **aç** ve `created_by = auth.email()` owner-scoped politikası ekle. **Bu kuralı asla gevşetme.**
- Dünyaya-açık (`qual: true`) okuma politikası SADECE gerçekten herkese açık referans veri için (gizli veri asla).
- INSERT politikası `created_by = auth.email()` olmalı (sadece "girişli mi" yetmez — sahte sahiplik açığı olur).

## Yapılan güvenlik sıkılaştırmaları (canlıda)
`sec_01..07` migration'larıyla: RLS izolasyonu doğrulandı; herkese-açık Excel kovası kapatıldı (private + imzalı URL); fonksiyon `search_path` sabitlendi; sahte-sahiplik INSERT açıkları kapatıldı; anonim (girişsiz) okuma kısıtlandı; sistem şablonu paylaşımı doğru ayarlandı.

## Entegrasyon (API anahtarları) için uyarı
Trendyol/Hepsiburada API anahtarı saklarken:
- Anahtar kolonlarını **`is_system_admin` şablon platformlarına KOYMA** (yoksa herkes görür).
- İdeali: anahtarları **Supabase Vault** ile şifreli sakla.

## Kalan opsiyonel madde
"Leaked password protection" (sızdırılmış şifre koruması) — Supabase Pro plan gerektirir; Google OAuth kullanıldığı için kritik değil.
