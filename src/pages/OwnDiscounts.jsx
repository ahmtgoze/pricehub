import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Plus, Edit2, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { bugunMetni } from '@/lib/zincirHesabi';

/**
 * TRENDYOL — KENDI INDIRIMLERIM (16 Eylul 2026)
 *
 * Trendyol panelinde "Indirim Olustur" ve "Kuponlar" ile tanimladigin
 * indirimlerin kaydi. Trendyol bunlar icin Excel vermez; burada tanimlanir,
 * Trendyol'a girmeyi sen yaparsin. Kayitli ve bugun suren her indirim
 * ZINCIR hesabina girer (src/lib/zincirHesabi.js):
 *   net -> sira 1, kosullu -> sira 2 (sepet kampanyalariyla yarisir),
 *   Plus'a ozel -> 2.5, indirim kodu -> 5, kupon -> 6 (karsilama payi dusulur).
 * Boylece tarife/avantajli/flas/kampanya/Plus sayfalarindaki "Diger
 * promosyonlarla" satiri ve Akilli Sec bunlari da hesaba katar.
 */
const Entity = db.entities.TrendyolOwnDiscount;

const TURLER = [
  { value: 'net', label: 'Net İndirim' },
  { value: 'kosullu_tutar', label: 'Koşullu — Tutar üzerinden' },
  { value: 'kosullu_adet', label: 'Koşullu — Ürün adedi üzerinden' },
  { value: 'kosullu_xurun', label: 'Koşullu — X. ürüne' },
  { value: 'indirim_kodu', label: 'İndirim Kodu' },
  { value: 'kupon', label: 'Kupon' },
];
const HEDEFLER = [
  { value: 'all', label: 'Tüm ülkeler (herkes)' },
  { value: 'plus', label: "Trendyol Plus'a özel" },
  { value: 'mikro', label: 'Mikro İhracat (hesaba girmez)' },
];
const KUPON_TURLERI = [
  { value: 'urunden', label: 'Üründen Kazan', aciklama: 'Ürün sayfasını ziyaret eden müşteri kuponu ürün sayfasından kazanır.' },
  { value: 'hedef_kitle', label: 'Hedef Kitle', aciklama: 'Seçilen kriterlere göre oluşan müşteri kitlesine kupon tanımlanır.' },
  { value: 'takipci', label: 'Takipçi Kazan', aciklama: 'Mağazanı takip eden müşteri kupon kazanır.' },
  { value: 'yorum', label: 'Yorum Yap Kazan', aciklama: 'Ürününe yorum yapan müşteri kupon kazanır.' },
];
const INDIRIM_TURLERI = [
  { value: 'net', label: 'Net İndirim', aciklama: 'Sepet tutarına direkt uygulanır; alt limit yok.' },
  { value: 'kosullu', label: 'Koşullu İndirim', aciklama: 'Belirlenen koşul üzeri alışverişlere uygulanır (tutar, adet, X. ürün).' },
  { value: 'indirim_kodu', label: 'İndirim Kodu', aciklama: 'Sepette kodu giren müşteriye uygulanır.' },
];
const KOSUL_TIPLERI = [
  { value: 'tutar', label: 'Tutar üzerinden', aciklama: 'Sepet tutarı minimum tutarı geçince uygulanır.' },
  { value: 'adet', label: 'Ürün adedi üzerinden', aciklama: 'Sepette belirlenen adet ve üzeri ürün olunca uygulanır (X al Y öde de burada).' },
  { value: 'xurun', label: 'X. ürüne', aciklama: 'Belirlenen adette ürün eklenince sepetteki en ucuz ürüne uygulanır.' },
];
const KAPSAMLAR = [
  { value: 'all', label: 'Tüm ürünler' },
  { value: 'kategori', label: 'Kategori' },
  { value: 'urunler', label: 'Belirli ürünler (barkod / stok kodu)' },
];
const bos = () => ({
  ad: '', kategori: 'kupon', tur: 'kupon', kupon_turu: 'urunden', kosul_tipi: 'tutar', hedef_kitle: 'all', kapsam_turu: 'all', kapsam_kategoriler: [], kapsam_urunler_metin: '',
  indirim_tipi: 'tl', oran: '', tutar: '', alt_limit: '', adet: '', al_x: '3', ode_y: '2', maks_tutar: '', karsilama: '0',
  kupon_adedi: '', siparis_limiti: '', start_date: bugunMetni(), end_date: '', aktif: true, not_metni: '',
});
const sayi = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

export default function OwnDiscounts() {
  const [userEmail, setUserEmail] = useState(null);
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [form, setForm] = useState(bos());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [adim, setAdim] = useState(1);

  React.useEffect(() => { db.auth.me().then((u) => setUserEmail(u.email)).catch(() => {}); }, []);
  const { data: platforms = [] } = useQuery({ queryKey: ['platforms', userEmail], queryFn: () => db.entities.Platform.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: categories = [] } = useQuery({ queryKey: ['categories', userEmail], queryFn: () => db.entities.Category.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: kayitlar = [] } = useQuery({ queryKey: ['trendyolOwnDiscounts', userEmail], queryFn: () => Entity.filter({ created_by: userEmail }), enabled: !!userEmail });

  const trendyolPlatforms = platforms.filter((p) => p.platform_type === 'trendyol' && p.is_active !== false)
    .filter((p, i, a) => a.findIndex((x) => x.name === p.name) === i);
  React.useEffect(() => { if (trendyolPlatforms.length >= 1 && !selectedPlatform) setSelectedPlatform(trendyolPlatforms[0].name); }, [trendyolPlatforms.length]);

  const bugun = bugunMetni();
  const surer = (r) => String(r.start_date || '').slice(0, 10) <= bugun && String(r.end_date || '').slice(0, 10) >= bugun;
  const liste = kayitlar
    .filter((r) => !selectedPlatform || !r.platform_account || r.platform_account === selectedPlatform)
    .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setForm(bos()); setEditingId(null); setAdim(1); setShowForm(true); };
  const openEdit = (r) => {
    setForm({
      ...bos(), ...r, kupon_turu: r.kupon_turu || 'urunden', kategori: r.tur === 'kupon' ? 'kupon' : 'indirim', kosul_tipi: (r.tur || '').startsWith('kosullu_') ? r.tur.slice(8) : 'tutar',
      oran: r.oran ?? '', tutar: r.tutar ?? '', alt_limit: r.alt_limit ?? '', adet: r.adet ?? '', al_x: r.al_x ?? '3', ode_y: r.ode_y ?? '2',
      maks_tutar: r.maks_tutar ?? '', karsilama: r.karsilama ?? '0', kupon_adedi: r.kupon_adedi ?? '', siparis_limiti: r.siparis_limiti ?? '',
      kapsam_kategoriler: Array.isArray(r.kapsam_kategoriler) ? r.kapsam_kategoriler : [],
      kapsam_urunler_metin: (Array.isArray(r.kapsam_urunler) ? r.kapsam_urunler : []).join('\n'),
    });
    setEditingId(r.id); setAdim(3); setShowForm(true);
  };

  const kaydet = async () => {
    if (!selectedPlatform) { toast.error('Platform seçin'); return; }
    if (!form.end_date || !form.start_date) { toast.error('Başlangıç ve bitiş tarihi gerekli'); return; }
    if (form.indirim_tipi === 'percent' && !(sayi(form.oran) > 0)) { toast.error('İndirim yüzdesi girin'); return; }
    if (form.indirim_tipi === 'tl' && !(sayi(form.tutar) > 0)) { toast.error('İndirim tutarı girin'); return; }
    const veri = {
      platform_account: selectedPlatform, ad: form.ad || null, tur: form.tur, kupon_turu: form.tur === 'kupon' ? form.kupon_turu : null, hedef_kitle: form.hedef_kitle, kapsam_turu: form.kapsam_turu,
      kapsam_kategoriler: form.kapsam_turu === 'kategori' ? form.kapsam_kategoriler : [],
      kapsam_urunler: form.kapsam_turu === 'urunler' ? form.kapsam_urunler_metin.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean) : [],
      indirim_tipi: form.indirim_tipi, oran: sayi(form.oran), tutar: sayi(form.tutar), alt_limit: sayi(form.alt_limit) || 0,
      adet: sayi(form.adet), al_x: sayi(form.al_x), ode_y: sayi(form.ode_y), maks_tutar: sayi(form.maks_tutar),
      karsilama: sayi(form.karsilama) || 0, kupon_adedi: sayi(form.kupon_adedi), siparis_limiti: sayi(form.siparis_limiti),
      start_date: form.start_date, end_date: form.end_date, aktif: form.aktif !== false, not_metni: form.not_metni || null,
      updated_date: new Date().toISOString(),
    };
    try {
      if (editingId) await Entity.update(editingId, veri); else await Entity.create(veri);
      queryClient.invalidateQueries({ queryKey: ['trendyolOwnDiscounts'] });
      toast.success(editingId ? 'İndirim güncellendi' : 'İndirim kaydedildi; zincir hesabına dahil edildi');
      setShowForm(false); setEditingId(null); setForm(bos());
    } catch (e) { toast.error('Kayıt hatası: ' + (e?.message || e)); }
  };
  const sil = async (r) => {
    if (!window.confirm(`"${r.ad || TURLER.find((t) => t.value === r.tur)?.label}" silinsin mi?`)) return;
    try { await Entity.delete(r.id); queryClient.invalidateQueries({ queryKey: ['trendyolOwnDiscounts'] }); toast.success('Silindi'); }
    catch (e) { toast.error('Silme hatası: ' + (e?.message || e)); }
  };
  const aktifDegistir = async (r) => {
    try { await Entity.update(r.id, { aktif: r.aktif === false, updated_date: new Date().toISOString() }); queryClient.invalidateQueries({ queryKey: ['trendyolOwnDiscounts'] }); }
    catch (e) { toast.error('Hata: ' + (e?.message || e)); }
  };

  const indirimMetni = (r) => {
    const tip = r.indirim_tipi || 'percent';
    const m = tip === 'tl' ? `${r.tutar} TL` : tip === 'xalyode' ? `${r.al_x} Al ${r.ode_y} Öde` : `%${r.oran}${r.maks_tutar ? ` (maks ${r.maks_tutar} TL)` : ''}`;
    return `${m}${Number(r.alt_limit) > 0 ? ` · alt limit ${r.alt_limit} TL` : ''}${r.tur === 'kosullu_adet' && r.adet ? ` · ${r.adet} adet` : ''}${r.tur === 'kosullu_xurun' && r.adet ? ` · ${r.adet}. ürün` : ''}`;
  };
  const kapsamMetni = (r) => r.kapsam_turu === 'kategori' ? `Kategori: ${(r.kapsam_kategoriler || []).join(', ')}` : r.kapsam_turu === 'urunler' ? `${(r.kapsam_urunler || []).length} ürün` : 'Tüm ürünler';

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="ph-title">Kuponlarım ve İndirimlerim</h1>
            <p className="text-muted-foreground mt-1">Trendyol'da "İndirim Oluştur" ve "Kuponlar" ile tanımladığın indirimler. Burada kaydedilir; süren olanlar tüm sayfalardaki kâr hesabına (zincire) kendiliğinden girer.</p>
          </div>
          <Button onClick={openNew} className="bg-primary hover:bg-black dark:hover:bg-white/90"><Plus className="mr-2 h-4 w-4" />Yeni İndirim / Kupon</Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6 text-sm text-muted-foreground space-y-1">
            <div className="flex items-start gap-2"><Info className="h-4 w-4 mt-0.5 shrink-0" />
              <div>Trendyol'da tanımladığın indirimi ve kuponu buraya da yaz. Sistem bunları diğer promosyonlarla birlikte hesaplar; kuponda Trendyol'un karşıladığı pay senden çıkmaz.</div>
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? 'İndirimi Düzenle' : 'Yeni İndirim / Kupon'}</CardTitle>
              <div className="flex gap-2 mt-2 text-xs">
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`px-2 py-1 rounded-full ${adim === n ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {n}. {n === 1 ? 'Kupon mu, indirim mi?' : n === 2 ? 'Tür' : 'Detaylar'}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {adim === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[['kupon', 'Kupon', "Trendyol → Promosyon & Fiyat → Kuponlar. Müşteri kuponu kazanır, sepette kullanır. Trendyol destekli kuponda karşılama oranı vardır."],
                    ['indirim', 'İndirim', "Trendyol → Promosyon & Fiyat → İndirimler. Net indirim, koşullu indirim ya da indirim kodu."]].map(([k, b, a]) => (
                    <button key={k} type="button" onClick={() => { set('kategori', k); set('tur', k === 'kupon' ? 'kupon' : 'net'); setAdim(2); }}
                      className={`text-left rounded-xl border p-4 hover:bg-secondary ${form.kategori === k ? 'border-primary bg-secondary' : 'border-border'}`}>
                      <div className="font-semibold">{b}</div><div className="text-xs text-muted-foreground mt-1">{a}</div>
                    </button>
                  ))}
                </div>
              )}

              {adim === 2 && form.kategori === 'kupon' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {KUPON_TURLERI.map((t) => (
                    <button key={t.value} type="button" onClick={() => { set('kupon_turu', t.value); set('tur', 'kupon'); setAdim(3); }}
                      className={`text-left rounded-xl border p-4 hover:bg-secondary ${form.kupon_turu === t.value ? 'border-primary bg-secondary' : 'border-border'}`}>
                      <div className="font-semibold">{t.label}</div><div className="text-xs text-muted-foreground mt-1">{t.aciklama}</div>
                    </button>
                  ))}
                </div>
              )}
              {adim === 2 && form.kategori === 'indirim' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {INDIRIM_TURLERI.map((t) => (
                      <button key={t.value} type="button" onClick={() => { set('tur', t.value === 'kosullu' ? `kosullu_${form.kosul_tipi}` : t.value); if (t.value !== 'kosullu') setAdim(3); }}
                        className={`text-left rounded-xl border p-4 hover:bg-secondary ${(t.value === 'kosullu' ? form.tur.startsWith('kosullu') : form.tur === t.value) ? 'border-primary bg-secondary' : 'border-border'}`}>
                        <div className="font-semibold">{t.label}</div><div className="text-xs text-muted-foreground mt-1">{t.aciklama}</div>
                      </button>
                    ))}
                  </div>
                  {form.tur.startsWith('kosullu') && (
                    <div className="space-y-2">
                      <Label>Koşul tipi</Label>
                      <div className="flex flex-wrap gap-2">
                        {KOSUL_TIPLERI.map((k) => (
                          <Button key={k.value} type="button" variant={form.kosul_tipi === k.value ? 'default' : 'outline'} size="sm"
                            onClick={() => { set('kosul_tipi', k.value); set('tur', `kosullu_${k.value}`); if (k.value !== 'adet' && form.indirim_tipi === 'xalyode') set('indirim_tipi', 'percent'); }}>{k.label}</Button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">{KOSUL_TIPLERI.find((k) => k.value === form.kosul_tipi)?.aciklama}</div>
                      <Button type="button" onClick={() => setAdim(3)} className="bg-primary hover:bg-black dark:hover:bg-white/90 mt-2">Devam et</Button>
                    </div>
                  )}
                </div>
              )}

              {adim === 3 && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {form.kategori === 'kupon' ? `Kupon · ${KUPON_TURLERI.find((k) => k.value === form.kupon_turu)?.label}` : TURLER.find((t) => t.value === form.tur)?.label}
                    {' '}<button type="button" className="underline" onClick={() => setAdim(2)}>değiştir</button>
                  </div>

                  <div className="space-y-2"><Label>{form.kategori === 'kupon' ? 'Kupon kapsamı' : 'İndirim uygulanacak ürünler'}</Label>
                    <div className="flex flex-wrap gap-2">
                      {KAPSAMLAR.map((k) => <Button key={k.value} type="button" size="sm" variant={form.kapsam_turu === k.value ? 'default' : 'outline'} onClick={() => set('kapsam_turu', k.value)}>{k.label}</Button>)}
                    </div>
                  </div>
                  {form.kapsam_turu === 'kategori' && (
                    <div className="space-y-2"><Label>Kategoriler</Label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((c) => {
                          const secili = form.kapsam_kategoriler.includes(c.name);
                          return <Button key={c.id} type="button" size="sm" variant={secili ? 'default' : 'outline'} className="h-7 text-xs"
                            onClick={() => set('kapsam_kategoriler', secili ? form.kapsam_kategoriler.filter((x) => x !== c.name) : [...form.kapsam_kategoriler, c.name])}>{c.name}</Button>;
                        })}
                        {categories.length === 0 && <span className="text-xs text-muted-foreground">Kategori tanımlı değil (Kategoriler sayfası).</span>}
                      </div>
                    </div>
                  )}
                  {form.kapsam_turu === 'urunler' && (
                    <div className="space-y-2"><Label>Ürünler (barkod ya da stok kodu; satır başına bir)</Label>
                      <textarea className="w-full min-h-[90px] rounded-xl border border-border bg-background p-2 text-sm font-mono" value={form.kapsam_urunler_metin} onChange={(e) => set('kapsam_urunler_metin', e.target.value)} placeholder={'KCZ4555\n8681511355425'} />
                    </div>
                  )}

                  <div className="space-y-2"><Label>{form.kategori === 'kupon' ? 'Kupon indirim türü' : 'İndirim tipi'}</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant={form.indirim_tipi === 'tl' ? 'default' : 'outline'} onClick={() => set('indirim_tipi', 'tl')}>{form.kategori === 'kupon' ? 'Tutar (₺) indirimi' : 'X TL indirim'}</Button>
                      <Button type="button" size="sm" variant={form.indirim_tipi === 'percent' ? 'default' : 'outline'} onClick={() => set('indirim_tipi', 'percent')}>{form.kategori === 'kupon' ? 'Yüzde indirimi' : '%X indirim'}</Button>
                      {form.tur === 'kosullu_adet' && <Button type="button" size="sm" variant={form.indirim_tipi === 'xalyode' ? 'default' : 'outline'} onClick={() => set('indirim_tipi', 'xalyode')}>X Al Y Öde</Button>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {form.indirim_tipi === 'percent' && <div className="space-y-2"><Label>{form.kategori === 'kupon' ? 'Kupon yüzde indirimi *' : 'İndirim yüzdesi *'}</Label><Input type="number" step="0.1" value={form.oran} onChange={(e) => set('oran', e.target.value)} placeholder="ör. 10" /></div>}
                    {form.indirim_tipi === 'tl' && <div className="space-y-2"><Label>{form.kategori === 'kupon' ? 'Kupon tutarı (₺) *' : 'İndirim tutarı (₺) *'}</Label><Input type="number" step="0.01" value={form.tutar} onChange={(e) => set('tutar', e.target.value)} placeholder="ör. 50" /></div>}
                    {form.indirim_tipi === 'xalyode' && (<>
                      <div className="space-y-2"><Label>X al</Label><Input type="number" value={form.al_x} onChange={(e) => set('al_x', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Y öde</Label><Input type="number" value={form.ode_y} onChange={(e) => set('ode_y', e.target.value)} /></div>
                    </>)}
                    {form.tur === 'kupon' && form.indirim_tipi === 'percent' && <div className="space-y-2"><Label>Maks. kupon tutarı (₺)</Label><Input type="number" step="0.01" value={form.maks_tutar} onChange={(e) => set('maks_tutar', e.target.value)} placeholder="tavan" /></div>}
                    {form.tur !== 'net' && form.indirim_tipi !== 'xalyode' && <div className="space-y-2"><Label>{form.kategori === 'kupon' ? 'Alışveriş alt limiti (₺)' : 'Minimum sepet tutarı (₺)'}</Label><Input type="number" step="0.01" value={form.alt_limit} onChange={(e) => set('alt_limit', e.target.value)} placeholder="0 = yok" /></div>}
                    {form.tur === 'kosullu_adet' && <div className="space-y-2"><Label>Ürün adedi (ve üzeri)</Label><Input type="number" value={form.adet} onChange={(e) => set('adet', e.target.value)} placeholder="ör. 2" /></div>}
                    {form.tur === 'kosullu_xurun' && <div className="space-y-2"><Label>Sepette olması gereken ürün adedi</Label><Input type="number" value={form.adet} onChange={(e) => set('adet', e.target.value)} placeholder="ör. 2" /></div>}
                    {form.tur === 'kupon' && <div className="space-y-2"><Label>Trendyol'un karşıladığı oran (%)</Label><Input type="number" step="1" value={form.karsilama} onChange={(e) => set('karsilama', e.target.value)} placeholder="0 = tamamı senden" /></div>}
                    {form.tur === 'kupon' && <div className="space-y-2"><Label>Kupon adedi</Label><Input type="number" value={form.kupon_adedi} onChange={(e) => set('kupon_adedi', e.target.value)} /></div>}
                    {form.tur === 'indirim_kodu' && <div className="space-y-2"><Label>Kod kullanım adedi</Label><Input type="number" value={form.kupon_adedi} onChange={(e) => set('kupon_adedi', e.target.value)} /></div>}
                    {form.tur !== 'kupon' && form.tur !== 'indirim_kodu' && <div className="space-y-2"><Label>Sipariş adedi limiti</Label><Input type="number" value={form.siparis_limiti} onChange={(e) => set('siparis_limiti', e.target.value)} placeholder="boş = sınırsız" /></div>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Hedef kitle</Label>
                      <Select value={form.hedef_kitle} onValueChange={(v) => set('hedef_kitle', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{HEDEFLER.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Başlangıç *</Label><Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Bitiş *</Label><Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Ad (isteğe bağlı)</Label><Input value={form.ad} onChange={(e) => set('ad', e.target.value)} placeholder="ör. Eylül kuponu" /></div>
                  </div>
                  <div className="space-y-2"><Label>Not</Label><Input value={form.not_metni} onChange={(e) => set('not_metni', e.target.value)} placeholder="ör. Trendyol destekli kupon" /></div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setAdim(2)}>Geri</Button>
                    <Button onClick={kaydet} className="bg-primary hover:bg-black dark:hover:bg-white/90">{editingId ? 'Güncelle' : 'Kaydet'}</Button>
                    <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Vazgeç</Button>
                  </div>
                </div>
              )}
              {adim < 3 && (
                <div className="flex gap-3 pt-2">
                  {adim === 2 && <Button variant="outline" onClick={() => setAdim(1)}>Geri</Button>}
                  <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Vazgeç</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BadgePercent className="h-5 w-5" />Kayıtlı indirimler ({liste.length})</CardTitle></CardHeader>
          <CardContent>
            {liste.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">Henüz kayıt yok. Trendyol'da tanımladığın indirim ya da kuponu buraya da yaz; kâr hesabı onu görsün.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left">
                    <th className="p-3">Tür</th><th className="p-3">İndirim</th><th className="p-3">Hedef</th><th className="p-3">Kapsam</th><th className="p-3">Tarih</th><th className="p-3">Durum</th><th className="p-3"></th>
                  </tr></thead>
                  <tbody>
                    {liste.map((r) => {
                      const suruyor = surer(r) && r.aktif !== false;
                      return (
                        <tr key={r.id} className="border-b hover:bg-secondary">
                          <td className="p-3"><div className="font-medium">{TURLER.find((t) => t.value === r.tur)?.label || r.tur}{r.tur === 'kupon' && r.kupon_turu ? ` · ${KUPON_TURLERI.find((k) => k.value === r.kupon_turu)?.label || r.kupon_turu}` : ''}</div>{r.ad && <div className="text-xs text-muted-foreground">{r.ad}</div>}</td>
                          <td className="p-3">{indirimMetni(r)}{r.tur === 'kupon' && Number(r.karsilama) > 0 && <div className="text-xs text-emerald-600">%{r.karsilama} Trendyol karşılamalı</div>}</td>
                          <td className="p-3">{HEDEFLER.find((h) => h.value === r.hedef_kitle)?.label || 'Tüm ülkeler'}</td>
                          <td className="p-3 text-xs">{kapsamMetni(r)}</td>
                          <td className="p-3 text-xs">{r.start_date} → {r.end_date}</td>
                          <td className="p-3"><Badge variant={suruyor ? 'default' : 'secondary'}>{r.aktif === false ? 'Pasif' : suruyor ? 'Sürüyor · hesapta' : (String(r.end_date) < bugun ? 'Bitti' : 'Başlamadı')}</Badge></td>
                          <td className="p-3 whitespace-nowrap">
                            <Button size="sm" variant="ghost" onClick={() => aktifDegistir(r)} className="text-xs">{r.aktif === false ? 'Aktif et' : 'Pasif yap'}</Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit2 className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => sil(r)} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
