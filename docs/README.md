# PriceHub — Dokümantasyon

Bu klasör projenin **bilgi katmanı**dır. Kod değil, Türkçe açıklamalardır. Hem sahibi (kod bilmeyen) hem de yapay zeka asistanı buraya bakar.

## Klasör yapısı

| Klasör | Ne içerir |
|--------|-----------|
| `00-sistem/` | Genel kurallar, güvenlik modeli, mimari harita — **en önemli klasör** |
| `tasarim/` | Renkler, fontlar, bileşen rehberi, yeni sayfa şablonu |
| `calisma-prensibi/` | Her modül NASIL çalışır (fiyat hesabı, komisyon, kargo-barem, promosyonlar) |
| `bilgilendirme/` | Her sayfa için Türkçe kullanım açıklaması (23 sayfa) |

## Nereden başlamalı
1. Proje genel kuralları → `00-sistem/kurallar.md`
2. Güvenlik / kullanıcı izolasyonu → `00-sistem/guvenlik.md`
3. Sistemin kalbi (fiyat/kâr hesabı) → `calisma-prensibi/fiyat-hesabi.md`

> Not: Projenin "beyni" kök dizindeki `CLAUDE.md`'dir — yapay zeka her oturumda önce onu okur.
