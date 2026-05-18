import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const changeTypeLabels = {
  cost_update: { label: 'Maliyet', color: 'bg-blue-100 text-blue-700' },
  shipping_update: { label: 'Kargo', color: 'bg-purple-100 text-purple-700' },
  commission_update: { label: 'Komisyon', color: 'bg-amber-100 text-amber-700' },
  platform_update: { label: 'Platform', color: 'bg-indigo-100 text-indigo-700' },
  manual: { label: 'Manuel', color: 'bg-slate-100 text-slate-700' },
};

const PLATFORM_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ProductHistoryModal({ open, onClose, productId, productName }) {
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['productHistory', productId],
    queryFn: () => db.entities.UpdateReport.filter({ product_id: productId }, '-created_date'),
    enabled: open && !!productId,
  });

  const platforms = useMemo(() => {
    const map = {};
    reports.forEach(r => { if (r.platform_id && r.platform_name) map[r.platform_id] = r.platform_name; });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [reports]);

  const filtered = useMemo(() => {
    if (selectedPlatform === 'all') return reports;
    return reports.filter(r => r.platform_id === selectedPlatform);
  }, [reports, selectedPlatform]);

  // Grafik için veri: tarihe göre sıralı, her platform ayrı çizgi
  const chartData = useMemo(() => {
    const byDate = {};
    const sortedAsc = [...reports].reverse(); // en eskiden yeniye
    sortedAsc.forEach(r => {
      const dateKey = format(new Date(r.created_date), 'dd MMM yy', { locale: tr });
      if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey };
      byDate[dateKey][`${r.platform_id}_price`] = r.new_sale_price;
      byDate[dateKey][`${r.platform_id}_profit`] = r.new_profit_rate;
    });
    return Object.values(byDate);
  }, [reports]);

  const summary = useMemo(() => {
    if (filtered.length === 0) return null;
    const prices = filtered.map(r => r.new_sale_price).filter(Boolean);
    const profits = filtered.map(r => r.new_profit_rate).filter(Boolean);
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      minProfit: Math.min(...profits),
      maxProfit: Math.max(...profits),
      avgProfit: profits.reduce((a, b) => a + b, 0) / profits.length,
      total: filtered.length,
    };
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Geçmiş Analizi — {productName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Bu ürün için geçmiş kayıt bulunamadı</p>
            <p className="text-sm mt-1">Fiyat güncellemeleri yapıldıkça burada görünecek</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Platform filtresi */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Platform:</span>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Platformlar</SelectItem>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Özet kartlar */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SummaryCard label="Toplam Kayıt" value={summary.total} unit="" />
                <SummaryCard label="Ort. Fiyat" value={summary.avgPrice.toFixed(2)} unit="₺" />
                <SummaryCard label="Ort. Kâr" value={summary.avgProfit.toFixed(1)} unit="%" color={summary.avgProfit > 0 ? 'emerald' : 'rose'} />
                <SummaryCard label="Min / Maks Fiyat" value={`₺${summary.minPrice.toFixed(2)} / ₺${summary.maxPrice.toFixed(2)}`} unit="" small />
                <SummaryCard label="Min / Maks Kâr" value={`%${summary.minProfit.toFixed(1)} / %${summary.maxProfit.toFixed(1)}`} unit="" small />
              </div>
            )}

            {/* Fiyat Grafiği */}
            {chartData.length > 1 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Fiyat Değişimi</p>
                <div className="bg-slate-50 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₺${v}`} />
                      <Tooltip formatter={(v, name) => [`₺${Number(v).toFixed(2)}`, name.split('_price')[0]]} />
                      <Legend />
                      {platforms.map((p, i) => (
                        <Line
                          key={p.id}
                          type="monotone"
                          dataKey={`${p.id}_price`}
                          name={p.name}
                          stroke={PLATFORM_COLORS[i % PLATFORM_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Kâr Grafiği */}
            {chartData.length > 1 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Kâr Oranı Değişimi</p>
                <div className="bg-slate-50 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `%${v}`} />
                      <Tooltip formatter={(v, name) => [`%${Number(v).toFixed(1)}`, name.split('_profit')[0]]} />
                      <Legend />
                      {platforms.map((p, i) => (
                        <Line
                          key={p.id}
                          type="monotone"
                          dataKey={`${p.id}_profit`}
                          name={p.name}
                          stroke={PLATFORM_COLORS[i % PLATFORM_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                          strokeDasharray="5 3"
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Tablo */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Değişiklik Geçmişi ({filtered.length})</p>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-3 text-left font-semibold text-slate-600">Tarih</th>
                      <th className="p-3 text-left font-semibold text-slate-600">Platform</th>
                      <th className="p-3 text-right font-semibold text-slate-600">Eski Fiyat</th>
                      <th className="p-3 text-right font-semibold text-slate-600">Yeni Fiyat</th>
                      <th className="p-3 text-center font-semibold text-slate-600">Değişim</th>
                      <th className="p-3 text-right font-semibold text-slate-600">Eski Kâr</th>
                      <th className="p-3 text-right font-semibold text-slate-600">Yeni Kâr</th>
                      <th className="p-3 text-center font-semibold text-slate-600">Neden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const diff = (r.new_sale_price || 0) - (r.old_sale_price || 0);
                      const profitDiff = (r.new_profit_rate || 0) - (r.old_profit_rate || 0);
                      const ct = changeTypeLabels[r.change_type] || changeTypeLabels.manual;
                      return (
                        <tr key={r.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                          <td className="p-3 text-slate-600 whitespace-nowrap">
                            {r.created_date ? format(new Date(r.created_date), 'dd MMM yyyy HH:mm', { locale: tr }) : '-'}
                          </td>
                          <td className="p-3 font-medium text-slate-800">{r.platform_name}</td>
                          <td className="p-3 text-right font-mono text-slate-500">₺{r.old_sale_price?.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-900">₺{r.new_sale_price?.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            {diff > 0 ? (
                              <span className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-medium">
                                <TrendingUp className="h-3 w-3" />+₺{diff.toFixed(2)}
                              </span>
                            ) : diff < 0 ? (
                              <span className="flex items-center justify-center gap-1 text-rose-600 text-xs font-medium">
                                <TrendingDown className="h-3 w-3" />₺{diff.toFixed(2)}
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-1 text-slate-400 text-xs">
                                <Minus className="h-3 w-3" />—
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right text-slate-500">%{r.old_profit_rate?.toFixed(1)}</td>
                          <td className="p-3 text-right">
                            <span className={`font-semibold ${profitDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              %{r.new_profit_rate?.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={`${ct.color} text-xs`}>{ct.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, unit, color = 'slate', small = false }) {
  const colors = {
    slate: 'bg-slate-50 border-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    rose: 'bg-rose-50 border-rose-100 text-rose-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`font-bold ${small ? 'text-sm' : 'text-xl'}`}>{unit}{value}</p>
    </div>
  );
}
