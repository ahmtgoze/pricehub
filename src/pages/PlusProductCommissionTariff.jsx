import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Check, AlertCircle, Info, Calendar as CalendarIcon, Trash2, Sparkles } from 'lucide-react';
import { calculatePriceBreakdown, findDesiShippingRate } from '@/components/PriceCalculationEngine';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function PlusProductCommissionTariff() {
  const [userEmail, setUserEmail] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [dateRangeValue, setDateRangeValue] = useState({ from: undefined, to: undefined });
  const [uploadedData, setUploadedData] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [originalExcelData, setOriginalExcelData] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ['products', userEmail],
    queryFn: () => db.entities.Product.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: () => db.entities.Platform.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions', userEmail],
    queryFn: () => db.entities.Commission.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: shippingRates = [] } = useQuery({
    queryKey: ['shippingRates', userEmail],
    queryFn: () => db.entities.ShippingRate.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: marketplaceProducts = [] } = useQuery({
    queryKey: ['marketplaceProducts', userEmail],
    queryFn: () => db.entities.MarketplaceProduct.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: savedPlusTariffs = [] } = useQuery({
    queryKey: ['plusProductCommissionTariffs', userEmail],
    queryFn: () => db.entities.PlusProductCommissionTariff.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const uniquePlatforms = platforms.filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
  const trendyolPlatforms = uniquePlatforms
    .filter(p => p.platform_type === 'trendyol' && p.is_active !== false)
    .filter((p, idx, arr) => arr.findIndex(x => x.name === p.name) === idx);
  const hasTrendyol = trendyolPlatforms.length > 0;

  React.useEffect(() => {
    if (trendyolPlatforms.length === 1 && !selectedPlatform) {
      setSelectedPlatform(trendyolPlatforms[0].name);
    }
  }, [trendyolPlatforms.length]);

  React.useEffect(() => {
    if (!selectedPlatform || savedPlusTariffs.length === 0) return;
    if (!dateRangeValue?.from || !dateRangeValue?.to) return;

    const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
    const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');
    const filtered = savedPlusTariffs.filter(
      r => r.platform_account === selectedPlatform && r.start_date === startDate && r.end_date === endDate
    );
    setUploadedData(filtered);
  }, [savedPlusTariffs, selectedPlatform, dateRangeValue?.from, dateRangeValue?.to]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedPlatform) { toast.error('Lütfen platform seçin'); return; }
    if (!dateRangeValue?.from || !dateRangeValue?.to) { toast.error('Lütfen tarih aralığı seçin'); return; }

    const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
    const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setOriginalExcelData({ workbook, sheetName, jsonData });

        const findColumnValue = (obj, keywords) => {
          const lowerKeys = Object.keys(obj).map(k => ({ original: k, lower: k.toLowerCase().trim() }));
          const matchedKey = lowerKeys.find(k => 
            keywords.some(keyword => k.lower.includes(keyword.toLowerCase().trim()))
          );
          return matchedKey ? obj[matchedKey.original] : '';
        };

        let excludedCount = 0;
        const parsed = jsonData.map(row => {
          const productName = findColumnValue(row, ['ürün', 'ismi', 'ürün adı', 'product']) || '';
          const barcode = findColumnValue(row, ['barkod', 'barcode']) || '';
          const category = findColumnValue(row, ['kategori', 'category']) || '';

          let matchedProductId = null;
          const marketplaceMatch = marketplaceProducts.find(mp => 
            (mp.barkod === barcode && barcode) || 
            (mp.platform_product_name?.toLowerCase().includes(productName?.toLowerCase()) && productName)
          );

          if (marketplaceMatch && marketplaceMatch.matched_product_id) {
            matchedProductId = marketplaceMatch.matched_product_id;
          }

          return {
            platform_account: selectedPlatform,
            start_date: startDate,
            end_date: endDate,
            product_name: productName,
            barcode: barcode,
            seller_stock_code: findColumnValue(row, ['satıcı stok', 'sku']) || '',
            size: findColumnValue(row, ['beden', 'size']) || '',
            model_code: findColumnValue(row, ['model kodu', 'model']) || '',
            category: category,
            brand: findColumnValue(row, ['marka', 'brand']) || '',
            stock: parseFloat(findColumnValue(row, ['stok', 'stock'])) || 0,
            current_base_price: parseFloat(findColumnValue(row, ['komisyona esas fiyat'])) || 0,
            current_commission: parseFloat(findColumnValue(row, ['güncel komisyon'])) || 0,
            plus_price_limit: parseFloat(findColumnValue(row, ['plus fiyat üst limiti'])) || 0,
            plus_commission_offer: parseFloat(findColumnValue(row, ['plus komisyon teklifi'])) || 0,
            plus_base_price: 0,
            selected_price: 0,
            calculated_commission: 0,
            cancel_status: 'no',
            matched_product_id: matchedProductId
          };
        }).filter(item => item);

        const oldRecords = savedPlusTariffs.filter(
          r => r.platform_account === selectedPlatform && r.start_date === startDate && r.end_date === endDate
        );

        if (oldRecords.length > 0) {
          for (let i = 0; i < oldRecords.length; i += 30) {
            const batch = oldRecords.slice(i, i + 30);
            await Promise.all(batch.map(r => db.entities.PlusProductCommissionTariff.delete(r.id)));
            if (i + 30 < oldRecords.length) await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        setUploadProgress({ current: 0, total: parsed.length });
        for (let i = 0; i < parsed.length; i += 30) {
          const batch = parsed.slice(i, i + 30);
          await db.entities.PlusProductCommissionTariff.bulkCreate(batch);
          setUploadProgress({ current: Math.min(i + 30, parsed.length), total: parsed.length });
          if (i + 30 < parsed.length) await new Promise(resolve => setTimeout(resolve, 200));
        }

        setUploadedData(parsed);
        setUploadProgress({ current: 0, total: 0 });
        queryClient.invalidateQueries(['plusProductCommissionTariffs']);
        toast.success(`${parsed.length} ürün yüklendi ve kaydedildi`);
      } catch (error) {
        toast.error('Excel yüklemesi başarısız: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Plus Ürün Komisyon Tarifesi</h1>
          <p className="text-slate-500 mt-1">Trendyol Plus kampanyaları için komisyon tarifelerini yönetin</p>
        </div>

        {!hasTrendyol && (
          <div className="mb-6 flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 text-base mb-1">Trendyol Platformu Aktif Değil</h3>
              <p className="text-amber-800 text-sm">Bu sayfa yalnızca Trendyol platformu ile kullanılabilir.</p>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader><CardTitle>Platform ve Tarih Seçimi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform *</Label>
                {trendyolPlatforms.length === 1 ? (
                  <div className="flex items-center h-10 px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium">
                    {trendyolPlatforms[0].name}
                  </div>
                ) : (
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger><SelectValue placeholder="Platform seçin" /></SelectTrigger>
                    <SelectContent>
                      {trendyolPlatforms.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tarih Aralığı *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRangeValue?.from ? (
                        dateRangeValue.to ? (
                          <>{format(dateRangeValue.from, 'd MMM yyyy', { locale: tr })} - {format(dateRangeValue.to, 'd MMM yyyy', { locale: tr })}</>
                        ) : format(dateRangeValue.from, 'd MMM yyyy', { locale: tr })
                      ) : <span>Tarih seçin</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRangeValue}
                      onSelect={(range) => setDateRangeValue(range || { from: undefined, to: undefined })}
                      defaultMonth={new Date()}
                      numberOfMonths={2}
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => document.getElementById('excelUpload').click()} disabled={!selectedPlatform || !dateRangeValue?.from || !dateRangeValue?.to} className="bg-indigo-600 hover:bg-indigo-700">
                <Upload className="mr-2 h-4 w-4" />{uploadedData.length > 0 ? 'Yeni Excel Yükle' : 'Excel Yükle'}
              </Button>
              <input id="excelUpload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              {uploadedData.length > 0 && (
                <>
                  <Button variant="outline" onClick={() => { setUploadedData([]); toast.success('Excel silindi'); }} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                    <Trash2 className="mr-2 h-4 w-4" />Excel'i Sil
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {uploadedData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Plus Ürün Komisyon Tarifesi ({uploadedData.length})</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">Plus komisyon tarifesi verileri yüklendi. Detaylı işlemler için ayrı ara yüz geliştirilecektir.</p>
            </CardContent>
          </Card>
        )}

        {uploadedData.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Upload className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Henüz dosya yüklenmedi</p>
              <p className="text-sm text-slate-400">Platform seçip tarih aralığı belirledikten sonra Excel dosyasını yükleyin</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
