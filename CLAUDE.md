# CLAUDE.md — PriceHub Proje Beyni

Bu dosya projenin "beynidir". Her oturumda (masaüstü veya mobil/bulut) önce bunu oku.
Sahibi **ahmtgoze** kod bilmez; çok düzenli, güvenli ve anlaşılır çalışmak ister. Açıklamalar Türkçe yapılmalı.

## Proje nedir
PriceHub: Trendyol & Hepsiburada odaklı **fiyatlama / kâr yönetim sistemi** (master ürünlerden komisyon, kargo, kampanya hesaplayıp satış fiyatı üretir). React 18 + Vite (JS/JSX), Tailwind + Radix (shadcn), Supabase backend, Vercel deploy. Başlangıçta Base44 (no-code) ile yapıldı, Supabase'e taşındı.

## Bağlantılar
- GitHub: `ahmtgoze/pricehub` (public, main → Vercel auto-deploy). Canlı: `pricehub-ashen.vercel.app`.
- Supabase: ref `hrnubpnvknkhzyzebgra` (eu-central-1, Postgres 17). Gerçek veri var (~924 ürün).
- Vercel: proje `pricehub`, takım `ahmet's projects`.

## Mimari (kısaca)
- `src/api/db.js` = veri katmanı. Base44 uyumlu bir "shim": `db.entities.X.filter/create/update/...` → Supabase. `created_by` her insert'te kullanıcının e-postasına set edilir. **Bu çalışan kalptir, silme — sadece temizle/belgele.**
- `src/components/PriceCalculationEngine.jsx` = **sistemin kalbi.** `calculatePriceBreakdown` fiyat/komisyon/kargo/barem/KDV/kâr hesaplar. Buna DOKUNURKEN ÇOK DİKKAT.
- `src/pages/` sayfalar, `src/Layout.jsx` menü/kabuk, `src/pages.config.js` sayfa kaydı (yeni sayfa burada + Layout nav'a eklenir).

## ⛔ ASLA BOZULMAYACAK KURALLAR
1. **Çok kiracılılık / izolasyon:** Hiçbir kullanıcı diğerinin verisini GÖREMEZ. Her kullanıcı-verisi tablosu RLS ile `created_by = auth.email()` izoleli. Yeni tablo eklerken RLS + owner-scoped policy ZORUNLU. Bunu asla gevşetme.
2. **Veri ≠ Kod.** Kod değişikliği veriye dokunmaz. Veriyi DELETE/UPDATE eden migration'lardan kaçın; mecbursan önce yedek.
3. **Fiyat/kâr hesabı bozulmamalı.** PriceCalculationEngine mantığı değişirse kârlar yanlış çıkar. Değiştirmeden önce iki kez düşün; ileride buraya otomatik test eklenecek.
4. Her push öncesi `npm run build` ile derlemeyi DOĞRULA.

## Güvenli çalışma yöntemi (ZORUNLU)
Büyük/riskli değişiklikler: **branch aç → Vercel önizleme linki (canlı dokunulmaz) → kullanıcı test edip ONAYLAR → main'e merge → canlı.** Sorun olursa Vercel tek-tık rollback. Doküman (.md) dosyaları uygulamaya dahil değildir → direkt main'e güvenle gidebilir, önizleme gerekmez.

## YEDEKLER (2026-06-24, reorg öncesi)
- DATA: Supabase'de `backup_20260624` şeması = 22 public tablonun donmuş kopyası. Geri yükleme: `truncate public.X; insert into public.X select * from backup_20260624.X;` (servis rolüyle, FK/RLS'e dikkat).
- KOD: git tag `yedek-reorg-oncesi-20260624` (commit 4a9ef3a). Bu, HB sayfaları + güvenlik dahil son stabil hal.

## Güvenlik (yapıldı, canlıda)
RLS izolasyonu tüm 22 tabloda; herkese-açık Excel kovası kapatıldı (private + imzalı URL); fonksiyon search_path sabitlendi; forging INSERT açıkları kapatıldı; anon okuma kısıtlandı. Detay: migration sec_01..07. Gizli bilgi kolonu yok. Kabul edilen: is_admin RPC (politikalarda gerekli). Manuel kalan: leaked-password-protection (Pro plan gerektirir, opsiyonel). Entegrasyonda API anahtarı saklarken: `is_system_admin` şablon platformlarına KOYMA; ideali Supabase Vault.

## Devam eden plan (reorganizasyon — düzenli yapı)
3 katman: (1) **Bilgi** = bu CLAUDE.md + `docs/` (Türkçe: 00-sistem, tasarim, calisma-prensibi, bilgilendirme). (2) **Kod** = `src/` + YENİ `src/config/` merkezi marka/tema/font (tek doğru kaynak). (3) **Ayar** = YENİ `app_config` tablosu + admin "Genel Ayarlar" paneli (marka adı, logo, banner, font, tema — koda dokunmadan).
Karar: **marka adı = "PriceHub"**, tema **GLOBAL** (sahip tasarlar, herkes aynısını görür; admin yazar, herkes okur, gizli bilgi içermez).
Sıra: docs+CLAUDE.md → Base44/çöp temizliği (canlı repoda hâlâ `base44/` klasörü + base44 favicon var) → src/config + app_config → Genel Ayarlar paneli → gelişmiş UI (sütun sürükleme; @hello-pangea/dnd kurulu) → fiyat motoruna otomatik testler.

## Bilinen durum
- HB promosyon sayfaları (Avantajlı Teklifler, Sepet Kampanyaları, Kendi Kampanyan) **canlıda** (commit 4a9ef3a). `hepsiburadaOnly` ile gizlenir/gösterilir.
- Apple tarzı tasarım revizesi (Dashboard + fontlar + monokrom) **ertelendi**, yerel `wip-hb-design` dalında duruyor (deploy edilmedi).
- Tekrar fırsatı: `calculateProfit` mantığı birçok sayfada kopyalanmış (Trendyol + HB) → ileride tek yere toplanabilir (fresh code).

## Üslup
Türkçe, sade, kullanıcı kod bilmiyor. Riskli/geri-dönülemez işlerden önce onay al. Küçük adımlar, her adımda doğrula. Önce güvenlik ve veri bütünlüğü.
