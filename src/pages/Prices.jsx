import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, ChevronDown, ChevronUp, RefreshCw, Info } from 'lucide-react';
import { formatTurkishCurrency, formatTurkishPercent } from '@/utils/formatters';
import SearchInput from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCSV } from '@/components/ImportExport';
import { calculateAllPlatformPrices } from '@/components/PriceCalculationEngine';
import { toast } from 'sonner';
import { useBackgroundTask } from '@/lib/BackgroundTaskContext';
import { useLocation } from 'react-router-dom';
import PriceDetailModal from '@/components/modals/PriceDetailModal';
import ProductHistoryModal from '@/components/modals/ProductHistoryModal';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Prices() {
  const [userEmail, setUserEmail] = React.useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [calculating, setCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState({ current: 0, total: 0 });
  const [calculatingSingle, setCalculatingSingle] = useState(null);
  const [detailModal, setDetailModal] = useState({ open: false, product: null, platform: null });
  const [historyModal, setHistoryModal] = useState({ open: false, productId: null, productName: '' });
  const [failedProducts, setFailedProducts] = useState([]);
  const [successModal, setSuccessModal] = useState({ open: false, successCount: 0, failedCount: 0 });
  const [priceCalculationProgress, setPriceCalculationProgress] = useState({ isCalculating: false, current: 0, total: 0, title: '', currentProductName: '', estimatedSecondsLeft: null, startTime: null });
  const [showProgressModal, setShowProgressModal] = useState(false);
  const { task, startTask, updateTask, finishTask } = useBackgroundTask();
  const location = useLocation();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (task && task.pageRoute === 'Prices') setShowProgressModal(true);
  }, [location.pathname]);

  React.useEffect(() => {
    if (task) {
      setPriceCalculationProgress(prev => ({ ...prev, isCalculating: true, current: task.current, total: task.total, title: task.name }));
    }
  }, [task?.current, task?.total]);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', userEmail],
    queryFn: () => db.entities.Product.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: allPlatforms = [], isLoading: platformsLoading } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: () => db.entities.Platform.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: adminPlatforms = [] } = useQuery({
    queryKey: ['adminPlatforms'],
    queryFn: () => db.entities.Platform.filter({ platform_type: { $in: ['trendyol', 'hepsiburada'] } }),
  });

  const PLATFORM_ORDER = ['trendyol', 'hepsiburada', 'website'];
  const platforms = [...new Map(
    allPlatforms.filter(p => p.is_active)
      .sort((a, b) => PLATFORM_ORDER.indexOf(a.platform_type) - PLATFORM_ORDER.indexOf(b.platform_type))
      .map(p => [p.platform_type, p])
  ).values()];

  const { data: productPrices = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['productPrices', userEmail],
    queryFn: () => db.entities.ProductPrice.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', userEmail],
    queryFn: () => db.entities.Category.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions', userEmail],
    queryFn: () => db.entities.Commission.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: packageItems = [] } = useQuery({
    queryKey: ['packageItems', userEmail],
    queryFn: () => db.entities.PackageItem.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const isLoading = productsLoading || platformsLoading || pricesLoading;

  const enrichedProducts = useMemo(() => {
    return products.map(product => {
      const priceMap = {};
      productPrices.filter(pp => pp.product_id === product.id).forEach(p => { priceMap[p.platform_id] = p; });
      return { ...product, prices: priceMap };
    });
  }, [products, productPrices]);

  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u');
  };

  const filteredProducts = useMemo(() => {
    let result = [...enrichedProducts];
    if (search) {
      const searchWords = search.trim().split(/\s+/).map(w => normalizeText(w)).filter(w => w.length > 0);
      result = result.filter(p => {
        const productText = normalizeText(`${p.name || ''} ${p.sku || ''}`);
        return searchWords.every(w => productText.includes(w));
      });
    }
    if (categoryFilter !== 'all') result = result.filter(p => p.category_id === categoryFilter);
    result.sort((a, b) => {
      let valA, valB;
      if (sortField.startsWith('platform_')) {
        const platformId = sortField.replace('platform_', '');
        valA = a.prices[platformId]?.sale_price || 0;
        valB = b.prices[platformId]?.sale_price || 0;
      } else {
        valA = a[sortField]; valB = b[sortField];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [enrichedProducts, search, categoryFilter, sortField, sortDir]);

  const handleCalculatePrices = async () => {
    setCalculating(true);
    setCalculationProgress({ current: 0, total: 0 });
    setFailedProducts([]);
    setShowProgressModal(true);

    try {
      const [freshShippingRates, freshUserPlatforms, freshProductPrices, freshPackages, freshPackageItems, freshProducts, freshCommissions, freshSettings, freshAdminPlatforms] = await Promise.all([
        db.entities.ShippingRate.list('-id', 10000),
        db.entities.Platform.filter({ created_by: userEmail }),
        db.entities.ProductPrice.filter({ created_by: userEmail }),
        db.entities.Package.filter({ created_by: userEmail }),
        db.entities.PackageItem.filter({ created_by: userEmail }),
        db.entities.Product.filter({ created_by: userEmail }),
        db.entities.Commission.filter({ created_by: userEmail }),
        db.entities.Settings.filter({ created_by: userEmail }),
        db.entities.Platform.filter({ platform_type: { $in: ['trendyol', 'hepsiburada'] } }),
      ]);

      const getFreshPackageCost = (packageId) => {
        if (!packageId) return 0;
        return freshPackageItems.filter(item => item.package_id === packageId && item.is_active !== false).reduce((sum, item) => sum + (item.cost || 0), 0);
      };

      const freshActivePlatforms = freshUserPlatforms.filter(p => p.is_active !== false);
      const total = freshProducts.length;
      startTask('calc-all-prices', 'Fiyatlar Hesaplanıyor', 'Fiyatlar', 'Prices', total);
      const startTime = Date.now();
      setPriceCalculationProgress({ isCalculating: true, current: 0, total, title: 'Fiyatlar Hesaplanıyor', currentProductName: '', estimatedSecondsLeft: null, startTime });
      setCalculationProgress({ current: 0, total });

      let successCount = 0;
      const failedProductsList = [];
      const allToCreate = [];
      const allToUpdate = [];

      // 1. Tüm hesaplamaları yap (DB işlemi yok)
      for (let i = 0; i < freshProducts.length; i++) {
        const product = freshProducts[i];
        try {
          const calculatedPrices = calculateAllPlatformPrices({
            product,
            platforms: freshActivePlatforms,
            shippingRates: freshShippingRates,
            commissions: freshCommissions,
            packages: freshPackages,
            packageItems: freshPackageItems,
            getPackageCost: getFreshPackageCost,
            settings: freshSettings,
            systemAdminPlatforms: freshAdminPlatforms
          });

          if (calculatedPrices.length === 0) {
            failedProductsList.push({ id: product.id, name: product.name });
          } else {
            for (const calcPrice of calculatedPrices) {
              const existing = freshProductPrices.filter(pp => pp.product_id === product.id && pp.platform_id === calcPrice.platform_id);
              if (existing.length > 0) {
                allToUpdate.push({ id: existing[0].id, data: calcPrice });
              } else {
                allToCreate.push(calcPrice);
              }
            }
            successCount++;
          }
        } catch (err) {
          failedProductsList.push({ id: product.id, name: product.name });
        }

        const done = i + 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const avgPerItem = elapsed / done;
        const remaining = Math.round(avgPerItem * (total - done));
        setPriceCalculationProgress({ isCalculating: true, current: done, total, title: 'Fiyatlar Hesaplanıyor', currentProductName: product.name, estimatedSecondsLeft: done > 2 ? remaining : null, startTime });
        setCalculationProgress({ current: done, total });
        updateTask(done, total);
        await new Promise(r => setTimeout(r, 0));
      }

      // 2. Toplu oluştur (100'lük gruplar)
      const BATCH = 100;
      for (let i = 0; i < allToCreate.length; i += BATCH) {
        await db.entities.ProductPrice.bulkCreate(allToCreate.slice(i, i + BATCH));
      }

      // 3. Paralel güncelle
      await Promise.all(allToUpdate.map(({ id, data }) => db.entities.ProductPrice.update(id, data)));

      await queryClient.invalidateQueries({ queryKey: ['productPrices', userEmail] });
      setFailedProducts(failedProductsList);
      setSuccessModal({ open: true, successCount, failedCount: failedProductsList.length });

    } catch (error) {
      toast.error('Fiyat hesaplama hatası: ' + error.message);
    } finally {
      setCalculating(false);
      setCalculationProgress({ current: 0, total: 0 });
      setPriceCalculationProgress({ isCalculating: false, current: 0, total: 0, title: '', estimatedSecondsLeft: null, startTime: null });
      setShowProgressModal(false);
      finishTask();
    }
  };

  const handleCalculateSingleProduct = async (originalProduct) => {
    setCalculatingSingle(originalProduct.id);
    try {
      const [freshProducts, freshPrices, freshShippingRates, freshUserPlatforms, freshCommissions, freshPackages, freshPackageItems, freshSettings, freshAdminPlatforms] = await Promise.all([
        db.entities.Product.filter({ created_by: userEmail }),
        db.entities.ProductPrice.filter({ created_by: userEmail }),
        db.entities.ShippingRate.list('-id', 10000),
        db.entities.Platform.filter({ created_by: userEmail }),
        db.entities.Commission.filter({ created_by: userEmail }),
        db.entities.Package.filter({ created_by: userEmail }),
        db.entities.PackageItem.filter({ created_by: userEmail }),
        db.entities.Settings.filter({ created_by: userEmail }),
        db.entities.Platform.filter({ platform_type: { $in: ['trendyol', 'hepsiburada'] } }),
      ]);

      const activePlatforms = freshUserPlatforms.filter(p => p.is_active !== false);
      const product = freshProducts.find(p => p.id === originalProduct.id) || originalProduct;
      const getFreshPackageCost = (packageId) => {
        if (!packageId) return 0;
        return freshPackageItems.filter(item => item.package_id === packageId && item.is_active !== false).reduce((sum, item) => sum + (item.cost || 0), 0);
      };

      const calculatedPrices = calculateAllPlatformPrices({
        product, platforms: activePlatforms, shippingRates: freshShippingRates,
        commissions: freshCommissions, packages: freshPackages, packageItems: freshPackageItems,
        getPackageCost: getFreshPackageCost, settings: freshSettings, systemAdminPlatforms: freshAdminPlatforms
      });

      if (calculatedPrices.length === 0) {
        toast.error('Bu ürün için fiyat hesaplanamadı - komisyon veya kargo tarifesi eksik olabilir');
        return;
      }

      await Promise.all(calculatedPrices.map(async (calcPrice) => {
        const existing = freshPrices.filter(pp => pp.product_id === product.id && pp.platform_id === calcPrice.platform_id);
        if (existing.length > 0) {
          await db.entities.ProductPrice.update(existing[0].id, calcPrice);
        } else {
          await db.entities.ProductPrice.create(calcPrice);
        }
      }));

      await queryClient.invalidateQueries({ queryKey: ['productPrices', userEmail] });
      toast.success(`${product.name} için fiyatlar güncellendi`);
    } catch (error) {
      toast.error('Fiyat hesaplama hatası: ' + error.message);
    } finally {
      setCalculatingSingle(null);
    }
  };

  const handleResetPrices = async () => {
    if (!confirm('Tüm fiyat kayıtları silinecek. Emin misiniz?')) return;
    setCalculating(true);
    try {
      const BATCH_SIZE = 50;
      for (let i = 0; i < productPrices.length; i += BATCH_SIZE) {
        const batch = productPrices.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(p => db.entities.ProductPrice.delete(p.id)));
      }
      await queryClient.invalidateQueries({ queryKey: ['productPrices', userEmail] });
      toast.success('Tüm fiyatlar sıfırlandı.');
    } catch (error) {
      toast.error('Fiyat sıfırlama hatası: ' + error.message);
    } finally {
      setCalculating(false);
    }
  };

  const handleRecalculateFailed = async () => {
    if (failedProducts.length === 0) { toast.info('Hesaplanamayan ürün yok.'); return; }
    setCalculating(true);
    const total = failedProducts.length;
    setCalculationProgress({ current: 0, total });
    setShowProgressModal(true);
    startTask('calc-failed-prices', 'Başarısız Ürünler Hesaplanıyor', 'Fiyatlar', 'Prices', total);
    const startTime = Date.now();
    setPriceCalculationProgress({ isCalculating: true, current: 0, total, title: 'Başarısız Ürünler Hesaplanıyor', currentProductName: '', estimatedSecondsLeft: null, startTime });

    try {
      const [freshShippingRates, freshUserPlatforms, freshProductPrices, freshPackages, freshPackageItems, freshProducts, freshCommissions, freshSettings, freshAdminPlatforms] = await Promise.all([
        db.entities.ShippingRate.list('-id', 10000),
        db.entities.Platform.filter({ created_by: userEmail }),
        db.entities.ProductPrice.filter({ created_by: userEmail }),
        db.entities.Package.filter({ created_by: userEmail }),
        db.entities.PackageItem.filter({ created_by: userEmail }),
        db.entities.Product.filter({ created_by: userEmail }),
        db.entities.Commission.filter({ created_by: userEmail }),
        db.entities.Settings.filter({ created_by: userEmail }),
        db.entities.Platform.filter({ platform_type: { $in: ['trendyol', 'hepsiburada'] } }),
      ]);

      const freshActivePlatforms = freshUserPlatforms.filter(p => p.is_active !== false);
      const getFreshPackageCost = (packageId) => {
        if (!packageId) return 0;
        return freshPackageItems.filter(item => item.package_id === packageId && item.is_active !== false).reduce((sum, item) => sum + (item.cost || 0), 0);
      };

      const allToCreate = [];
      const allToUpdate = [];
      let successCount = 0;
      const stillFailedProducts = [];

      for (let i = 0; i < failedProducts.length; i++) {
        const failedProduct = failedProducts[i];
        const product = freshProducts.find(p => p.id === failedProduct.id);
        if (!product) continue;

        try {
          const calculatedPrices = calculateAllPlatformPrices({
            product, platforms: freshActivePlatforms, shippingRates: freshShippingRates,
            commissions: freshCommissions, packages: freshPackages, packageItems: freshPackageItems,
            getPackageCost: getFreshPackageCost, settings: freshSettings, systemAdminPlatforms: freshAdminPlatforms
          });

          if (calculatedPrices.length === 0) { stillFailedProducts.push(failedProduct); continue; }

          for (const calcPrice of calculatedPrices) {
            const existing = freshProductPrices.filter(pp => pp.product_id === product.id && pp.platform_id === calcPrice.platform_id);
            if (existing.length > 0) allToUpdate.push({ id: existing[0].id, data: calcPrice });
            else allToCreate.push(calcPrice);
          }
          successCount++;
        } catch (err) {
          stillFailedProducts.push(failedProduct);
        }

        const done = i + 1;
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.round((elapsed / done) * (total - done));
        setCalculationProgress({ current: done, total });
        updateTask(done, total);
        await new Promise(r => setTimeout(r, 0));
        setPriceCalculationProgress({ isCalculating: true, current: done, total, title: 'Başarısız Ürünler Hesaplanıyor', currentProductName: product.name, estimatedSecondsLeft: done > 2 ? remaining : null, startTime });
      }

      const BATCH = 100;
      for (let i = 0; i < allToCreate.length; i += BATCH) {
        await db.entities.ProductPrice.bulkCreate(allToCreate.slice(i, i + BATCH));
      }
      await Promise.all(allToUpdate.map(({ id, data }) => db.entities.ProductPrice.update(id, data)));
      await queryClient.invalidateQueries({ queryKey: ['productPrices', userEmail] });

      setFailedProducts(stillFailedProducts);
      if (stillFailedProducts.length > 0) toast.warning(`${successCount} ürün hesaplandı, ${stillFailedProducts.length} hala hesaplanamadı.`);
      else toast.success(`Tüm başarısız ürünler hesaplandı (${successCount} ürün)`);
    } catch (error) {
      toast.error('Hesaplama hatası: ' + error.message);
    } finally {
      setCalculating(false);
      setCalculationProgress({ current: 0, total: 0 });
      setPriceCalculationProgress({ isCalculating: false, current: 0, total: 0, title: '', estimatedSecondsLeft: null, startTime: null });
      setShowProgressModal(false);
      finishTask();
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-4 w-4 inline ml-1" /> : <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const handleExport = () => {
    const exportData = filteredProducts.flatMap(product =>
      platforms.map(platform => {
        const price = product.prices[platform.id];
        return { sku: product.sku, name: product.name, category: product.category_name, cost: product.cost, printing_cost: product.printing_cost || 0, packaging_cost: price?.packaging_cost || 0, desi: product.desi, platform: platform.name, sale_price: price?.sale_price || 0, profit_rate: price?.profit_rate || 0, net_profit: price?.net_profit || 0 };
      })
    );
    const columns = [
      { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Ürün Adı' }, { key: 'category', label: 'Kategori' },
      { key: 'cost', label: 'Maliyet' }, { key: 'printing_cost', label: 'Baskı Maliyeti' }, { key: 'packaging_cost', label: 'Paketleme Maliyeti' },
      { key: 'desi', label: 'Desi' }, { key: 'platform', label: 'Platform' }, { key: 'sale_price', label: 'Satış Fiyatı' },
      { key: 'profit_rate', label: 'Kâr Oranı (%)' }, { key: 'net_profit', label: 'Net Kâr' }
    ];
    downloadCSV(exportData, columns, 'fiyatlar_rapor');
  };

  const getProfitColor = (rate) => {
    if (rate >= 30) return 'text-emerald-600 bg-emerald-50';
    if (rate >= 20) return 'text-blue-600 bg-blue-50';
    if (rate >= 10) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  const getBaremBadge = (barem) => {
    if (barem === 'barem1') return <Badge className="bg-red-100 text-red-700 text-xs">B1</Badge>;
    if (barem === 'barem2') return <Badge className="bg-blue-100 text-blue-700 text-xs">B2</Badge>;
    if (barem === 'desi') return <Badge variant="outline" className="text-xs">Desi</Badge>;
    return null;
  };

  const handleShowDetail = (product, platform) => {
    const adminPlatform = adminPlatforms.find(p => p.platform_type === platform.platform_type);
    const mergedPlatform = adminPlatform ? { ...platform, has_service_fee: adminPlatform.has_service_fee, service_fee_type: adminPlatform.service_fee_type, service_fee_amount: adminPlatform.service_fee_amount, service_fee_vat_rate: adminPlatform.service_fee_vat_rate, has_same_day_delivery: adminPlatform.has_same_day_delivery, same_day_delivery_service_fee: adminPlatform.same_day_delivery_service_fee, has_withholding: adminPlatform.has_withholding, withholding_rate: adminPlatform.withholding_rate } : platform;
    setDetailModal({ open: true, product, platform: mergedPlatform });
  };

  const getDesiValue = (product, idx) => {
    if (!product.multi_package) return idx === 0 ? (product.desi || '-') : '-';
    try {
      const pkgs = typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages;
      return pkgs[idx]?.desi || '-';
    } catch { return idx === 0 ? (product.desi || '-') : '-'; }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Fiyatlar</h1>
          <p className="text-gray-500 mt-1 text-sm">Tüm ürünlerin platform bazlı fiyat ve kâr tablosu</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 card-shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleCalculatePrices} disabled={calculating || products.length === 0} size="sm">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Fiyatları Hesapla</span>
                <span className="sm:hidden ml-1">Hesapla</span>
              </Button>
              <Button onClick={handleRecalculateFailed} variant="outline" disabled={calculating || failedProducts.length === 0} className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50" size="sm">
                <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Hesaplanamayan Ürünleri Hesapla</span>
                <span className="sm:hidden">Hesaplanamayan</span>
              </Button>
              <Button onClick={handleResetPrices} variant="destructive" disabled={calculating} size="sm">
                <span className="hidden sm:inline">Tüm Fiyatları Sıfırla</span>
                <span className="sm:hidden">Sıfırla</span>
              </Button>
              <Button onClick={handleExport} variant="outline" className="gap-2" size="sm">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Excel / CSV</span>
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Ürün adı veya SKU ara..." className="w-full sm:w-72" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                <Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-full" />
              </div>
            ))
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">Ürün bulunamadı</div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{product.sku} · {product.category_name}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={() => handleCalculateSingleProduct(product)} disabled={calculating || calculatingSingle === product.id}>
                    <RefreshCw className={`h-3.5 w-3.5 ${calculatingSingle === product.id ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {platforms.map(platform => {
                    const price = product.prices[platform.id];
                    const commission = commissions.find(c => c.category_id === product.category_id && c.platform_id === platform.id && c.is_active !== false);
                    const targetRate = commission?.target_profit_rate ?? price?.profit_rate;
                    if (!price) return <div key={platform.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"><span className="text-xs font-medium text-gray-600">{platform.name}</span><span className="text-xs text-gray-400">—</span></div>;
                    return (
                      <div key={platform.id} className="flex flex-col gap-1 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{platform.name}</span>
                          <button onClick={() => handleShowDetail(product, platform)} className="text-blue-500 hover:text-blue-700"><Info className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">₺{formatTurkishCurrency(price.sale_price)}</span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${getProfitColor(targetRate)}`}>{formatTurkishPercent(targetRate)}</span>
                          {getBaremBadge(price.barem_used)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold cursor-pointer hover:text-gray-900" onClick={() => handleSort('sku')}>SKU <SortIcon field="sku" /></TableHead>
                  <TableHead className="font-semibold cursor-pointer hover:text-gray-900" onClick={() => handleSort('name')}>Ürün Adı <SortIcon field="name" /></TableHead>
                  <TableHead className="font-semibold cursor-pointer hover:text-gray-900 text-right" onClick={() => handleSort('cost')}>Maliyet <SortIcon field="cost" /></TableHead>
                  <TableHead className="font-semibold">Baskı</TableHead>
                  <TableHead className="font-semibold">Ek Maliyet</TableHead>
                  <TableHead className="font-semibold">Desi 1</TableHead>
                  <TableHead className="font-semibold">Desi 2</TableHead>
                  <TableHead className="font-semibold">Desi 3</TableHead>
                  <TableHead className="font-semibold">Desi 4</TableHead>
                  <TableHead className="font-semibold">Desi 5</TableHead>
                  {platforms.map(p => (
                    <TableHead key={p.id} className="font-semibold text-center min-w-[160px] cursor-pointer hover:text-gray-900" onClick={() => handleSort(`platform_${p.id}`)}>{p.name} <SortIcon field={`platform_${p.id}`} /></TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>{[...Array(10 + platforms.length)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>)}</TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={10 + platforms.length} className="h-32 text-center text-slate-500">Ürün bulunamadı</TableCell></TableRow>
                ) : (
                  filteredProducts.map(product => (
                    <TableRow key={product.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <span>{product.sku || '-'}</span>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handleCalculateSingleProduct(product)} disabled={calculating || calculatingSingle === product.id}>
                            <RefreshCw className={`h-3 w-3 ${calculatingSingle === product.id ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" onClick={() => setHistoryModal({ open: true, productId: product.id, productName: product.name })} title="Geçmiş Analizi">📈</Button>
                        </div>
                      </TableCell>
                      <TableCell><div><p className="font-medium text-slate-900">{product.name}</p><p className="text-xs text-slate-500">{product.category_name}</p></div></TableCell>
                      <TableCell className="font-semibold">₺{formatTurkishCurrency(product.cost)}</TableCell>
                      <TableCell className="text-sm">{product.printing_cost > 0 ? <span className="text-purple-600 font-medium">₺{formatTurkishCurrency(product.printing_cost)}</span> : '-'}</TableCell>
                      <TableCell className="text-sm">{product.extra_cost > 0 ? <span className="text-rose-600 font-medium">₺{formatTurkishCurrency(product.extra_cost)}</span> : '-'}</TableCell>
                      {[0, 1, 2, 3, 4].map(idx => <TableCell key={idx}>{getDesiValue(product, idx)}</TableCell>)}
                      {platforms.map(platform => {
                        const price = product.prices[platform.id];
                        if (!price) return <TableCell key={platform.id} className="text-center text-slate-400">-</TableCell>;
                        const commission = commissions.find(c => c.category_id === product.category_id && c.platform_id === platform.id && c.is_active !== false);
                        const targetRate = commission?.target_profit_rate ?? price.profit_rate;
                        return (
                          <TableCell key={platform.id} className="text-center">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900">₺{formatTurkishCurrency(price.sale_price)}</p>
                              <div className="flex items-center justify-center gap-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getProfitColor(targetRate)}`}>{formatTurkishPercent(targetRate)}</span>
                                {getBaremBadge(price.barem_used)}
                              </div>
                              <p className="text-xs text-slate-500">Kâr: ₺{formatTurkishCurrency(price.net_profit)}</p>
                              {price.packaging_cost > 0 && <p className="text-xs text-amber-600 font-medium">📦 Paket: ₺{formatTurkishCurrency(price.packaging_cost)}</p>}
                              <Button variant="ghost" size="sm" className="h-7 text-xs mt-1" onClick={() => handleShowDetail(product, platform)}>
                                <Info className="h-3 w-3 mr-1" />Detay
                              </Button>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <PriceDetailModal open={detailModal.open} onClose={() => setDetailModal({ open: false, product: null, platform: null })} product={detailModal.product} platform={detailModal.platform} productPrices={productPrices} commissions={commissions} />
        <ProductHistoryModal open={historyModal.open} onClose={() => setHistoryModal({ open: false, productId: null, productName: '' })} productId={historyModal.productId} productName={historyModal.productName} />

        <AlertDialog open={successModal.open} onOpenChange={(open) => !open && setSuccessModal({ ...successModal, open: false })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{successModal.failedCount === 0 ? '✅ Başarılı' : '⚠️ Kısmi Başarı'}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>{successModal.successCount} ürün için fiyatlar başarıyla hesaplandı.</p>
                {successModal.failedCount > 0 && <p className="text-amber-600 font-medium">{successModal.failedCount} ürün hesaplanamadı.</p>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogAction onClick={() => setSuccessModal({ ...successModal, open: false })}>Tamam</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showProgressModal && priceCalculationProgress.isCalculating} onOpenChange={(open) => { if (!open) setShowProgressModal(false); }}>
          <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle>{priceCalculationProgress.title}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">İlerleme</span>
                <span className="text-sm font-bold text-indigo-600">{priceCalculationProgress.current} / {priceCalculationProgress.total}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-indigo-600 h-4 rounded-full transition-all duration-300" style={{ width: `${(priceCalculationProgress.current / (priceCalculationProgress.total || 1)) * 100}%` }} />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">%{Math.round((priceCalculationProgress.current / (priceCalculationProgress.total || 1)) * 100)}</p>
              </div>
              {priceCalculationProgress.estimatedSecondsLeft !== null && priceCalculationProgress.estimatedSecondsLeft > 0 && (
                <div className="bg-indigo-50 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-indigo-500">Tahmini kalan süre</p>
                  <p className="text-lg font-bold text-indigo-700">
                    {priceCalculationProgress.estimatedSecondsLeft >= 60
                      ? `${Math.floor(priceCalculationProgress.estimatedSecondsLeft / 60)} dk ${priceCalculationProgress.estimatedSecondsLeft % 60} sn`
                      : `${priceCalculationProgress.estimatedSecondsLeft} saniye`}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}