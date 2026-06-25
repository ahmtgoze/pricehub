import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Lock, Users, ChevronRight, Check, Eye, EyeOff, Shield, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'account', label: 'Hesap', icon: User },
  { id: 'security', label: 'Güvenlik', icon: Lock },
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
        <h1 className="text-2xl font-semibold text-gray-900">Genel Ayarlar</h1>
        <p className="text-sm text-gray-500 mt-1">Hesap ve uygulama tercihlerinizi yönetin.</p>
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
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', active ? 'text-white' : 'text-gray-400')} />
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
          <Input value={user?.email || ''} disabled className="bg-gray-50 text-gray-500" />
          <p className="text-xs text-gray-400 mt-1">E-posta adresi değiştirilemez.</p>
        </Field>
        <Field label="Rol">
          <div className="flex items-center gap-2 h-9">
            <Badge className={user?.role === 'admin' ? 'bg-gray-900' : ''} variant={user?.role === 'admin' ? 'default' : 'secondary'}>
              {user?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
            </Badge>
          </div>
        </Field>
        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Güvenlik ─── */
function SecuritySection() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (newPw.length < 6) { toast.error('Şifre en az 6 karakter olmalı.'); return; }
    if (newPw !== confirmPw) { toast.error('Şifreler eşleşmiyor.'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user?.email, password: currentPw });
      if (signInErr) { toast.error('Mevcut şifre yanlış.'); return; }
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success('Şifre başarıyla güncellendi.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      toast.error('Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Şifre Değiştir" icon={<Shield className="h-4 w-4 text-gray-400" />}>
      <div className="space-y-5">
        <Field label="Mevcut Şifre">
          <div className="relative">
            <Input type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="Yeni Şifre">
          <Input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="En az 6 karakter" />
        </Field>
        <Field label="Yeni Şifre (Tekrar)">
          <Input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
        </Field>
        <div className="pt-2">
          <Button onClick={handleChange} disabled={loading || !currentPw || !newPw || !confirmPw} className="bg-gray-900 hover:bg-gray-800">
            {loading ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
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
    <Card title="Marka Ayarları" icon={<Palette className="h-4 w-4 text-gray-400" />}>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <Field label="Uygulama Adı">
            <Input value={markaAdi} onChange={e => setMarkaAdi(e.target.value)} placeholder="PriceHub" />
            <p className="text-xs text-gray-400 mt-1">Sidebar ve giriş ekranında görünen isim.</p>
          </Field>
          <div className="pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending || !markaAdi.trim()} className="bg-gray-900 hover:bg-gray-800">
              {save.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-xs text-amber-700">Değişiklik kaydedildikten sonra tüm kullanıcılar sayfayı yenilediklerinde yeni adı görecek.</p>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─── Kullanıcılar (admin) ─── */
function UsersSection() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['user_profiles_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('id, full_name, role, is_active').order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

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
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{u.id.slice(0, 8)}…</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={u.role || 'user'}
                  onChange={e => setRole.mutate({ id: u.id, role: e.target.value })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="user">Kullanıcı</option>
                  <option value="admin">Yönetici</option>
                </select>
                <button
                  onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                    u.is_active !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                  )}
                >
                  {u.is_active !== false ? <><Check className="h-3 w-3" /> Aktif</> : 'Pasif'}
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Kayıtlı kullanıcı bulunamadı.</p>}
        </div>
      )}
    </Card>
  );
}

/* ─── Yardımcı bileşenler ─── */
function Card({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        {icon}
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}
