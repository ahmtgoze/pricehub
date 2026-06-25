# Yeni Sayfa Oluştururken Takip Edilecek Şablon

Yeni bir sayfa eklerken aşağıdaki şablonu ve kuralları takip et.

## Dosya oluşturma

1. `src/pages/YeniSayfa.jsx` dosyasını oluştur
2. `src/pages.config.js` içine import ekle ve `PAGES` objesine kayıt et
3. `src/Layout.jsx` içindeki `baseNavigation` dizisine navigasyon öğesi ekle
4. `docs/bilgilendirme/` altına açıklama belgesi yaz

## Sayfa şablonu

```jsx
import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function YeniSayfa() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    db.auth.me().then(u => setUserEmail(u.email)).catch(() => {});
  }, []);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', userEmail],
    queryFn: () => db.entities.EntityAdi.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      {/* Sayfa başlığı */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Sayfa Adı</h1>
        <p className="text-sm text-gray-500 mt-1">Kısa açıklama.</p>
      </div>

      {/* İçerik */}
    </div>
  );
}
```

## Kart bileşeni

```jsx
<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
  <h2 className="text-base font-semibold text-gray-900 mb-6">Kart Başlığı</h2>
  {/* içerik */}
</div>
```

## Form alanı

```jsx
<div className="space-y-1.5">
  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
    Alan Adı
  </label>
  <Input value={value} onChange={e => setValue(e.target.value)} />
  <p className="text-xs text-gray-400">Yardımcı not.</p>
</div>
```

## Toast bildirimleri

```jsx
toast.success('İşlem başarılı.');
toast.error('Bir hata oluştu.');
toast.warning('Dikkat: ...');
```

## Loading durumu

```jsx
{isLoading ? (
  <div className="flex justify-center py-12">
    <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
  </div>
) : (
  /* içerik */
)}
```

## Boş durum

```jsx
{items.length === 0 && (
  <div className="text-center py-16">
    <p className="text-sm text-gray-400">Henüz kayıt yok.</p>
  </div>
)}
```

## Navigasyon öğesi (Layout.jsx)

```js
{ name: 'Sayfa Adı', page: 'YeniSayfa', icon: IconAdi },
// Platform kısıtlaması için:
{ name: 'Sayfa Adı', page: 'YeniSayfa', icon: IconAdi, trendyolOnly: true },
{ name: 'Sayfa Adı', page: 'YeniSayfa', icon: IconAdi, hepsiburadaOnly: true },
```

## Kontrol listesi

Sayfa eklerken:
- [ ] `pages.config.js`'e import ve PAGES kaydı eklendi
- [ ] `Layout.jsx` navigasyona eklendi
- [ ] Tasarım ilkelerine uyuldu (siyah/gri/beyaz, kart yapısı)
- [ ] Toast bildirimleri eklendi (başarı ve hata için)
- [ ] Loading ve boş durum ele alındı
- [ ] `docs/bilgilendirme/` altına belge yazıldı
