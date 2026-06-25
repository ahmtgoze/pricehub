# Tasarım — Genel İlkeler

## Felsefe

PriceHub'ın görsel dili **Apple.com estetiğini** referans alır: minimal, sakin, göze yorucu olmayan, bol beyaz alan, net tipografik hiyerarşi.

Hedef: kullanıcı ekrana bakınca ne yapacağını hemen anlar, renk/ikon kalabalığı dikkatini dağıtmaz, önemli bilgi vurgulanır ama abartılmaz.

## Renk paleti

| Kullanım | Renk | Tailwind / CSS |
|---|---|---|
| Sayfa arka planı | Açık gri | `bg-gray-50` / `#f5f5f7` |
| Kart arka planı | Beyaz | `bg-white` |
| Ana metin | Neredeyse siyah | `text-gray-900` / `#1d1d1f` |
| İkincil metin | Orta gri | `text-gray-500` |
| Yardımcı metin | Açık gri | `text-gray-400` |
| Kenarlık | İnce gri | `border-gray-100` |
| Aktif/seçili eleman | Siyah arka plan | `bg-gray-900 text-white` |
| Birincil buton | Siyah | `bg-gray-900 hover:bg-gray-800` |
| Tehlike/silme | Kırmızı | `text-red-500 / bg-red-50` |
| Başarı | Yeşil | `text-green-600 / bg-green-50` |
| Uyarı | Sarı/amber | `text-amber-600 / bg-amber-50` |

Renkli aksan (mavi, turuncu, mor gruplar) **kullanılmaz**. Renk sadece anlam taşıdığında kullanılır (yeşil = olumlu, kırmızı = tehlike/kayıp).

## Tipografi

```css
/* index.css ve tailwind.config.js'de tanımlı */
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, sans-serif;
font-family-mono: 'SF Mono', 'Fira Code', monospace; /* SKU, barkod, sayılar */
```

Hiyerarşi:
- **Sayfa başlığı** — `text-2xl font-semibold text-gray-900`
- **Alt başlık** — `text-sm text-gray-500 mt-1`
- **Kart başlığı** — `text-base font-semibold text-gray-900`
- **Alan etiketi** — `text-xs font-medium text-gray-500 uppercase tracking-wide`
- **Gövde metni** — `text-sm text-gray-700`
- **Yardımcı not** — `text-xs text-gray-400`

## Boşluk ve düzen

- Sayfa içeriği: `max-w-4xl` veya `max-w-6xl` merkezi hizalama, `px-4 lg:px-8 py-8`
- Kartlar arası boşluk: `gap-4` veya `gap-6`
- Kart iç boşluk: `p-6`
- Form alanları arası: `space-y-5`

## Bileşen stilleri

### Kart
```
bg-white rounded-2xl border border-gray-100 shadow-sm p-6
```

### Birincil buton
```
bg-gray-900 hover:bg-gray-800 text-white rounded-lg
```

### İkincil/ghost buton
```
variant="ghost" — sadece hover'da hafif gri arka plan
```

### Input / Select
```
border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400
```

### Badge (aktif durum)
```
bg-green-100 text-green-700   ← aktif/başarılı
bg-red-100 text-red-600       ← pasif/hata
bg-gray-900 text-white        ← seçili/vurgulu
```

### Liste satırı (hover state)
```
bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors
```

## İkon kullanımı

Lucide React ikonları kullanılır. Boyut: `h-4 w-4` (küçük) veya `h-5 w-5` (orta). Renk: `text-gray-400` (pasif), `text-gray-900` (aktif/seçili), `text-white` (siyah arka plan üstünde).

## Duyarlı tasarım (Responsive)

- Mobil öncelikli: sidebar gizli, hamburger menü
- `lg:` breakpoint'te sidebar görünür (`w-72`), layout yatay

Genel pattern:
```
flex flex-col lg:flex-row   ← yan yana
hidden lg:flex              ← sadece masaüstü
lg:hidden                   ← sadece mobil
```
