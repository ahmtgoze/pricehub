# Mimari Harita — Sistem Nasıl Kurulu

## Teknoloji yığını
- **Önyüz:** React 18 + Vite (JavaScript/JSX), Tailwind CSS + Radix (shadcn tarzı bileşenler).
- **Arka uç:** Supabase (PostgreSQL veritabanı + Auth + Storage + Edge Functions).
- **Barındırma:** Vercel (main'e push → otomatik deploy).
- **Geçmiş:** Önce Base44 (no-code) ile yapıldı, sonra Supabase'e taşındı.

## Klasör haritası
```
src/
├── api/db.js          → VERİ KATMANI. db.entities.X.filter/create/update/delete...
│                        Base44 uyumlu "shim" — Supabase'i sarmalar.
│                        created_by her kayıtta otomatik kullanıcı e-postasına set edilir.
│                        ⚠️ Çalışan kalp — silme, sadece temizle/belgele.
├── components/
│   └── PriceCalculationEngine.jsx  → SİSTEMİN KALBİ (fiyat/kâr hesabı). Dikkatle dokun.
├── pages/             → Sayfalar (Dashboard, Fiyatlar, Ürünler, Komisyonlar, promosyonlar...)
├── Layout.jsx         → Menü + kabuk. Sayfa kaydı pages.config.js ile.
├── pages.config.js    → Sayfa→rota eşleşmesi (yeni sayfa burada kaydedilir)
└── lib/               → Yardımcılar (platformAdapters, matchingEngine, utils...)
```

## Veri akışı (özet)
```
Sayfa (React)
  → db.entities.X.filter({ created_by })   (src/api/db.js)
    → Supabase (RLS: sadece kendi verin)
  → PriceCalculationEngine ile hesap
  → ekranda göster / Excel'e aktar
```

## Önemli tablolar
`products` (master ürünler), `product_prices` (hesaplanan fiyatlar), `marketplace_products` (pazaryeri eşleşmeleri), `commissions`, `categories`, `platforms`, `shipping_rates`, `packages`/`package_items`, ve promosyon tabloları (trendyol_price_ranges, flash_products, advantage_product_tags...).

## Planlanan ekler (reorganizasyon)
- `src/config/` → merkezi marka/tema/font (tek doğru kaynak).
- `app_config` tablosu + "Genel Ayarlar" admin paneli → panelden marka/logo/font/tema yönetimi.
Detaylı plan: kök `CLAUDE.md`.
