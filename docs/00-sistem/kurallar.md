# Sistem Kuralları — Nasıl Çalışmalı

Bu projede her iş yapılırken uyulacak temel kurallar.

## Çalışma prensibi
- **Önce güvenlik ve veri bütünlüğü.** Hiçbir değişiklik kullanıcı verisini riske atmamalı.
- **Küçük adımlar.** Tek seferde bir iş; her adımdan sonra doğrula.
- **Riskli/geri-dönülemez işlerden önce onay al** (silme, canlıya çıkma, veri değiştirme).
- Sahibi kod bilmez → her şey **Türkçe ve sade** anlatılır.

## Güvenli değişiklik akışı (zorunlu)
```
1. Değişiklik → ayrı dal (branch), canlıya değil
2. Vercel otomatik ÖNİZLEME linki  ← canlı site dokunulmaz
3. Sahibi önizlemede test eder + ONAYLAR
4. Onaylanınca → main'e merge → canlı
5. Veritabanı işi varsa → önce YEDEK
6. Sorun olursa → Vercel'den tek-tık GERİ AL (rollback)
```
> İstisna: Doküman (`.md`) dosyaları uygulamaya dahil değildir → direkt main'e güvenle gidebilir.

## Asla bozulmayacaklar
1. **Kullanıcı izolasyonu** — kimse kimsenin verisini göremez (bkz. `guvenlik.md`).
2. **Veri ≠ Kod** — kod değişikliği veriyi silmez/bozmaz.
3. **Fiyat/kâr hesabı** — `PriceCalculationEngine` mantığı yanlışlaşırsa kârlar bozulur. Dikkat (bkz. `../calisma-prensibi/fiyat-hesabi.md`).
4. Her push öncesi `npm run build` ile derleme doğrulanır.

## Yeni sayfa eklerken
1. `src/pages/` içine sayfa dosyası.
2. `src/pages.config.js`'e import + PAGES kaydı.
3. `src/Layout.jsx`'e menü maddesi (gerekiyorsa `trendyolOnly`/`hepsiburadaOnly` koşulu).
4. Build + önizleme + onay.

## Yedekler
Her büyük işten önce yedek alınır. Mevcut: `backup_20260624` (veri şeması) + `yedek-reorg-oncesi-20260624` (git etiketi). Detay `CLAUDE.md`'de.
