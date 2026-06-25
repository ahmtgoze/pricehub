import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { MARKA_ADI } from '@/config/marka';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('E-posta veya şifre hatalı.');
    } else {
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'user' } },
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccessMsg('Kayıt başarılı! E-postanızı doğrulayın.');
      setMode('login');
    }
    setIsLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccessMsg('Şifre sıfırlama bağlantısı e-postanıza gönderildi.');
    }
    setIsLoading(false);
  };

  const titles = { login: 'Giriş Yap', register: 'Kayıt Ol', reset: 'Şifre Sıfırla' };
  const handlers = { login: handleLogin, register: handleRegister, reset: handleReset };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{MARKA_ADI}</h1>
          <p className="text-slate-500 text-sm mt-1">{titles[mode]}</p>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handlers[mode]} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="ornek@email.com"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Yükleniyor...' : titles[mode]}
          </button>
        </form>
        <button
  type="button"
  onClick={async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' }
      }
    });
  }}
  className="w-full flex items-center justify-center gap-2 border border-slate-300 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition"
>
  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.7-2.9-11.9-7.2l-6.5 5C9.5 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.7 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
  Google ile Giriş Yap
</button>

        <div className="mt-6 flex flex-col gap-2 text-center text-sm">
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('reset')} className="text-slate-500 hover:text-slate-900">
                Şifremi unuttum
              </button>
              <button onClick={() => setMode('register')} className="text-slate-500 hover:text-slate-900">
                Hesabın yok mu? Kayıt ol
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button onClick={() => setMode('login')} className="text-slate-500 hover:text-slate-900">
              ← Giriş yap
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
