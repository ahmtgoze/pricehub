import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handler } from './kabuk.ts';
import { gercekVeri } from './veri.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const izinliKaynaklar = (Deno.env.get('IZINLI_KAYNAKLAR') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const istemci = (basliklar: Record<string, string> = {}) =>
  createClient(url, anon, { global: { headers: basliklar }, auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve((req) => handler(req, {
  izinliKaynaklar,
  kimlikDogrula: async (jwt) => {
    const { data, error } = await istemci().auth.getUser(jwt);
    return error || !data.user?.email ? null : { id: data.user.id, email: data.user.email };
  },
  veriKur: (jwt, kimlik) => gercekVeri(istemci({ Authorization: `Bearer ${jwt}` }), kimlik.email),
}));
