import { supabase } from './supabaseClient';
import { silinecekDosyalar, VARSAYILAN_GUN } from '@/lib/eskiDosyaSuzgeci';

const TABLE_MAP = {
  Product: 'products',
  Category: 'categories',
  Platform: 'platforms',
  ShippingCompany: 'shipping_companies',
  ShippingRate: 'shipping_rates',
  Commission: 'commissions',
  ProductPrice: 'product_prices',
  MarketplaceProduct: 'marketplace_products',
  Package: 'packages',
  PackageItem: 'package_items',
  UpdateReport: 'update_reports',
  Campaign: 'campaigns',
  FlashProduct: 'flash_products',
  AdvantageProductTag: 'advantage_product_tags',
  PlusProductCommissionTariff: 'plus_product_commission_tariffs',
  // HB Sepet Kampanyalari: platform + tarih araligi bazli secim kayitlari
  HBBasketCampaign: 'hb_basket_campaigns',
  TrendyolPriceRange: 'trendyol_price_ranges',
  Announcement: 'announcements',
  AnnouncementRead: 'announcement_reads',
  Message: 'messages',
  // Kullaniciya ozel sistem bildirimleri (tarife penceresi hatirlatmasi vb.)
  Bildirim: 'bildirimler',
  Settings: 'settings',
  User: 'user_profiles',
  // Kullanici bazli tablo gorunum tercihleri (sutun gizleme/sira/genislik/sabitleme)
  UserViewPreference: 'user_view_preferences',
  // Kullaniciya ozel Excel/CSV disa aktarma sablonlari
  ExportTemplate: 'export_templates',
};

function applyConditions(query, conditions) {
  if (!conditions || typeof conditions !== 'object') return query;
  for (const [key, value] of Object.entries(conditions)) {
    if (key === '$or') {
      const orParts = value.map((cond) => {
        const [field, val] = Object.entries(cond)[0];
        if (val && typeof val === 'object' && val.$in) return `${field}.in.(${val.$in.join(',')})`;
        return `${field}.eq.${val}`;
      });
      query = query.or(orParts.join(','));
    } else if (value && typeof value === 'object' && value.$in) {
      query = query.in(key, value.$in);
    } else if (value === null) {
      query = query.is(key, null);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function parseOrderBy(orderBy) {
  if (!orderBy) return null;
  const isDesc = orderBy.startsWith('-');
  const column = isDesc ? orderBy.slice(1) : orderBy;
  const mappedColumn = column === 'created_date' ? 'created_at' : column;
  return { column: mappedColumn, ascending: !isDesc };
}

function normalize(row) {
  if (!row) return row;
  return { ...row, created_date: row.created_at };
}


/**
 * Tum satirlari SAYFA SAYFA ceker.
 *
 * NICIN VAR: filter/list varsayilan olarak 10.000 satirda kesiyordu ve bunu
 * SESSIZCE yapiyordu. 10.000 urunu olan bir hesapta fiyat kaydi ~30.000
 * olur; 20.000'i hic gelmez. Fiyat hesabi gelmeyen kaydi "yok" sayip
 * YENISINI olusturur — her calistirmada on binlerce cift kayit birikir,
 * hicbir uyari cikmaz.
 *
 * Supabase tek istekte sinirsiz satir vermez; 1000'lik dilimlerle
 * (range) hepsi cekilir. Cagrilar degismedi, yalnizca artik eksiksiz.
 */
const SAYFA = 1000;

/**
 * Siralamaya BENZERSIZ bir ayirici ekler.
 *
 * NICIN ZORUNLU: sayfalama range(0..999), range(1000..1999) seklinde yapiliyor.
 * Siralama anahtari benzersiz DEGILSE (varsayilan created_at boyle: toplu
 * eklemede yuzlerce kayit ayni saniyeyi tasir) Postgres esit satirlarin
 * sirasini garanti etmez. Iki istek arasinda sira degisince bazi satirlar
 * ATLANIR, bazilari IKI KEZ gelir.
 *
 * Canli etkisi: svs'de 1009 fiyat kaydi (tam iki sayfa) vardi; her yuklemede
 * rastgele birkac kayit dusuyor, o urunlerde "sistem fiyati" bos gorunuyordu.
 * Sebebi urunde ya da eslestirmede sanildi, oysa veri hic gelmiyordu.
 *
 * id birincil anahtar oldugu icin benzersizdir; ikincil siralama olarak
 * eklenince toplam sira kesinlesir ve sayfalama guvenli olur.
 */
function siralamayiKesinlestir(query, order) {
  if (order) query = query.order(order.column, { ascending: order.ascending });
  return query.order('id', { ascending: true });
}

async function sayfalayarakCek(entityName, islem, limit, sorguKur) {
  const tablo = TABLE_MAP[entityName];
  const hepsi = [];

  for (let bas = 0; ; bas += SAYFA) {
    // limit verilmisse onu asma
    const kalan = limit ? limit - hepsi.length : SAYFA;
    if (kalan <= 0) break;
    const son = bas + Math.min(SAYFA, kalan) - 1;

    const { data, error } = await sorguKur(supabase.from(tablo)).range(bas, son);
    if (error) throw new Error(`[db.${entityName}.${islem}] ${error.message}`);

    const dilim = data || [];
    hepsi.push(...dilim);
    if (dilim.length < SAYFA) break;      // son sayfa
  }
  return hepsi.map(normalize);
}

function createEntity(entityName) {
  const tableName = TABLE_MAP[entityName];
  if (!tableName) throw new Error(`Bilinmeyen entity: ${entityName}`);

  return {
    // alanlar: yalnizca belirli sutunlari cekmek icin (ornek: 'id, platform_name').
    // Varsayilan '*' — mevcut tum cagrilarin davranisi degismez.
    // alanlar: yalnizca belirli sutunlari cekmek icin (ornek: 'id, platform_name').
    // limit verilirse o kadarla sinirlanir; VERILMEZSE tum satirlar sayfa
    // sayfa cekilir.
    async filter(conditions = {}, orderBy = '-created_at', limit = null, alanlar = '*') {
      return sayfalayarakCek(entityName, 'filter', limit, (q) => {
        const query = applyConditions(q.select(alanlar), conditions);
        return siralamayiKesinlestir(query, parseOrderBy(orderBy));
      });
    },

    async list(orderBy = '-created_at', limit = null) {
      return sayfalayarakCek(entityName, 'list', limit, (q) => {
        const query = q.select('*');
        return siralamayiKesinlestir(query, parseOrderBy(orderBy));
      });
    },

    async create(data) {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...data, created_by: user?.email || data.created_by, created_at: new Date().toISOString() };
      const { data: result, error } = await supabase.from(tableName).insert(payload).select().single();
      if (error) throw new Error(`[db.${entityName}.create] ${error.message}`);
      return normalize(result);
    },

async update(id, data) {
  const { data: result, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select();
  if (error) throw new Error(`[db.${entityName}.update] ${error.message}: ${JSON.stringify(error.details)}`);
  return normalize(result?.[0]);
},

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw new Error(`[db.${entityName}.delete] ${error.message}`);
      return { id };
    },

    async bulkCreate(items) {
      if (!items || items.length === 0) return [];
      const { data: { user } } = await supabase.auth.getUser();
      const payload = items.map((item) => ({ ...item, created_by: user?.email || item.created_by, created_at: new Date().toISOString() }));
      const { data, error } = await supabase.from(tableName).insert(payload).select();
      if (error) throw new Error(`[db.${entityName}.bulkCreate] ${error.message}`);
      return (data || []).map(normalize);
    },

    subscribe(callback) {
      const channel = supabase.channel(`${tableName}_changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
          callback({ type: payload.eventType.toLowerCase(), id: payload.new?.id || payload.old?.id, record: payload.new || payload.old });
        }).subscribe();
      return () => supabase.removeChannel(channel);
    },
  };
}

const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Oturum acik degil');
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();
    return {
      id: user.id,
      email: user.email,
      role: profile?.role || 'user',
      full_name: profile?.full_name || '',
    };
  },
  async logout() { await supabase.auth.signOut(); },
  redirectToLogin() { window.location.href = '/login'; },
};

const functions = {
  async invoke(functionName, params = {}) {
    const { data, error } = await supabase.functions.invoke(functionName, { body: params });
    if (error) throw new Error(`[db.functions.${functionName}] ${error.message}`);
    return data;
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('excel-files').upload(fileName, file, { upsert: true });
      if (error) throw new Error(`[db.storage.upload] ${error.message}`);
      // Kova artık private (sahibe özel RLS). Herkese açık URL yerine uzun ömürlü imzalı URL
      // dönüyoruz; böylece yüklenen dosya sahibi tarafından erişilebilir kalıyor ama kova açığa çıkmıyor.
      const { data: signed, error: signError } = await supabase.storage
        .from('excel-files')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365 * 10); // ~10 yıl
      if (signError) throw new Error(`[db.storage.sign] ${signError.message}`);
      return { file_url: signed.signedUrl };
    },

    /**
     * 10 gunden eski Excel'leri depodan siler.
     *
     * Supabase storage.objects'ten SQL ile silmeye izin vermiyor
     * ("Direct deletion from storage tables is not allowed. Use the Storage
     * API"), bu yuzden silme uygulama tarafinda yapiliyor. Kova RLS'i sahibe
     * ozel oldugu icin list() yalnizca kullanicinin kendi dosyalarini verir.
     *
     * Kayitlardaki olu excel_file_url baglantilarini her gun cron temizliyor
     * (public.eski_excelleri_sil).
     */
    async EskiExcelleriTemizle({ gun = VARSAYILAN_GUN } = {}) {
      const { data, error } = await supabase.storage.from('excel-files').list('', { limit: 1000 });
      if (error) throw new Error(`[db.storage.list] ${error.message}`);

      const silinecek = silinecekDosyalar(data, gun);
      if (silinecek.length === 0) return { silinen: 0 };

      const { error: silmeHatasi } = await supabase.storage.from('excel-files').remove(silinecek);
      if (silmeHatasi) throw new Error(`[db.storage.remove] ${silmeHatasi.message}`);
      return { silinen: silinecek.length };
    },
  },
};

const entities = new Proxy({}, { get(_, entityName) { return createEntity(entityName); } });

export const db = { entities, auth, functions, integrations, _supabase: supabase };