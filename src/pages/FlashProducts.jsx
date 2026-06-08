import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Filter, Check, AlertCircle, Info, Calendar as CalendarIcon, Trash2, Sparkles } from 'lucide-react';
import { calculatePriceBreakdown, findDesiShippingRate } from '@/components/PriceCalculationEngine';
import PriceDetailModal from '@/components/modals/PriceDetailModal';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function FlashProducts() {
  const [userEmail, setUserEmail] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [dateRangeValue, setDateRangeValue] = useState({ from: undefined, to: undefined });
  const [uploadedData, setUploadedData] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [originalExcelData, setOriginalExcelData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [localSelections, setLocalSelections] = useState({});
  const [detailModal, setDetailModal] = useState({ open: false, product: null, priceData: null, calculationDetails: null });
  const [excludedCount, setExcludedCount] = useState(0);
  const [filterColumn, setFilterColumn] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [bulkColumn, setBulkColumn] = useState('');
  const [bulkMinProfitRate, setBulkMinProfitRate] = useState('');
  const [bulkMinProfitAmount, setBulkMinProfitAmount] = useState('');
  const [calendarKey, setCalendarKey] = useState(0);

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
    queryKey: ['shippingRates'],
    queryFn: () => db.entities.ShippingRate.list('-id', 10000),
    enabled: !!userEmail
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', userEmail],
    queryFn: () => db.entities.Category.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: productPrices = [] } = useQuery({
    queryKey: ['productPrices', userEmail],
    queryFn: () => db.entities.ProductPrice.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings', userEmail],
    queryFn: () => db.entities.Settings.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: savedFlashProducts = [] } = useQuery({
    queryKey: ['flashProducts', userEmail],
    queryFn: () => db.entities.FlashProduct.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: marketplaceProducts = [] } = useQuery({
    queryKey: ['marketplaceProducts', userEmail],
    queryFn: () => db.entities.MarketplaceProduct.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: trendyolPriceRanges = [] } = useQuery({
    queryKey: ['trendyolPriceRanges', userEmail],
    queryFn: () => db.entities.TrendyolPriceRange.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages', userEmail],
    queryFn: () => db.entities.Package.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: packageItems = [] } = useQuery({
    queryKey: ['packageItems', userEmail],
    queryFn: () => db.entities.PackageItem.filter({ created_by: userEmail }),
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

  // Platform ve tarih seçildiğinde o gruba ait verileri göster; tarih yoksa en son kaydı yükle
  React.useEffect(() => {
    if (!selectedPlatform || savedFlashProducts.length === 0) return;

    if (!dateRangeValue?.from || !dateRangeValue?.to) {
      const platformRecords = savedFlashProducts.filter(r => r.platform_account === selectedPlatform);
      if (platformRecords.length > 0) {
        const latest = platformRecords.reduce((a, b) => (a.end_date > b.end_date ? a : b));
        setDateRangeValue({ from: new Date(latest.start_date + 'T00:00:00'), to: new Date(latest.end_date + 'T00:00:00') });
      }
      return;
    }

    if (selectedPlatform && dateRangeValue?.from && dateRangeValue?.to) {
      const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
      const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');
      
      const filtered = savedFlashProducts.filter(
        r => r.platform_account === selectedPlatform &&
             r.start_date === startDate &&
             r.end_date === endDate
      );
      
      setUploadedData(filtered);
      
      // Load selections
      const selections = {};
      filtered.forEach(item => {
        selections[item.id || item.product_name] = {
          type: item.selected_type || 'none',
          manualPrice: item.manual_price || 0
        };
      });
      setLocalSelections(selections);

      // Excel'i geri yükle (sayfa yenilenince state sıfırlanmış olur)
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
      } else {
        setOriginalExcelData(null);
      }
    } else {
      setUploadedData([]);
      setOriginalExcelData(null);
    }
  }, [savedFlashProducts, selectedPlatform, dateRangeValue]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedPlatform) {
      toast.error('Lütfen platform seçin');
      return;
    }

    if (!dateRangeValue?.from || !dateRangeValue?.to) {
      toast.error('Lütfen tarih aralığı seçin');
      return;
    }

    const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
    const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');

    const reader = new FileReader();
    reader.onload = async (event) => {
      setUploadProgress({ current: 0, total: 0 });
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Orijinal Excel'i sakla
        setOriginalExcelData({ workbook, sheetName, jsonData });

        // Excel'i dosya olarak yükle (URL sakla) — sayfa yenilenince geri yüklensin
        const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const excelBlob = new Blob([new Uint8Array(excelBuffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const excelFileObj = new File([excelBlob], file.name || 'flash.xlsx', { type: excelBlob.type });
        let excelFileUrl = null;
        try {
          const uploadResult = await db.integrations.Core.UploadFile({ file: excelFileObj });
          excelFileUrl = uploadResult.file_url;
        } catch (uploadErr) {
          console.error('Excel upload hatası:', uploadErr);
        }

        // Debug: İlk satırın sütun adlarını göster
        if (jsonData.length > 0) {
          console.log('Excel sütun adları:', Object.keys(jsonData[0]));
        }

        let excludedProductsCount = 0;
        const parsed = jsonData.map(row => {
          // Sütun başlıklarını bul (trim ve case-insensitive)
          const findColumnValue = (obj, keywords) => {
            const lowerKeys = Object.keys(obj).map(k => ({ original: k, lower: k.toLowerCase().trim() }));
            const matchedKey = lowerKeys.find(k => 
              keywords.some(keyword => k.lower.includes(keyword.toLowerCase().trim()))
            );
            return matchedKey ? obj[matchedKey.original] : '';
          };

          const productName = findColumnValue(row, ['ürün', 'ismi', 'ürün ismi', 'ürün adı', 'product']) || '';
          const barcode = findColumnValue(row, ['barkod', 'barcode']) || '';
          const hasCommissionTariff = findColumnValue(row, ['ürün komisyon tarife seçeneği', 'komisyon tarife']) || 'Yok';
          const category = findColumnValue(row, ['kategori', 'category']) || '';

          // Önce pazaryeri ürünlerinden eşleşme bul
          let masterProductId = null;
          let commissionRate = 0;
          const marketplaceMatch = marketplaceProducts.find(mp => 
            (mp.barkod === barcode && barcode) || 
            (mp.platform_product_name?.toLowerCase().includes(productName?.toLowerCase()) && productName)
          );

          if (marketplaceMatch && marketplaceMatch.matched_product_id) {
            masterProductId = marketplaceMatch.matched_product_id;
            // Kategori ID + Trendyol platformu için Komisyonlar tablosundan oranı al
            const matchedProduct = products.find(p => p.id === masterProductId);
            if (matchedProduct?.category_id) {
              const trendyolPlatformIds = trendyolPlatforms.map(p => String(p.id));
              const trendyolPlatformNames = trendyolPlatforms.map(p => p.name.toLowerCase().trim());
              const commission = commissions.find(c =>
                c.is_active !== false &&
                (
                  trendyolPlatformIds.includes(String(c.platform_id)) ||
                  trendyolPlatformNames.includes((c.platform_name || '').toLowerCase().trim())
                ) &&
                String(c.category_id) === String(matchedProduct.category_id)
              );
              if (commission?.commission_rate) {
                commissionRate = commission.commission_rate;
              }
            }
          }

          const start24h = findColumnValue(row, ['24 saat başlangıç', '24h başlangıç']) ? format(new Date(findColumnValue(row, ['24 saat başlangıç', '24h başlangıç'])), 'yyyy-MM-dd') : '';
          const end24h = findColumnValue(row, ['24 saat bitiş', '24h bitiş']) ? format(new Date(findColumnValue(row, ['24 saat bitiş', '24h bitiş'])), 'yyyy-MM-dd') : '';
          const start3h = findColumnValue(row, ['3 saat başlangıç', '3h başlangıç']) ? format(new Date(findColumnValue(row, ['3 saat başlangıç', '3h başlangıç'])), 'yyyy-MM-dd') : '';
          const end3h = findColumnValue(row, ['3 saat bitiş', '3h bitiş']) ? format(new Date(findColumnValue(row, ['3 saat bitiş', '3h bitiş'])), 'yyyy-MM-dd') : '';

          // Tarih aralığı kontrolü
          const isInRange24h = !start24h || !end24h || (start24h >= startDate && end24h <= endDate);
          const isInRange3h = !start3h || !end3h || (start3h >= startDate && end3h <= endDate);
          
          if (!isInRange24h && !isInRange3h) {
            excludedProductsCount++;
            return null;
          }

          return {
            platform_account: selectedPlatform,
            start_date: startDate,
            end_date: endDate,
            product_name: productName,
            stock: parseFloat(findColumnValue(row, ['stok'])) || 0,
            price_24h: parseFloat(findColumnValue(row, ['24 saat fiyat', '24h fiyat'])) || 0,
            start_24h: start24h,
            end_24h: end24h,
            price_3h: parseFloat(findColumnValue(row, ['3 saat fiyat', '3h fiyat'])) || 0,
            start_3h: start3h,
            end_3h: end3h,
            master_product_id: masterProductId,
            commission_rate: commissionRate,
            has_commission_tariff: hasCommissionTariff,
            category: category,
            barcode: barcode,
            selected_type: 'none',
            manual_price: 0
          };
        }).filter(item => item !== null);

        // Önce aynı platform ve tarih aralığındaki eski kayıtları sil
        const oldRecords = savedFlashProducts.filter(
          r => r.platform_account === selectedPlatform &&
               r.start_date === startDate &&
               r.end_date === endDate
        );

        if (oldRecords.length > 0) {
          // Batch'ler halinde sil (10'ar)
          for (let i = 0; i < oldRecords.length; i += 10) {
            const batch = oldRecords.slice(i, i + 10);
            await Promise.all(batch.map(r => db.entities.FlashProduct.delete(r.id)));
            if (i + 10 < oldRecords.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          // Silme tamamlandıktan sonra uzun bekle
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Yeni verileri batch'ler halinde kaydet (10'ar)
        setUploadProgress({ current: 0, total: parsed.length });
        for (let i = 0; i < parsed.length; i += 10) {
          const batch = parsed.slice(i, i + 10);
          // Sadece ilk batch'in ilk kaydına Excel URL'ini ekle
          if (i === 0 && batch.length > 0 && excelFileUrl) {
            batch[0].excel_file_url = excelFileUrl;
          }
          await db.entities.FlashProduct.bulkCreate(batch);
          setUploadProgress({ current: Math.min(i + 10, parsed.length), total: parsed.length });
          if (i + 10 < parsed.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        setUploadedData(parsed);
        setUploadProgress({ current: 0, total: 0 });
        setExcludedCount(excludedProductsCount);
        
        if (excludedProductsCount > 0) {
          toast.success(`${parsed.length} ürün yüklendi, ${excludedProductsCount} ürün tarih aralığı dışında`);
        } else {
          toast.success(`${parsed.length} ürün yüklendi ve kaydedildi`);
        }
      } catch (error) {
        setUploadProgress({ current: 0, total: 0 });
        toast.error('Excel yüklemesi başarısız: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const getMatchedProduct = (item) => {
    if (item.master_product_id) {
      return products.find(p => p.id === item.master_product_id);
    }
    return null;
  };

  const getCategory = (item) => {
    const product = getMatchedProduct(item);
    if (!product) return null;
    return categories.find(c => c.id === product.category_id);
  };

  const getSystemPrice = (item) => {
    const product = getMatchedProduct(item);
    if (!product || !selectedPlatform) return null;

    const platform = uniquePlatforms.find(p => p.name === selectedPlatform);
    if (!platform) return null;

    const priceInfo = productPrices.find(pp =>
      pp.product_id === product.id &&
      pp.platform_id === platform.id
    );
    
    if (!priceInfo) return null;
    
    // Sistem fiyatından komisyon oranı ekle (getCommissionRate 371-447'de tanımlanan logic)
    const trendyolPlatformIds = trendyolPlatforms.map(p => String(p.id));
    const trendyolPlatformNames = trendyolPlatforms.map(p => p.name.toLowerCase().trim());
    let commissionRate = 0;
    
    // Excel kategorisiyle ara
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
    
    // Ürün kategorisiyle ara
    if (commissionRate === 0) {
      const commission = commissions.find(c =>
        c.platform_id === platform.id &&
        c.category_id === product.category_id &&
        c.is_active !== false
      );
      if (commission?.commission_rate && commission.commission_rate > 0) {
        commissionRate = commission.commission_rate;
      }
    }
    
    // Min komisyon ara
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
    
    return { ...priceInfo, commission_rate: commissionRate };
  };

  const getPackageCost = (packageId) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return 0;
    return pkg.total_cost || 0;
  };

  const getCommissionRate = (item, price = null) => {
    // Eğer "Var" ise: fiyatın hangi Ürün Komisyon Tarifesi aralığına girdiğini kontrol et, o aralığın komisyonunu al
    if (item.has_commission_tariff === 'Var' && price && price > 0) {
      const priceRange = trendyolPriceRanges.find(pr => 
        pr.barcode === item.barcode && 
        pr.platform_account === selectedPlatform
      );

      if (priceRange) {
        let rangeCommission = 0;

        // Fiyatın hangi aralığa girdiğini kontrol et
        if (price >= (priceRange.price_range_1_min || 0) && price < (priceRange.price_range_2_min || Infinity)) {
          rangeCommission = priceRange.commission_1 || 0;
        } else if (price >= (priceRange.price_range_2_min || 0) && price <= (priceRange.price_range_2_max || Infinity)) {
          rangeCommission = priceRange.commission_2 || 0;
        } else if (price >= (priceRange.price_range_3_min || 0) && price <= (priceRange.price_range_3_max || Infinity)) {
          rangeCommission = priceRange.commission_3 || 0;
        } else if (price >= (priceRange.price_range_4_min || 0) && price <= (priceRange.price_range_4_max || Infinity)) {
          rangeCommission = priceRange.commission_4 || 0;
        }

        if (rangeCommission > 0) {
          return rangeCommission;
        }
      }
    }
    
    // "Yok" ise veya komisyon tarifesinde seçim yapılmamışsa sistem fiyatındaki komisyon oranını kullan
    const trendyolPlatformIds = trendyolPlatforms.map(p => String(p.id));
    const trendyolPlatformNames = trendyolPlatforms.map(p => p.name.toLowerCase().trim());
    
    // Adım 1: Excel'deki category alanı ile doğrudan komisyon tablosundan ara
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
        return categoryCommission.commission_rate;
      }
    }
    
    const product = getMatchedProduct(item);
    if (!product || !selectedPlatform) return null;

    const platform = uniquePlatforms.find(p => p.name === selectedPlatform);
    if (!platform) return null;

    // Adım 2: Eşleştirilen ürünün kategorisine göre ara
    const commission = commissions.find(c =>
      c.platform_id === platform.id &&
      c.category_id === product.category_id &&
      c.is_active !== false
    );
    if (commission?.commission_rate && commission.commission_rate > 0) return commission.commission_rate;

    // Adım 3: Aynı platform için en küçük komisyon oranını bul
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
      if (minCommission?.commission_rate) return minCommission.commission_rate;
    }

    return 0;
  };

  const calculateProfit = (price, commissionRate, product) => {
    try {
      if (!price || price <= 0) {
        return { profit: 0, profitRate: 0, breakdown: null };
      }

      if (commissionRate === null) {
        return { profit: 0, profitRate: 0, breakdown: null };
      }

      const matchedProduct = getMatchedProduct(product);
      if (!matchedProduct) {
        return { profit: 0, profitRate: 0, breakdown: null };
      }

      const platform = uniquePlatforms.find(p => p.name === selectedPlatform);
      if (!platform) {
        return { profit: 0, profitRate: 0, breakdown: null };
      }

      const platformShippingRates = shippingRates.filter(r =>
        r.is_active !== false && (r.platform_id === platform.id || r.platform_type === platform.platform_type)
      );

      // Paketleme maliyeti
      let packagingCost = 0;
      if (matchedProduct.multi_package && matchedProduct.packages) {
        try {
          const productPackages = typeof matchedProduct.packages === 'string' 
            ? JSON.parse(matchedProduct.packages) 
            : matchedProduct.packages;
          for (const pkg of productPackages) {
            if (pkg.package_id) {
              packagingCost += getPackageCost(pkg.package_id);
            }
          }
        } catch (e) {
          packagingCost = 0;
        }
      } else if (matchedProduct.package_id || matchedProduct.auto_package_id) {
        const packageId = matchedProduct.package_id || matchedProduct.auto_package_id;
        packagingCost = getPackageCost(packageId);
      }

      const printingCost = matchedProduct.printing_cost || 0;

      // Kargo hesapla — Barem kontrolleri
      let shippingCost = 0;
      let shippingVatRate = 20;
      let baremUsed = 'desi';

      const canUseBarem = !matchedProduct.special_shipping && !matchedProduct.multi_package;
      
      // Barem kontrolleri — Prices sayfasıyla aynı
      if (canUseBarem && price > 0) {
        if (price >= 0 && price <= 149.99) {
          const baremRate = platformShippingRates.find(r => r.rate_type === 'barem1');
          if (baremRate) {
            shippingCost = baremRate.price;
            shippingVatRate = baremRate.vat_rate || 20;
            baremUsed = 'barem1';
          }
        } else if (price >= 150 && price <= 299.99) {
          const baremRate = platformShippingRates.find(r => r.rate_type === 'barem2');
          if (baremRate) {
            shippingCost = baremRate.price;
            shippingVatRate = baremRate.vat_rate || 20;
            baremUsed = 'barem2';
          }
        }
      }

      if (shippingCost === 0) {
        if (matchedProduct.multi_package && matchedProduct.packages) {
          try {
            const productPackages = typeof matchedProduct.packages === 'string' 
              ? JSON.parse(matchedProduct.packages) 
              : matchedProduct.packages;

            if (matchedProduct.special_shipping) {
              const returnCostSetting = settings.find(s => s.setting_key === 'return_cost_per_package');
              const returnCostPerPackage = returnCostSetting ? parseFloat(returnCostSetting.setting_value) : 180.096;

              for (const pkg of productPackages) {
                const desiRate = findDesiShippingRate(platformShippingRates, pkg.desi || 0);
                if (desiRate) {
                  shippingCost += (desiRate.price * 2) + returnCostPerPackage;
                  shippingVatRate = desiRate.vat_rate || 20;
                }
              }
            } else {
              for (const pkg of productPackages) {
                const desiRate = findDesiShippingRate(platformShippingRates, pkg.desi || 0);
                if (desiRate) {
                  shippingCost += desiRate.price;
                  shippingVatRate = desiRate.vat_rate || 20;
                }
              }
            }
          } catch (e) {
            const desiRate = findDesiShippingRate(platformShippingRates, matchedProduct.desi || 0);
            shippingCost = desiRate?.price || 0;
            shippingVatRate = desiRate?.vat_rate || 20;
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
        isSameDayDelivery: matchedProduct.same_day_delivery || false
      });

      return { 
        profit: parseFloat(breakdown.netProfit) || 0, 
        profitRate: parseFloat(breakdown.profitRate) || 0,
        breakdown,
        matchedProduct,
        platform,
        baremUsed
      };
    } catch (error) {
      return { profit: 0, profitRate: 0, breakdown: null };
    }
  };

  // ✅ Akıllı Otomatik Seç — indirimli komisyon hedeflerine göre, 3 Saat → 24 Saat
  // Manuel seçilmiş ürünlere dokunmaz
  const handleSmartAutoSelect = async () => {
    // Platform direkt name ile eşleştir
    const uniquePlats = platforms.filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
    const platform = uniquePlats.find(p => p.name === selectedPlatform);
    if (!platform) { toast.error('Platform bulunamadı'); return; }

    // Fresh komisyon verisi çek (RLS zaten kullanıcıya göre filtreler)
    let freshCommissions = [];
    try {
      freshCommissions = await db.entities.Commission.list();
    } catch (e) {
      toast.error('Komisyon verisi alınamadı');
      return;
    }

    let selectedCount = 0;
    let skippedNoCommission = 0;
    let skippedAlreadySelected = 0;

    const updated = uploadedData.map(item => {
      // Elle seçilen (manuel) ürünleri koru; diğer önceki seçimleri sıfırlayıp baştan değerlendir
      if (item.selected_type === 'manual') { skippedAlreadySelected++; return item; }

      const matchedProduct = getMatchedProduct(item);
      if (!matchedProduct) return { ...item, selected_type: 'none', selected_price: 0 };

      const commission = freshCommissions.find(c =>
        c.platform_id === platform?.id &&
        c.category_id === matchedProduct.category_id &&
        c.is_active !== false
      );

      if (!commission) { skippedNoCommission++; return { ...item, selected_type: 'none', selected_price: 0 }; }

      // ✅ 0/boş hedefleri "tanımsız" say — aksi halde hedef tutar 0 iken "kâr >= 0"
      //    her zaman sağlanıp, indirimli hedef kâr oranı dikkate alınmadan en
      //    indirimli (en düşük fiyat) aralık seçiliyordu.
      const toNum = (v) => (v != null && v !== '') ? Number(v) : null;
      const rawRate = toNum(commission.discounted_target_profit_rate);
      const rawAmount = toNum(commission.discounted_target_profit_amount);
      const rawMin = toNum(commission.discounted_minimum_profit_amount);
      const targetRate = (rawRate != null && rawRate > 0) ? rawRate : null;
      const targetAmount = (rawAmount != null && rawAmount > 0) ? rawAmount : null;
      const minAmount = (rawMin != null && rawMin > 0) ? rawMin : null;

      const hasDiscountedTarget = targetRate != null || targetAmount != null;
      if (!hasDiscountedTarget) { skippedNoCommission++; return { ...item, selected_type: 'none', selected_price: 0 }; }

      // 3 Saat → 24 Saat sırasıyla dene (en düşük/en indirimli fiyattan başla)
      const ranges = [
        { rangeType: 'flash_3h', price: item.price_3h },
        { rangeType: 'flash_24h', price: item.price_24h },
      ];

      for (const range of ranges) {
        if (!range.price || range.price <= 0) continue;
        const commissionRate = getCommissionRate(item, range.price);
        if (commissionRate === null) continue;
        const calc = calculateProfit(range.price, commissionRate, item);
        if (!calc.breakdown) continue;

        // İndirimli minimum kâr tutarı altındaki aralıkları ele
        if (minAmount != null && calc.profit < minAmount) continue;

        // Tanımlı olan TÜM hedefler sağlanmalı (sıkı kontrol):
        // - indirimli hedef kâr oranı varsa, kâr oranı >= hedef OLMALI
        // - indirimli hedef kâr tutarı varsa, kâr tutarı >= hedef OLMALI
        let meetsTarget = true;
        if (targetRate != null && calc.profitRate < targetRate) meetsTarget = false;
        if (targetAmount != null && calc.profit < targetAmount) meetsTarget = false;

        if (meetsTarget) {
          selectedCount++;
          return { ...item, selected_type: range.rangeType, selected_price: range.price };
        }
      }

      return { ...item, selected_type: 'none', selected_price: 0 };
    });

    setUploadedData(updated);

    if (skippedNoCommission > 0) {
      toast.warning(`${selectedCount} ürün seçildi. ${skippedNoCommission} üründe indirimli kâr hedefi tanımlı değil — Komisyonlar sayfasından ekleyin.`);
    } else {
      toast.success(`${selectedCount} ürün otomatik seçildi. ${skippedAlreadySelected} ürün zaten seçiliydi.`);
    }
  };

  const handleBulkSelect = () => {
    if (!bulkColumn) {
      toast.error('Lütfen kolon seçin');
      return;
    }

    const minRate = parseFloat(bulkMinProfitRate) || 0;
    const minAmount = parseFloat(bulkMinProfitAmount) || 0;

    // Kategori filtresi aktifse sadece görünen ürünlerin adlarını bul
    const visibleProductNames = filterCategory
      ? new Set(filteredData.map(item => item.product_name))
      : null;

    const updated = uploadedData.map(item => {
      // Kategori filtresi aktifse ve ürün bu kategoride değilse → dokunma
      if (visibleProductNames && !visibleProductNames.has(item.product_name)) {
        return item;
      }

      // Zaten başka bir kolonda seçiliyse dokunma
      if (item.selected_type !== 'none' && item.selected_type !== bulkColumn) {
        return item;
      }

      let price = 0;

      if (bulkColumn === 'flash_24h') {
        price = item.price_24h;
      } else if (bulkColumn === 'flash_3h') {
        price = item.price_3h;
      }

      if (price <= 0) {
        if (item.selected_type === bulkColumn) {
          return { ...item, selected_type: 'none', selected_price: 0 };
        }
        return item;
      }

      let commissionRate = getCommissionRate(item, price);
      const { profit, profitRate } = calculateProfit(price, commissionRate, item);

      if (profitRate >= minRate && profit >= minAmount && commissionRate !== null) {
        return { ...item, selected_type: bulkColumn, selected_price: price };
      }

      // Sadece bu kolonda seçiliyse kaldır, yoksa dokunma
      if (item.selected_type === bulkColumn) {
        return { ...item, selected_type: 'none', selected_price: 0 };
      }
      return item;
    });

    setUploadedData(updated);
    toast.success('Toplu seçim yapıldı');
  };

  const handleExport = () => {
    if (uploadedData.length === 0) {
      toast.error('İndirilebilecek veri bulunamadı');
      return;
    }

    if (!originalExcelData) {
      toast.error('Orijinal Excel dosyası bulunamadı');
      return;
    }

    // İzin verilen sütunlar
    const allowedColumns = [
      'Model Kodu', 'Barkod', 'Ürün Adı', 'Kategori', 'Marka', 'Stok',
      'Mevcut Fiyat', 'Müşterinin Gördüğü Fiyat', 'Mevcut Komisyon',
      'Güncellenecek Fiyat', '24 Saat Fiyat', '3 Saat Fiyat',
      'Senin Belirlediğin Flaş Fiyatı', '24 Saat Flaş Başlangıç Tarihi',
      '24 Saat Flaş Bitiş Tarihi', '3 Saat Flaş Başlangıç Tarihi',
      '3 Saat Flaş Bitiş Tarihi', 'Ürün Komisyon Tarife Seçeneği',
      'Kampanyalı Ürün', 'Ürün Id'
    ];

    // FRESH workbook kopyası oluştur (değişikliklerin birbirini etkilememesi için)
    const { workbook: originalWorkbook, sheetName } = originalExcelData;
    const workbook = XLSX.utils.book_new();
    const originalSheet = originalWorkbook.Sheets[sheetName];
    const worksheet = XLSX.utils.aoa_to_sheet(XLSX.utils.sheet_to_json(originalSheet, { header: 1 }));
    workbook.SheetNames.push(sheetName);
    workbook.Sheets[sheetName] = worksheet;
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // Sütun mapping'i oluştur - hangi sütunlar tutulacak
    const columnsToKeep = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const header = worksheet[headerAddress]?.v?.toString() || '';
      if (allowedColumns.includes(header)) {
        columnsToKeep.push(C);
      }
    }

    // Fazladan sütunları sil
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        if (!columnsToKeep.includes(C)) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          delete worksheet[cellAddress];
        }
      }
    }

    // Her satırı güncelle
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const row = {};
      for (let C of columnsToKeep) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell) {
          const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
          const header = worksheet[headerAddress]?.v;
          if (header) {
            row[header] = cell.v;
          }
        }
      }

      // Bu satıra karşılık gelen ürünü bul
      const productNameKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('ürün') && key.toLowerCase().includes('adı')
      );
      const productName = productNameKey ? row[productNameKey] : '';
      
      // uploadedData'dan ürünü bul - trim ve case-insensitive match
      const item = uploadedData.find(i => 
        i.product_name?.trim().toLowerCase() === productName?.trim().toLowerCase()
      );
      
      if (!item) {
        console.log('✗ ÜRÜN BULUNAMADI:', productName);
      }

      if (item) {
        console.log('✓ ÜRÜN BULUNDU:', productName);
        console.log('  - selected_type:', item.selected_type);
        console.log('  - manual_price:', item.manual_price);
        console.log('  - manual_time_range:', item.manual_time_range);
        
        // Zaman aralığını belirle: manuel fiyat seçiliyse manual_time_range kullan, değilse selected_type
        const timeRange = item.selected_type === 'manual' 
          ? (item.manual_time_range || 'flash_3h')
          : item.selected_type;
        
        // Sütunları güncelle
        for (let C of columnsToKeep) {
          const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
          const header = worksheet[headerAddress]?.v?.toString() || '';
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

          // SADECE GÜNCELLENEBİLİR SÜTUNLAR
          
          // Güncellenecek Fiyat
          if (header === 'Güncellenecek Fiyat') {
            let guncellenecekFiyat = 'Hiçbiri';
            
            // Seçim yoksa 'Hiçbiri' (Trendyol boş satırı hatalı sayıyor; "Hiçbiri" = atla)
            if (!item.selected_type || item.selected_type === 'none') {
              guncellenecekFiyat = 'Hiçbiri';
            } else if (item.selected_type === 'flash_24h') {
              guncellenecekFiyat = '24 Saat';
            } else if (item.selected_type === 'flash_3h') {
              guncellenecekFiyat = '3 Saat';
            } else if (item.selected_type === 'manual') {
              guncellenecekFiyat = 'Senin Belirlediğin Flaş Fiyatı';
            }
            
            console.log('  → Güncellenecek Fiyat:', guncellenecekFiyat);
            worksheet[cellAddress] = { v: guncellenecekFiyat, t: 's' };
          }

          // Senin Belirlediğin Flaş Fiyatı
          else if (header === 'Senin Belirlediğin Flaş Fiyatı') {
            let value = '';
            // Manuel seçildiyse ve manual_price varsa yaz
            if (item.selected_type === 'manual' && item.manual_price && item.manual_price > 0) {
              value = item.manual_price;
            }
            worksheet[cellAddress] = { v: value, t: value === '' ? 's' : 'n' };
          }

          // Flaş tarih sütunları: orijinal dosyadaki değerlere DOKUNULMAZ,
          // aynen korunur (Trendyol bu tarihleri ve formatını bekliyor; üzerine
          // yazılırsa boşalıyor ve hiçbir ürün güncellenmiyordu).

          // Ürün Komisyon Tarife Seçeneği
          else if (header === 'Ürün Komisyon Tarife Seçeneği') {
            worksheet[cellAddress] = { v: item.has_commission_tariff || 'Yok', t: 's' };
          }

          // Kampanyalı Ürün - Değiştirilmez, orijinal değer korunur
          // (Bu sütuna dokunulmaz)
        }
      }
    }

    // Range'i güncelle
    if (columnsToKeep.length > 0) {
      const newRange = {
        s: { r: range.s.r, c: Math.min(...columnsToKeep) },
        e: { r: range.e.r, c: Math.max(...columnsToKeep) }
      };
      worksheet['!ref'] = XLSX.utils.encode_range(newRange);
    }

    const slugify = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const fromStr = dateRangeValue?.from ? format(dateRangeValue.from, 'd MMMM', { locale: tr }) : '';
    const toStr = dateRangeValue?.to ? format(dateRangeValue.to, 'd MMMM', { locale: tr }) : '';
    const fileName = `flashurunler-${slugify(fromStr)}-${slugify(toStr)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Excel dosyası indirildi');
  };

  const filteredData = uploadedData
    .filter(item => {
      // En az bir fiyat var mı
      if (item.price_24h <= 0 && item.price_3h <= 0) return false;

      if (searchTerm && !item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      if (filterCategory) {
        const category = getCategory(item);
        if (!category || category.name !== filterCategory) return false;
      }

      if (minStock && item.stock < parseFloat(minStock)) return false;
      if (maxStock && item.stock > parseFloat(maxStock)) return false;

      if (filterColumn) {
        if (filterColumn === 'flash_24h' && item.price_24h <= 0) return false;
        if (filterColumn === 'flash_3h' && item.price_3h <= 0) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === 'name_asc') return (a.product_name || '').localeCompare(b.product_name || '');
      if (sortBy === 'name_desc') return (b.product_name || '').localeCompare(a.product_name || '');
      if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
      if (sortBy === 'system_price_asc') {
        const priceA = getSystemPrice(a);
        const priceB = getSystemPrice(b);
        return (priceA?.sale_price || 0) - (priceB?.sale_price || 0);
      }
      if (sortBy === 'system_price_desc') {
        const priceA = getSystemPrice(a);
        const priceB = getSystemPrice(b);
        return (priceB?.sale_price || 0) - (priceA?.sale_price || 0);
      }
      return 0;
    });

  // Sadece yüklenen Excel'deki ürünlerin kategorilerini göster
  const uniqueCategories = [...new Set(
    uploadedData.map(item => getCategory(item)?.name).filter(Boolean)
  )].sort();

  const handlePriceSelect = (index, type, price) => {
    const updated = [...uploadedData];
    const item = updated[index];

    // Manuel seçimde zaman aralığı kontrolü
    if (type === 'manual') {
      if (item.manual_time_range_error) {
        toast.error('Manuel fiyat hem 3 hem 24 saatlik fiyattan büyük olamaz');
        return;
      }

      updated[index].selected_type = 'manual';
      updated[index].selected_price = price;
      updated[index].selected_time_range = item.manual_time_range;
    } else {
      updated[index].selected_type = type;
      updated[index].selected_price = price;
      updated[index].selected_time_range = type;
    }
    
    setUploadedData(updated);
  };

  const handleManualPriceChange = (index, value) => {
    const updated = [...uploadedData];
    const manualPrice = parseFloat(value) || 0;
    updated[index].manual_price = manualPrice;
    
    if (manualPrice > 0) {
      const item = updated[index];
      const price24h = item.price_24h || 0;
      const price3h = item.price_3h || 0;

      // HATA KONTROLÜ: Manuel fiyat hem 3 hem 24 saatlik fiyattan büyükse HATA
      if (manualPrice > price24h && manualPrice > price3h && price24h > 0 && price3h > 0) {
        updated[index].manual_time_range_error = true;
        updated[index].manual_time_range = null;
        updated[index].manual_time_range_options = [];
        updated[index].manual_profit = 0;
        updated[index].manual_profit_rate = 0;
        updated[index].manual_commission = null;
      } else {
        updated[index].manual_time_range_error = false;

        // A) Manuel fiyat 3 saatlik fiyattan BÜYÜKSE → 24 saat seçilir
        if (manualPrice > price3h && price3h > 0) {
          updated[index].manual_time_range = 'flash_24h';
          updated[index].manual_time_range_options = ['flash_24h'];
        }
        // B) Manuel fiyat 3 saatlik fiyattan KÜÇÜKSE
        else if (manualPrice < price3h && price3h > 0) {
          // B2) Manuel fiyat 24 saatlik fiyattan BÜYÜKSE → Otomatik 3 saat
          if (manualPrice > price24h && price24h > 0) {
            updated[index].manual_time_range = 'flash_3h';
            updated[index].manual_time_range_options = ['flash_3h'];
          }
          // B1) Manuel fiyat 24 saatlik fiyattan da KÜÇÜKSE → Dropdown göster
          else if (manualPrice < price24h && price24h > 0) {
            updated[index].manual_time_range = updated[index].manual_time_range || 'flash_3h';
            updated[index].manual_time_range_options = ['flash_3h', 'flash_24h'];
          }
          // Sadece 3 saatlik fiyat varsa
          else if (price24h === 0 || !price24h) {
            updated[index].manual_time_range = 'flash_3h';
            updated[index].manual_time_range_options = ['flash_3h'];
          }
        }
        // Sadece 24 saatlik fiyat varsa
        else if ((price3h === 0 || !price3h) && price24h > 0) {
          updated[index].manual_time_range = 'flash_24h';
          updated[index].manual_time_range_options = ['flash_24h'];
        }

        // Komisyon oranını al ve karlılık hesapla
        const commissionRate = getCommissionRate(item, manualPrice);
        const { profit, profitRate } = calculateProfit(manualPrice, commissionRate, item);
        updated[index].manual_profit = profit;
        updated[index].manual_profit_rate = profitRate;
        updated[index].manual_commission = commissionRate;
      }
    } else {
      updated[index].manual_profit = 0;
      updated[index].manual_profit_rate = 0;
      updated[index].manual_commission = 0;
      updated[index].manual_time_range_error = false;
      updated[index].manual_time_range = null;
      updated[index].manual_time_range_options = [];
    }
    
    setUploadedData(updated);
  };

  const handleSaveSelections = async () => {
    const selectedItems = uploadedData.filter(item => item.selected_type !== 'none');

    if (selectedItems.length === 0) {
      toast.error('Lütfen en az bir ürün seçin');
      return;
    }

    try {
      // Ekrandaki TÜM kayıtları DB ile eşitle: kayıtlı olanları güncelle
      // (seçimi kaldırılanlar 'none' olur), id'siz seçili olanları oluştur.
      const toUpdate = uploadedData.filter(item => item.id);
      const toCreate = uploadedData.filter(item => !item.id && item.selected_type !== 'none');

      for (let i = 0; i < toUpdate.length; i += 30) {
        const batch = toUpdate.slice(i, i + 30);
        await Promise.all(batch.map(item => db.entities.FlashProduct.update(item.id, item)));
        if (i + 30 < toUpdate.length) await new Promise(resolve => setTimeout(resolve, 200));
      }
      for (let i = 0; i < toCreate.length; i += 30) {
        const batch = toCreate.slice(i, i + 30);
        await Promise.all(batch.map(item => db.entities.FlashProduct.create(item)));
        if (i + 30 < toCreate.length) await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Güncel veriyi veritabanından yeniden yükle
      const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
      const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');

      const updatedData = await db.entities.FlashProduct.filter({
        created_by: userEmail,
        platform_account: selectedPlatform,
        start_date: startDate,
        end_date: endDate
      });

      setUploadedData(updatedData);

      toast.success(`${selectedItems.length} ürün kaydedildi`);
      queryClient.invalidateQueries(['flashProducts']);
    } catch (error) {
      toast.error('Kayıt hatası: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Flaş Ürünler</h1>
          <p className="text-slate-500 mt-1">Flaş ürün fiyatlarını yükleyip kârlılık analizi yapın</p>
        </div>

        {!hasTrendyol && (
          <div className="mb-6 flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-base mb-1">Trendyol Platformu Aktif Değil</h3>
              <p className="text-amber-800 text-sm leading-relaxed">
                Bu sayfa yalnızca <strong>Trendyol</strong> platformuna yönelik flaş ürün kampanyaları için tasarlanmıştır. 
                Sayfayı kullanabilmek için önce <strong>Platformlar</strong> bölümünden Trendyol platformunu aktive etmeniz gerekmektedir. 
                Platform aktive edildikten sonra flaş ürün fiyatlarınızı yükleyip kârlılık analizlerinizi yapabilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Platform ve Excel Yükleme</CardTitle>
          </CardHeader>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Platform seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {trendyolPlatforms.map(p => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tarih Aralığı *</Label>
                <Popover onOpenChange={(open) => { if (open) setCalendarKey(k => k + 1); }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRangeValue?.from ? (
                        dateRangeValue.to ? (
                          <>
                            {format(dateRangeValue.from, 'd MMM yyyy', { locale: tr })} - {format(dateRangeValue.to, 'd MMM yyyy', { locale: tr })}
                          </>
                        ) : (
                          format(dateRangeValue.from, 'd MMM yyyy', { locale: tr })
                        )
                      ) : (
                        <span>Tarih seçin</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      key={calendarKey}
                      mode="range"
                      selected={dateRangeValue}
                      onSelect={(range) => {
                        if (range?.from && range?.to && range.from.getTime() === range.to.getTime() && dateRangeValue?.from && range.from.getTime() === dateRangeValue.from.getTime()) {
                          setDateRangeValue({ from: undefined, to: undefined });
                        } else {
                          setDateRangeValue(range);
                        }
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
              <Button
                onClick={() => document.getElementById('excelUpload').click()}
                disabled={!selectedPlatform || !dateRangeValue?.from || !dateRangeValue?.to}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadProgress.total > 0
                  ? `Yükleniyor... ${uploadProgress.current}/${uploadProgress.total}`
                  : uploadedData.length > 0 ? 'Yeni Excel Yükle' : 'Excel Yükle'}
              </Button>
              <input
                id="excelUpload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploadedData.length > 0 && (
                <>
                  <Button onClick={handleSmartAutoSelect} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                    <Sparkles className="h-4 w-4" />
                    Akıllı Otomatik Seç
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
                      const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');
                      const recordsToDelete = savedFlashProducts.filter(
                        r => r.platform_account === selectedPlatform &&
                             r.start_date === startDate &&
                             r.end_date === endDate
                      );
                      // Ekranı HEMEN temizle, silmeyi arka planda yap (anında tepki için)
                      setUploadedData([]);
                      setOriginalExcelData(null);
                      setExcludedCount(0);
                      toast.success('Excel silindi');
                      try {
                        for (let i = 0; i < recordsToDelete.length; i += 30) {
                          const batch = recordsToDelete.slice(i, i + 30);
                          await Promise.all(batch.map(r => db.entities.FlashProduct.delete(r.id)));
                          if (i + 30 < recordsToDelete.length) {
                            await new Promise(resolve => setTimeout(resolve, 150));
                          }
                        }
                        queryClient.invalidateQueries(['flashProducts']);
                      } catch (error) {
                        toast.error('Silme hatası (arka plan): ' + error.message);
                      }
                    }}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excel'i Sil
                  </Button>
                  <Button variant="outline" onClick={handleSaveSelections}>
                    <Check className="mr-2 h-4 w-4" />
                    Seçimleri Kaydet ({uploadedData.filter(i => i.selected_type !== 'none').length})
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const updated = uploadedData.map(item => ({ ...item, selected_type: 'none', selected_price: 0 }));
                      setUploadedData(updated);
                      toast.success('Tüm seçimler kaldırıldı');
                    }}
                  >
                    Seçimleri Kaldır
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Excel İndir
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {uploadedData.length > 0 && (
          <>
            {/* Info Banner */}
            {excludedCount > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{excludedCount} ürün tarih aralığı dışında olduğu için gösterilmiyor</span>
                </div>
              </div>
            )}

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtreler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Ürün adı ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select value={filterCategory || "all"} onValueChange={(val) => setFilterCategory(val === 'all' ? '' : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Kategori</SelectItem>
                      {uniqueCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterColumn || "all"} onValueChange={(val) => setFilterColumn(val === 'all' ? '' : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kolon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="flash_24h">24 Saat</SelectItem>
                      <SelectItem value="flash_3h">3 Saat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <Input
                    type="number"
                    placeholder="Min Stok"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max Stok"
                    value={maxStock}
                    onChange={(e) => setMaxStock(e.target.value)}
                  />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sırala" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sıralama Yok</SelectItem>
                      <SelectItem value="name_asc">Ürün Adı (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Ürün Adı (Z-A)</SelectItem>
                      <SelectItem value="stock_asc">Stok (Artan)</SelectItem>
                      <SelectItem value="stock_desc">Stok (Azalan)</SelectItem>
                      <SelectItem value="system_price_asc">Sistem Fiyatı (Artan)</SelectItem>
                      <SelectItem value="system_price_desc">Sistem Fiyatı (Azalan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Toplu Seçim</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select value={bulkColumn} onValueChange={setBulkColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kolon seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flash_24h">24 Saat</SelectItem>
                      <SelectItem value="flash_3h">3 Saat</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Min Kâr Oranı (%)"
                    value={bulkMinProfitRate}
                    onChange={(e) => setBulkMinProfitRate(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Min Kâr Tutarı (₺)"
                    value={bulkMinProfitAmount}
                    onChange={(e) => setBulkMinProfitAmount(e.target.value)}
                  />
                  <Button onClick={handleBulkSelect} variant="outline">
                    Toplu Seç
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Flaş Ürünler ({filteredData.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-3 text-left font-semibold min-w-[180px]">Ürün</th>
                        <th className="p-3 text-center font-semibold">Stok</th>
                        <th className="p-3 text-center font-semibold min-w-[120px]">Kategori</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Sistem Fiyatı</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">24 Saat</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">3 Saat</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Barem</th>
                        <th className="p-3 text-center font-semibold min-w-[160px]">Manuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => {
                        const matchedProduct = getMatchedProduct(item);
                        const category = getCategory(item);
                        const systemPrice = getSystemPrice(item);
                        const commissionRate24h = getCommissionRate(item, item.price_24h);
                        const commissionRate3h = getCommissionRate(item, item.price_3h);

                        return (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{item.product_name}</div>
                              {!matchedProduct && (
                                <Badge variant="outline" className="mt-1 text-xs text-rose-600 border-rose-300">
                                  Master eşleşmedi
                                </Badge>
                              )}
                              {item.has_commission_tariff === 'Var' && (
                                <Badge variant="outline" className="mt-1 text-xs">Komisyon Tarifesi: Var</Badge>
                              )}
                            </td>
                            <td className="p-3 text-center">{item.stock}</td>
                            <td className="p-3 text-center">
                              {category ? (
                                <span className="text-xs font-medium">{category.name}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {systemPrice ? (
                                <div className="text-center">
                                  <div className="font-semibold">₺{systemPrice.sale_price?.toFixed(2)}</div>
                                  <div className="text-xs text-slate-500">
                                    {matchedProduct?.desi} desi • {systemPrice.barem_used === 'barem1' ? 'Barem 1' : systemPrice.barem_used === 'barem2' ? 'Barem 2' : 'Desi'}
                                  </div>
                                  <div className="text-xs text-slate-500">Kom: %{systemPrice.commission_rate || 0}</div>
                                  <div className={`text-xs font-medium ${(systemPrice.profit_rate || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ₺{(systemPrice.net_profit || 0).toFixed(2)} (%{(systemPrice.profit_rate || 0).toFixed(1)})
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {item.price_24h > 0 ? (
                                <div className={`border rounded-lg p-2 ${item.selected_type === 'flash_24h' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                  <div className="text-xs font-semibold text-slate-700 mb-1">₺{item.price_24h.toFixed(2)}</div>
                                  {item.start_24h && item.end_24h && (
                                    <div className="text-xs text-slate-400 mb-1">
                                      {format(new Date(item.start_24h), 'd MMM', { locale: tr })} - {format(new Date(item.end_24h), 'd MMM', { locale: tr })}
                                    </div>
                                  )}
                                  {commissionRate24h !== null ? (
                                    <>
                                      <div className="text-xs text-slate-500">
                                        Kom: %{commissionRate24h}
                                      </div>
                                      {(() => {
                                        const { profit, profitRate } = calculateProfit(item.price_24h, commissionRate24h, item);
                                        const isProfitable = profit > 0;
                                        return (
                                          <>
                                            <div className="flex items-center justify-between mt-1">
                                              <div className={`text-xs font-semibold ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isProfitable ? '+' : ''}₺{profit.toFixed(2)} (%{profitRate.toFixed(1)})
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-5 w-5 p-0"
                                                onClick={() => {
                                                  const calc = calculateProfit(item.price_24h, commissionRate24h, item);
                                                  if (calc.breakdown && calc.matchedProduct && calc.platform) {
                                                    setDetailModal({
                                                      open: true,
                                                      product: calc.matchedProduct,
                                                      priceData: {
                                                        sale_price: item.price_24h,
                                                        net_profit: calc.profit,
                                                        profit_rate: calc.profitRate,
                                                        shipping_cost: calc.breakdown.shippingCost,
                                                        packaging_cost: calc.breakdown.packagingCost,
                                                        commission_amount: calc.breakdown.commissionAmount,
                                                        withholding_amount: calc.breakdown.withholdingAmount,
                                                        service_fee: calc.breakdown.serviceFee,
                                                        net_vat: calc.breakdown.netVat,
                                                        corporate_tax_amount: calc.breakdown.corporateTaxAmount,
                                                        net_profit_before_tax: calc.breakdown.netProfitBeforeTax,
                                                        barem_used: calc.baremUsed
                                                      },
                                                      calculationDetails: {
                                                        productCost: calc.matchedProduct.cost,
                                                        productVatRate: calc.matchedProduct.vat_rate || 20,
                                                        commissionRate: commissionRate24h
                                                      }
                                                    });
                                                  }
                                                }}
                                              >
                                                <Info className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant={item.selected_type === 'flash_24h' ? 'default' : 'outline'}
                                              onClick={() => handlePriceSelect(uploadedData.indexOf(item), 'flash_24h', item.price_24h)}
                                              className="w-full mt-2 h-7 text-xs"
                                            >
                                              {item.selected_type === 'flash_24h' ? 'Seçili' : 'Seç'}
                                            </Button>
                                          </>
                                        );
                                      })()}
                                    </>
                                  ) : (
                                    <div className="text-center text-slate-400 text-xs">-</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {item.price_3h > 0 ? (
                                <div className={`border rounded-lg p-2 ${item.selected_type === 'flash_3h' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                  <div className="text-xs font-semibold text-slate-700 mb-1">₺{item.price_3h.toFixed(2)}</div>
                                  {item.start_3h && item.end_3h && (
                                    <div className="text-xs text-slate-400 mb-1">
                                      {format(new Date(item.start_3h), 'd MMM', { locale: tr })} - {format(new Date(item.end_3h), 'd MMM', { locale: tr })}
                                    </div>
                                  )}
                                  {commissionRate3h !== null ? (
                                    <>
                                      <div className="text-xs text-slate-500">
                                        Kom: %{commissionRate3h}
                                      </div>
                                      {(() => {
                                        const { profit, profitRate } = calculateProfit(item.price_3h, commissionRate3h, item);
                                        const isProfitable = profit > 0;
                                        return (
                                          <>
                                            <div className="flex items-center justify-between mt-1">
                                              <div className={`text-xs font-semibold ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isProfitable ? '+' : ''}₺{profit.toFixed(2)} (%{profitRate.toFixed(1)})
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-5 w-5 p-0"
                                                onClick={() => {
                                                  const calc = calculateProfit(item.price_3h, commissionRate3h, item);
                                                  if (calc.breakdown && calc.matchedProduct && calc.platform) {
                                                    setDetailModal({
                                                      open: true,
                                                      product: calc.matchedProduct,
                                                      priceData: {
                                                        sale_price: item.price_3h,
                                                        net_profit: calc.profit,
                                                        profit_rate: calc.profitRate,
                                                        shipping_cost: calc.breakdown.shippingCost,
                                                        packaging_cost: calc.breakdown.packagingCost,
                                                        commission_amount: calc.breakdown.commissionAmount,
                                                        withholding_amount: calc.breakdown.withholdingAmount,
                                                        service_fee: calc.breakdown.serviceFee,
                                                        net_vat: calc.breakdown.netVat,
                                                        corporate_tax_amount: calc.breakdown.corporateTaxAmount,
                                                        net_profit_before_tax: calc.breakdown.netProfitBeforeTax,
                                                        barem_used: calc.baremUsed
                                                      },
                                                      calculationDetails: {
                                                        productCost: calc.matchedProduct.cost,
                                                        productVatRate: calc.matchedProduct.vat_rate || 20,
                                                        commissionRate: commissionRate3h
                                                      }
                                                    });
                                                  }
                                                }}
                                              >
                                                <Info className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant={item.selected_type === 'flash_3h' ? 'default' : 'outline'}
                                              onClick={() => handlePriceSelect(uploadedData.indexOf(item), 'flash_3h', item.price_3h)}
                                              className="w-full mt-2 h-7 text-xs"
                                            >
                                              {item.selected_type === 'flash_3h' ? 'Seçili' : 'Seç'}
                                            </Button>
                                          </>
                                        );
                                      })()}
                                    </>
                                  ) : (
                                    <div className="text-center text-slate-400 text-xs">-</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Barem */}
                            <td className="p-3">
                              {(() => {
                                const selectedPrice = item.selected_price || 0;
                                if (selectedPrice === 0 || item.selected_type === 'none') return (
                                  <div className="text-center text-slate-400 text-xs">-</div>
                                );

                                const selectedCommissionRate = getCommissionRate(item, selectedPrice);
                                if (selectedCommissionRate === null) return (
                                  <div className="text-center text-slate-400 text-xs">-</div>
                                );

                                const currentCalc = calculateProfit(selectedPrice, selectedCommissionRate, item);
                                const currentProfitRate = currentCalc.profitRate;
                                const currentBaremUsed = currentCalc.baremUsed;

                                if (currentBaremUsed === 'barem1' || currentBaremUsed === 'barem2') {
                                  return <div className="text-center text-slate-400 text-xs">-</div>;
                                }

                                let bestBaremSuggestion = null;

                                if (selectedPrice > 299.99) {
                                  const barem2CommissionRate = getCommissionRate(item, 299.99);
                                  if (barem2CommissionRate !== null) {
                                    const barem2Calc = calculateProfit(299.99, barem2CommissionRate, item);
                                    if (barem2Calc.baremUsed === 'barem2' && barem2Calc.profitRate > currentProfitRate) {
                                      bestBaremSuggestion = {
                                        price: 299.99,
                                        profit: barem2Calc.profit,
                                        profitRate: barem2Calc.profitRate,
                                        baremType: 'Barem 2',
                                        breakdown: barem2Calc.breakdown,
                                        matchedProduct: barem2Calc.matchedProduct,
                                        platform: barem2Calc.platform,
                                        commissionRate: barem2CommissionRate
                                      };
                                    }
                                  }
                                }

                                if (selectedPrice > 149.99) {
                                  const barem1CommissionRate = getCommissionRate(item, 149.99);
                                  if (barem1CommissionRate !== null) {
                                    const barem1Calc = calculateProfit(149.99, barem1CommissionRate, item);
                                    if (barem1Calc.baremUsed === 'barem1' && barem1Calc.profitRate > currentProfitRate) {
                                      if (!bestBaremSuggestion || barem1Calc.profitRate > bestBaremSuggestion.profitRate) {
                                        bestBaremSuggestion = {
                                          price: 149.99,
                                          profit: barem1Calc.profit,
                                          profitRate: barem1Calc.profitRate,
                                          baremType: 'Barem 1',
                                          breakdown: barem1Calc.breakdown,
                                          matchedProduct: barem1Calc.matchedProduct,
                                          platform: barem1Calc.platform,
                                          commissionRate: barem1CommissionRate
                                        };
                                      }
                                    }
                                  }
                                }

                                if (!bestBaremSuggestion) {
                                  return <div className="text-center text-slate-400 text-xs">-</div>;
                                }

                                const profitIncrease = bestBaremSuggestion.profitRate - currentProfitRate;

                                return (
                                  <div className="border rounded-lg p-2 border-amber-300 bg-amber-50">
                                    <div className="text-xs font-semibold text-amber-800 mb-1">
                                      {bestBaremSuggestion.baremType} Önerisi
                                    </div>
                                    <div className="text-xs text-slate-600">
                                      Fiyat: ₺{bestBaremSuggestion.price.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                      Kom: %{bestBaremSuggestion.commissionRate}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <div className="text-xs font-semibold text-emerald-600">
                                        +₺{bestBaremSuggestion.profit.toFixed(2)} (%{bestBaremSuggestion.profitRate.toFixed(1)})
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 p-0"
                                        onClick={() => {
                                          if (bestBaremSuggestion.breakdown && bestBaremSuggestion.matchedProduct && bestBaremSuggestion.platform) {
                                            setDetailModal({
                                              open: true,
                                              product: bestBaremSuggestion.matchedProduct,
                                              priceData: {
                                                sale_price: bestBaremSuggestion.price,
                                                net_profit: bestBaremSuggestion.profit,
                                                profit_rate: bestBaremSuggestion.profitRate,
                                                shipping_cost: bestBaremSuggestion.breakdown.shippingCost,
                                                packaging_cost: bestBaremSuggestion.breakdown.packagingCost,
                                                commission_amount: bestBaremSuggestion.breakdown.commissionAmount,
                                                withholding_amount: bestBaremSuggestion.breakdown.withholdingAmount,
                                                service_fee: bestBaremSuggestion.breakdown.serviceFee,
                                                net_vat: bestBaremSuggestion.breakdown.netVat,
                                                corporate_tax_amount: bestBaremSuggestion.breakdown.corporateTaxAmount,
                                                net_profit_before_tax: bestBaremSuggestion.breakdown.netProfitBeforeTax,
                                                barem_used: bestBaremSuggestion.baremType === 'Barem 1' ? 'barem1' : 'barem2'
                                              },
                                              calculationDetails: {
                                                productCost: bestBaremSuggestion.matchedProduct.cost,
                                                productVatRate: bestBaremSuggestion.matchedProduct.vat_rate || 20,
                                                commissionRate: bestBaremSuggestion.commissionRate
                                              }
                                            });
                                          }
                                        }}
                                      >
                                        <Info className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="text-xs text-amber-700 font-medium mt-1">
                                      +%{profitIncrease.toFixed(1)} kar artışı
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePriceSelect(uploadedData.indexOf(item), item.selected_type, bestBaremSuggestion.price)}
                                      className="w-full mt-2 h-7 text-xs border-amber-400 hover:bg-amber-100"
                                    >
                                      Uygula
                                    </Button>
                                  </div>
                                );
                              })()}
                            </td>

                            <td className="p-3">
                              <div className={`border rounded-lg p-2 ${item.selected_type === 'manual' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                <div className="text-xs font-semibold text-slate-700 mb-2">Manuel Fiyat</div>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={item.manual_price || ''}
                                      onChange={(e) => handleManualPriceChange(uploadedData.indexOf(item), e.target.value)}
                                      placeholder="Fiyat girin"
                                      className="h-8 text-xs mb-2"
                                    />
                                    {item.manual_price > 0 && (
                                     <>
                                       {item.manual_time_range_error ? (
                                         <div className="mb-2 p-2 bg-rose-50 border border-rose-200 rounded">
                                           <div className="text-xs text-rose-700 font-medium">
                                             ⚠ Fiyat hem 3 hem 24 saatlik fiyattan büyük olamaz
                                           </div>
                                         </div>
                                       ) : (
                                         <>
                                           <div className="flex items-center justify-between mb-2">
                                             <div className={`text-xs font-semibold ${(item.manual_profit || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                               {(item.manual_profit || 0) > 0 ? '+' : ''}₺{(item.manual_profit || 0).toFixed(2)} (%{(item.manual_profit_rate || 0).toFixed(1)})
                                             </div>
                                             <Button
                                               size="sm"
                                               variant="ghost"
                                               className="h-5 w-5 p-0"
                                               onClick={() => {
                                                 const manualCommissionRate = getCommissionRate(item, item.manual_price);
                                                 const calc = calculateProfit(item.manual_price, manualCommissionRate, item);
                                                 if (calc.breakdown && calc.matchedProduct && calc.platform) {
                                                   setDetailModal({
                                                     open: true,
                                                     product: calc.matchedProduct,
                                                     priceData: {
                                                       sale_price: item.manual_price,
                                                       net_profit: calc.profit,
                                                       profit_rate: calc.profitRate,
                                                       shipping_cost: calc.breakdown.shippingCost,
                                                       packaging_cost: calc.breakdown.packagingCost,
                                                       commission_amount: calc.breakdown.commissionAmount,
                                                       withholding_amount: calc.breakdown.withholdingAmount,
                                                       service_fee: calc.breakdown.serviceFee,
                                                       net_vat: calc.breakdown.netVat,
                                                        corporate_tax_amount: calc.breakdown.corporateTaxAmount,
                                                        net_profit_before_tax: calc.breakdown.netProfitBeforeTax,
                                                       barem_used: calc.baremUsed
                                                     },
                                                     calculationDetails: {
                                                       productCost: calc.matchedProduct.cost,
                                                       productVatRate: calc.matchedProduct.vat_rate || 20,
                                                       commissionRate: manualCommissionRate
                                                     }
                                                   });
                                                 }
                                               }}
                                             >
                                               <Info className="h-3 w-3" />
                                             </Button>
                                           </div>
                                           {item.manual_time_range_options && item.manual_time_range_options.length > 1 ? (
                                             <div className="mb-2">
                                               <Select 
                                                 value={item.manual_time_range || 'flash_3h'} 
                                                 onValueChange={(val) => {
                                                   const updated = [...uploadedData];
                                                   updated[uploadedData.indexOf(item)].manual_time_range = val;
                                                   setUploadedData(updated);
                                                 }}
                                               >
                                                 <SelectTrigger className="h-7 text-xs">
                                                   <SelectValue />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                   <SelectItem value="flash_3h">3 Saatlik Zaman Aralığı</SelectItem>
                                                   <SelectItem value="flash_24h">24 Saatlik Zaman Aralığı</SelectItem>
                                                 </SelectContent>
                                               </Select>
                                             </div>
                                           ) : (
                                             item.manual_time_range && (
                                               <div className="mb-2 text-xs text-slate-600">
                                                 Zaman: {item.manual_time_range === 'flash_24h' ? '24 Saat' : '3 Saat'}
                                               </div>
                                             )
                                           )}
                                         </>
                                       )}
                                     </>
                                    )}
                                    <Button
                                      size="sm"
                                      variant={item.selected_type === 'manual' ? 'default' : 'outline'}
                                      onClick={() => handlePriceSelect(uploadedData.indexOf(item), 'manual', item.manual_price)}
                                      className="w-full h-7 text-xs"
                                      disabled={!item.manual_price || item.manual_price <= 0 || item.manual_time_range_error}
                                    >
                                      {item.selected_type === 'manual' ? 'Seçili' : 'Seç'}
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
              <p className="text-sm text-slate-400">Platform seçip Excel dosyasını yükleyin</p>
            </CardContent>
          </Card>
        )}
      </div>

      <PriceDetailModal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, product: null, priceData: null, calculationDetails: null })}
        product={detailModal.product}
        platform={detailModal.product && platforms.find(p => p.name === selectedPlatform.split(' ')[0])}
        priceData={detailModal.priceData}
        calculationDetails={detailModal.calculationDetails}
      />
    </div>
  );
}
