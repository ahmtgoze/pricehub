import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Filter, AlertCircle, Info, Megaphone } from 'lucide-react';
import { calculatePriceBreakdown, findDesiShippingRate } from '@/components/PriceCalculationEngine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PriceDetailModal from '@/components/modals/PriceDetailModal';

const Product = db.entities.Product;
const Platform = db.entities.Platform;
const Commission = db.entities.Commission;
const ShippingRate = db.entities.ShippingRate;

const withVatRate = (rate) => Math.round((rate || 0) * 1.2 * 100) / 100;
const commLabel = (rate) => `%${rate || 0} (KDV'li %${withVatRate(rate)})`;

const CAMPAIGN_TYPES = [
  { value: 'cart_percent', label: 'Sepette % indirim' },
  { value: 'cart_tl', label: 'Sepette TL indirim' },
  { value: 'buy_x_pay_y', label: 'Sepette X al Y öde' },
  { value: 'nth_percent', label: 'X. ürün % indirimi' },
  { value: 'nth_tl', label: 'X. ürün Y TL indirimi' },
];

export default function HBOwnCampaign() {
  const [userEmail, setUserEmail] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [campaignType, setCampaignType] = useState('cart_percent');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountTl, setDiscountTl] = useState('');
  const [buyX, setBuyX] = useState('3');
  const [payY, setPayY] = useState('2');
  const [commissionDiscount, setCommissionDiscount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [onlyLoss, setOnlyLoss] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, product: null, priceData: null, calculationDetails: null });

  React.useEffect(() => {
    db.auth.me().then((u) => setUserEmail(u.email)).catch(() => {});
  }, []);

  const { data: platforms = [] } = useQuery({ queryKey: ['platforms', userEmail], queryFn: () => Platform.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: products = [] } = useQuery({ queryKey: ['products', userEmail], queryFn: () => Product.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: commissions = [] } = useQuery({ queryKey: ['commissions', userEmail], queryFn: () => Commission.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: shippingRates = [] } = useQuery({ queryKey: ['shippingRates'], queryFn: () => ShippingRate.list('-id', 10000), enabled: !!userEmail });
  const { data: packages = [] } = useQuery({ queryKey: ['packages'], queryFn: () => db.entities.Package.list(), enabled: !!userEmail });
  const { data: settings = [] } = useQuery({ queryKey: ['settings', userEmail], queryFn: () => db.entities.Settings.filter({ created_by: userEmail }), enabled: !!userEmail });
  const { data: productPrices = [] } = useQuery({ queryKey: ['productPrices', userEmail], queryFn: () => db.entities.ProductPrice.filter({ created_by: userEmail }), enabled: !!userEmail });

  const uniquePlatforms = platforms.filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);
  const hbPlatforms = uniquePlatforms
    .filter((p) => p.platform_type === 'hepsiburada' && p.is_active !== false)
    .filter((p, idx, arr) => arr.findIndex((x) => x.name === p.name) === idx);
  const hasHepsiburada = hbPlatforms.length > 0;
  const hbPlatform = hbPlatforms.find((p) => p.name === selectedPlatform) || hbPlatforms[0];

  React.useEffect(() => {
    if (hbPlatforms.length >= 1 && !selectedPlatform) setSelectedPlatform(hbPlatforms[0].name);
  }, [hbPlatforms.length]);

  const getPackageCost = (packageId) => packages.find((p) => p.id === packageId)?.total_cost || 0;

  const getCommissionRate = (product) => {
    if (!product) return 0;
    const hbIds = hbPlatforms.map((p) => String(p.id));
    const hbNames = hbPlatforms.map((p) => (p.name || '').toLowerCase().trim());
    const c = commissions.find((c) =>
      c.is_active !== false &&
      (hbIds.includes(String(c.platform_id)) || hbNames.includes((c.platform_name || '').toLowerCase().trim())) &&
      ((product.category_id && String(c.category_id) === String(product.category_id)) ||
       (product.category_name && (c.category_name || '').toLowerCase().trim() === (product.category_name || '').toLowerCase().trim()))
    );
    return c?.commission_rate || 0;
  };

  function calculateProfit(price, commissionRate, product) {
    try {
      if (!price || price <= 0 || !product || !hbPlatform) return { profit: 0, profitRate: 0, breakdown: null };
      const platform = hbPlatform;
      const platformShippingRates = shippingRates.filter((r) => r.is_active !== false && (r.platform_id === platform.id || r.platform_type === platform.platform_type));

      let packagingCost = 0;
      if (product.multi_package && product.packages) {
        try {
          const pp = typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages;
          for (const pkg of pp) { if (pkg.package_id) packagingCost += getPackageCost(pkg.package_id); }
        } catch (e) { packagingCost = 0; }
      } else if (product.package_id || product.auto_package_id) {
        packagingCost = getPackageCost(product.package_id || product.auto_package_id);
      }

      let shippingCost = 0, shippingVatRate = 20, baremUsed = 'desi';
      const canUseBarem = !product.special_shipping && !product.multi_package;
      if (canUseBarem && price > 0) {
        if (price <= 149.99) { const r = platformShippingRates.find((r) => r.rate_type === 'barem1'); if (r) { shippingCost = r.price; shippingVatRate = r.vat_rate || 20; baremUsed = 'barem1'; } }
        else if (price <= 299.99) { const r = platformShippingRates.find((r) => r.rate_type === 'barem2'); if (r) { shippingCost = r.price; shippingVatRate = r.vat_rate || 20; baremUsed = 'barem2'; } }
      }
      if (shippingCost === 0) {
        if (product.multi_package && product.packages) {
          try {
            const pp = typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages;
            if (product.special_shipping) {
              const rc = settings.find((s) => s.setting_key === 'return_cost_per_package');
              const rcv = rc ? parseFloat(rc.setting_value) : 180.096;
              for (const pkg of pp) { const dr = findDesiShippingRate(platformShippingRates, pkg.desi || 0); if (dr) { shippingCost += (dr.price * 2) + rcv; shippingVatRate = dr.vat_rate || 20; } }
            } else {
              for (const pkg of pp) { const dr = findDesiShippingRate(platformShippingRates, pkg.desi || 0); if (dr) { shippingCost += dr.price; shippingVatRate = dr.vat_rate || 20; } }
            }
          } catch (e) { const dr = findDesiShippingRate(platformShippingRates, product.desi || 0); shippingCost = dr?.price || 0; shippingVatRate = dr?.vat_rate || 20; }
        } else { const dr = findDesiShippingRate(platformShippingRates, product.desi || 0); shippingCost = dr?.price || 0; shippingVatRate = dr?.vat_rate || 20; }
        baremUsed = 'desi';
      }

      const breakdown = calculatePriceBreakdown({
        salePriceInclVat: parseFloat(price),
        productCost: parseFloat(product.cost) || 0,
        productVatRate: parseFloat(product.vat_rate) || 20,
        shippingCost: parseFloat(shippingCost) || 0,
        shippingVatRate: parseFloat(shippingVatRate) || 20,
        commissionRate: parseFloat(commissionRate) || 0,
        commissionVatRate: 20,
        platform,
        baremUsed,
        packagingCost: parseFloat(packagingCost) || 0,
        printingCost: parseFloat(product.printing_cost) || 0,
        extraCost: parseFloat(product.extra_cost) || 0,
        isSameDayDelivery: product.same_day_delivery || false,
      });
      return { profit: parseFloat(breakdown.netProfit) || 0, profitRate: parseFloat(breakdown.profitRate) || 0, breakdown, baremUsed };
    } catch (e) { return { profit: 0, profitRate: 0, breakdown: null }; }
  }

  const applyCampaign = (price) => {
    const dp = parseFloat(discountPercent) || 0;
    const dt = parseFloat(discountTl) || 0;
    const x = parseInt(buyX) || 0, y = parseInt(payY) || 0;
    switch (campaignType) {
      case 'cart_percent':
      case 'nth_percent':
        return Math.max(0, price * (1 - dp / 100));
      case 'cart_tl':
      case 'nth_tl':
        return Math.max(0, price - dt);
      case 'buy_x_pay_y':
        return x > 0 ? Math.max(0, price * (y / x)) : price;
      default:
        return price;
    }
  };

  // HB fiyatı olan ürünleri satırlara dök
  const rows = productPrices
    .filter((pp) => hbPlatform && pp.platform_id === hbPlatform.id && pp.sale_price > 0)
    .map((pp) => {
      const product = products.find((p) => p.id === pp.product_id);
      if (!product) return null;
      const baseCommission = getCommissionRate(product);
      const effCommission = Math.max(0, baseCommission - (parseFloat(commissionDiscount) || 0));
      const basePrice = pp.sale_price;
      const campPrice = applyCampaign(basePrice);
      const current = calculateProfit(basePrice, baseCommission, product);
      const campaign = calculateProfit(campPrice, effCommission, product);
      return { product, basePrice, campPrice, baseCommission, effCommission, current, campaign };
    })
    .filter(Boolean);

  const allCategories = [...new Set(rows.map((r) => r.product.category_name).filter(Boolean))].sort();
  const filteredRows = rows.filter((r) => {
    if (searchTerm && !r.product.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !r.product.sku?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory && r.product.category_name !== filterCategory) return false;
    if (onlyLoss && r.campaign.profit >= 0) return false;
    return true;
  });

  const lossCount = rows.filter((r) => r.campaign.profit < 0).length;

  const openDetail = (price, commissionRate, product) => {
    const calc = calculateProfit(price, commissionRate, product);
    setDetailModal({
      open: true, product,
      priceData: { sale_price: price, net_profit: calc.profit, profit_rate: calc.profitRate, shipping_cost: calc.breakdown?.shippingCost || 0, packaging_cost: calc.breakdown?.packagingCost || 0, commission_amount: calc.breakdown?.commissionAmount || 0, withholding_amount: calc.breakdown?.withholdingAmount || 0, service_fee: calc.breakdown?.serviceFee || 0, net_vat: calc.breakdown?.netVat || 0, barem_used: calc.baremUsed || 'none' },
      calculationDetails: { productCost: product?.cost || 0, productVatRate: product?.vat_rate || 20, commissionRate, packagingCost: calc.breakdown?.packagingCost || 0, printingCost: product?.printing_cost || 0, extraCost: product?.extra_cost || 0, shippingCost: calc.breakdown?.shippingCost || 0 },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Kendi Kampanyanı Oluştur</h1>
          <p className="text-muted-foreground mt-1">Bir sepet kampanyası kurgulayıp, ürünlerinde kâr etkisini görün (Hepsiburada)</p>
        </div>

        {!hasHepsiburada && (
          <div className="mb-6 flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
            <div>
              <h3 className="font-semibold text-amber-900 text-base mb-1">Hepsiburada Platformu Aktif Değil</h3>
              <p className="text-amber-800 text-sm leading-relaxed">Bu sayfayı kullanabilmek için önce <strong>Platformlar</strong> bölümünden Hepsiburada platformunu aktive etmeniz gerekir.</p>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />Kampanya Ayarları</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Kampanya Türü</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CAMPAIGN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {(campaignType === 'cart_percent' || campaignType === 'nth_percent') && (
                <div className="space-y-2"><Label>İndirim Oranı (%)</Label><Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="örn. 15" /></div>
              )}
              {(campaignType === 'cart_tl' || campaignType === 'nth_tl') && (
                <div className="space-y-2"><Label>İndirim Tutarı (₺)</Label><Input type="number" value={discountTl} onChange={(e) => setDiscountTl(e.target.value)} placeholder="örn. 50" /></div>
              )}
              {campaignType === 'buy_x_pay_y' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2"><Label>Al (X)</Label><Input type="number" value={buyX} onChange={(e) => setBuyX(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Öde (Y)</Label><Input type="number" value={payY} onChange={(e) => setPayY(e.target.value)} /></div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Komisyon İndirimi (%) <span className="text-xs text-slate-400">opsiyonel</span></Label>
                <Input type="number" value={commissionDiscount} onChange={(e) => setCommissionDiscount(e.target.value)} placeholder="örn. 7" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">Not: "X al Y öde" ürün başına ortalama birim fiyatı (Y/X) baz alır. Komisyon indirimi girersen, kampanya kârı düşük komisyonla hesaplanır.</p>
          </CardContent>
        </Card>

        {rows.length > 0 ? (
          <>
            <Card className="mb-6">
              <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filtreler</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <Input placeholder="Ürün / SKU ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <Select value={filterCategory || 'all'} onValueChange={(val) => setFilterCategory(val === 'all' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Kategori</SelectItem>{allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant={onlyLoss ? 'default' : 'outline'} onClick={() => setOnlyLoss(!onlyLoss)} className="gap-2">
                    Sadece zarar edenler {lossCount > 0 && <Badge variant="outline" className="text-rose-600 border-rose-300">{lossCount}</Badge>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Kâr Etkisi ({filteredRows.length} ürün)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-3 text-left font-semibold min-w-[200px]">Ürün</th>
                        <th className="p-3 text-center font-semibold min-w-[150px]">Mevcut</th>
                        <th className="p-3 text-center font-semibold min-w-[170px]">Kampanya Sonrası</th>
                        <th className="p-3 text-center font-semibold min-w-[120px]">Kâr Farkı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r, i) => {
                        const diff = r.campaign.profit - r.current.profit;
                        return (
                          <tr key={i} className={`border-b hover:bg-slate-50 ${r.campaign.profit < 0 ? 'bg-rose-50/50' : ''}`}>
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{r.product.name}</div>
                              <div className="text-xs text-slate-500 font-mono">{r.product.sku}</div>
                              <div className="text-xs text-slate-400">{r.product.category_name}</div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="font-semibold text-slate-900">₺{r.basePrice.toFixed(2)}</div>
                              <div className="text-[11px] text-slate-500">Kom: {commLabel(r.baseCommission)}</div>
                              <div className={`text-xs font-medium ${r.current.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₺{r.current.profit.toFixed(2)} (%{r.current.profitRate.toFixed(1)})</div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-semibold text-slate-900">₺{r.campPrice.toFixed(2)}</span>
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openDetail(r.campPrice, r.effCommission, r.product)}><Info className="h-3 w-3" /></Button>
                              </div>
                              <div className="text-[11px] text-slate-500">Kom: {commLabel(r.effCommission)}</div>
                              <div className={`text-xs font-semibold ${r.campaign.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₺{r.campaign.profit.toFixed(2)} (%{r.campaign.profitRate.toFixed(1)})</div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-semibold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{diff >= 0 ? '+' : ''}₺{diff.toFixed(2)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Megaphone className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">Hepsiburada fiyatı olan ürün bulunamadı</p>
              <p className="text-sm text-slate-400">Bu araç, Fiyatlar sayfasında Hepsiburada fiyatı belirlenmiş ürünler üzerinden kâr etkisini hesaplar.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <PriceDetailModal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, product: null, priceData: null, calculationDetails: null })}
        product={detailModal.product}
        platform={hbPlatform}
        priceData={detailModal.priceData}
        calculationDetails={detailModal.calculationDetails}
      />
    </div>
  );
}
