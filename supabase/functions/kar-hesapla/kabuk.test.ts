// Çalıştırma: deno test --allow-read supabase/functions/kar-hesapla/kabuk.test.ts
// Ağ ve veritabanı yok: kimlik ve veri taklit edilir. Sabit veriler uydurmadır (depo herkese açık).
// deno-lint-ignore-file no-explicit-any
import { handler, hizSiniriUygun } from './kabuk.ts';
import { gercekVeri } from './veri.ts';

const dogru = (kosul: unknown, ad: string) => { if (!kosul) throw new Error(`✗ ${ad}`); };
const esit = (bulunan: unknown, beklenen: unknown, ad: string) => dogru(JSON.stringify(bulunan) === JSON.stringify(beklenen), `${ad}: bulunan ${JSON.stringify(bulunan)} beklenen ${JSON.stringify(beklenen)}`);

/* ── Uydurma veri ─────────────────────────────────────────────────── */
const SABLON = { id: 'sablon', platform_type: 'trendyol', is_system_admin: true, use_barem: true, barem_max_desi: 10, barem1_min: 0, barem1_max: 199.99, barem2_min: 200, barem2_max: 349.99,
  has_withholding: true, withholding_rate: 1, has_service_fee: true, service_fee_type: 'fixed_per_order', service_fee_amount: 13.18, service_fee_vat_rate: 20, same_day_delivery_service_fee: 5.99, has_corporate_tax: true, corporate_tax_rate: 25 };
const KULLANICI = { ...SABLON, id: 'p-ty', is_system_admin: false, is_active: true, shipping_company_name: 'Express', satici_no: 900001 };
const t = (o: any) => ({ is_active: true, vat_rate: 20, is_admin_created: true, platform_type: 'trendyol', shipping_company: 'Express', ...o });
const TARIFELER = [t({ rate_type: 'barem1', price: 88, same_day_delivery: false }), t({ rate_type: 'barem2', price: 94.49, same_day_delivery: false }),
  ...Array.from({ length: 41 }, (_, d) => t({ rate_type: 'desi', desi: d, price: 98 + d * 11, same_day_delivery: false }))];
const URUN = { id: 'u1', category_id: 'k1', cost: 100, desi: 2, vat_rate: 20, printing_cost: 0, extra_cost: 0, same_day_delivery: false };

const sahteVeri = (ek: any = {}) => ({
  platformlar: async () => [KULLANICI, SABLON], tarifeler: async () => TARIFELER, ayarlar: async () => [], komisyonlar: async () => [],
  urunler: async (b: string[]) => new Map(b.filter((x) => x.toLowerCase() === 'abc-1').map((x) => [x.toLowerCase(), { urun: URUN, eslesme: 'barkod' }])), ...ek,
});
const IZINLI = 'chrome-extension://izinli-eklenti';
let sirayla = 0;
const bag = (ek: any = {}) => ({
  izinliKaynaklar: [IZINLI], simdi: () => 1_000_000 + sirayla, veriKur: () => sahteVeri(),
  kimlikDogrula: async (jwt: string) => (jwt === 'gecerli' ? { id: `kullanici-${++sirayla}`, email: 'k@ornek.com' } : null), ...ek,
});
const GOVDE = { surum: 1, platform: 'trendyol', saticiNo: 900001, satirlar: [{ id: 's1', tur: 'fiyat', barkod: 'abc-1', fiyat: 300, komisyonOrani: 20 }] };
const istekYap = (govde: unknown, { yontem = 'POST', jwt = 'gecerli', kaynak = null as string | null, tur = 'application/json', ham = undefined as string | undefined } = {}) =>
  new Request('https://x.test/kar-hesapla', {
    method: yontem,
    headers: { ...(tur ? { 'content-type': tur } : {}), ...(jwt ? { authorization: `Bearer ${jwt}` } : {}), ...(kaynak ? { origin: kaynak } : {}) },
    body: yontem === 'POST' ? (ham ?? JSON.stringify(govde)) : undefined,
  });

Deno.test('kabuk: başarılı istek 200, güvenlik başlıkları, kaynak yok → ACAO yok', async () => {
  const r = await handler(istekYap(GOVDE), bag());
  esit(r.status, 200, 'durum');
  const j = await r.json();
  esit([j.surum, j.magaza.durum, j.satirlar[0].durum], [1, 'eslesti', 'tamam'], 'gövde');
  esit([r.headers.get('cache-control'), r.headers.get('x-content-type-options')], ['no-store', 'nosniff'], 'başlıklar');
  dogru(!r.headers.has('access-control-allow-origin'), 'kaynaksız istekte ACAO yok');
});

Deno.test('kabuk: izinli kaynak ACAO alır, izinsiz kaynak reddedilir', async () => {
  const iyi = await handler(istekYap(GOVDE, { kaynak: IZINLI }), bag());
  esit([iyi.status, iyi.headers.get('access-control-allow-origin'), iyi.headers.get('vary')], [200, IZINLI, 'Origin'], 'izinli');
  const kotu = await handler(istekYap(GOVDE, { kaynak: 'https://kotu.example' }), bag());
  esit(kotu.status, 403, 'izinsiz kaynak');
  dogru(!kotu.headers.has('access-control-allow-origin'), 'izinsiz kaynağa ACAO verilmez');
  const bos = await handler(istekYap(GOVDE, { kaynak: 'https://kotu.example' }), bag({ izinliKaynaklar: [] }));
  esit(bos.status, 403, 'izin listesi boşken hiçbir tarayıcı kaynağı geçmez');
});

Deno.test('kabuk: ön kontrol (OPTIONS)', async () => {
  const iyi = await handler(new Request('https://x.test', { method: 'OPTIONS', headers: { origin: IZINLI } }), bag());
  esit([iyi.status, iyi.headers.get('access-control-allow-origin'), iyi.headers.get('access-control-allow-methods')], [204, IZINLI, 'POST, OPTIONS'], 'izinli');
  const kotu = await handler(new Request('https://x.test', { method: 'OPTIONS', headers: { origin: 'https://kotu.example' } }), bag());
  esit(kotu.status, 403, 'izinsiz');
});

Deno.test('kabuk: kimlik zorunlu', async () => {
  esit((await handler(istekYap(GOVDE, { jwt: '' }), bag())).status, 401, 'başlık yok');
  esit((await handler(istekYap(GOVDE, { jwt: 'sahte' }), bag())).status, 401, 'geçersiz belirteç');
  const patlak = await handler(istekYap(GOVDE), bag({ kimlikDogrula: async () => { throw new Error('ağ'); } }));
  esit(patlak.status, 401, 'doğrulama hatası = reddet, geçirme');
  const bearersiz = new Request('https://x.test', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'gecerli' }, body: JSON.stringify(GOVDE) });
  esit((await handler(bearersiz, bag())).status, 401, 'Bearer öneki yok');
  let veriKuruldu = false;
  await handler(istekYap(GOVDE, { jwt: 'sahte' }), bag({ veriKur: () => { veriKuruldu = true; return sahteVeri(); } }));
  dogru(!veriKuruldu, 'kimliksiz istekte veri katmanı hiç kurulmaz');
});

Deno.test('kabuk: yöntem, içerik türü ve boyut sınırları', async () => {
  esit((await handler(istekYap(GOVDE, { yontem: 'GET' }), bag())).status, 405, 'GET');
  esit((await handler(istekYap(GOVDE, { yontem: 'DELETE' }), bag())).status, 405, 'DELETE');
  esit((await handler(istekYap(GOVDE, { tur: 'text/plain' }), bag())).status, 415, 'düz metin');
  esit((await handler(istekYap(GOVDE, { tur: '' }), bag())).status, 415, 'içerik türü yok');
  esit((await handler(istekYap(null, { ham: JSON.stringify({ ...GOVDE, gurultu: 'x'.repeat(70_000) }) }), bag())).status, 413, '70 KB gövde');
  esit((await handler(istekYap(null, { ham: '{bozuk' }), bag())).status, 400, 'bozuk JSON');
  esit((await handler(istekYap({ ...GOVDE, surum: 9 }), bag())).status, 400, 'bilinmeyen sürüm');
  const kucuk = JSON.stringify(GOVDE);
  esit((await handler(istekYap(null, { ham: kucuk }), bag())).status, 200, 'sınır altı gövde geçer');
});

Deno.test('kabuk: dakikada 60 istek sınırı, kullanıcı başına', async () => {
  const b: any = bag({ kimlikDogrula: async (jwt: string) => ({ id: jwt, email: `${jwt}@ornek.com` }), simdi: () => 5_000_000 });
  let sonDurum = 0;
  for (let i = 0; i < 60; i++) sonDurum = (await handler(istekYap(GOVDE, { jwt: 'kisi-a' }), b)).status;
  esit(sonDurum, 200, '60. istek geçer');
  const fazla = await handler(istekYap(GOVDE, { jwt: 'kisi-a' }), b);
  esit([fazla.status, fazla.headers.get('retry-after')], [429, '60'], '61. istek 429');
  esit((await handler(istekYap(GOVDE, { jwt: 'kisi-b' }), b)).status, 200, 'başka kullanıcı etkilenmez');
  dogru(hizSiniriUygun('kisi-a', 5_000_000 + 61_000), 'pencere geçince yeniden izin');
});

Deno.test('kabuk: veri hatası 500, hata gövdeyi ve veriyi yansıtmaz', async () => {
  const kayitlar: unknown[][] = [];
  const asilHata = console.error;
  console.error = (...a: unknown[]) => { kayitlar.push(a); };
  try {
    const r = await handler(istekYap({ ...GOVDE, satirlar: [{ ...GOVDE.satirlar[0], barkod: 'GİZLİ-BARKOD' }] }),
      bag({ veriKur: () => sahteVeri({ tarifeler: async () => { throw new Error('veri_hatasi:GİZLİ-DETAY 300 TL'); } }) }));
    esit([r.status, await r.json()], [500, { hata: 'sunucu_hatasi' }], '500');
  } finally { console.error = asilHata; }
  const metin = JSON.stringify(kayitlar);
  dogru(!metin.includes('GİZLİ') && !metin.includes('300'), 'kayıtta barkod, fiyat ya da hata ayrıntısı yok');
});

Deno.test('kabuk: yanıt istekteki fazlalığı yansıtmaz', async () => {
  const r = await handler(istekYap({ ...GOVDE, musteriAdi: 'GİZLİ-AD', satirlar: [{ ...GOVDE.satirlar[0], adres: 'GİZLİ-ADRES' }] }), bag());
  dogru(r.status === 200 && !(await r.text()).includes('GİZLİ'), 'yanıtta müşteri alanları yok');
});

/* ── Veri katmanı: her kullanıcı sorgusu created_by ile süzülür ───────── */
function sahteIstemci(tablolar: Record<string, any[]>) {
  const kayit: { tablo: string; sutunlar: string; suzgec: [string, string, unknown][] }[] = [];
  const kur = (tablo: string) => {
    const q: any = { tablo, sutunlar: '', suzgec: [] as [string, string, unknown][] };
    for (const y of ['select', 'eq', 'in', 'not', 'range']) {
      q[y] = (...a: unknown[]) => { if (y === 'select') q.sutunlar = String(a[0]); else q.suzgec.push([y, String(a[0]), a[1]]); return q; };
    }
    q.then = (coz: (v: unknown) => void) => {
      kayit.push({ tablo, sutunlar: q.sutunlar, suzgec: q.suzgec });
      const uygun = (tablolar[tablo] ?? []).filter((s: any) => q.suzgec.every(([y, k, d]: any) => {
        if (y === 'eq') return s[k] === d;
        if (y === 'in') return (d as unknown[]).includes(s[k]);
        return true;
      }));
      coz({ data: uygun, error: null });
    };
    return q;
  };
  return { kayit, from: (t: string) => kur(t) };
}

Deno.test('veri: kullanıcı tabloları created_by ile süzülür, şablon ve sistem tarifeleri süzülmez', async () => {
  const ben = 'ben@ornek.com', baska = 'baska@ornek.com';
  const istemci = sahteIstemci({
    platforms: [{ id: 'a', created_by: ben, platform_type: 'trendyol', is_system_admin: false }, { id: 'b', created_by: baska, platform_type: 'trendyol', is_system_admin: false }, { id: 'sablon', created_by: 'yonetici', platform_type: 'trendyol', is_system_admin: true }],
    marketplace_products: [{ created_by: ben, platform_account: 'Trendyol', barkod: 'abc-1', model_code: 'm1', matched_product_id: 'u-ben' }, { created_by: baska, platform_account: 'Trendyol', barkod: 'abc-1', model_code: 'm1', matched_product_id: 'u-baska' }],
    products: [{ id: 'u-ben', created_by: ben, cost: 10 }, { id: 'u-baska', created_by: baska, cost: 99 }],
    commissions: [{ created_by: ben, platform_name: 'Trendyol', category_id: 'k1' }, { created_by: baska, platform_name: 'Trendyol', category_id: 'k1' }],
    settings: [{ created_by: ben, setting_key: 'cift_kargo_kurallari', setting_value: '[]' }, { created_by: baska, setting_key: 'cift_kargo_kurallari', setting_value: 'baska' }],
    shipping_rates: [{ platform_type: 'trendyol', is_admin_created: true, is_active: true, rate_type: 'barem1' }],
  });
  const veri: any = gercekVeri(istemci, ben);
  const platformlar = await veri.platformlar();
  esit(platformlar.map((p: any) => p.id).sort(), ['a', 'sablon'], 'yalnız kendi platformum + şablon (başka kullanıcınınki gelmez)');
  const urunler = await veri.urunler(['ABC-1']);
  esit([...urunler.keys()], ['abc-1'], 'barkod büyük/küçük harf farkıyla bulunur');
  esit(urunler.get('abc-1').urun.cost, 10, 'başka hesabın aynı barkodlu ürünü DEĞİL, benimki gelir');
  esit((await veri.komisyonlar()).length, 1, 'yalnız benim komisyonlarım');
  esit((await veri.ayarlar()).map((s: any) => s.setting_value), ['[]'], 'yalnız benim ayarım');
  esit((await veri.tarifeler()).length, 1, 'sistem tarifeleri gelir');

  for (const k of istemci.kayit.filter((x) => ['marketplace_products', 'products', 'commissions', 'settings'].includes(x.tablo))) {
    dogru(k.suzgec.some(([y, s, d]) => y === 'eq' && s === 'created_by' && d === ben), `${k.tablo} sorgusunda created_by süzgeci var`);
  }
  const kendiPlatform = istemci.kayit.filter((x) => x.tablo === 'platforms');
  dogru(kendiPlatform.some((k) => k.suzgec.some(([y, s, d]) => y === 'eq' && s === 'created_by' && d === ben)), 'platform sorgusu created_by ile');
  dogru(kendiPlatform.some((k) => k.suzgec.some(([y, s, d]) => y === 'eq' && s === 'is_system_admin' && d === true) && !k.suzgec.some(([, s]) => s === 'created_by')), 'şablon sorgusu yalnız is_system_admin ile');
});

Deno.test('veri: belirsiz eşleşme (aynı kod iki ürüne bağlı) eşleşmemiş sayılır, model koduna düşülür', async () => {
  const ben = 'ben@ornek.com';
  const istemci = sahteIstemci({
    marketplace_products: [
      { created_by: ben, platform_account: 'Trendyol', barkod: 'cift', model_code: 'x', matched_product_id: 'u1' },
      { created_by: ben, platform_account: 'Trendyol', barkod: 'cift', model_code: 'y', matched_product_id: 'u2' },
      { created_by: ben, platform_account: 'Trendyol', barkod: 'baska-barkod', model_code: 'mk-1', matched_product_id: 'u3' },
    ],
    products: [{ id: 'u1', created_by: ben }, { id: 'u2', created_by: ben }, { id: 'u3', created_by: ben }],
  });
  const veri: any = gercekVeri(istemci, ben);
  const sonuc = await veri.urunler(['cift', 'mk-1', 'yok']);
  esit([...sonuc.keys()], ['mk-1'], 'belirsiz kod ve bilinmeyen kod eşleşmez; yalnız model kodu eşleşir');
  esit(sonuc.get('mk-1').eslesme, 'model_kodu', 'eşleşme türü model kodu');
});
