import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { MARKA_ADI } from '@/config/marka';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Adım: e-postaya tek seferlik kod gönder
  const handleSendCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { role: 'user' } },
    });
    if (error) {
      setError(error.message || 'Kod gönderilemedi. E-postanı kontrol et.');
    } else {
      setOtpSent(true);
      setSuccessMsg('Giriş kodu e-postana gönderildi. Kutunu (ve spam) kontrol et.');
    }
    setIsLoading(false);
  };

  // 2. Adım: gelen kodu doğrula ve giriş yap
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    });
    if (error) {
      setError('Kod hatalı veya süresi dolmuş. Tekrar dene.');
    } else {
      navigate('/');
    }
    setIsLoading(false);
  };

  const resetFlow = () => {
    setOtpSent(false);
    setCode('');
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{MARKA_ADI}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {otpSent ? 'E-postana gelen kodu gir' : 'E-posta ile giriş'}
          </p>
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

        {!otpSent ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="ornek@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Gönderiliyor...' : 'Giriş Kodu Gönder'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giriş Kodu</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                maxLength={8}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="______"
              />
              <p className="text-xs text-slate-400 mt-1">{email} adresine gönderildi.</p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={resetFlow} className="text-slate-500 hover:text-slate-900">
                ← E-postayı değiştir
              </button>
              <button type="button" onClick={handleSendCode} disabled={isLoading} className="text-slate-500 hover:text-slate-900">
                Kodu tekrar gönder
              </button>
            </div>
          </form>
        )}

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">veya</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: window.location.origin,
                queryParams: { prompt: 'select_account' },
              },
            });
          }}
          className="w-full flex items-center justify-center gap-2 border border-slate-300 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition"
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.7-2.9-11.9-7.2l-6.5 5C9.5 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.7 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
          Google ile Giriş Yap
        </button>
      </div>
    </div>
  );
}
