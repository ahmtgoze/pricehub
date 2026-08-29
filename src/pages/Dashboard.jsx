import WidgetIzgarasi from '@/components/dashboard/WidgetIzgarasi';
import React, { useMemo, useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Package, Store,
  AlertCircle, CheckCircle2, Tag, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatTurkishPercent } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { tariheGoreSuz } from '@/lib/tarihAraligi';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(null);
  // Tek takvimden secilen aralik. tariheGoreSuz 'YYYY-MM-DD' bekledigi icin
  // secim aninda yerel gune gore metne cevriliyor (UTC kaymasi olmasin).
  const [tarihAraligi, setTarihAraligi] = useState({ from: undefined, to: undefined });
  const [takvimAnahtari, setTakvimAnahtari] = useState(0);
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

  // Date -> 'YYYY-MM-DD' (yerel gune gore; toISOString UTC'ye kaydirirdi)
  const gunMetni = (t) =>
    t ? `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` : '';

  const handleShowProducts = () => {
    const { from, to } = tarihAraligi;
    if (!from || !to) return;
    setNewProductsList(tariheGoreSuz(products, gunMetni(from), gunMetni(to)));
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

  // Prototip rengi yalnızca uyarı için kullanıyor: sağlıklı kâr nötr (siyah),
  // düşük kâr amber, negatif kâr kırmızı. Yeşil ton kaldırıldı.
  const profitColor = (rate) => {
    if (rate === null) return 'text-muted-foreground';
    if (rate < 0) return 'text-destructive';
    if (rate < 10) return 'text-amber-600';
    if (rate < 20) return 'text-amber-500';
    return 'text-foreground';
  };

  // Prototipten birebir olculen kar dagilimi paleti (11 aralik):
  // negatiften basliyor, kar arttikca kirmizi -> turuncu -> sari -> yesil.
  // Degerler tasarim dosyasindaki sutunlardan dogrudan okundu.
  const KAR_PALETI = {
    '< 0%': '#d70015',
    '0\u201310%': '#e8834a',
    '10\u201320%': '#e8a33d',
    '20\u201330%': '#d7c04a',
    '30\u201340%': '#8fc46b',
    '40\u201350%': '#5fb96a',
    '50\u201375%': '#39a35a',
    '75\u2013100%': '#2b8c4c',
    '100\u2013200%': '#22703d',
    '200\u2013300%': '#1a5c31',
    '> 300%': '#124524',
  };

  const barColor = (item) => {
    if (item.type === 'negative') return KAR_PALETI['< 0%'];
    const ad = item.name || item;
    if (KAR_PALETI[ad]) return KAR_PALETI[ad];
    // Ozel aralik secildiginde tek sutun cikar: kar pozitifse koyu yesil
    if (item.type === 'positive') return '#22703d';
    return '#1d1d1f';
  };

  const platformColors = { trendyol: 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30', hepsiburada: 'border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30', website: 'border-border bg-secondary' };
  const platformTextColors = { trendyol: 'text-orange-700', hepsiburada: 'text-purple-700', website: 'text-foreground' };
  const platformBadgeColors = { trendyol: 'bg-orange-100 text-orange-800', hepsiburada: 'bg-purple-100 text-purple-800', website: 'bg-secondary text-muted-foreground' };

  // Dashboard kutulari. WidgetIzgarasi bunlari tasinabilir ve
  // boyutlandirilabilir hale getiriyor; icerik/hesap mantigi degismedi.
  const widgetTanimlari = [
    // Ust ozet kartlari tek bir sabit blok degil, dort ayri widget:
    // kullanici her birini tasiyabilir, boyutlandirabilir, gizleyebilir.
    // Tasarim prototipi de bunlari ayri widget olarak tanimliyor.
    {
      id: 'kpi-urun',
      baslik: 'Aktif Ürün',
      varsayilanSpan: 1,
      icerik: <StatCard icon={Package} label="Aktif Ürün" value={activeProducts.length} color="blue" />,
    },
    {
      id: 'kpi-platform',
      baslik: 'Platform',
      varsayilanSpan: 1,
      icerik: <StatCard icon={Store} label="Platform" value={activePlatforms.length} color="purple" />,
    },
    {
      id: 'kpi-fiyat',
      baslik: 'Hesaplanan Fiyat',
      varsayilanSpan: 1,
      icerik: <StatCard icon={Tag} label="Hesaplanan Fiyat" value={productPrices.length} color="green" />,
    },
    {
      id: 'kpi-fiyatlanmamis',
      baslik: 'Fiyatlanmamış',
      varsayilanSpan: 1,
      icerik: (
        <StatCard
          icon={AlertCircle}
          label="Fiyatlanmamış"
          value={unpricedProducts.length}
          color={unpricedProducts.length > 0 ? 'red' : 'green'}
          onClick={() => navigate('/Prices?filter=unpriced')}
        />
      ),
    },
    {
      id: 'kar-ozeti',
      baslik: 'Kâr Özeti',
      varsayilanSpan: 1,
      icerik: (
      <div className="ph-card flex flex-col gap-4">
                <h2 className="text-[15px] font-semibold tracking-[-0.2px]">Kâr Özeti</h2>
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-[13.5px]">
                      <span className="text-muted-foreground">Ort. Kâr Oranı</span>
                      <span className={`font-semibold tabular-nums ${profitColor(overallAvgProfit)}`}>{formatTurkishPercent(overallAvgProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13.5px]">
                      <span className="text-muted-foreground">Toplam Fiyatlı Kayıt</span>
                      <span className="font-semibold tabular-nums">{productPrices.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13.5px]">
                      <span className="text-muted-foreground">Negatif Kârlı</span>
                      <span className={`font-semibold tabular-nums ${negativeProfitTotal > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {negativeProfitTotal}
                        {negativeProfitTotal > 0 && <AlertCircle className="inline ml-1 h-3.5 w-3.5" />}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[13.5px]">
                      <span className="text-muted-foreground">Kategoriler</span>
                      <span className="font-semibold tabular-nums">{categories.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13.5px]">
                      <span className="text-muted-foreground">Komisyon Kuralı</span>
                      <span className="font-semibold tabular-nums">{commissions.filter(c => c.is_active !== false).length}</span>
                    </div>
                  </div>
                </div>
      ),
    },
    {
      id: 'kar-dagilimi',
      baslik: 'Kâr Oranı Dağılımı',
      varsayilanSpan: 3,
      icerik: (
      <div className="ph-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-semibold tracking-[-0.2px]">Kâr Oranı Dağılımı</h2>
                    <Button variant="outline" size="sm" onClick={() => setShowCustomFilter(!showCustomFilter)} className="text-xs">
                      {filteredByRange ? '✓ Filtre Aktif' : 'Tarih Aralığı Seç'}
                    </Button>
                  </div>
                  {showCustomFilter && (
                    <div className="mb-4 p-[14px] bg-secondary rounded-xl flex gap-2 items-end">
                      <div className="flex-1 min-w-0">
                        <Label className="text-[11.5px] text-muted-foreground mb-[5px] block">Min %</Label>
                        <Input type="number" value={customMinProfit} onChange={(e) => setCustomMinProfit(e.target.value)} placeholder="0" className="text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className="text-[11.5px] text-muted-foreground mb-[5px] block">Max %</Label>
                        <Input type="number" value={customMaxProfit} onChange={(e) => setCustomMaxProfit(e.target.value)} placeholder="100" className="text-sm" />
                      </div>
                      <Button size="sm" onClick={() => { if (customMinProfit !== '' || customMaxProfit !== '') setFilteredByRange(true); }} className="text-xs shrink-0">Filtrele</Button>
                      <Button variant="outline" size="sm" onClick={() => { setCustomMinProfit(''); setCustomMaxProfit(''); setFilteredByRange(false); }} className="text-xs shrink-0">Sıfırla</Button>
                    </div>
                  )}
                  {productPrices.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-[13.5px]">Henüz fiyat hesaplanmamış</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={profitDistribution} barSize={36} style={{ cursor: 'pointer' }} onClick={handleBarClick}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#a1a1a6' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #ececee', fontSize: 12 }} formatter={(v) => [`${v} fiyat`, 'Adet']} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {profitDistribution.map((entry) => (<Cell key={entry.name} fill={barColor(entry)} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 text-center">Bir sütuna tıklayarak o kâr aralığındaki ürünleri görün</p>
              </div>
      ),
    },
    {
      id: 'platform-ozeti',
      baslik: 'Platform Bazlı Kâr Özeti',
      varsayilanSpan: 4,
      icerik: (
      <div className="ph-card">
                <h2 className="text-[15px] font-semibold tracking-[-0.2px] mb-4">Platform Bazlı Kâr Özeti</h2>
                {platformSummary.length === 0 ? (
                  <p className="ph-empty">Platform bulunamadı</p>
                ) : (
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-border">
                          <th className="ph-th pb-[13px] pr-4">Platform</th>
                          <th className="ph-th pb-[13px] pr-4 text-center">Fiyat Sayısı</th>
                          <th className="ph-th pb-[13px] pr-4 text-center">Ort. Kâr</th>
                          <th className="ph-th pb-[13px] pr-4 text-center">Min</th>
                          <th className="ph-th pb-[13px] pr-4 text-center">Maks</th>
                          <th className="ph-th pb-[13px] text-center">Negatif</th>
                        </tr>
                      </thead>
                      <tbody>
                        {platformSummary.map(({ platform, prices, avgProfit, minProfit, maxProfit, negativeProfitCount }) => (
                          <tr key={platform.id} className="border-b border-[#f2f2f4] last:border-0 hover:bg-secondary/60 transition-colors">
                            <td className="py-[11px] pr-4 font-medium">{platform.name}</td>
                            <td className="py-[11px] pr-4 text-center text-muted-foreground tabular-nums">{prices}</td>
                            <td className={`py-[11px] pr-4 text-center font-semibold tabular-nums ${profitColor(avgProfit)}`}>{avgProfit !== null ? formatTurkishPercent(avgProfit) : '—'}</td>
                            <td className={`py-[11px] pr-4 text-center text-xs tabular-nums ${profitColor(minProfit)}`}>{minProfit !== null ? formatTurkishPercent(minProfit) : '—'}</td>
                            <td className={`py-[11px] pr-4 text-center text-xs tabular-nums ${profitColor(maxProfit)}`}>{maxProfit !== null ? formatTurkishPercent(maxProfit) : '—'}</td>
                            <td className="py-[11px] text-center">
                              {negativeProfitCount > 0 ? <Badge variant="destructive" className="text-xs">{negativeProfitCount}</Badge> : <CheckCircle2 className="h-4 w-4 text-muted-foreground/50 mx-auto" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
      ),
    },
    {
      id: 'tarihe-gore',
      baslik: 'Tarihe Göre Eklenen Ürünler',
      varsayilanSpan: 1,
      icerik: (
      <div className="ph-card">
                  <h2 className="text-[15px] font-semibold tracking-[-0.2px] mb-4">Tarihe Göre Eklenen Ürünler</h2>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end w-full">
                    <div className="flex-1 min-w-0">
                      <Label className="text-[11.5px] text-muted-foreground mb-[5px] block">Tarih Aralığı</Label>
                      <Popover onOpenChange={(acik) => { if (acik) setTakvimAnahtari((k) => k + 1); }}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            {tarihAraligi.from ? (
                              tarihAraligi.to
                                ? <>{format(tarihAraligi.from, 'd MMM yyyy', { locale: tr })} - {format(tarihAraligi.to, 'd MMM yyyy', { locale: tr })}</>
                                : format(tarihAraligi.from, 'd MMM yyyy', { locale: tr })
                            ) : (
                              <span className="text-muted-foreground">Tarih seçin</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            key={takvimAnahtari}
                            mode="range"
                            selected={tarihAraligi}
                            onSelect={(aralik) => setTarihAraligi(aralik || { from: undefined, to: undefined })}
                            defaultMonth={tarihAraligi.from || new Date()}
                            numberOfMonths={2}
                            locale={tr}
                            classNames={{ day_today: 'bg-primary font-bold text-primary-foreground' }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button onClick={handleShowProducts} disabled={!tarihAraligi.from || !tarihAraligi.to} className="w-full sm:w-auto shrink-0">Listele</Button>
                  </div>
                  {showProductsList && (
                    <div className="mt-4">
                      <p className="text-[13.5px] font-semibold mb-3">{newProductsList.length} ürün bulundu</p>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {newProductsList.length > 0 ? newProductsList.map(product => (
                          <div key={product.id} className="flex items-center justify-between px-[13px] py-2.5 bg-secondary rounded-xl hover:bg-accent transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[13.5px] truncate">{product.name}</p>
                              {product.sku && <p className="text-xs text-muted-foreground font-mono-numeric truncate">{product.sku}</p>}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 ml-3 whitespace-nowrap tabular-nums">{new Date(product.created_date).toLocaleDateString('tr-TR')}</span>
                          </div>
                        )) : <p className="ph-empty">Bu tarihte eklenen ürün yok</p>}
                      </div>
                    </div>
                  )}
                </div>
      ),
    },
    {
      id: 'listelenmeyen',
      baslik: 'Platformda Listelenmeyen Ürünler',
      varsayilanSpan: 1,
      icerik: (
      <div className="ph-card">
                  <h2 className="text-[15px] font-semibold tracking-[-0.2px] mb-4">Platformda Listelenmeyen Ürünler</h2>
                  <div className="space-y-3">
                    {unlistedByPlatform.map(({ platformType, name, listedCount, unlistedCount, unlistedProducts }) => (
                      <div key={platformType} className={`rounded-xl border overflow-hidden ${platformColors[platformType]}`}>
                        <button onClick={() => setExpandedPlatform(expandedPlatform === platformType ? null : platformType)} className="w-full flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`font-semibold text-sm ${platformTextColors[platformType]}`}>{name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${platformBadgeColors[platformType]}`}>{listedCount} listelendi</span>
                            {unlistedCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">{unlistedCount} listelenmemiş</span>}
                            {unlistedCount === 0 && <CheckCircle2 className="h-4 w-4 text-muted-foreground/60" />}
                          </div>
                          {unlistedCount > 0 && (expandedPlatform === platformType ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />)}
                        </button>
                        {expandedPlatform === platformType && unlistedCount > 0 && (
                          <div className="px-4 pb-3 border-t border-white/50">
                            <div className="space-y-1.5 max-h-56 overflow-y-auto mt-2 pr-1">
                              {unlistedProducts.map(p => (
                                <div key={p.id} className="flex items-center justify-between bg-card rounded-[10px] px-3 py-2 text-xs">
                                  <span className="font-medium truncate">{p.name}</span>
                                  {p.sku && <span className="text-muted-foreground font-mono-numeric ml-2 shrink-0">{p.sku}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
      ),
    },
  ];

  return (
    <div className="ph-page mx-auto">
      <WidgetIzgarasi
        pageKey="dashboard"
        tanimlar={widgetTanimlari}
        baslik={(
          <div>
            <h1 className="ph-title">Dashboard</h1>
            <p className="ph-subtitle">Ürün, platform ve kâr özeti</p>
          </div>
        )}
      />
    </div>
  );
}

// Prototipteki istatistik kutusu: ikon yok, üstte soluk etiket, altta iri sayı.
// `icon` (kullanılmıyor) ve `color` parametreleri çağrı yerleri bozulmasın diye korundu;
// `color === 'red'` sayıyı kırmızıya çeker (fiyatlanmamış ürün uyarısı kaybolmasın).
function StatCard({ icon: _icon, label, value, color, onClick }) {
  return (
    <div
      className={`ph-card ${onClick ? 'cursor-pointer transition-colors hover:border-[#d8d8dc] dark:hover:border-muted-foreground/40' : ''}`}
      onClick={onClick}
    >
      <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2.5 text-[28px] sm:text-[38px] font-semibold leading-none tracking-[-0.04em] tabular-nums ${color === 'red' ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}