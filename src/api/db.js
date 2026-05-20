import { supabase } from './supabaseClient';

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
  TrendyolPriceRange: 'trendyol_price_ranges',
  Announcement: 'announcements',
  AnnouncementRead: 'announcement_reads',
  Message: 'messages',
  Settings: 'settings',
  User: 'user_profiles',
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

function createEntity(entityName) {
  const tableName = TABLE_MAP[entityName];
  if (!tableName) throw new Error(`Bilinmeyen entity: ${entityName}`);

  return {
    async filter(conditions = {}, orderBy = '-created_at', limit = 10000) {
      let query = supabase.from(tableName).select('*');
      query = applyConditions(query, conditions);
      const order = parseOrderBy(orderBy);
      if (order) query = query.order(order.column, { ascending: order.ascending });
      query = query.limit(limit || 50000);
      const { data, error } = await query;
      if (error) throw new Error(`[db.${entityName}.filter] ${error.message}`);
      return (data || []).map(normalize);
    },

    async list(orderBy = '-created_at', limit = 10000) {
      let query = supabase.from(tableName).select('*');
      const order = parseOrderBy(orderBy);
      if (order) query = query.order(order.column, { ascending: order.ascending });
      query = query.limit(50000);
      query = query.limit(limit || 50000);
      const { data, error } = await query;
      if (error) throw new Error(`[db.${entityName}.list] ${error.message}`);
      return (data || []).map(normalize);
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
      const { data: { publicUrl } } = supabase.storage.from('excel-files').getPublicUrl(data.path);
      return { file_url: publicUrl };
    },
  },
};

const entities = new Proxy({}, { get(_, entityName) { return createEntity(entityName); } });

export const db = { entities, auth, functions, integrations, _supabase: supabase };