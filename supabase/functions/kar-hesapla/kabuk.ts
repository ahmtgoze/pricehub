// Edge Function kabuğu: CORS, kimlik, sınırlar, hata yönetimi. Hesap kuralları src/lib/karServisi.js'te.
import { isle, istekiDogrula, SINIRLAR } from '../../../src/lib/karServisi.js';

export type Kimlik = { id: string; email: string };
export type Bagimlilik = {
  kimlikDogrula: (jwt: string) => Promise<Kimlik | null>;
  veriKur: (jwt: string, kimlik: Kimlik) => unknown;
  izinliKaynaklar: string[];
  simdi?: () => number;
};

const DAKIKADA_EN_FAZLA = 60;
const PENCERE_MS = 60_000;
const sayac = new Map<string, number[]>();

// Tek örnek belleğinde çalışır: örnekler arası paylaşılmaz, bu yüzden en iyi çaba sınırıdır.
export function hizSiniriUygun(anahtar: string, simdi: number): boolean {
  if (sayac.size > 5000) sayac.clear();
  const pencere = (sayac.get(anahtar) ?? []).filter((t) => simdi - t < PENCERE_MS);
  const uygun = pencere.length < DAKIKADA_EN_FAZLA;
  if (uygun) pencere.push(simdi);
  sayac.set(anahtar, pencere);
  return uygun;
}

function yanit(govde: unknown, durum: number, kaynak: string | null, ek: Record<string, string> = {}): Response {
  const basliklar: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...ek,
  };
  if (kaynak) {
    basliklar['Access-Control-Allow-Origin'] = kaynak;
    basliklar['Vary'] = 'Origin';
  }
  return new Response(govde === null ? null : JSON.stringify(govde), { status: durum, headers: basliklar });
}

export async function handler(req: Request, b: Bagimlilik): Promise<Response> {
  const kaynak = req.headers.get('origin');
  if (kaynak && !b.izinliKaynaklar.includes(kaynak)) return yanit({ hata: 'kaynak_izinsiz' }, 403, null);
  const acao = kaynak;

  if (req.method === 'OPTIONS') {
    return yanit(null, 204, acao, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
      'Access-Control-Max-Age': '600',
    });
  }
  if (req.method !== 'POST') return yanit({ hata: 'yontem_izinsiz' }, 405, acao, { Allow: 'POST, OPTIONS' });
  if (!(req.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) return yanit({ hata: 'icerik_turu' }, 415, acao);
  if (Number(req.headers.get('content-length') ?? 0) > SINIRLAR.EN_FAZLA_BAYT) return yanit({ hata: 'govde_cok_buyuk' }, 413, acao);

  const yetki = req.headers.get('authorization') ?? '';
  const jwt = yetki.startsWith('Bearer ') ? yetki.slice(7).trim() : '';
  if (!jwt) return yanit({ hata: 'oturum_gerekli' }, 401, acao);
  let kimlik: Kimlik | null = null;
  try {
    kimlik = await b.kimlikDogrula(jwt);
  } catch {
    kimlik = null;
  }
  if (!kimlik) return yanit({ hata: 'oturum_gecersiz' }, 401, acao);

  if (!hizSiniriUygun(kimlik.id, (b.simdi ?? Date.now)())) return yanit({ hata: 'cok_fazla_istek' }, 429, acao, { 'Retry-After': '60' });

  const metin = await req.text();
  if (new TextEncoder().encode(metin).length > SINIRLAR.EN_FAZLA_BAYT) return yanit({ hata: 'govde_cok_buyuk' }, 413, acao);
  let govde: unknown;
  try {
    govde = JSON.parse(metin);
  } catch {
    return yanit({ hata: 'gecersiz_json' }, 400, acao);
  }
  const d = istekiDogrula(govde);
  if (!d.tamam) return yanit({ hata: d.hata }, 400, acao);

  try {
    return yanit(await isle(d.istek, b.veriKur(jwt, kimlik)), 200, acao);
  } catch (e) {
    // Gövde, fiyat, barkod ve maliyet kayda yazılmaz; yalnız hatanın türü.
    console.error('kar-hesapla hata:', e instanceof Error ? e.name : 'bilinmiyor');
    return yanit({ hata: 'sunucu_hatasi' }, 500, acao);
  }
}
