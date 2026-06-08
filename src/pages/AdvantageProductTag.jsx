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
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function AdvantageProductTag() {
  const [userEmail, setUserEmail] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [dateRangeValue, setDateRangeValue] = useState({ from: undefined, to: undefined });
  const [uploadedData, setUploadedData] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [originalExcelData, setOriginalExcelData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterColumn, setFilterColumn] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [bulkColumn, setBulkColumn] = useState('');
  const [bulkMinProfitRate, setBulkMinProfitRate] = useState('');
  const [bulkMinProfitAmount, setBulkMinProfitAmount] = useState('');
  const [detailModal, setDetailModal] = useState({ open: false, product: null, priceData: null, calculationDetails: null });
  const [calendarKey, setCalendarKey] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  const { data: savedItems = [] } = useQuery({
    queryKey: ['advantageProductTags', userEmail],
    queryFn: () => db.entities.AdvantageProductTag.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: marketplaceProducts = [] } = useQuery({
    queryKey: ['marketplaceProducts', userEmail],
    queryFn: () => db.entities.MarketplaceProduct.filter({ created_by: userEmail }),
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

  const { data: trendyolPriceRanges = [] } = useQuery({
    queryKey: ['trendyolPriceRanges', userEmail],
    queryFn: () => db.entities.TrendyolPriceRange.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const uniquePlatforms = platforms.filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
  const trendyolPlatforms = uniquePlatforms
    .filter(p => p.platform_type === 'trendyol' && p.is_active !== false)
    .filter((p, idx, arr) => arr.findIndex(x => x.name === p.name) === idx);
  const hasTrendyol = trendyolPlatforms.length > 0;

  const trendyolPlatformIds = trendyolPlatforms.map(p => String(p.id));
  const trendyolPlatformNames = trendyolPlatforms.map(p => (p.name || '').toLowerCase().trim());

  const findCommission = (matchedProduct) => {
    if (!matchedProduct) return null;
    return commissions.find(c =>
      c.is_active !== false &&
      (
        trendyolPlatformIds.includes(String(c.platform_id)) ||
        trendyolPlatformNames.includes((c.platform_name || '').toLowerCase().trim())
      ) &&
      (
        (matchedProduct.category_id && String(c.category_id) === String(matchedProduct.category_id)) ||
        (matchedProduct.category_name && (c.category_name || '').toLowerCase().trim() === (matchedProduct.category_name || '').toLowerCase().trim())
      )
    ) || null;
  };

  const findCommissionByCategoryName = (categoryName) => {
    if (!categoryName) return null;
    return commissions.find(c =>
      c.is_active !== false &&
      (
        trendyolPlatformIds.includes(String(c.platform_id)) ||
        trendyolPlatformNames.includes((c.platform_name || '').toLowerCase().trim())
      ) &&
      (c.category_name || '').toLowerCase().trim() === categoryName.toLowerCase().trim()
    ) || null;
  };

  React.useEffect(() => {
    if (trendyolPlatforms.length === 1 && !selectedPlatform) {
      setSelectedPlatform(trendyolPlatforms[0].name);
    }
  }, [trendyolPlatforms.length]);

  React.useEffect(() => {
    if (!selectedPlatform || savedItems.length === 0) return;
    if (!dateRangeValue?.from || !dateRangeValue?.to) return;

    const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
    const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');
    const filtered = savedItems.filter(
      r => r.platform_account === selectedPlatform && r.start_date === startDate && r.end_date === endDate
    );
    setUploadedData(filtered);
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
  }, [savedItems, selectedPlatform, dateRangeValue?.from, dateRangeValue?.to]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedPlatform) { toast.error('Lütfen platform seçin'); return; }
    if (!dateRangeValue?.from || !dateRangeValue?.to) { toast.error('Lütfen tarih aralığı seçin'); return; }

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
        setOriginalExcelData({ workbook, sheetName, jsonData });

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

          if (marketplaceProduct?.matched_product_id) {
            matchedProduct = products.find(p => p.id === marketplaceProduct.matched_product_id);
          }

          let commissionRate = 0;
          if (matchedProduct) {
            const commission = findCommission(matchedProduct);
            if (commission?.commission_rate) commissionRate = commission.commission_rate;
          }
          if (!commissionRate) {
            const catName = matchedProduct?.category_name || row['KATEGORİ'] || '';
            const catCommission = findCommissionByCategoryName(catName);
            if (catCommission?.commission_rate) commissionRate = catCommission.commission_rate;
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
            stock: parseFloat(row['STOK']) || 0,
            brand: row['MARKA'] || '',
            commission_rate: commissionRate,
            has_commission_tariff: row['Ürün Komisyon Tarife Seçeneği'] || row['KOMİSYON TARİFESİ'] || 'Yok',
            advantage_min: parseFloat(row['Avantajlı Ürün Alt Limit'] ?? row['1 YILDIZ ALT FİYAT']) || 0,
            advantage_max: parseFloat(row['Avantajlı Ürün Üst Limit'] ?? row['1 YILDIZ ÜST FİYAT']) || 0,
            advantage_commission: parseFloat(row['Avantajlı Ürün Komisyon'] ?? row['1 YILDIZ KOMİSYON']) || 0,
            super_advantage_min: parseFloat(row['Çok Avantajlı Ürün Alt Limit'] ?? row['2 YILDIZ ALT FİYAT']) || 0,
            super_advantage_max: parseFloat(row['Çok Avantajlı Ürün Üst Limit'] ?? row['2 YILDIZ ÜST FİYAT']) || 0,
            super_advantage_commission: parseFloat(row['Çok Avantajlı Ürün Komisyon'] ?? row['2 YILDIZ KOMİSYON']) || 0,
            mega_advantage_min: parseFloat(row['Süper Avantajlı Ürün Alt Limit'] ?? row['3 YILDIZ ALT FİYAT'] ?? row['3 YILDIZ ÜST FİYAT']) || 0,
            mega_advantage_max: parseFloat(row['Süper Avantajlı Ürün Üst Limit'] ?? row['3 YILDIZ ÜST FİYAT']) || 0,
            mega_advantage_commission: parseFloat(row['Süper Avantajlı Ürün Komisyon'] ?? row['3 YILDIZ KOMİSYON']) || 0,
            current_base_price: parseFloat(row['KOMİSYONA ESAS FİYAT'] ?? row['MÜŞTERİNİN GÖRDÜĞÜ FİYAT']) || 0,
            current_commission: parseFloat(row['GÜNCEL KOMİSYON']) || 0,
            current_tsf: parseFloat(row['GÜNCEL TSF'] ?? row['TRENDYOL SATIŞ FİYATI']) || 0,
            selected_range: 'none',
            manual_price: 0,
            matched_product_id: matchedProduct?.id || null
          };
        });

        const oldRecords = savedItems.filter(
          r => r.platform_account === selectedPlatform && r.start_date === startDate && r.end_date === endDate
        );
        if (oldRecords.length > 0) {
          for (let i = 0; i < oldRecords.length; i += 30) {
            const batch = oldRecords.slice(i, i + 30);
            await Promise.all(batch.map(r => db.entities.AdvantageProductTag.delete(r.id)));
            if (i + 30 < oldRecords.length) await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        setUploadProgress({ current: 0, total: parsed.length });
        for (let i = 0; i < parsed.length; i += 30) {
          const batch = parsed.slice(i, i + 30);
          if (i === 0 && batch.length > 0 && excelFileUrl) {
            batch[0].excel_file_url = excelFileUrl;
          }
          await db.entities.AdvantageProductTag.bulkCreate(batch);
          setUploadProgress({ current: Math.min(i + 30, parsed.length), total: parsed.length });
          if (i + 30 < parsed.length) await new Promise(resolve => setTimeout(resolve, 200));
        }

        setUploadedData(parsed);
        setUploadProgress({ current: 0, total: 0 });
        queryClient.invalidateQueries(['advantageProductTags']);
        toast.success(`${parsed.length} ürün yüklendi ve kaydedildi`);
      } catch (error) {
        setUploadProgress({ current: 0, total: 0 });
        toast.error('Excel yüklemesi başarısız: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const getMatchedProduct = (item) => {
    if (item.matched_product_id) return products.find(p => p.id === item.matched_product_id);
    const mpMatch = marketplaceProducts.find(mp => mp.platform_account === selectedPlatform && mp.barkod === item.barcode);
    if (mpMatch?.matched_product_id) return products.find(p => p.id === mpMatch.matched_product_id);
    return null;
  };

  const getPackageCost = (packageId) => {
    const pkg = packages.find(p => p.id === packageId);
    return pkg?.total_cost || 0;
  };

  const getSystemPrice = (item) => {
    const matchedProduct = getMatchedProduct(item);
    if (!matchedProduct) return null;
    const platformObj = uniquePlatforms.find(p => p.name === selectedPlatform);
    if (!platformObj) return null;
    const priceInfo = productPrices.find(pp => pp.product_id === matchedProduct.id && pp.platform_id === platformObj.id);
    if (!priceInfo) return null;
    const commission = findCommission(matchedProduct);
    const commissionRate = commission?.commission_rate ?? item.commission_rate ?? item.current_commission ?? 0;
    return { ...priceInfo, commission_rate: commissionRate };
  };

  const calculateProfit = (price, commissionRate, item) => {
    try {
      if (!price || price <= 0) return { profit: 0, profitRate: 0, breakdown: null };
      const matchedProduct = getMatchedProduct(item);
      if (!matchedProduct) return { profit: 0, profitRate: 0, breakdown: null };
      const platformObj = uniquePlatforms.find(p => p.name === selectedPlatform);
      if (!platformObj) return { profit: 0, profitRate: 0, breakdown: null };

      const platformShippingRates = shippingRates.filter(r =>
        r.is_active !== false && (r.platform_id === platformObj.id || r.platform_type === platformObj.platform_type)
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

      if (canUseBarem && price > 0) {
        if (price >= 0 && price <= 149.99) {
          const r = platformShippingRates.find(r => r.rate_type === 'barem1');
          if (r) { shippingCost = r.price; shippingVatRate = r.vat_rate || 20; baremUsed = 'barem1'; }
        } else if (price >= 150 && price <= 299.99) {
          const r = platformShippingRates.find(r => r.rate_type === 'barem2');
          if (r) { shippingCost = r.price; shippingVatRate = r.vat_rate || 20; baremUsed = 'barem2'; }
        }
      }

      if (shippingCost === 0) {
        const desiRate = findDesiShippingRate(platformShippingRates, matchedProduct.desi || 0);
        shippingCost = desiRate?.price || 0;
        shippingVatRate = desiRate?.vat_rate || 20;
        baremUsed = 'desi';
      }

      const breakdown = calculatePriceBreakdown({
        salePriceInclVat: parseFloat(price),
        productCost: matchedProduct.cost || 0,
        productVatRate: matchedProduct.vat_rate || 20,
        shippingCost,
        shippingVatRate,
        commissionRate: parseFloat(commissionRate) || 0,
        commissionVatRate: 20,
        platform: platformObj,
        baremUsed,
        packagingCost,
        printingCost,
        extraCost,
        isSameDayDelivery: matchedProduct.same_day_delivery || false
      });

      return { profit: breakdown.netProfit || 0, profitRate: breakdown.profitRate || 0, breakdown, matchedProduct, platform: platformObj, baremUsed };
    } catch (e) {
      return { profit: 0, profitRate: 0, breakdown: null };
    }
  };

  const getDynamicCommissionForPrice = (item, price) => {
    const hasTariff = item.has_commission_tariff === 'Var' || item.has_commission_tariff === 'true';

    // ✅ Tarife "Var" ise: verilen fiyatın Ürün Komisyon Tarifesi'nde hangi aralığa girdiğini kontrol et, o aralığın komisyonunu al
    if (hasTariff && price && price > 0 && item.barcode) {
      const priceRangeRecord = trendyolPriceRanges.find(pr => 
        pr.barcode === item.barcode && 
        pr.platform_account === selectedPlatform
      );
      
      if (priceRangeRecord) {
        let rangeCommission = 0;

        // Fiyatın hangi aralığa girdiğini kontrol et
        if (price >= (priceRangeRecord.price_range_1_min || 0) && price < (priceRangeRecord.price_range_2_min || Infinity)) {
          rangeCommission = priceRangeRecord.commission_1 || 0;
        } else if (price >= (priceRangeRecord.price_range_2_min || 0) && price <= (priceRangeRecord.price_range_2_max || Infinity)) {
          rangeCommission = priceRangeRecord.commission_2 || 0;
        } else if (price >= (priceRangeRecord.price_range_3_min || 0) && price <= (priceRangeRecord.price_range_3_max || Infinity)) {
          rangeCommission = priceRangeRecord.commission_3 || 0;
        } else if (price >= (priceRangeRecord.price_range_4_min || 0) && price <= (priceRangeRecord.price_range_4_max || Infinity)) {
          rangeCommission = priceRangeRecord.commission_4 || 0;
        }

        if (rangeCommission > 0) {
          return rangeCommission;
        }
      }
    }

    // Tarife "Yok" veya uygun aralık bulunamadıysa: sistem komisyonunu kullan
    if (item.commission_rate && item.commission_rate > 0) return item.commission_rate;

    const matchedProduct = getMatchedProduct(item);
    if (matchedProduct) {
      const commission = findCommission(matchedProduct);
      if (commission?.commission_rate && commission.commission_rate > 0) return commission.commission_rate;
    }

    if (item.category) {
      const catCommission = findCommissionByCategoryName(item.category);
      if (catCommission?.commission_rate && catCommission.commission_rate > 0) return catCommission.commission_rate;
    }

    return item.current_commission || 0;
  };

  // ✅ Süper Avantaj → Çok Avantaj → Avantaj sırasıyla
  const handleSmartAutoSelect = () => {
    const platformObj = uniquePlatforms.find(p => p.name === selectedPlatform);
    if (!platformObj) { toast.error('Platform bulunamadı'); return; }

    let selectedCount = 0;
    let skippedAlreadySelected = 0;
    let skippedNoProduct = 0;
    let skippedNoMatch = 0;
    let skippedNoCommission = 0;
    let skippedTargetNotMet = 0;

    const updated = uploadedData.map(item => {
      // Elle fiyat girilen seçimleri koru; diğer tüm önceki seçimleri sıfırlayıp baştan değerlendir
      const isManual = item.selected_range === 'manual' || (item.manual_price && item.manual_price > 0);
      if (isManual) {
        skippedAlreadySelected++;
        return item;
      }

      const matchedProduct = getMatchedProduct(item);
      if (!matchedProduct) { skippedNoProduct++; return { ...item, selected_range: 'none', selected_price: 0 }; }

      const commission = findCommission(matchedProduct);
      if (!commission) { skippedNoMatch++; return { ...item, selected_range: 'none', selected_price: 0 }; }

      // ✅ 0/boş hedefleri "tanımsız" say — aksi halde hedef tutar 0 iken "kâr >= 0"
      //    her zaman sağlanıp, indirimli hedef kâr oranı dikkate alınmadan en
      //    indirimli aralık seçiliyordu. 0'ı null'a çevirince sadece geçerli hedefler işler.
      const toNum = (v) => (v != null && v !== '') ? Number(v) : null;
      const rawRate = toNum(commission.discounted_target_profit_rate);
      const rawAmount = toNum(commission.discounted_target_profit_amount);
      const rawMin = toNum(commission.discounted_minimum_profit_amount);
      const targetRate = (rawRate != null && rawRate > 0) ? rawRate : null;
      const targetAmount = (rawAmount != null && rawAmount > 0) ? rawAmount : null;
      const minAmount = (rawMin != null && rawMin > 0) ? rawMin : null;

      const hasDiscountedTarget = targetRate != null || targetAmount != null;
      if (!hasDiscountedTarget) { skippedNoCommission++; return { ...item, selected_range: 'none', selected_price: 0 }; }

      // Süper Avantaj → Çok Avantaj → Avantaj (en indirimliden başla),
      // hedefi karşılayan İLK aralıkta dur. Komisyon kartla aynı (getDynamicCommissionForPrice).
      const ranges = [
        { rangeType: 'mega_advantage', price: item.mega_advantage_max, min: item.mega_advantage_min, commission: getDynamicCommissionForPrice(item, item.mega_advantage_max) },
        { rangeType: 'super_advantage', price: item.super_advantage_max, min: item.super_advantage_min, commission: getDynamicCommissionForPrice(item, item.super_advantage_max) },
        { rangeType: 'advantage', price: item.advantage_max, min: item.advantage_min, commission: getDynamicCommissionForPrice(item, item.advantage_max) },
      ];

      for (const range of ranges) {
        if (!range.price || range.price <= 0 || !range.min || range.min <= 0) continue;
        if (!range.commission || range.commission <= 0) continue;

        const calc = calculateProfit(range.price, range.commission, item);
        const profit = calc.profit || 0;
        const profitRate = calc.profitRate || 0;

        // İndirimli minimum kâr tutarı altındaki aralıkları ele
        if (minAmount != null && profit < minAmount) continue;

        // Tanımlı olan TÜM hedefler sağlanmalı (sıkı kontrol):
        // - indirimli hedef kâr oranı varsa, kâr oranı >= hedef OLMALI
        // - indirimli hedef kâr tutarı varsa, kâr tutarı >= hedef OLMALI
        let meetsTarget = true;
        if (targetRate != null && profitRate < targetRate) meetsTarget = false;
        if (targetAmount != null && profit < targetAmount) meetsTarget = false;

        if (meetsTarget) {
          selectedCount++;
          return { ...item, selected_range: range.rangeType, selected_price: range.price };
        }
      }

      skippedTargetNotMet++;
      return { ...item, selected_range: 'none', selected_price: 0 };
    });

    setUploadedData(updated);

    const parts = [];
    if (selectedCount > 0) parts.push(`✅ ${selectedCount} ürün seçildi`);
    if (skippedAlreadySelected > 0) parts.push(`${skippedAlreadySelected} zaten seçili/manuel`);
    if (skippedNoProduct > 0) parts.push(`⚠️ ${skippedNoProduct} sistem ürünüyle eşleşmedi`);
    if (skippedNoMatch > 0) parts.push(`⚠️ ${skippedNoMatch} komisyon kaydı bulunamadı`);
    if (skippedNoCommission > 0) parts.push(`⚠️ ${skippedNoCommission} indirimli hedef kâr tanımlı değil`);
    if (skippedTargetNotMet > 0) parts.push(`⚠️ ${skippedTargetNotMet} hiçbir aralıkta hedef karşılanmadı`);

    if (selectedCount === 0) toast.warning(parts.join(' • ') || 'Hiçbir ürün seçilemedi');
    else toast.success(parts.join(' • '));
  };

  const handleBulkSelect = () => {
    if (!bulkColumn) { toast.error('Lütfen kolon seçin'); return; }
    const minRate = parseFloat(bulkMinProfitRate) || 0;
    const minAmount = parseFloat(bulkMinProfitAmount) || 0;

    const updated = uploadedData.map(item => {
      if (item.selected_range !== 'none' && item.selected_range !== bulkColumn) return item;

      let price = 0, commissionRate = 0;
      if (bulkColumn === 'advantage') { price = item.advantage_min; commissionRate = getDynamicCommissionForPrice(item, item.advantage_min); }
      else if (bulkColumn === 'super_advantage') { price = item.super_advantage_min; commissionRate = getDynamicCommissionForPrice(item, item.super_advantage_min); }
      else if (bulkColumn === 'mega_advantage') { price = item.mega_advantage_min; commissionRate = getDynamicCommissionForPrice(item, item.mega_advantage_min); }

      if (!price || price <= 0) {
        if (item.selected_range === bulkColumn) return { ...item, selected_range: 'none', selected_price: 0 };
        return item;
      }

      const { profit, profitRate } = calculateProfit(price, commissionRate, item);
      if (profitRate >= minRate && profit >= minAmount) return { ...item, selected_range: bulkColumn, selected_price: price };
      if (item.selected_range === bulkColumn) return { ...item, selected_range: 'none', selected_price: 0 };
      return item;
    });

    setUploadedData(updated);
    toast.success('Toplu seçim yapıldı');
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
      const commissionToUse = getDynamicCommissionForPrice(item, manualPrice);
      const { profit, profitRate } = calculateProfit(manualPrice, commissionToUse, item);
      updated[index].manual_profit = profit;
      updated[index].manual_profit_rate = profitRate;
      updated[index].manual_commission = commissionToUse;
    } else {
      updated[index].manual_profit = 0;
      updated[index].manual_profit_rate = 0;
      updated[index].manual_commission = 0;
    }
    setUploadedData(updated);
  };

  const handleSave = async () => {
    const selectedItems = uploadedData.filter(item => item.selected_range !== 'none');
    if (selectedItems.length === 0) { toast.error('Lütfen en az bir ürün seçin'); return; }
    try {
      // Ekrandaki TÜM kayıtları DB ile eşitle: kayıtlı olanları güncelle
      // (seçimi kaldırılanlar 'none' olarak yazılır), id'siz seçili olanları oluştur.
      // Böylece eski/yanlış seçimler DB'de kalmaz, sayfa yenilenince geri gelmez.
      const toUpdate = uploadedData.filter(item => item.id);
      const toCreate = uploadedData.filter(item => !item.id && item.selected_range !== 'none');

      for (let i = 0; i < toUpdate.length; i += 30) {
        const batch = toUpdate.slice(i, i + 30);
        await Promise.all(batch.map(item => db.entities.AdvantageProductTag.update(item.id, item)));
        if (i + 30 < toUpdate.length) await new Promise(resolve => setTimeout(resolve, 200));
      }
      for (let i = 0; i < toCreate.length; i += 30) {
        const batch = toCreate.slice(i, i + 30);
        await Promise.all(batch.map(item => db.entities.AdvantageProductTag.create(item)));
        if (i + 30 < toCreate.length) await new Promise(resolve => setTimeout(resolve, 200));
      }

      toast.success(`${selectedItems.length} ürün kaydedildi`);
      queryClient.invalidateQueries(['advantageProductTags']);
    } catch (error) {
      toast.error('Kayıt hatası: ' + error.message);
    }
  };

  const handleExport = () => {
    if (uploadedData.length === 0) { toast.error('Yüklenmiş veri bulunamadı'); return; }
    if (!originalExcelData) { toast.error('Orijinal Excel dosyası bulunamadı'); return; }

    const { workbook, sheetName } = originalExcelData;
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const row = {};
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
        const header = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })]?.v;
        if (cell && header) row[header] = cell.v;
      }
      const barcode = row['BARKOD'];
      const item = uploadedData.find(i => i.barcode === barcode);
      const isSelected = item && item.selected_range !== 'none';

      // Her satırda önce TSF ve "Uygula" hücrelerini TEMİZLE, sadece seçili olanlara yaz.
      // (Önceden indirilip tekrar yüklenen dosyalardaki hayalet "Evet" değerleri böylece silinir.)
      for (let C = range.s.c; C <= range.e.c; C++) {
        const header = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })]?.v;
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (header === 'YENİ TSF (FİYAT GÜNCELLE)') {
          worksheet[cellAddress] = isSelected ? { v: item.selected_price || 0, t: 'n' } : { v: '', t: 's' };
        }
        if (header === 'Tarife Sonuna Kadar Uygula') {
          worksheet[cellAddress] = isSelected ? { v: 'Evet', t: 's' } : { v: '', t: 's' };
        }
      }
    }

    const slugify = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const fromStr = dateRangeValue?.from ? format(dateRangeValue.from, 'd MMMM', { locale: tr }) : '';
    const toStr = dateRangeValue?.to ? format(dateRangeValue.to, 'd MMMM', { locale: tr }) : '';
    const fileName = `avantajliurunetiketi-${slugify(fromStr)}-${slugify(toStr)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Excel dosyası indirildi');
  };

  const filteredData = uploadedData.filter(item => {
    if (searchTerm && !item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory && item.category !== filterCategory) return false;
    if (filterBrand && item.brand !== filterBrand) return false;
    if (minStock && item.stock < parseFloat(minStock)) return false;
    if (maxStock && item.stock > parseFloat(maxStock)) return false;
    if (filterColumn) {
      if (filterColumn === 'advantage' && (!item.advantage_min || !item.advantage_max)) return false;
      if (filterColumn === 'super_advantage' && (!item.super_advantage_min || !item.super_advantage_max)) return false;
      if (filterColumn === 'mega_advantage' && (!item.mega_advantage_min || !item.mega_advantage_max)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (!sortBy) return 0;
    if (sortBy === 'name_asc') return (a.product_name || '').localeCompare(b.product_name || '');
    if (sortBy === 'name_desc') return (b.product_name || '').localeCompare(a.product_name || '');
    if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
    if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
    return 0;
  });

  const uniqueCategories = [...new Set(uploadedData.map(item => item.category).filter(Boolean))].sort();
  const uniqueBrands = [...new Set(uploadedData.map(item => item.brand).filter(Boolean))].sort();

  const renderRangeCell = (item, index, rangeType, minPrice, maxPrice, excelCommission, label) => {
    if (!minPrice || minPrice <= 0) return <div className="text-center text-slate-400 text-xs">-</div>;

    const dynamicCommission = getDynamicCommissionForPrice(item, maxPrice);
    const { profit, profitRate } = calculateProfit(maxPrice, dynamicCommission, item);
    const isProfitable = profit > 0;
    const isSelected = item.selected_range === rangeType;

    return (
      <div className={`border rounded-lg p-2 ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
        <div className="text-xs font-semibold text-slate-700 mb-1">{label}</div>
        {maxPrice > 0 && (
          <div className="text-xs text-slate-500 text-center">
            <div className="font-bold text-sm">₺{maxPrice?.toFixed(2)}</div>
            <div>ve altı</div>
          </div>
        )}
        <div className="text-xs text-slate-500">Kom: %{dynamicCommission}</div>
        <div className="flex items-center justify-between mt-1">
          <div className={`text-xs font-semibold ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isProfitable ? '+' : ''}₺{profit.toFixed(2)} (%{profitRate.toFixed(1)})
          </div>
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => {
            const calc = calculateProfit(maxPrice, dynamicCommission, item);
            if (calc.breakdown && calc.matchedProduct) {
              setDetailModal({
                open: true,
                product: calc.matchedProduct,
                priceData: {
                  sale_price: maxPrice,
                  net_profit: calc.profit,
                  profit_rate: calc.profitRate,
                  shipping_cost: calc.breakdown.shippingCost,
                  packaging_cost: calc.breakdown.packagingCost,
                  commission_amount: calc.breakdown.commissionAmount,
                  withholding_amount: calc.breakdown.withholdingAmount,
                  service_fee: calc.breakdown.serviceFee,
                  net_vat: calc.breakdown.netVat,
                  barem_used: calc.baremUsed
                },
                calculationDetails: {
                  productCost: calc.matchedProduct.cost,
                  productVatRate: calc.matchedProduct.vat_rate || 20,
                  commissionRate: dynamicCommission,
                  packagingCost: calc.breakdown.packagingCost,
                  printingCost: calc.matchedProduct.printing_cost || 0,
                  extraCost: calc.matchedProduct.extra_cost || 0,
                  shippingCost: calc.breakdown.shippingCost
                }
              });
            }
          }}>
            <Info className="h-3 w-3" />
          </Button>
        </div>
        <Button size="sm" variant={isSelected ? 'default' : 'outline'} onClick={() => {
          const updated = [...uploadedData];
          const idx = uploadedData.indexOf(item);
          if (updated[idx].selected_range === rangeType) {
            updated[idx].selected_range = 'none';
            updated[idx].selected_price = 0;
          } else {
            updated[idx].selected_range = rangeType;
            updated[idx].selected_price = maxPrice;
            updated[idx].selected_commission = dynamicCommission;
          }
          setUploadedData(updated);
        }} className="w-full mt-2 h-7 text-xs">
          {isSelected ? 'Seçili' : 'Seç'}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Avantajlı Ürün Etiketi</h1>
          <p className="text-slate-500 mt-1">Trendyol avantaj etiketlerini yükleyip kârlılık analizi yapın</p>
        </div>

        {!hasTrendyol && (
          <div className="mb-6 flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-base mb-1">Trendyol Platformu Aktif Değil</h3>
              <p className="text-amber-800 text-sm leading-relaxed">
                Bu sayfa yalnızca <strong>Trendyol</strong> platformuna yönelik avantajlı ürün etiketleri için tasarlanmıştır.
                Sayfayı kullanabilmek için önce <strong>Platformlar</strong> bölümünden Trendyol platformunu aktive etmeniz gerekmektedir.
              </p>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader><CardTitle>Platform ve Excel Yükleme</CardTitle></CardHeader>
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
              <Button onClick={() => document.getElementById('advantageExcelUpload').click()} disabled={!selectedPlatform || !dateRangeValue?.from || !dateRangeValue?.to} className="bg-indigo-600 hover:bg-indigo-700">
                <Upload className="mr-2 h-4 w-4" />
                {uploadProgress.total > 0 ? `Yükleniyor... ${uploadProgress.current}/${uploadProgress.total}` : uploadedData.length > 0 ? 'Yeni Excel Yükle' : 'Excel Yükle'}
              </Button>
              <input id="advantageExcelUpload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              {uploadedData.length > 0 && (
                <>
                  <Button onClick={handleSmartAutoSelect} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                    <Sparkles className="h-4 w-4" />
                    Akıllı Otomatik Seç
                  </Button>
                  <Button variant="outline" onClick={async () => {
                    try {
                      const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
                      const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');
                      const recordsToDelete = savedItems.filter(r => r.platform_account === selectedPlatform && r.start_date === startDate && r.end_date === endDate);
                      if (recordsToDelete.length > 0) {
                        for (let i = 0; i < recordsToDelete.length; i += 10) {
                          const batch = recordsToDelete.slice(i, i + 10);
                          await Promise.all(batch.map(r => db.entities.AdvantageProductTag.delete(r.id)));
                          if (i + 10 < recordsToDelete.length) await new Promise(resolve => setTimeout(resolve, 300));
                        }
                      }
                      setUploadedData([]);
                      queryClient.invalidateQueries(['advantageProductTags']);
                      toast.success('Excel silindi');
                    } catch (error) { toast.error('Silme hatası: ' + error.message); }
                  }} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input placeholder="Ürün adı ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <Select value={filterCategory || "all"} onValueChange={(val) => setFilterCategory(val === 'all' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterBrand || "all"} onValueChange={(val) => setFilterBrand(val === 'all' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Marka" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {uniqueBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterColumn || "all"} onValueChange={(val) => setFilterColumn(val === 'all' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Kolon" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="advantage">Avantaj</SelectItem>
                      <SelectItem value="super_advantage">Çok Avantaj</SelectItem>
                      <SelectItem value="mega_advantage">Süper Avantaj</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <Input type="number" placeholder="Min Stok" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
                  <Input type="number" placeholder="Max Stok" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger><SelectValue placeholder="Sırala" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sıralama Yok</SelectItem>
                      <SelectItem value="name_asc">Ürün Adı (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Ürün Adı (Z-A)</SelectItem>
                      <SelectItem value="stock_asc">Stok (Artan)</SelectItem>
                      <SelectItem value="stock_desc">Stok (Azalan)</SelectItem>
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
                      <SelectItem value="advantage">Avantaj</SelectItem>
                      <SelectItem value="super_advantage">Çok Avantaj</SelectItem>
                      <SelectItem value="mega_advantage">Süper Avantaj</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Min Kâr Oranı (%)" value={bulkMinProfitRate} onChange={(e) => setBulkMinProfitRate(e.target.value)} />
                  <Input type="number" placeholder="Min Kâr Tutarı (₺)" value={bulkMinProfitAmount} onChange={(e) => setBulkMinProfitAmount(e.target.value)} />
                  <Button onClick={handleBulkSelect} variant="outline">Toplu Seç</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Avantajlı Ürünler ({filteredData.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-3 text-left font-semibold min-w-[180px]">Ürün</th>
                        <th className="p-3 text-center font-semibold">Stok</th>
                        <th className="p-3 text-center font-semibold min-w-[120px]">Kategori</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Sistem Fiyatı</th>
                        <th className="p-3 text-center font-semibold min-w-[150px]">Avantaj</th>
                        <th className="p-3 text-center font-semibold min-w-[150px]">Çok Avantaj</th>
                        <th className="p-3 text-center font-semibold min-w-[150px]">Süper Avantaj</th>
                        <th className="p-3 text-center font-semibold min-w-[160px]">Manuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => {
                        const matchedProduct = getMatchedProduct(item);
                        const systemPrice = getSystemPrice(item);
                        return (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{item.product_name}</div>
                              <div className="text-xs text-slate-500">{item.model_code}</div>
                              {!matchedProduct && <Badge variant="outline" className="mt-1 text-xs text-rose-600 border-rose-300">Master eşleşmedi</Badge>}
                            </td>
                            <td className="p-3 text-center">{item.stock}</td>
                            <td className="p-3 text-center">
                              <span className="text-xs font-medium">{item.category || '-'}</span>
                            </td>
                            <td className="p-3">
                              {systemPrice ? (
                                <div className="text-center">
                                  <div className="font-semibold">₺{systemPrice.sale_price?.toFixed(2)}</div>
                                  <div className="text-xs text-slate-500">Kom: %{systemPrice.commission_rate || 0}</div>
                                  <div className={`text-xs font-medium ${(systemPrice.profit_rate || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ₺{(systemPrice.net_profit || 0).toFixed(2)} (%{(systemPrice.profit_rate || 0).toFixed(1)})
                                  </div>
                                </div>
                              ) : <span className="text-slate-400 text-xs">-</span>}
                            </td>
                            <td className="p-3">{renderRangeCell(item, index, 'advantage', item.advantage_min, item.advantage_max, item.advantage_commission, 'Avantaj')}</td>
                            <td className="p-3">{renderRangeCell(item, index, 'super_advantage', item.super_advantage_min, item.super_advantage_max, item.super_advantage_commission, 'Çok Avantaj')}</td>
                            <td className="p-3">{renderRangeCell(item, index, 'mega_advantage', item.mega_advantage_min, item.mega_advantage_max, item.mega_advantage_commission, 'Süper Avantaj')}</td>
                            <td className="p-3">
                              <div className={`border rounded-lg p-2 ${item.selected_range === 'manual' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                <div className="text-xs font-semibold text-slate-700 mb-2">Manuel Fiyat</div>
                                <Input type="number" step="0.01" value={item.manual_price || ''} onChange={(e) => handleManualPriceChange(uploadedData.indexOf(item), e.target.value)} placeholder="Fiyat girin" className="h-8 text-xs mb-2" />
                                {item.manual_price > 0 && (
                                  <div className="flex items-center justify-between mb-2">
                                    <div className={`text-xs font-semibold ${(item.manual_profit || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {(item.manual_profit || 0) > 0 ? '+' : ''}₺{(item.manual_profit || 0).toFixed(2)} (%{(item.manual_profit_rate || 0).toFixed(1)})
                                    </div>
                                  </div>
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
        platform={detailModal.product && platforms.find(p => p.name === selectedPlatform)}
        priceData={detailModal.priceData}
        calculationDetails={detailModal.calculationDetails}
      />
    </div>
  );
}
