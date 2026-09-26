// deno-lint-ignore-file no-explicit-any
// Servisin veri okuması. Her kullanıcı verisi ayrıca `created_by = çağıranın e-postası` ile süzülür:
// RLS yönetici hesabına tüm hesapları açtığı için yalnız RLS'e güvenilmez (barkodlar hesaplar arasında ortak).
const SAYFA = 5000;

const PLATFORM = 'id,name,platform_type,is_system_admin,is_active,satici_no,shipping_company_name,use_barem,barem_max_desi,barem1_min,barem1_max,barem2_min,barem2_max,has_withholding,withholding_rate,has_service_fee,service_fee_type,service_fee_amount,service_fee_vat_rate,same_day_delivery_service_fee,same_day_delivery_vat_rate,has_pos_service_fee,pos_service_fee_rate,has_corporate_tax,corporate_tax_rate,has_transaction_fee,transaction_fee_amount,transaction_fee_vat_rate,use_custom_shipping_price,custom_shipping_price';
const TARIFE = 'platform_id,platform_type,shipping_company,rate_type,same_day_delivery,desi,price,vat_rate,is_manual,is_admin_created,is_active';
const KOMISYON = 'platform_id,platform_name,category_id,category_name,is_active,discounted_target_profit_rate,discounted_target_profit_amount,discounted_minimum_profit_amount';
const URUN = 'id,cost,base_cost,ref_product_id,ref_product_id_size,printing_cost,extra_cost,desi,vat_rate,category_id,category_name,same_day_delivery,special_shipping,double_shipping,multi_package,packages,package_id,auto_package_id';

async function oku(sorgu: any): Promise<any[]> {
  const { data, error } = await sorgu;
  if (error) throw new Error(`veri_hatasi:${error.code ?? 'bilinmiyor'}`);
  return data ?? [];
}

const varyantlar = (liste: string[]) => [...new Set(liste.flatMap((b) => [b, b.toLowerCase(), b.toUpperCase()]))];

export function gercekVeri(client: any, email: string) {
  const benim = (tablo: string, alanlar: string) => client.from(tablo).select(alanlar).eq('created_by', email);

  async function eslesenUrunler(alan: 'barkod' | 'model_code', degerler: string[]): Promise<Map<string, string>> {
    if (!degerler.length) return new Map();
    const satirlar = await oku(benim('marketplace_products', 'barkod,model_code,matched_product_id')
      .eq('platform_account', 'Trendyol').not('matched_product_id', 'is', null).in(alan, varyantlar(degerler)));
    const gruplar = new Map<string, Set<string>>();
    for (const s of satirlar) {
      const anahtar = String(s[alan]).toLowerCase();
      gruplar.set(anahtar, (gruplar.get(anahtar) ?? new Set()).add(String(s.matched_product_id)));
    }
    // Aynı kod birden fazla ürüne bağlıysa belirsizdir: eşleşmemiş sayılır, tahmin edilmez.
    return new Map([...gruplar].filter(([, kimlikler]) => kimlikler.size === 1).map(([k, kimlikler]) => [k, [...kimlikler][0]]));
  }

  return {
    platformlar: async () => {
      const [kendi, sablon] = await Promise.all([
        oku(benim('platforms', PLATFORM).eq('platform_type', 'trendyol').eq('is_system_admin', false)),
        oku(client.from('platforms').select(PLATFORM).eq('is_system_admin', true).eq('platform_type', 'trendyol')),
      ]);
      return [...kendi, ...sablon];
    },
    tarifeler: () => oku(client.from('shipping_rates').select(TARIFE).eq('platform_type', 'trendyol').eq('is_admin_created', true).eq('is_active', true).range(0, SAYFA - 1)),
    ayarlar: () => oku(benim('settings', 'setting_key,setting_value').eq('setting_key', 'cift_kargo_kurallari')),
    komisyonlar: () => oku(benim('commissions', KOMISYON).eq('platform_name', 'Trendyol').range(0, SAYFA - 1)),
    urunler: async (barkodlar: string[]) => {
      const barkodla = await eslesenUrunler('barkod', barkodlar);
      const kalan = barkodlar.filter((b) => !barkodla.has(b.toLowerCase()));
      const modelle = await eslesenUrunler('model_code', kalan);
      const kimlikler = [...new Set([...barkodla.values(), ...modelle.values()])];
      if (!kimlikler.length) return new Map();
      const urunler = new Map((await oku(benim('products', URUN).in('id', kimlikler))).map((u) => [String(u.id), u]));
      const sonuc = new Map<string, { urun: any; eslesme: string }>();
      for (const [kod, id] of barkodla) if (urunler.has(id)) sonuc.set(kod, { urun: urunler.get(id), eslesme: 'barkod' });
      for (const [kod, id] of modelle) if (urunler.has(id)) sonuc.set(kod, { urun: urunler.get(id), eslesme: 'model_kodu' });
      return sonuc;
    },
  };
}
