import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { db } from '@/api/db';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({ id: 'pricehub', public_settings: {} });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        // Oturum yok: App.jsx bunu gorup login'e yonlendirir. Daha once
        // authError set edilmedigi icin uygulama girissiz de aciliyor,
        // sayfalar bos veri gosteriyor ve Platformlar sonsuz donuyordu.
        setAuthError({ type: 'auth_required', message: 'Oturum acik degil.' });
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setAuthError({ type: 'auth_required', message: 'Oturum acik degil.' });
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 10 gunden eski promosyon Excel'leri depodan silinir.
  //
  // Neden burada: Supabase storage.objects'ten SQL ile silmeye izin vermiyor
  // ("Direct deletion from storage tables is not allowed. Use the Storage
  // API"), bu yuzden silme uygulama tarafinda yapilmali. Kayitlardaki olu
  // baglantilari ise her gun cron temizliyor (public.eski_excelleri_sil).
  //
  // Oturum basina bir kez ve SESSIZ calisir; basarisiz olursa kullaniciyi
  // ilgilendirmez, bir sonraki acilista yeniden denenir.
  const eskiExcelleriTemizle = () => {
    const anahtar = 'pricehub-excel-temizligi';
    const bugun = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(anahtar) === bugun) return;
    } catch { /* localStorage kapali olabilir; yine de calissin */ }

    db.integrations.Core.EskiExcelleriTemizle()
      .then(({ silinen }) => {
        try { localStorage.setItem(anahtar, bugun); } catch { /* onemsiz */ }
        if (silinen > 0) console.info(`[temizlik] ${silinen} eski Excel silindi`);
      })
      .catch((e) => console.warn('[temizlik] eski Excel silinemedi:', e?.message || e));
  };

  const loadUserProfile = async (authUser) => {
    // Oturum ELDE: profil sorgusu beklenmeden auth_required temizlenir.
    // Aksi halde giris hemen sonrasinda App.jsx hala "oturum yok" gorup
    // kullaniciyi /login'e geri atiyordu.
    setAuthError(null);
    eskiExcelleriTemizle();
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, full_name, is_active')
        .eq('id', authUser.id)
        .single();

      if (profile && profile.is_active === false) {
        setAuthError({ type: 'user_not_registered', message: 'Hesabınız aktif değil.' });
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      setUser({ id: authUser.id, email: authUser.email, role: profile?.role || 'user', full_name: profile?.full_name || '' });
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
      setUser({ id: authUser.id, email: authUser.email, role: 'user' });
      setIsAuthenticated(true);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => { window.location.href = '/login'; };

  const checkAppState = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await loadUserProfile(session.user);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, appPublicSettings, logout, navigateToLogin, checkAppState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
