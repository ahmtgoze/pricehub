import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Lock, Users, ChevronRight, Check, Eye, EyeOff, Shield, Palette
, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CIFT_KARGO_ANAHTARI, ciftKargoKurallari, kuralHatasi } from '@/lib/kargoHesabi';

const SECTIONS = [
  { id: 'account', label: 'Hesap', icon: User },
  { id: 'security', label: 'Güvenlik', icon: Lock },
  { id: 'hesaplama', label: 'Hesaplama', icon: Calculator },
  { id: 'brand', label: 'Marka Ayarları', icon: Palette, adminOnly: true },
  { id: 'users', label: 'Kullanıcılar', icon: Users, adminOnly: true },
];

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeSection, setActiveSection] = useState('account');
  const visibleSections = SECTIONS.filter(s => !s.adminOnly || isAdmin);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="ph-title">Genel Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">Hesap ve uygulama tercihlerinizi yönetin.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sol nav */}
        <nav className="lg:w-52 flex-shrink-0">
          <ul className="space-y-0.5">
            {visibleSections.map(s => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', active ? 'text-white' : 'text-muted-foreground/70')} />
                    {s.label}
                    {active && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* İçerik */}
        <div className="flex-1 min-w-0">
          {activeSection === 'account' && <AccountSection user={user} />}
          {activeSection === 'security' && <SecuritySection />}
          {activeSection === 'hesaplama' && <HesaplamaSection />}
          {activeSection === 'brand' && isAdmin && <BrandSection />}
          {activeSection === 'users' && isAdmin && <UsersSection />}
        </div>
      </div>
    </div>
  );
}

/* ─── Hesap ─── */
function AccountSection({ user }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setFullName(user?.full_name || ''); }, [user?.full_name]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_profiles').update({ full_name: fullName }).eq('id', user.id);
      if (error) throw error;
      toast.success('Ad güncellendi.');
    } catch {
      toast.error('Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Hesap Bilgileri">
      <div className="space-y-5">
        <Field label="Ad Soyad">
          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Adınızı girin" />
        </Field>
        <Field label="E-posta">
          <Input value={user?.email || ''} disabled className="bg-secondary text-muted-foreground" />
          <p className="text-xs text-muted-foreground/70 mt-1">E-posta adresi değiştirilemez.</p>
        </Field>
        <Field label="Rol">
          <div className="flex items-center gap-2 h-9">
            <Badge className={user?.role === 'admin' ? 'bg-primary' : ''} variant={user?.role === 'admin' ? 'default' : 'secondary'}>
              {user?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
            </Badge>
          </div>
        </Field>
        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-black dark:hover:bg-white/90">
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Güvenlik ─── */
// Google/kodla girenlerin şifresi yok: "Şifre Oluştur". Şifresi unutulursa
// e-postaya gelen doğrulama koduyla (reauthenticate nonce) yenisi belirlenir.
function SecuritySection() {
  const [sifreVar, setSifreVar] = useState(null);
  const [unuttum, setUnuttum] = useState(false);
  const [kodGitti, setKodGitti] = useState(false);
  const [f, setF] = useState({ mevcut: '', yeni: '', tekrar: '', kod: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));

  useEffect(() => { supabase.rpc('sifre_var_mi').then(({ data }) => setSifreVar(!!data)); }, []);

  const mod = !sifreVar ? 'olustur' : unuttum ? 'unuttum' : 'degistir';
  const baslik = { olustur: 'Şifre Oluştur', degistir: 'Şifre Değiştir', unuttum: 'Şifre Sıfırla' }[mod];

  const kodGonder = async () => {
    setLoading(true);
    const { error } = await supabase.auth.reauthenticate();
    setLoading(false);
    if (error) { toast.error('Kod gönderilemedi.'); return; }
    setKodGitti(true);
    toast.success('Doğrulama kodu e-postana gönderildi.');
  };

  const kaydet = async () => {
    if (f.yeni.length < 6) { toast.error('Şifre en az 6 karakter olmalı.'); return; }
    if (f.yeni !== f.tekrar) { toast.error('Şifreler eşleşmiyor.'); return; }
    setLoading(true);
    try {
      if (mod === 'degistir') {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.auth.signInWithPassword({ email: user?.email, password: f.mevcut });
        if (error) { toast.error('Mevcut şifre yanlış.'); return; }
      }
      const { error } = await supabase.auth.updateUser(
        mod === 'unuttum' ? { password: f.yeni, nonce: f.kod.trim() } : { password: f.yeni });
      if (error) { toast.error(mod === 'unuttum' ? 'Kod hatalı ya da süresi dolmuş.' : 'Şifre kaydedilemedi.'); return; }
      toast.success(mod === 'olustur' ? 'Şifren oluşturuldu.' : 'Şifre güncellendi.');
      setF({ mevcut: '', yeni: '', tekrar: '', kod: '' });
      setSifreVar(true); setUnuttum(false); setKodGitti(false);
    } finally {
      setLoading(false);
    }
  };

  if (sifreVar === null) return null;
  const tip = showPw ? 'text' : 'password';
  const eksik = !f.yeni || !f.tekrar || (mod === 'degistir' && !f.mevcut) || (mod === 'unuttum' && !f.kod);

  return (
    <Card title={baslik} icon={<Shield className="h-4 w-4 text-muted-foreground/70" />}>
      <div className="space-y-5">
        {mod === 'olustur' && (
          <p className="text-sm text-muted-foreground">Hesabına şimdiye kadar Google ya da e-posta koduyla girdin. Dilersen e-posta ve şifreyle de giriş yapabilmek için bir şifre belirle.</p>
        )}
        {mod === 'degistir' && (
          <Field label="Mevcut Şifre">
            <div className="relative">
              <Input type={tip} value={f.mevcut} onChange={upd('mevcut')} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button type="button" onClick={() => setUnuttum(true)} className="mt-2 text-xs text-muted-foreground underline hover:text-foreground">Şifremi unuttum</button>
          </Field>
        )}
        {mod === 'unuttum' && (
          <Field label="E-postana gelen doğrulama kodu">
            <div className="flex gap-2">
              <Input value={f.kod} onChange={upd('kod')} placeholder="123456" inputMode="numeric" disabled={!kodGitti} />
              <Button variant="outline" onClick={kodGonder} disabled={loading}>{kodGitti ? 'Tekrar Gönder' : 'Kod Gönder'}</Button>
            </div>
            <button type="button" onClick={() => { setUnuttum(false); setKodGitti(false); }} className="mt-2 text-xs text-muted-foreground underline hover:text-foreground">Vazgeç</button>
          </Field>
        )}
        <Field label="Yeni Şifre">
          <Input type={tip} value={f.yeni} onChange={upd('yeni')} placeholder="En az 6 karakter" />
        </Field>
        <Field label="Yeni Şifre (Tekrar)">
          <Input type={tip} value={f.tekrar} onChange={upd('tekrar')} placeholder="••••••••" />
        </Field>
        <div className="pt-2">
          <Button onClick={kaydet} disabled={loading || eksik} className="bg-primary hover:bg-black dark:hover:bg-white/90">
            {loading ? 'Kaydediliyor…' : baslik}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Marka Ayarları (admin) ─── */
function BrandSection() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['app_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_config').select('*').eq('id', 'singleton').single();
      if (error) throw error;
      return data;
    },
  });

  const [markaAdi, setMarkaAdi] = useState('');
  useEffect(() => { if (config?.marka_adi) setMarkaAdi(config.marka_adi); }, [config?.marka_adi]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('app_config')
        .update({ marka_adi: markaAdi, updated_at: new Date().toISOString() })
        .eq('id', 'singleton');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['app_config']);
      toast.success('Marka adı güncellendi. Sayfayı yenileyin.');
    },
    onError: () => toast.error('Kaydetme başarısız.'),
  });

  return (
    <Card title="Marka Ayarları" icon={<Palette className="h-4 w-4 text-muted-foreground/70" />}>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-border border-t-gray-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <Field label="Uygulama Adı">
            <Input value={markaAdi} onChange={e => setMarkaAdi(e.target.value)} placeholder="PriceHub" />
            <p className="text-xs text-muted-foreground/70 mt-1">Sidebar ve giriş ekranında görünen isim.</p>
          </Field>
          <div className="pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending || !markaAdi.trim()} className="bg-primary hover:bg-black dark:hover:bg-white/90">
              {save.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 px-4 py-3">
            <p className="text-xs text-amber-700">Değişiklik kaydedildikten sonra tüm kullanıcılar sayfayı yenilediklerinde yeni adı görecek.</p>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─── Hesaplama ayarları ─── */
const YENI_ARALIK = { min: '', max: '', yontem: 'ayni', tutar: '' };

function HesaplamaSection() {
  const queryClient = useQueryClient();
  const [satirlar, setSatirlar] = useState([]);

  const { data: ayarlar = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.entities.Settings.list('-created_at', 200),
  });
  const kayit = ayarlar.find((a) => a.setting_key === CIFT_KARGO_ANAHTARI);

  useEffect(() => { setSatirlar(ciftKargoKurallari(ayarlar)); }, [kayit?.setting_value]);

  const sayi = (v) => (v === '' || v == null ? NaN : Number(String(v).replace(',', '.')));
  const kurallar = satirlar.map((r) => ({ min: sayi(r.min), max: sayi(r.max), yontem: r.yontem, ...(r.yontem === 'sabit' && { tutar: sayi(r.tutar) }) }));
  const hata = kuralHatasi(kurallar);
  const degis = (i, k) => (e) => setSatirlar((l) => l.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)));

  const kaydet = useMutation({
    mutationFn: () => {
      const deger = JSON.stringify([...kurallar].sort((a, b) => a.min - b.min));
      return kayit
        ? db.entities.Settings.update(kayit.id, { setting_value: deger })
        : db.entities.Settings.create({ setting_key: CIFT_KARGO_ANAHTARI, setting_value: deger, description: 'Çift Kargo desi aralıkları' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('Kaydedildi. Fiyatlar sayfasında "Fiyatları Hesapla"ya bas.'); },
    onError: () => toast.error('Kaydedilemedi.'),
  });

  return (
    <Card title="Çift Kargo (üretime gidip dönen ürünler)">
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            <strong>Çift Kargo</strong> işaretli ürünler (ör. kişiselleştirilebilir poşetler) önce baskı için üretime gider,
            sonra depoya döner, oradan müşteriye gönderilir. Depodan üretime ve depodan müşteriye giden yollar kargo
            tarifesinden (desiye göre) ödenir. <strong>Üretimden depoya dönüşün</strong> nasıl hesaplanacağını desi aralığına göre sen seçersin:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Tarifeyle aynı:</strong> dönüş de tarife fiyatından. Tarife 100 ₺ ise 100 + 100 + 100 = <strong>300 ₺</strong>.</li>
            <li><strong>Sabit tutar:</strong> dönüş için girdiğin tutar eklenir. Tarife 100 ₺, sabit 60 ₺ ise 100 + 100 + 60 = <strong>260 ₺</strong>.</li>
          </ul>
          <p>Hiçbir aralığa girmeyen Çift Kargo ürünlerinde kargo 2 kat alınır (100 + 100 = 200 ₺). Birden çok paketli üründe her paket kendi desisine göre hesaplanır. Aralıklar çakışamaz.</p>
        </div>

        {satirlar.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input className="w-24" inputMode="decimal" placeholder="Min desi" value={r.min} onChange={degis(i, 'min')} />
            <span className="text-muted-foreground">–</span>
            <Input className="w-24" inputMode="decimal" placeholder="Maks desi" value={r.max} onChange={degis(i, 'max')} />
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={r.yontem} onChange={degis(i, 'yontem')}>
              <option value="ayni">Tarifeyle aynı</option>
              <option value="sabit">Sabit tutar</option>
            </select>
            {r.yontem === 'sabit' && <Input className="w-28" inputMode="decimal" placeholder="Tutar ₺" value={r.tutar} onChange={degis(i, 'tutar')} />}
            <Button variant="ghost" size="sm" onClick={() => setSatirlar((l) => l.filter((_, j) => j !== i))}>Sil</Button>
          </div>
        ))}

        {hata && satirlar.length > 0 && <p className="text-sm text-red-600">{hata}</p>}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSatirlar((l) => [...l, YENI_ARALIK])} disabled={isLoading}>+ Aralık Ekle</Button>
          <Button onClick={() => kaydet.mutate()} disabled={kaydet.isPending || isLoading || !!hata}>
            {kaydet.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Kullanıcılar (admin) ─── */

// Hesap yapisi: 1 yonetici (hesap sahibi) + en fazla 3 kullanici.
// Sinir burada tanimli; degistirmek icin tek yer.
const MAKS_KULLANICI = 3;

function UsersSection() {
  const queryClient = useQueryClient();
  const { user: oturumKullanicisi } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['user_profiles_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('id, full_name, role, is_active').order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Yonetici disindaki aktif kullanicilar
  const aktifKullanicilar = users.filter(u => u.role !== 'admin' && u.is_active !== false);
  const sinirDoldu = aktifKullanicilar.length >= MAKS_KULLANICI;

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase.from('user_profiles').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries(['user_profiles_all']); toast.success('Kullanıcı durumu güncellendi.'); },
    onError: () => toast.error('Güncelleme başarısız.'),
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role }) => {
      const { error } = await supabase.from('user_profiles').update({ role }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries(['user_profiles_all']); toast.success('Rol güncellendi.'); },
    onError: () => toast.error('Güncelleme başarısız.'),
  });

  return (
    <Card title="Kullanıcı Yönetimi">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary px-4 py-3">
        <p className="text-[13px] text-muted-foreground">
          Hesap yapısı: <strong className="text-foreground">1 yönetici</strong> (hesap sahibi) +
          en fazla <strong className="text-foreground">{MAKS_KULLANICI} kullanıcı</strong>.
        </p>
        <span className={cn(
          'text-xs font-semibold px-2.5 py-1 rounded-full',
          sinirDoldu ? 'bg-destructive/10 text-destructive' : 'bg-card text-muted-foreground'
        )}>
          {aktifKullanicilar.length} / {MAKS_KULLANICI} aktif kullanıcı
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-border border-t-gray-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary hover:bg-secondary transition-colors gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{u.full_name || '—'}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{u.id.slice(0, 8)}…</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={u.role || 'user'}
                  disabled={u.id === oturumKullanicisi?.id}
                  title={u.id === oturumKullanicisi?.id ? 'Kendi rolünü değiştiremezsin' : undefined}
                  onChange={e => setRole.mutate({ id: u.id, role: e.target.value })}
                  className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
                >
                  <option value="user">Kullanıcı</option>
                  <option value="admin">Yönetici</option>
                </select>
                <button
                  disabled={u.id === oturumKullanicisi?.id}
                  title={
                    u.id === oturumKullanicisi?.id
                      ? 'Kendi hesabını pasife alamazsın'
                      : (u.is_active === false && u.role !== 'admin' && sinirDoldu
                          ? `En fazla ${MAKS_KULLANICI} aktif kullanıcı olabilir`
                          : undefined)
                  }
                  onClick={() => {
                    // Pasiften aktife alirken siniri kontrol et
                    if (u.is_active === false && u.role !== 'admin' && sinirDoldu) {
                      toast.error(`En fazla ${MAKS_KULLANICI} aktif kullanıcı olabilir. Önce birini pasife al.`);
                      return;
                    }
                    toggleActive.mutate({ id: u.id, is_active: !u.is_active });
                  }}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50',
                    u.is_active !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                  )}
                >
                  {u.is_active !== false ? <><Check className="h-3 w-3" /> Aktif</> : 'Pasif'}
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-muted-foreground/70 text-center py-6">Kayıtlı kullanıcı bulunamadı.</p>}
        </div>
      )}
    </Card>
  );
}

/* ─── Yardımcı bileşenler ─── */
function Card({ title, icon, children }) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-6">
        {icon}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}
