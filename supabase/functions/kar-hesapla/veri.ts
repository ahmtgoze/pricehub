// deno-lint-ignore-file no-explicit-any
// Servisin veri okuması. Her kullanıcı verisi ayrıca `created_by = çağıranın e-postası` ile süzülür:
// RLS yönetici hesabına tüm hesapları açtığı için yalnız RLS'e güvenilmez (barkodlar hesaplar arasında ortak).
const SAYFA = 5000;

const PLATFORM = 'id,name,platform_type,is_system_admin,is_active,satici_no,shipping_company_name,use_barem,barem_max_desi,barem1_min,barem1_max,barem2_min,barem2_max,has_withholding,withholding_rate,has_service_fee,service_fee_type,service_fee_amount,service_fee_vat_rate,has_same_day_delivery,same_day_delivery_service_fee,has_corporate_tax,corporate_tax_rate,has_transaction_fee,transaction_fee_amount,transaction_fee_vat_rate';
const TARIFE = 'platform_id,platform_type,shipping_company,rate_type,same_day_delivery,desi,price,vat_rate,is_active';
const KOMISYON = 'platform_id,platform_name,category_id,category_name,is_active,discounted_target_profit_rate,discounted_target_profit_amount,discounted_minimum_profit_amount';
const URUN = 'id,cost,base_cost,ref_product_id,ref_product_id_size,printing_cost,extra_cost,desi,vat_rate,category_id,category_name,same_day_delivery,double_shipping,multi_package,packages,package_id,auto_package_id';

// Çakışma (zincir) motorunun okuduğu sütunlar. Fark testi (tests/karServisiCakisma.test.mjs) bu listeleri okur.
const ZINCIR_FIYAT_ARALIGI = 'platform_account,start_date,end_date,barcode,selected_range,selected_price,manual_price,pencere_tarihleri,secimler';
const ZINCIR_ETIKET = 'platform_account,start_date,end_date,barcode,selected_range,selected_price,manual_price';
const ZINCIR_FLAS = 'platform_account,start_date,end_date,barcode,selected_type,selected_price,manual_price';
const ZINCIR_PLUS_TARIFE = 'platform_account,start_date,end_date,barcode,selected_type,selected_price,manual_price,secimler,plus_commission_offer,calculated_commission,current_commission';
const ZINCIR_KAMPANYA = 'id,campaign_type,start_date,end_date,cart_amount,cart_condition,discount_type,discount_amount,trendyol_coverage_rate,is_active,discount_kind,threshold_amount,buy_x,pay_y,min_qty';
const ZINCIR_KAMPANYA_URUNU = 'campaign_id,barcode,campaign_price,selected_type';
const ZINCIR_KENDI_INDIRIM = 'platform_account,tur,ad,hedef_kitle,kapsam_turu,kapsam_kategoriler,kapsam_urunler,indirim_tipi,oran,tutar,alt_limit,al_x,ode_y,maks_tutar,karsilama,start_date,end_date,aktif';

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

  async function urunleriGetir(gruplar: [string, Map<string, string>][]) {
    const kimlikler = [...new Set(gruplar.flatMap(([, harita]) => [...harita.values()]))];
    if (!kimlikler.length) return new Map();
    const urunler = new Map((await oku(benim('products', URUN).in('id', kimlikler))).map((u) => [String(u.id), u]));
    const sonuc = new Map<string, { urun: any; eslesme: string }>();
    for (const [eslesme, harita] of gruplar) for (const [kod, id] of harita) if (urunler.has(id)) sonuc.set(kod, { urun: urunler.get(id), eslesme });
    return sonuc;
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
      return urunleriGetir([['barkod', barkodla], ['model_kodu', await eslesenUrunler('model_code', kalan)]]);
    },
    // PriceHub'a kayıtlı diğer promosyon seçimleri. Barkodlu tablolar yalnız istenen barkodlarla süzülür.
    zincirKaynaklari: async (barkodlar: string[]) => {
      const b = varyantlar(barkodlar);
      const barkodlu = (tablo: string, alanlar: string) => benim(tablo, alanlar).in('barcode', b).range(0, SAYFA - 1);
      const [priceRanges, advantageTags, flashProducts, plusTariffs, campaigns, campaignProducts, ownDiscounts] = await Promise.all([
        oku(barkodlu('trendyol_price_ranges', ZINCIR_FIYAT_ARALIGI)),
        oku(barkodlu('advantage_product_tags', ZINCIR_ETIKET)),
        oku(barkodlu('flash_products', ZINCIR_FLAS)),
        oku(barkodlu('plus_product_commission_tariffs', ZINCIR_PLUS_TARIFE)),
        oku(benim('campaigns', ZINCIR_KAMPANYA).range(0, SAYFA - 1)),
        oku(barkodlu('campaign_products', ZINCIR_KAMPANYA_URUNU)),
        oku(benim('trendyol_own_discounts', ZINCIR_KENDI_INDIRIM).range(0, SAYFA - 1)),
      ]);
      return { priceRanges, advantageTags, flashProducts, plusTariffs, campaigns, campaignProducts, ownDiscounts };
    },
    urunlerModelKoduyla: async (kodlar: string[]) => urunleriGetir([['model_kodu', await eslesenUrunler('model_code', kodlar)]]),
  };
}
