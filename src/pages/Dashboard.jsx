import React, { useMemo, useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Package, Percent, Store,
  AlertCircle, CheckCircle2, BarChart2, Tag, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatTurkishPercent } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [newProductsList, setNewProductsList] = useState([]);
  const [showProductsList, setShowProductsList] = useState(false);
  const [customMinProfit, setCustomMinProfit] = useState('');
  const [customMaxProfit, setCustomMaxProfit] = useState('');
  const [showCustomFilter, setShowCustomFilter] = useState(false);
  const [filteredByRange, setFilteredByRange] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState(null);

  useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ['products', userEmail],
    queryFn: () => db.entities.Product.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: async () => {
      const result = await db.entities.Platform.filter({ created_by: userEmail });
      const active = result.filter(p => p.is_active !== false);
      return [...new Map(active.map(p => [p.platform_type, p])).values()];
    },
    enabled: !!userEmail
  });

  const { data: productPrices = [] } = useQuery({
    queryKey: ['productPrices', userEmail],
    queryFn: () => db.entities.ProductPrice.filter({ created_by: userEmail }, '-created_at', 50000),
    enabled: !!userEmail
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions', userEmail],
    queryFn: () => db.entities.Commission.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', userEmail],
    queryFn: () => db.entities.Category.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: marketplaceProducts = [] } = useQuery({
    queryKey: ['marketplaceProducts', userEmail],
    queryFn: () => db.entities.MarketplaceProduct.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const activePlatforms = useMemo(() => platforms.filter(p => p.is_active !== false), [platforms]);
  const activeProducts = useMemo(() => products.filter(p => p.is_active !== false), [products]);

  const unpricedProducts = useMemo(() => {
    const pricedProductIds = new Set(productPrices.map(pp => pp.product_id));
    return activeProducts.filter(p => !pricedProductIds.has(p.id));
  }, [activeProducts, productPrices]);

  const unlistedByPlatform = useMemo(() => {
    const allPlatformTypes = ['trendyol', 'hepsiburada', 'website'];
    const platformNames = { trendyol: 'Trendyol', hepsiburada: 'HepsiBurada', website: 'Web Sitesi' };
    return allPlatformTypes.map(platformType => {
      const matchedProductIds = new Set(
        marketplaceProducts
          .filter(mp => {
            const platformObj = platforms.find(p => p.name === mp.platform_account);
            return platformObj?.platform_type === platformType && mp.status === 'matched';
          })
          .map(mp => mp.matched_product_id)
          .filter(Boolean)
      );
      const unlisted = activeProducts.filter(p => !matchedProductIds.has(p.id));
      return { platformType, name: platformNames[platformType], listedCount: matchedProductIds.size, unlistedCount: unlisted.length, unlistedProducts: unlisted };
    });
  }, [activeProducts, marketplaceProducts, platforms]);

  const profitDistribution = useMemo(() => {
if (filteredByRange) {
      const min = customMinProfit !== '' ? parseFloat(customMinProfit) : -Infinity;
      const max = customMaxProfit !== '' ? parseFloat(customMaxProfit) : Infinity;
      const filteredPrices = productPrices.filter(p => {
        const r = p.profit_rate ?? 0;
        return r >= min && r <= max;
      });
      const label = `${customMinProfit !== '' ? customMinProfit : ''}–${customMaxProfit !== '' ? customMaxProfit : ''}%`;
      return [{ name: label, value: filteredPrices.length, type: 'positive' }];
    }
    const buckets = { '< 0%': 0, '0\u201310%': 0, '10\u201320%': 0, '20\u201330%': 0, '30\u201340%': 0, '40\u201350%': 0, '50\u201375%': 0, '75\u2013100%': 0, '100\u2013200%': 0, '200\u2013300%': 0, '> 300%': 0 };
    productPrices.forEach(pp => {
      const r = pp.profit_rate ?? 0;
      if (r < 0) buckets['< 0%']++;
      else if (r < 10) buckets['0\u201310%']++;
      else if (r < 20) buckets['10\u201320%']++;
      else if (r < 30) buckets['20\u201330%']++;
      else if (r < 40) buckets['30\u201340%']++;
      else if (r < 50) buckets['40\u201350%']++;
      else if (r < 75) buckets['50\u201375%']++;
      else if (r < 100) buckets['75\u2013100%']++;
      else if (r < 200) buckets['100\u2013200%']++;
      else if (r < 300) buckets['200\u2013300%']++;
      else buckets['> 300%']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [productPrices, filteredByRange, customMinProfit, customMaxProfit]);

  const platformSummary = useMemo(() => {
    return activePlatforms.map(platform => {
      const prices = productPrices.filter(pp => pp.platform_id === platform.id);
      let avgProfit = null, minProfit = null, maxProfit = null;
      if (prices.length > 0) {
        const totalProfit = prices.reduce((s, p) => s + (p.net_profit || 0), 0);
        const totalCost = products.filter(prod => prices.some(pp => pp.product_id === prod.id)).reduce((s, prod) => s + (prod.cost || 0), 0);
        avgProfit = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
        minProfit = Math.min(...prices.map(p => p.profit_rate || 0));
        maxProfit = Math.max(...prices.map(p => p.profit_rate || 0));
      }
      const negativeProfitCount = prices.filter(p => (p.profit_rate || 0) < 0).length;
      return { platform, prices: prices.length, avgProfit, minProfit, maxProfit, negativeProfitCount };
    });
  }, [activePlatforms, productPrices, products]);

  const overallAvgProfit = useMemo(() => {
    if (!productPrices.length) return 0;
    return productPrices.reduce((s, p) => s + (p.profit_rate || 0), 0) / productPrices.length;
  }, [productPrices]);

  const negativeProfitTotal = useMemo(() => productPrices.filter(p => (p.profit_rate || 0) < 0).length, [productPrices]);

  const handleShowProducts = () => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const filtered = products.filter(p => p.created_date && new Date(p.created_date) >= start && new Date(p.created_date) <= end).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setNewProductsList(filtered);
    setShowProductsList(true);
  };

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const name = data.activePayload[0].payload.name;
      const rangeMap = {
        '< 0%': { min: '', max: '0' },
        '0\u201310%': { min: '0', max: '10' },
        '10\u201320%': { min: '10', max: '20' },
        '20\u201330%': { min: '20', max: '30' },
        '30\u201340%': { min: '30', max: '40' },
        '40\u201350%': { min: '40', max: '50' },
        '50\u201375%': { min: '50', max: '75' },
        '75\u2013100%': { min: '75', max: '100' },
        '100\u2013200%': { min: '100', max: '200' },
        '200\u2013300%': { min: '200', max: '300' },
        '> 300%': { min: '300', max: '' },
      };
      const range = rangeMap[name];
      if (range) {
        navigate(`/Prices?minRate=${range.min}&maxRate=${range.max}&label=${encodeURIComponent(name)}`);
      } else {
        const match = name.match(/([\d.]+)[^\d]+([\d.]+)%/);
        if (match) {
          navigate(`/Prices?minRate=${match[1]}&maxRate=${match[2]}&label=${encodeURIComponent(name)}`);
        }
      }
    }
  };

  const profitColor = (rate) => {
    if (rate === null) return 'text-gray-400';
    if (rate < 0) return 'text-red-600';
    if (rate < 10) return 'text-orange-500';
    if (rate < 20) return 'text-yellow-600';
    return 'text-emerald-600';
  };

  const barColor = (item) => {
    if (item.type === 'negative') return '#ef4444';
    if (item.type === 'positive') return '#22c55e';
    const name = item.name || item;
    if (name === '< 0%') return '#ef4444';
    if (name.startsWith('0\u2013')) return '#f97316';
    if (name.startsWith('10\u2013')) return '#eab308';
    if (name.startsWith('20\u2013')) return '#fbbf24';
    if (name.startsWith('30\u2013')) return '#86efac';
    if (name.startsWith('40\u2013')) return '#4ade80';
    if (name.startsWith('50\u2013')) return '#22c55e';
    if (name.startsWith('75\u2013')) return '#16a34a';
    if (name.startsWith('100\u2013')) return '#15803d';
    if (name.startsWith('200\u2013')) return '#166534';
    return '#14532d';
  };

  const platformColors = { trendyol: 'border-orange-200 bg-orange-50', hepsiburada: 'border-yellow-200 bg-yellow-50', website: 'border-indigo-200 bg-indigo-50' };
  const platformTextColors = { trendyol: 'text-orange-700', hepsiburada: 'text-yellow-700', website: 'text-indigo-700' };
  const platformBadgeColors = { trendyol: 'bg-orange-100 text-orange-800', hepsiburada: 'bg-yellow-100 text-yellow-800', website: 'bg-indigo-100 text-indigo-800' };

  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Ürün, platform ve kâr özeti</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
          <StatCard icon={Package} label="Aktif Ürün" value={activeProducts.length} color="blue" />
          <StatCard icon={Store} label="Platform" value={activePlatforms.length} color="purple" />
          <StatCard icon={Tag} label="Hesaplanan Fiyat" value={productPrices.length} color="green" />
          <StatCard icon={AlertCircle} label="Fiyatlanmamış" value={unpricedProducts.length} color={unpricedProducts.length > 0 ? 'red' : 'green'} onClick={() => navigate('/Prices?filter=unpriced')} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Percent className="h-4 w-4 text-gray-400" />Kâr Özeti</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Ort. Kâr Oranı</span>
                <span className={`text-lg font-bold ${profitColor(overallAvgProfit)}`}>{formatTurkishPercent(overallAvgProfit)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Toplam Fiyatlı Kayıt</span>
                <span className="font-semibold text-gray-800">{productPrices.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Negatif Kârlı</span>
                <span className={`font-semibold ${negativeProfitTotal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {negativeProfitTotal}
                  {negativeProfitTotal > 0 && <AlertCircle className="inline ml-1 h-3.5 w-3.5" />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Kategoriler</span>
                <span className="font-semibold text-gray-800">{categories.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Komisyon Kuralı</span>
                <span className="font-semibold text-gray-800">{commissions.filter(c => c.is_active !== false).length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><BarChart2 className="h-4 w-4 text-gray-400" />Kâr Oranı Dağılımı</h2>
              <Button variant="outline" size="sm" onClick={() => setShowCustomFilter(!showCustomFilter)} className="text-xs">
                {filteredByRange ? '✓ Filtre Aktif' : 'Özel Aralık Seç'}
              </Button>
            </div>
            {showCustomFilter && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex gap-2 items-end">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-gray-500 mb-1 block">Min %</Label>
                  <Input type="number" value={customMinProfit} onChange={(e) => setCustomMinProfit(e.target.value)} placeholder="0" className="text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-gray-500 mb-1 block">Max %</Label>
                  <Input type="number" value={customMaxProfit} onChange={(e) => setCustomMaxProfit(e.target.value)} placeholder="100" className="text-sm" />
                </div>
                <Button size="sm" onClick={() => { if (customMinProfit !== '' || customMaxProfit !== '') setFilteredByRange(true); }} className="text-xs shrink-0">Filtrele</Button>
                <Button variant="outline" size="sm" onClick={() => { setCustomMinProfit(''); setCustomMaxProfit(''); setFilteredByRange(false); }} className="text-xs shrink-0">Sıfırla</Button>
              </div>
            )}
            {productPrices.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Henüz fiyat hesaplanmamış</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={profitDistribution} barSize={36} style={{ cursor: 'pointer' }} onClick={handleBarClick}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => [`${v} fiyat`, 'Adet']} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {profitDistribution.map((entry) => (<Cell key={entry.name} fill={barColor(entry)} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-xs text-gray-400 mt-2 text-center">Bir sütuna tıklayarak o kâr aralığındaki ürünleri görün</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Store className="h-4 w-4 text-gray-400" />Platform Bazlı Kâr Özeti</h2>
          {platformSummary.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Platform bulunamadı</p>
          ) : (
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 pr-4 font-medium">Platform</th>
                    <th className="pb-2 pr-4 font-medium text-center">Fiyat Sayısı</th>
                    <th className="pb-2 pr-4 font-medium text-center">Ort. Kâr</th>
                    <th className="pb-2 pr-4 font-medium text-center">Min</th>
                    <th className="pb-2 pr-4 font-medium text-center">Maks</th>
                    <th className="pb-2 font-medium text-center">Negatif</th>
                  </tr>
                </thead>
                <tbody>
                  {platformSummary.map(({ platform, prices, avgProfit, minProfit, maxProfit, negativeProfitCount }) => (
                    <tr key={platform.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{platform.name}</td>
                      <td className="py-2.5 pr-4 text-center text-gray-600">{prices}</td>
                      <td className={`py-2.5 pr-4 text-center font-semibold ${profitColor(avgProfit)}`}>{avgProfit !== null ? formatTurkishPercent(avgProfit) : '—'}</td>
                      <td className={`py-2.5 pr-4 text-center text-xs ${profitColor(minProfit)}`}>{minProfit !== null ? formatTurkishPercent(minProfit) : '—'}</td>
                      <td className={`py-2.5 pr-4 text-center text-xs ${profitColor(maxProfit)}`}>{maxProfit !== null ? formatTurkishPercent(maxProfit) : '—'}</td>
                      <td className="py-2.5 text-center">
                        {negativeProfitCount > 0 ? <Badge variant="destructive" className="text-xs">{negativeProfitCount}</Badge> : <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Package className="h-4 w-4 text-gray-400" />Tarihe Göre Eklenen Ürünler</h2>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end w-full">
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-gray-500 mb-1 block">Başlangıç</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
              </div>
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-gray-500 mb-1 block">Bitiş</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
              </div>
              <Button onClick={handleShowProducts} disabled={!startDate || !endDate} className="w-full sm:w-auto shrink-0">Listele</Button>
            </div>
            {showProductsList && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">{newProductsList.length} ürün bulundu</p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {newProductsList.length > 0 ? newProductsList.map(product => (
                    <div key={product.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                        {product.sku && <p className="text-xs text-gray-400 font-mono truncate">{product.sku}</p>}
                      </div>
                      <span className="text-xs text-gray-500 shrink-0 ml-3 whitespace-nowrap">{new Date(product.created_date).toLocaleDateString('tr-TR')}</span>
                    </div>
                  )) : <p className="text-center text-gray-400 py-8 text-sm">Bu tarihte eklenen ürün yok</p>}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-gray-400" />Platformda Listelenmeyen Ürünler</h2>
            <div className="space-y-3">
              {unlistedByPlatform.map(({ platformType, name, listedCount, unlistedCount, unlistedProducts }) => (
                <div key={platformType} className={`rounded-xl border overflow-hidden ${platformColors[platformType]}`}>
                  <button onClick={() => setExpandedPlatform(expandedPlatform === platformType ? null : platformType)} className="w-full flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold text-sm ${platformTextColors[platformType]}`}>{name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${platformBadgeColors[platformType]}`}>{listedCount} listelendi</span>
                      {unlistedCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">{unlistedCount} listelenmemiş</span>}
                      {unlistedCount === 0 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                    {unlistedCount > 0 && (expandedPlatform === platformType ? <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />)}
                  </button>
                  {expandedPlatform === platformType && unlistedCount > 0 && (
                    <div className="px-4 pb-3 border-t border-white/50">
                      <div className="space-y-1.5 max-h-56 overflow-y-auto mt-2 pr-1">
                        {unlistedProducts.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs">
                            <span className="font-medium text-gray-800 truncate">{p.name}</span>
                            {p.sku && <span className="text-gray-400 font-mono ml-2 shrink-0">{p.sku}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}