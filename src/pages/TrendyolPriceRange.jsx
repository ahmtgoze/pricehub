import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Filter, Check, AlertCircle, Info, Calendar as CalendarIcon, Trash2, Sparkles } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import PriceDetailModal from '@/components/modals/PriceDetailModal';

const TrendyolPriceRangeEntity = db.entities.TrendyolPriceRange;
const Product = db.entities.Product;
const Platform = db.entities.Platform;
const Commission = db.entities.Commission;
const ShippingRate = db.entities.ShippingRate;
const MarketplaceProduct = db.entities.MarketplaceProduct;

export default function TrendyolPriceRange() {
  const [userEmail, setUserEmail] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [dateRangeValue, setDateRangeValue] = useState({ from: undefined, to: undefined });
  const [uploadedData, setUploadedData] = useState([]);
  const [originalExcelData, setOriginalExcelData] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBarcode, setFilterBarcode] = useState('');
  const [filterModelCode, setFilterModelCode] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterColumn, setFilterColumn] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [sortBy, setSortBy] = useState('');
  
  const [bulkColumn, setBulkColumn] = useState('');
  const [bulkMinProfitRate, setBulkMinProfitRate] = useState('');
  const [bulkMinProfitAmount, setBulkMinProfitAmount] = useState('');
  
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [calendarKey, setCalendarKey] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, product: null, priceData: null, calculationDetails: null });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: () => Platform.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const uniquePlatforms = platforms.filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
  const trendyolPlatforms = uniquePlatforms
    .filter(p => p.platform_type === 'trendyol' && p.is_active !== false)
    .filter((p, idx, arr) => arr.findIndex(x => x.name === p.name) === idx);
  const hasTrendyol = trendyolPlatforms.length > 0;

  React.useEffect(() => {
    if (trendyolPlatforms.length >= 1 && !selectedPlatform) {
      setSelectedPlatform(trendyolPlatforms[0].name);
    }
  }, [trendyolPlatforms.length]);

  const { data: products = [] } = useQuery({
    queryKey: ['products', userEmail],
    queryFn: () => Product.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions', userEmail],
    queryFn: () => Commission.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: shippingRates = [] } = useQuery({
    queryKey: ['shippingRates'],
    queryFn: () => ShippingRate.list('-id', 10000),
    enabled: !!userEmail
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => db.entities.Package.list(),
    enabled: !!userEmail
  });

  const { data: packageItems = [] } = useQuery({
    queryKey: ['packageItems', userEmail],
    queryFn: () => db.entities.PackageItem.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings', userEmail],
    queryFn: () => db.entities.Settings.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: marketplaceProducts = [] } = useQuery({
    queryKey: ['marketplaceProducts', userEmail],
    queryFn: () => MarketplaceProduct.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: productPrices = [] } = useQuery({
    queryKey: ['productPrices', userEmail],
    queryFn: () => db.entities.ProductPrice.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: savedPriceRanges = [] } = useQuery({
    queryKey: ['trendyolPriceRanges', userEmail],
    queryFn: () => TrendyolPriceRangeEntity.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  // Tarih seçiliyse o tarihe ait kayıtları yükle
  React.useEffect(() => {
    if (!selectedPlatform || savedPriceRanges.length === 0) return;
    if (!dateRangeValue?.from || !dateRangeValue?.to) return;

    const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
    const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');
    const filtered = savedPriceRanges.filter(
      r => r.platform_account === selectedPlatform &&
           r.start_date === startDate &&
           r.end_date === endDate
    );
    setUploadedData(filtered);
    // Excel'i restore et (sayfa değişimi sonrası state sıfırlanmış olabilir)
    const recordWithExcel = filtered.find(r => r.excel_file_url);
    if (recordWithExcel) {
      fetch(recordWithExcel.excel_file_url)
        .then(r => r.arrayBuffer())
        .then(ab => {
          const wb = XLSX.read(new Uint8Array(ab), { type: 'array' });
          const sn = wb.SheetNames[0];
          setOriginalExcelData({ workbook: wb, sheetName: sn, jsonData: XLSX.utils.sheet_to_json(wb.Sheets[sn]) });
        })
        .catch(e => console.error('Excel restore hatası:', e));
    }
  }, [savedPriceRanges, selectedPlatform, dateRangeValue?.from, dateRangeValue?.to]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedPlatform) { toast.error('Lütfen önce platform seçin'); return; }
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

        // Excel'i dosya olarak yükle (URL sakla)
        const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const excelBlob = new Blob([new Uint8Array(excelBuffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const excelFileObj = new File([excelBlob], file.name || 'excel.xlsx', { type: excelBlob.type });
        let excelFileUrl = null;
        try {
          const uploadResult = await db.integrations.Core.UploadFile({ file: excelFileObj });
          excelFileUrl = uploadResult.file_url;
        } catch (uploadErr) {
          console.error('Excel upload hatası:', uploadErr);
        }

        const parsed = jsonData.map(row => {
          const barcode = row['BARKOD'] || '';
          const marketplaceProduct = marketplaceProducts.find(mp => mp.platform_account === selectedPlatform && mp.barkod === barcode);
          let matchedProduct;
          if (marketplaceProduct && marketplaceProduct.matched_product_id) {
            matchedProduct = products.find(p => p.id === marketplaceProduct.matched_product_id);
          }
          if (!matchedProduct) {
            const sellerStockCode = row['SATICI STOK KODU'] || '';
            const productName = row['ÜRÜN İSMİ'] || '';
            matchedProduct = products.find(p => p.sku === sellerStockCode || p.name?.toLowerCase().includes(productName?.toLowerCase()));
          }
          return {
            platform_account: selectedPlatform,
            start_date: startDate,
            end_date: endDate,
            product_name: row['ÜRÜN İSMİ'] || '',
            barcode: barcode,
            seller_stock_code: row['SATICI STOK KODU'] || '',
            size: row['BEDEN'] || '',
            model_code: row['MODEL KODU'] || '',
            category: matchedProduct?.category_name || row['KATEGORİ'] || '',
            brand: row['MARKA'] || '',
            stock: parseFloat(row['STOK']) || 0,
            price_range_1_min: parseFloat(row['1.Fiyat Alt Limit']) || 0,
            price_range_1_max: parseFloat(row['2.Fiyat Üst Limiti']) || 0,
            price_range_2_min: parseFloat(row['2.Fiyat Alt Limit']) || 0,
            price_range_2_max: parseFloat(row['2.Fiyat Üst Limiti']) || 0,
            price_range_3_min: parseFloat(row['3.Fiyat Alt Limit']) || 0,
            price_range_3_max: parseFloat(row['3.Fiyat Üst Limiti']) || 0,
            price_range_4_min: 0,
            price_range_4_max: parseFloat(row['4.Fiyat Üst Limiti']) || 0,
            commission_1: parseFloat(row['1.KOMİSYON']) || 0,
            commission_2: parseFloat(row['2.KOMİSYON']) || 0,
            commission_3: parseFloat(row['3.KOMİSYON']) || 0,
            commission_4: parseFloat(row['4.KOMİSYON']) || 0,
            current_base_price: parseFloat(row['KOMİSYONA ESAS FİYAT']) || 0,
            current_commission: parseFloat(row['GÜNCEL KOMİSYON']) || 0,
            current_tsf: parseFloat(row['GÜNCEL TSF']) || 0,
            has_commission_tariff: row['Ürün Komisyon Tarife Seçeneği'] || row['KOMİSYON TARİFESİ'] || 'Yok',
            selected_range: 'none',
            manual_price: 0,
            matched_product_id: matchedProduct?.id || null
          };
        });

        const oldRecords = savedPriceRanges.filter(
          r => r.platform_account === selectedPlatform && r.start_date === startDate && r.end_date === endDate
        );
        if (oldRecords.length > 0) {
          for (let i = 0; i < oldRecords.length; i += 30) {
            const batch = oldRecords.slice(i, i + 30);
            await Promise.all(batch.map(r => TrendyolPriceRangeEntity.delete(r.id)));
            if (i + 30 < oldRecords.length) await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        setUploadProgress({ current: 0, total: parsed.length });
        for (let i = 0; i < parsed.length; i += 30) {
          const batch = parsed.slice(i, i + 30);
          // Sadece ilk batch'in ilk kaydına Excel URL'ini ekle
          if (i === 0 && batch.length > 0 && excelFileUrl) {
            batch[0].excel_file_url = excelFileUrl;
          }
          await TrendyolPriceRangeEntity.bulkCreate(batch);
          setUploadProgress({ current: Math.min(i + 30, parsed.length), total: parsed.length });
          if (i + 30 < parsed.length) await new Promise(resolve => setTimeout(resolve, 200));
        }

        setUploadedData(parsed);
        queryClient.invalidateQueries(['trendyolPriceRanges']);
        toast.success(`${parsed.length} ürün yüklendi ve kaydedildi`);
      } catch (error) {
        toast.error('Excel dosyası okunamadı: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const getPackageCost = (packageId) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return 0;
    return pkg.total_cost || 0;
  };

  const calculateProfit = (price, commissionRate, product) => {
    try {
      if (!price || price <= 0) return { profit: 0, profitRate: 0, breakdown: null };
      const matchedProduct = getMatchedProduct(product);
      if (!matchedProduct) return { profit: 0, profitRate: 0, breakdown: null };
      const platform = uniquePlatforms.find(p => p.name === selectedPlatform);
      if (!platform) return { profit: 0, profitRate: 0, breakdown: null };

      const platformShippingRates = shippingRates.filter(r =>
        r.is_active !== false && (
          r.platform_id === platform.id ||
          r.platform_type === platform.platform_type
        )
      );

      let packagingCost = 0;
      if (matchedProduct.multi_package && matchedProduct.packages) {
        try {
          const productPackages = typeof matchedProduct.packages === 'string' ? JSON.parse(matchedProduct.packages) : matchedProduct.packages;
          for (const pkg of productPackages) { if (pkg.package_id) packagingCost += getPackageCost(pkg.package_id); }
        } catch (e) { packagingCost = 0; }
      } else if (matchedProduct.package_id || matchedProduct.auto_package_id) {
        packagingCost = getPackageCost(matchedProduct.package_id || matchedProduct.auto_package_id);
      }

      const printingCost = matchedProduct.printing_cost || 0;
      const extraCost = matchedProduct.extra_cost || 0;

      let shippingCost = 0;
      let shippingVatRate = 20;
      let baremUsed = 'desi';
      const canUseBarem = !matchedProduct.special_shipping && !matchedProduct.multi_package;

      // Barem kontrolleri — Prices sayfasıyla aynı
      if (canUseBarem && price > 0) {
        if (price >= 0 && price <= 149.99) {
          const baremRate = platformShippingRates.find(r => r.rate_type === 'barem1');
          if (baremRate) { shippingCost = baremRate.price; shippingVatRate = baremRate.vat_rate || 20; baremUsed = 'barem1'; }
        } else if (price >= 150 && price <= 299.99) {
          const baremRate = platformShippingRates.find(r => r.rate_type === 'barem2');
          if (baremRate) { shippingCost = baremRate.price; shippingVatRate = baremRate.vat_rate || 20; baremUsed = 'barem2'; }
        }
      }

      if (shippingCost === 0) {
        if (matchedProduct.multi_package && matchedProduct.packages) {
          try {
            const productPackages = typeof matchedProduct.packages === 'string' ? JSON.parse(matchedProduct.packages) : matchedProduct.packages;
            if (matchedProduct.special_shipping) {
              const returnCostSetting = settings.find(s => s.setting_key === 'return_cost_per_package');
              const returnCostPerPackage = returnCostSetting ? parseFloat(returnCostSetting.setting_value) : 180.096;
              for (const pkg of productPackages) {
                const desiRate = findDesiShippingRate(platformShippingRates, pkg.desi || 0);
                if (desiRate) { shippingCost += (desiRate.price * 2) + returnCostPerPackage; shippingVatRate = desiRate.vat_rate || 20; }
              }
            } else {
              for (const pkg of productPackages) {
                const desiRate = findDesiShippingRate(platformShippingRates, pkg.desi || 0);
                if (desiRate) { shippingCost += desiRate.price; shippingVatRate = desiRate.vat_rate || 20; }
              }
            }
          } catch (e) {
            const desiRate = findDesiShippingRate(platformShippingRates, matchedProduct.desi || 0);
            shippingCost = desiRate?.price || 0; shippingVatRate = desiRate?.vat_rate || 20;
          }
        } else {
          const desiRate = findDesiShippingRate(platformShippingRates, matchedProduct.desi || 0);
          shippingCost = desiRate?.price || 0;
          shippingVatRate = desiRate?.vat_rate || 20;
        }
        baremUsed = 'desi';
      }

      const breakdown = calculatePriceBreakdown({
        salePriceInclVat: parseFloat(price),
        productCost: parseFloat(matchedProduct.cost) || 0,
        productVatRate: parseFloat(matchedProduct.vat_rate) || 20,
        shippingCost: parseFloat(shippingCost) || 0,
        shippingVatRate: parseFloat(shippingVatRate) || 20,
        commissionRate: parseFloat(commissionRate) || 0,
        commissionVatRate: 20,
        platform,
        baremUsed,
        packagingCost: parseFloat(packagingCost) || 0,
        printingCost: parseFloat(printingCost) || 0,
        extraCost: parseFloat(extraCost) || 0,
        isSameDayDelivery: matchedProduct.same_day_delivery || false
      });

      return { profit: parseFloat(breakdown.netProfit) || 0, profitRate: parseFloat(breakdown.profitRate) || 0, breakdown, matchedProduct, platform, baremUsed };
    } catch (error) {
      try {
        const matchedProduct = getMatchedProduct(product);
        if (matchedProduct && price > 0) {
          const costIncVat = parseFloat(matchedProduct.cost) || 0;
          const commissionAmount = price * (parseFloat(commissionRate) || 0) / 100;
          const estimatedProfit = price - costIncVat - commissionAmount;
          const estimatedProfitRate = price > 0 ? (estimatedProfit / price) * 100 : 0;
          return { profit: estimatedProfit, profitRate: estimatedProfitRate, breakdown: null };
        }
      } catch (e) {}
      return { profit: 0, profitRate: 0, breakdown: null };
    }
  };

  const openDetailModal = (price, commissionRate, item, baremOverride = null) => {
    const calc = calculateProfit(price, commissionRate, item);
    const matchedProduct = calc.matchedProduct || getMatchedProduct(item);
    const platform = calc.platform || uniquePlatforms.find(p => p.name === selectedPlatform);

    setDetailModal({
      open: true,
      product: matchedProduct,
      priceData: {
        sale_price: price,
        net_profit: calc.profit,
        profit_rate: calc.profitRate,
        shipping_cost: calc.breakdown?.shippingCost || 0,
        packaging_cost: calc.breakdown?.packagingCost || 0,
        commission_amount: calc.breakdown?.commissionAmount || 0,
        withholding_amount: calc.breakdown?.withholdingAmount || 0,
        service_fee: calc.breakdown?.serviceFee || 0,
        net_vat: calc.breakdown?.netVat || 0,
        barem_used: baremOverride || calc.baremUsed || 'none'
      },
      calculationDetails: {
        productCost: matchedProduct?.cost || 0,
        productVatRate: matchedProduct?.vat_rate || 20,
        commissionRate: commissionRate,
        packagingCost: calc.breakdown?.packagingCost || 0,
        printingCost: matchedProduct?.printing_cost || 0,
        extraCost: matchedProduct?.extra_cost || 0,
        shippingCost: calc.breakdown?.shippingCost || 0,
      }
    });
  };

  const handlePriceSelect = (index, rangeType, price) => {
    const updated = [...uploadedData];
    if (updated[index].selected_range === rangeType) {
      updated[index].selected_range = 'none';
      updated[index].selected_price = 0;
    } else {
      updated[index].selected_range = rangeType;
      updated[index].selected_price = price;
      if (rangeType === 'manual') updated[index].manual_price = price;
    }
    setUploadedData(updated);
  };

  const handleManualPriceChange = (index, value) => {
    const updated = [...uploadedData];
    const manualPrice = parseFloat(value) || 0;
    updated[index].manual_price = manualPrice;

    if (manualPrice > 0) {
      const item = updated[index];
      const systemPrice = getSystemPrice(item);
      // Sistem fiyatından gelen komisyonu kullan
      let commissionToUse = systemPrice?.commission_rate ?? item.commission_1 ?? 0;
      let rangeInfo = '';

      if (manualPrice >= item.price_range_1_min && (manualPrice < item.price_range_2_min || !item.price_range_2_min)) {
        rangeInfo = 'Aralık 1';
      } else if (manualPrice >= item.price_range_2_min && manualPrice <= item.price_range_2_max) {
        rangeInfo = 'Aralık 2';
      } else if (manualPrice >= item.price_range_3_min && manualPrice <= item.price_range_3_max) {
        rangeInfo = 'Aralık 3';
      } else if (manualPrice <= item.price_range_4_max) {
        rangeInfo = 'Aralık 4';
      }

      const { profit, profitRate } = calculateProfit(manualPrice, commissionToUse, item);
      updated[index].manual_profit = profit;
      updated[index].manual_profit_rate = profitRate;
      updated[index].manual_range_info = rangeInfo;
      updated[index].manual_commission = commissionToUse;
    } else {
      updated[index].manual_profit = 0;
      updated[index].manual_profit_rate = 0;
      updated[index].manual_range_info = '';
      updated[index].manual_commission = 0;
    }
    setUploadedData(updated);
  };

  const handleBulkSelect = () => {
    if (!bulkColumn) { toast.error('Lütfen kolon seçin'); return; }
    const minRate = parseFloat(bulkMinProfitRate) || 0;
    const minAmount = parseFloat(bulkMinProfitAmount) || 0;
    const visibleBarcodes = filterCategory ? new Set(filteredData.map(item => item.barcode)) : null;

    const updated = uploadedData.map(item => {
      if (visibleBarcodes && !visibleBarcodes.has(item.barcode)) return item;
      if (item.selected_range !== 'none' && item.selected_range !== bulkColumn) return item;

      const systemPrice = getSystemPrice(item);
      let price = 0, commissionRate = systemPrice?.commission_rate ?? 0;
      if (bulkColumn === 'range_1') { price = item.price_range_1_min; }
      else if (bulkColumn === 'range_2') { price = item.price_range_2_max; }
      else if (bulkColumn === 'range_3') { price = item.price_range_3_max; }
      else if (bulkColumn === 'range_4') { price = item.price_range_4_max; }

      const { profit, profitRate } = calculateProfit(price, commissionRate, item);
      if (profitRate >= minRate && profit >= minAmount) return { ...item, selected_range: bulkColumn, selected_price: price };
      if (item.selected_range === bulkColumn) return { ...item, selected_range: 'none', selected_price: 0 };
      return item;
    });

    setUploadedData(updated);
    toast.success('Toplu seçim yapıldı');
  };

  const handleSmartAutoSelect = () => {
    const platform = uniquePlatforms.find(p => p.name === selectedPlatform);
    if (!platform) { toast.error('Platform bulunamadı'); return; }

    let selectedCount = 0;
    let skippedNoCommission = 0;
    let skippedNoMatch = 0;
    let skippedNoProduct = 0;
    let skippedTargetNotMet = 0;
    let skippedAlreadySelected = 0;

    const trendyolPlatformIds = trendyolPlatforms.map(p => String(p.id));
    const trendyolPlatformNames = trendyolPlatforms.map(p => p.name.toLowerCase().trim());

    const updated = uploadedData.map(item => {
      // Manuel fiyat girilmiş veya herhangi bir seçim yapılmışsa dokunma
      if (item.selected_range !== 'none' || (item.manual_price && item.manual_price > 0)) {
        skippedAlreadySelected++;
        return item;
      }

      const matchedProduct = getMatchedProduct(item);
      if (!matchedProduct) { skippedNoProduct++; return item; }

      const commission = commissions.find(c =>
        c.is_active !== false &&
        (
          trendyolPlatformIds.includes(String(c.platform_id)) ||
          trendyolPlatformNames.includes((c.platform_name || '').toLowerCase().trim())
        ) &&
        (
          (matchedProduct.category_id && String(c.category_id) === String(matchedProduct.category_id)) ||
          (matchedProduct.category_name && (c.category_name || '').toLowerCase().trim() === (matchedProduct.category_name || '').toLowerCase().trim())
        )
      );

      if (!commission) {
        skippedNoMatch++;
        if (skippedNoMatch <= 3) {
          console.log('DEBUG komisyon eşleşmedi:', {
            ürün: item.product_name,
            kategori_id: matchedProduct.category_id,
            kategori_adı: matchedProduct.category_name,
            trendyol_platform_ids: trendyolPlatformIds,
            trendyol_platform_names: trendyolPlatformNames,
            toplam_komisyon: commissions.length,
            trendyol_komisyonları: commissions
              .filter(c =>
                trendyolPlatformIds.includes(String(c.platform_id)) ||
                trendyolPlatformNames.includes((c.platform_name || '').toLowerCase().trim())
              )
              .map(c => ({
                id: c.id,
                platform_id: c.platform_id,
                platform_name: c.platform_name,
                category_id: c.category_id,
                category_name: c.category_name
              }))
          });
        }
        return item;
      }

      const toNum = (v) => (v != null && v !== '') ? Number(v) : null;
      // ÖNEMLİ: 0 (veya boş) değerleri "tanımsız" say. Aksi halde hedef tutar 0 iken
      // "kâr >= 0" şartı her zaman sağlanıp, kâr oranı hedefine (ör. %50) hiç bakılmadan
      // en ucuz barem (Aralık 4) seçiliyordu. 0'ı null'a çevirince sadece geçerli
      // (0'dan büyük) hedefler dikkate alınır.
      const rawRate = toNum(commission.discounted_target_profit_rate);
      const rawAmount = toNum(commission.discounted_target_profit_amount);
      const rawMin = toNum(commission.discounted_minimum_profit_amount);
      const targetRate = (rawRate != null && rawRate > 0) ? rawRate : null;
      const targetAmount = (rawAmount != null && rawAmount > 0) ? rawAmount : null;
      const minAmount = (rawMin != null && rawMin > 0) ? rawMin : null;

      const hasDiscountedTarget = targetRate != null || targetAmount != null;
      if (!hasDiscountedTarget) {
        skippedNoCommission++;
        return item;
      }

      // Sistem fiyatından gelen komisyonu kullan
      const systemPrice = getSystemPrice(item);
      const systemCommissionRate = systemPrice?.commission_rate ?? 0;

      // Aralık 4'ten 1'e doğru dene (en uygun/en ucuz fiyattan başla),
      // hedefi karşılayan İLK aralıkta dur.
      const ranges = [
        { rangeNum: 4, price: item.price_range_4_max, commissionRate: systemCommissionRate },
        { rangeNum: 3, price: item.price_range_3_max, commissionRate: systemCommissionRate },
        { rangeNum: 2, price: item.price_range_2_max, commissionRate: systemCommissionRate },
        { rangeNum: 1, price: item.price_range_1_min, commissionRate: systemCommissionRate },
      ];

      for (const range of ranges) {
        if (!range.price || range.price <= 0) continue;

        const calc = calculateProfit(range.price, range.commissionRate, item);
        const profit = calc.profit || 0;
        const profitRate = calc.profitRate || 0;

        // Minimum kâr tutarı altındaki aralıkları ele
        if (minAmount != null && profit < minAmount) continue;

        // Hedefe ulaşma kontrolü:
        // - Oran hedefi varsa, kâr oranı >= hedef oran OLMALI (alt sınır)
        // - Tutar hedefi varsa, kâr tutarı >= hedef tutar OLMALI
        // Her iki hedef tanımlıysa ikisi birden sağlanmalı (sıkı kontrol).
        let meetsTarget = true;
        if (targetRate != null && profitRate < targetRate) meetsTarget = false;
        if (targetAmount != null && profit < targetAmount) meetsTarget = false;

        if (meetsTarget) {
          selectedCount++;
          return { ...item, selected_range: `range_${range.rangeNum}`, selected_price: range.price };
        }
      }

      // Hiçbir aralık hedefi karşılamadı — seçme, olduğu gibi bırak
      skippedTargetNotMet++;
      return item;
    });

    setUploadedData(updated);

    const parts = [];
    if (selectedCount > 0) parts.push(`✅ ${selectedCount} ürün seçildi`);
    if (skippedAlreadySelected > 0) parts.push(`${skippedAlreadySelected} zaten seçili/manuel`);
    if (skippedNoProduct > 0) parts.push(`⚠️ ${skippedNoProduct} sistem ürünüyle eşleşmedi`);
    if (skippedNoMatch > 0) parts.push(`⚠️ ${skippedNoMatch} komisyon kaydı bulunamadı`);
    if (skippedNoCommission > 0) parts.push(`⚠️ ${skippedNoCommission} indirimli hedef kâr tanımlı değil`);
    if (skippedTargetNotMet > 0) parts.push(`⚠️ ${skippedTargetNotMet} hiçbir aralıkta hedef karşılanmadı`);

    if (skippedNoMatch > 0 && selectedCount === 0) {
      if (commissions.length === 0) {
        parts.push('❌ Komisyon verisi yok — Komisyonlar sayfasında Trendyol komisyonu tanımlayın');
      } else {
        const trendyolCommissions = commissions.filter(c =>
          trendyolPlatformIds.includes(String(c.platform_id)) ||
          trendyolPlatformNames.includes((c.platform_name || '').toLowerCase().trim())
        );
        if (trendyolCommissions.length === 0) {
          parts.push(`❌ Trendyol platformuna ait komisyon bulunamadı`);
        }
      }
    }

    if (selectedCount === 0) toast.warning(parts.join(' • ') || 'Hiçbir ürün seçilemedi');
    else toast.success(parts.join(' • '));
  };

  const handleSave = async () => {
    const selectedItems = uploadedData.filter(item => item.selected_range !== 'none');
    if (selectedItems.length === 0) { toast.error('Lütfen en az bir ürün seçin'); return; }
    try {
      await Promise.all(selectedItems.map(item => {
        if (item.id) return TrendyolPriceRangeEntity.update(item.id, item);
        return TrendyolPriceRangeEntity.create(item);
      }));
      toast.success(`${selectedItems.length} ürün güncellendi`);
      queryClient.invalidateQueries(['trendyolPriceRanges']);
    } catch (error) {
      toast.error('Kayıt hatası: ' + error.message);
    }
  };

  const handleExport = () => {
    if (uploadedData.length === 0) { toast.error('Yüklenmiş Excel dosyası bulunamadı'); return; }
    if (!originalExcelData) { toast.error('Orijinal Excel dosyası bulunamadı'); return; }

    const { workbook, sheetName } = originalExcelData;
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const row = {};
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell) {
          const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
          const header = worksheet[headerAddress]?.v;
          if (header) row[header] = cell.v;
        }
      }
      const barcode = row['BARKOD'];
      const item = uploadedData.find(i => i.barcode === barcode);
      if (item && item.selected_range !== 'none') {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
          const header = worksheet[headerAddress]?.v;
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (header === 'YENİ TSF (FİYAT GÜNCELLE)') worksheet[cellAddress] = { v: item.selected_price || 0, t: 'n' };
          if (header === 'Tarife Sonuna Kadar Uygula') worksheet[cellAddress] = { v: 'Evet', t: 's' };
        }
      }
    }

    // Sadece bilinen sütunları tut, geri kalanını sil (EXTERNAL ID, TARİFE GRUBU ve bilinmeyen sütunlar)
    const allowedHeaders = new Set([
      'ÜRÜN İSMİ', 'BARKOD', 'SATICI STOK KODU', 'BEDEN', 'MODEL KODU', 'KATEGORİ', 'MARKA', 'STOK',
      '1.Fiyat Alt Limit', '2.Fiyat Üst Limiti', '2.Fiyat Alt Limit', '3.Fiyat Üst Limiti',
      '3.Fiyat Alt Limit', '4.Fiyat Üst Limiti',
      '1.KOMİSYON', '2.KOMİSYON', '3.KOMİSYON', '4.KOMİSYON',
      'KOMİSYONA ESAS FİYAT', 'GÜNCEL KOMİSYON', 'GÜNCEL TSF',
      'YENİ TSF (FİYAT GÜNCELLE)', 'Hesaplanan Komisyon', 'Tarife Sonuna Kadar Uygula',
      'EXTERNAL ID', 'TARİFE GRUBU', 'Kar Tutarı', 'Kar/Maliyet (%)'
    ]);

    // Sütunları sağdan sola silerek kaydırma sorununu önle
    for (let C = range.e.c; C >= range.s.c; C--) {
      const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const header = worksheet[headerAddress]?.v;
      if (!allowedHeaders.has(header)) {
        // Bu sütunu sil ve sağındakileri sola kaydır
        for (let R = range.s.r; R <= range.e.r; R++) {
          for (let shiftC = C; shiftC < range.e.c; shiftC++) {
            const from = XLSX.utils.encode_cell({ r: R, c: shiftC + 1 });
            const to = XLSX.utils.encode_cell({ r: R, c: shiftC });
            if (worksheet[from]) worksheet[to] = worksheet[from];
            else delete worksheet[to];
          }
          delete worksheet[XLSX.utils.encode_cell({ r: R, c: range.e.c })];
        }
        range.e.c--;
      }
    }
    worksheet['!ref'] = XLSX.utils.encode_range(range);

    const slugify = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const fromStr = dateRangeValue?.from ? format(dateRangeValue.from, 'd MMMM', { locale: tr }) : '';
    const toStr = dateRangeValue?.to ? format(dateRangeValue.to, 'd MMMM', { locale: tr }) : '';
    const fileName = `urunkomisyontarifesi-${slugify(fromStr)}-${slugify(toStr)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Excel dosyası indirildi');
  };

  const getMatchedProduct = (item) => {
    if (item.matched_product_id) {
      const direct = products.find(p => p.id === item.matched_product_id);
      if (direct) return direct;
    }
    const marketplaceProduct = marketplaceProducts.find(mp =>
      mp.platform_account === selectedPlatform &&
      mp.barkod === item.barcode &&
      mp.matched_product_id
    );
    if (marketplaceProduct) {
      const mp = products.find(p => p.id === marketplaceProduct.matched_product_id);
      if (mp) return mp;
    }
    if (item.seller_stock_code) {
      const bysku = products.find(p => p.sku === item.seller_stock_code);
      if (bysku) return bysku;
    }
    return null;
  };

  const getSystemPrice = (item) => {
    const matchedProduct = getMatchedProduct(item);
    if (!matchedProduct) return null;
    const platform = uniquePlatforms.find(p => p.name === selectedPlatform);
    if (!platform) return null;
    const priceInfo = productPrices.find(pp => pp.product_id === matchedProduct.id && pp.platform_id === platform.id);
    
    const trendyolPlatformIds = trendyolPlatforms.map(p => String(p.id));
    const trendyolPlatformNames = trendyolPlatforms.map(p => p.name.toLowerCase().trim());
    
    // Adım 1: Excel'deki kategori adı (item.category) ile doğrudan komisyon tablosundan ara
    let commissionRate = 0;
    if (item.category) {
      const categoryCommission = commissions.find(c =>
        c.is_active !== false &&
        (
          trendyolPlatformIds.includes(String(c.platform_id)) ||
          trendyolPlatformNames.includes((c.platform_name || '').toLowerCase().trim())
        ) &&
        (c.category_name || '').toLowerCase().trim() === item.category.toLowerCase().trim()
      );
      if (categoryCommission?.commission_rate && categoryCommission.commission_rate > 0) {
        commissionRate = categoryCommission.commission_rate;
      }
    }
    
    // Adım 2: Eşleştirilen ürünün kategorisine göre ara
    if (commissionRate === 0) {
      const commission = commissions.find(c => 
        String(c.platform_id) === String(platform.id) && 
        String(c.category_id) === String(matchedProduct.category_id) &&
        c.is_active !== false
      );
      if (commission?.commission_rate && commission.commission_rate > 0) {
        commissionRate = commission.commission_rate;
      }
    }
    
    // Adım 3: Excel'deki current_commission
    if (commissionRate === 0 && item.current_commission && item.current_commission > 0) {
      commissionRate = item.current_commission;
    }
    
    // Adım 4: Aynı platform için en küçük komisyon
    if (commissionRate === 0) {
      const platformCommissions = commissions.filter(c =>
        c.is_active !== false &&
        c.commission_rate && c.commission_rate > 0 &&
        (
          trendyolPlatformIds.includes(String(c.platform_id)) ||
          trendyolPlatformNames.includes((c.platform_name || '').toLowerCase().trim())
        )
      );
      if (platformCommissions.length > 0) {
        const minCommission = platformCommissions.sort((a, b) => (a.commission_rate || 0) - (b.commission_rate || 0))[0];
        if (minCommission?.commission_rate) commissionRate = minCommission.commission_rate;
      }
    }
    
    // Adım 5: ProductPrice'daki commission_amount'tan hesapla
    if (commissionRate === 0 && priceInfo && priceInfo.commission_amount && priceInfo.sale_price) {
      commissionRate = parseFloat(((priceInfo.commission_amount / priceInfo.sale_price) * 100).toFixed(2));
    }
    
    return priceInfo ? { ...priceInfo, commission_rate: commissionRate } : null;
  };

  const filteredData = uploadedData.filter(item => {
    if (searchTerm && !item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterBarcode && !item.barcode?.includes(filterBarcode)) return false;
    if (filterModelCode && !item.model_code?.includes(filterModelCode)) return false;
    if (filterCategory) {
      const matchedProduct = getMatchedProduct(item);
      if (matchedProduct?.category_name !== filterCategory) return false;
    }
    if (filterBrand && item.brand !== filterBrand) return false;
    if (minStock && item.stock < parseFloat(minStock)) return false;
    if (maxStock && item.stock > parseFloat(maxStock)) return false;
    if (filterColumn) {
      if (filterColumn === 'range_1' && (!item.price_range_1_min || !item.price_range_1_max)) return false;
      if (filterColumn === 'range_2' && (!item.price_range_2_min || !item.price_range_2_max)) return false;
      if (filterColumn === 'range_3' && (!item.price_range_3_min || !item.price_range_3_max)) return false;
      if (filterColumn === 'range_4' && (!item.price_range_4_min || !item.price_range_4_max)) return false;
    }
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortBy) return 0;
    if (sortBy === 'product_name_asc') return (a.product_name || '').localeCompare(b.product_name || '');
    if (sortBy === 'product_name_desc') return (b.product_name || '').localeCompare(a.product_name || '');
    if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
    if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
    if (sortBy === 'system_price_asc') return (getSystemPrice(a)?.sale_price || 0) - (getSystemPrice(b)?.sale_price || 0);
    if (sortBy === 'system_price_desc') return (getSystemPrice(b)?.sale_price || 0) - (getSystemPrice(a)?.sale_price || 0);
    return 0;
  });

  const allCategories = [...new Set(uploadedData.map(item => getMatchedProduct(item)?.category_name).filter(Boolean))].sort();
  const uniqueBrands = [...new Set(uploadedData.map(item => item.brand).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ürün Komisyon Tarifesi</h1>
          <p className="text-slate-500 mt-1">Trendyol fiyat aralıklarını yükleyip kârlılık analizi yapın</p>
        </div>

        {!hasTrendyol && (
          <div className="mb-6 flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-base mb-1">Trendyol Platformu Aktif Değil</h3>
              <p className="text-amber-800 text-sm leading-relaxed">
                Bu sayfa yalnızca <strong>Trendyol</strong> platformuna yönelik komisyon tarife analizleri için tasarlanmıştır.
                Sayfayı kullanabilmek için önce <strong>Platformlar</strong> bölümünden Trendyol platformunu aktive etmeniz gerekmektedir.
              </p>
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
                  <div className="flex items-center h-10 px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium">{trendyolPlatforms[0].name}</div>
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
                <Popover open={calendarOpen} onOpenChange={(open) => {
                  if (open) setDateRangeValue({ from: undefined, to: undefined });
                  setCalendarOpen(open);
                }}>
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
                    onSelect={(range) => {
                      setDateRangeValue(range || { from: undefined, to: undefined });
                      if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) setCalendarOpen(false);
                    }}
                    defaultMonth={new Date()}
                    numberOfMonths={2}
                    locale={tr}
                    classNames={{ day_today: "bg-blue-500 font-bold text-white" }}
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
                  <Button onClick={handleSmartAutoSelect} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                    <Sparkles className="h-4 w-4" />
                    Akıllı Otomatik Seç
                  </Button>
                  <Button variant="outline" onClick={() => { setUploadedData([]); toast.success('Excel silindi'); }} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                    <Trash2 className="mr-2 h-4 w-4" />Excel'i Sil
                  </Button>
                  <Button variant="outline" onClick={handleSave}>
                    <Check className="mr-2 h-4 w-4" />Seçimleri Kaydet ({uploadedData.filter(i => i.selected_range !== 'none').length})
                  </Button>
                  <Button variant="outline" onClick={() => { setUploadedData(uploadedData.map(item => ({ ...item, selected_range: 'none', selected_price: 0 }))); toast.success('Tüm seçimler kaldırıldı'); }}>
                    Seçimleri Kaldır
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />Excel İndir
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {uploadedData.length > 0 && (
          <>
            <Card className="mb-6">
              <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filtreler</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <Input placeholder="Ürün adı ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <Input placeholder="Model kodu" value={filterModelCode} onChange={(e) => setFilterModelCode(e.target.value)} />
                  <Select value={filterCategory || "all"} onValueChange={(val) => setFilterCategory(val === 'all' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Kategori</SelectItem>
                      {allCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterBrand} onValueChange={(val) => setFilterBrand(val === 'all' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Marka" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {uniqueBrands.map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterColumn} onValueChange={(val) => setFilterColumn(val === 'all' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Kolon" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="range_1">Kolon 1</SelectItem>
                      <SelectItem value="range_2">Kolon 2</SelectItem>
                      <SelectItem value="range_3">Kolon 3</SelectItem>
                      <SelectItem value="range_4">Kolon 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <Input type="number" placeholder="Min Stok" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
                  <Input type="number" placeholder="Max Stok" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger><SelectValue placeholder="Sırala" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sıralama Yok</SelectItem>
                      <SelectItem value="product_name_asc">Ürün Adı (A-Z)</SelectItem>
                      <SelectItem value="product_name_desc">Ürün Adı (Z-A)</SelectItem>
                      <SelectItem value="stock_asc">Stok (Artan)</SelectItem>
                      <SelectItem value="stock_desc">Stok (Azalan)</SelectItem>
                      <SelectItem value="system_price_asc">Sistem Fiyatı (Artan)</SelectItem>
                      <SelectItem value="system_price_desc">Sistem Fiyatı (Azalan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader><CardTitle>Toplu Seçim</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select value={bulkColumn} onValueChange={setBulkColumn}>
                    <SelectTrigger><SelectValue placeholder="Kolon seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="range_1">Kolon 1</SelectItem>
                      <SelectItem value="range_2">Kolon 2</SelectItem>
                      <SelectItem value="range_3">Kolon 3</SelectItem>
                      <SelectItem value="range_4">Kolon 4</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Min Kâr Oranı (%)" value={bulkMinProfitRate} onChange={(e) => setBulkMinProfitRate(e.target.value)} />
                  <Input type="number" placeholder="Min Kâr Tutarı (₺)" value={bulkMinProfitAmount} onChange={(e) => setBulkMinProfitAmount(e.target.value)} />
                  <Button onClick={handleBulkSelect} variant="outline">Toplu Seç</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Kârlılık Analizi ({filteredData.length} ürün)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-3 text-left font-semibold min-w-[180px]">Ürün</th>
                        <th className="p-3 text-center font-semibold">Stok</th>
                        <th className="p-3 text-center font-semibold min-w-[120px]">Kategori</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Sistem Fiyatı</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Aralık 1</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Aralık 2</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Aralık 3</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Aralık 4</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Barem</th>
                        <th className="p-3 text-center font-semibold min-w-[160px]">Manuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((item, index) => {
                        const systemPrice = getSystemPrice(item);
                        const matchedProduct = getMatchedProduct(item);
                        return (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{item.product_name}</div>
                              <div className="text-xs text-slate-500">{item.model_code}</div>
                            </td>
                            <td className="p-3 text-center">{item.stock}</td>
                            <td className="p-3">
                              {matchedProduct ? (
                                <div className="text-center text-xs"><div className="font-medium text-slate-700">{matchedProduct.category_name}</div></div>
                              ) : <div className="text-center text-slate-400 text-xs">-</div>}
                            </td>
                            <td className="p-3">
                              {systemPrice ? (
                                <div className="text-center">
                                  <div className="font-semibold text-slate-900">₺{systemPrice.sale_price?.toFixed(2)}</div>
                                  {matchedProduct && <div className="text-xs text-slate-500 mb-1">{matchedProduct.desi} desi • {systemPrice.barem_used === 'barem1' ? 'Barem 1' : systemPrice.barem_used === 'barem2' ? 'Barem 2' : 'Desi'}</div>}
                                  <div className="text-xs text-slate-500 mb-1">Kom: %{systemPrice.commission_rate || 0}</div>
                                  <div className={`text-xs font-medium ${(systemPrice.profit_rate || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ₺{(systemPrice.net_profit || 0).toFixed(2)} (%{(systemPrice.profit_rate || 0).toFixed(1)})
                                  </div>
                                </div>
                              ) : <div className="text-center text-slate-400 text-xs">-</div>}
                            </td>

                            {[1, 2, 3, 4].map(rangeNum => {
                                const minPrice = item[`price_range_${rangeNum}_min`];
                                const maxPrice = item[`price_range_${rangeNum}_max`];
                                const commission = item[`commission_${rangeNum}`] ?? 0;

                               let priceToUse = 0;
                               let headerLabel = '';
                               if (rangeNum === 1) {
                                 priceToUse = minPrice;
                                 headerLabel = `₺${minPrice?.toFixed(2)} ve üzeri`;
                               } else {
                                 priceToUse = maxPrice;
                                 headerLabel = `₺${maxPrice?.toFixed(2)} ve altı`;
                               }

                               const { profit, profitRate } = calculateProfit(priceToUse, commission, item);
                               const isProfitable = profit > 0;
                               const isSelected = item.selected_range === `range_${rangeNum}`;

                              return (
                                <td key={rangeNum} className="p-3">
                                  {priceToUse > 0 ? (
                                    <div className={`border rounded-lg p-2 ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                      <div className="text-xs font-semibold text-slate-700 mb-1">{headerLabel}</div>
                                      <div className="text-xs text-slate-500">
                                        Fiyat: ₺{rangeNum === 1 && systemPrice ? systemPrice.sale_price?.toFixed(2) : priceToUse.toFixed(2)}
                                      </div>
                                      <div className="text-xs text-slate-500">Kom: %{commission}</div>
                                      <div className="flex items-center justify-between mt-1">
                                        <div className={`text-xs font-semibold ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {isProfitable ? '+' : ''}₺{profit.toFixed(2)} (%{profitRate.toFixed(1)})
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openDetailModal(priceToUse, commission, item)}>
                                          <Info className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <Button size="sm" variant={isSelected ? 'default' : 'outline'} onClick={() => handlePriceSelect(uploadedData.indexOf(item), `range_${rangeNum}`, priceToUse)} className="w-full mt-2 h-7 text-xs">
                                        {isSelected ? 'Seçili' : 'Seç'}
                                      </Button>
                                    </div>
                                  ) : <div className="text-center text-slate-400 text-xs">-</div>}
                                </td>
                              );
                            })}

                            <td className="p-3">
                              {(() => {
                                const selectedPrice = item.selected_price || 0;
                                if (selectedPrice === 0 || item.selected_range === 'none') return <div className="text-center text-slate-400 text-xs">-</div>;

                                // Excel'de "KOMİSYON TARİFESİ" = "Var" ise, seçilen aralığın Excel komisyonunu kullan
                                // Yoksa sistem fiyatından gelen komisyonu kullan
                                let currentCommission = 0;
                                if (item.has_commission_tariff === 'Var' || item.has_commission_tariff === 'true') {
                                  if (item.selected_range === 'range_1') currentCommission = item.commission_1;
                                  else if (item.selected_range === 'range_2') currentCommission = item.commission_2;
                                  else if (item.selected_range === 'range_3') currentCommission = item.commission_3;
                                  else if (item.selected_range === 'range_4') currentCommission = item.commission_4;
                                  else if (item.selected_range === 'manual') currentCommission = item.manual_commission;
                                } else {
                                  const systemPrice = getSystemPrice(item);
                                  currentCommission = systemPrice?.commission_rate ?? item.manual_commission ?? 0;
                                }

                                const currentCalc = calculateProfit(selectedPrice, currentCommission, item);
                                const currentProfitRate = currentCalc.profitRate;
                                const currentBaremUsed = currentCalc.baremUsed;

                                if (currentBaremUsed === 'barem1' || currentBaremUsed === 'barem2') return <div className="text-center text-slate-400 text-xs">-</div>;

                                let bestBaremSuggestion = null;
                                if (selectedPrice > 299.99) {
                                  const barem2Calc = calculateProfit(299.99, currentCommission, item);
                                  if (barem2Calc.baremUsed === 'barem2' && barem2Calc.profitRate > currentProfitRate) {
                                    bestBaremSuggestion = { price: 299.99, profit: barem2Calc.profit, profitRate: barem2Calc.profitRate, baremType: 'Barem 2', commission: currentCommission };
                                  }
                                }
                                if (selectedPrice > 149.99) {
                                  const barem1Calc = calculateProfit(149.99, currentCommission, item);
                                  if (barem1Calc.baremUsed === 'barem1' && barem1Calc.profitRate > currentProfitRate) {
                                    if (!bestBaremSuggestion || barem1Calc.profitRate > bestBaremSuggestion.profitRate) {
                                      bestBaremSuggestion = { price: 149.99, profit: barem1Calc.profit, profitRate: barem1Calc.profitRate, baremType: 'Barem 1', commission: currentCommission };
                                    }
                                  }
                                }

                                if (!bestBaremSuggestion) return <div className="text-center text-slate-400 text-xs">-</div>;
                                const profitIncrease = bestBaremSuggestion.profitRate - currentProfitRate;

                                return (
                                  <div className="border rounded-lg p-2 border-amber-300 bg-amber-50">
                                    <div className="text-xs font-semibold text-amber-800 mb-1">{bestBaremSuggestion.baremType} Önerisi</div>
                                    <div className="text-xs text-slate-600">Fiyat: ₺{bestBaremSuggestion.price.toFixed(2)}</div>
                                    <div className="text-xs text-slate-600">Kom: %{bestBaremSuggestion.commission}</div>
                                    <div className="flex items-center justify-between mt-1">
                                      <div className="text-xs font-semibold text-emerald-600">+₺{bestBaremSuggestion.profit.toFixed(2)} (%{bestBaremSuggestion.profitRate.toFixed(1)})</div>
                                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openDetailModal(bestBaremSuggestion.price, bestBaremSuggestion.commission, item, bestBaremSuggestion.baremType === 'Barem 1' ? 'barem1' : 'barem2')}>
                                        <Info className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="text-xs text-amber-700 font-medium mt-1">+%{profitIncrease.toFixed(1)} kar artışı</div>
                                    <Button size="sm" variant="outline" onClick={() => handlePriceSelect(uploadedData.indexOf(item), item.selected_range, bestBaremSuggestion.price)} className="w-full mt-2 h-7 text-xs border-amber-400 hover:bg-amber-100">
                                      Uygula
                                    </Button>
                                  </div>
                                );
                              })()}
                            </td>

                            <td className="p-3">
                              <div className={`border rounded-lg p-2 ${item.selected_range === 'manual' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                <div className="text-xs font-semibold text-slate-700 mb-2">Manuel Fiyat</div>
                                <Input type="number" step="0.01" value={item.manual_price || ''} onChange={(e) => handleManualPriceChange(uploadedData.indexOf(item), e.target.value)} placeholder="Fiyat girin" className="h-8 text-xs mb-2" />
                                {item.manual_price > 0 && (
                                  <>
                                    {item.manual_range_info && (
                                      <div className="mb-1">
                                        <Badge variant="outline" className="text-xs">{item.manual_range_info} (Kom: %{item.manual_commission})</Badge>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between mb-2">
                                      <div className={`text-xs font-semibold ${(item.manual_profit || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {(item.manual_profit || 0) > 0 ? '+' : ''}₺{(item.manual_profit || 0).toFixed(2)} (%{(item.manual_profit_rate || 0).toFixed(1)})
                                      </div>
                                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openDetailModal(item.manual_price, item.manual_commission, item)}>
                                        <Info className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                                <Button size="sm" variant={item.selected_range === 'manual' ? 'default' : 'outline'} onClick={() => handlePriceSelect(uploadedData.indexOf(item), 'manual', item.manual_price)} className="w-full h-7 text-xs" disabled={!item.manual_price || item.manual_price <= 0}>
                                  {item.selected_range === 'manual' ? 'Seçili' : 'Seç'}
                                </Button>
                              </div>
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
        )}

        {uploadedData.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Upload className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">Henüz dosya yüklenmedi</p>
              <p className="text-sm text-slate-400">Platform seçip tarih aralığı belirledikten sonra Excel dosyasını yükleyin</p>
            </CardContent>
          </Card>
        )}
      </div>

      <PriceDetailModal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, product: null, priceData: null, calculationDetails: null })}
        product={detailModal.product}
        platform={detailModal.product && uniquePlatforms.find(p => p.name === selectedPlatform)}
        priceData={detailModal.priceData}
        calculationDetails={detailModal.calculationDetails}
      />
    </div>
  );
}
