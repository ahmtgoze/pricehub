import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import PriceDetailModal from '@/components/modals/PriceDetailModal';

const PlusEntity = db.entities.PlusProductCommissionTariff;
const Product = db.entities.Product;
const Platform = db.entities.Platform;
const Commission = db.entities.Commission;
const ShippingRate = db.entities.ShippingRate;
const MarketplaceProduct = db.entities.MarketplaceProduct;

export default function PlusProductCommissionTariff() {
  const [userEmail, setUserEmail] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [dateRangeValue, setDateRangeValue] = useState({ from: undefined, to: undefined });
  const [uploadedData, setUploadedData] = useState([]);
  const [originalExcelData, setOriginalExcelData] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterModelCode, setFilterModelCode] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [sortBy, setSortBy] = useState('');

  const [bulkMinProfitRate, setBulkMinProfitRate] = useState('');
  const [bulkMinProfitAmount, setBulkMinProfitAmount] = useState('');

  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
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

  const { data: savedPlusTariffs = [] } = useQuery({
    queryKey: ['plusProductCommissionTariffs', userEmail],
    queryFn: () => PlusEntity.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  // Tarih seçiliyse o tarihe ait kayıtları yükle + Excel'i geri yükle
  React.useEffect(() => {
    if (!selectedPlatform || savedPlusTariffs.length === 0) return;
    if (!dateRangeValue?.from || !dateRangeValue?.to) return;

    const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
    const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');
    const filtered = savedPlusTariffs.filter(
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
  }, [savedPlusTariffs, selectedPlatform, dateRangeValue?.from, dateRangeValue?.to]);

  const getVal = (row, exact, keywords = []) => {
    if (exact in row) return row[exact];
    const keys = Object.keys(row);
    const k = keys.find(key => keywords.some(w => key.toLowerCase().trim().includes(w)));
    return k ? row[k] : '';
  };

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

        // Excel'i dosya olarak yükle (URL sakla) — yenilemede kaybolmasın
        const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const excelBlob = new Blob([new Uint8Array(excelBuffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const excelFileObj = new File([excelBlob], file.name || 'plus.xlsx', { type: excelBlob.type });
        let excelFileUrl = null;
        try {
          const uploadResult = await db.integrations.Core.UploadFile({ file: excelFileObj });
          excelFileUrl = uploadResult.file_url;
        } catch (uploadErr) {
          console.error('Excel upload hatası:', uploadErr);
        }

        const parsed = jsonData.map(row => {
          const barcode = getVal(row, 'Barkod', ['barkod', 'barcode']) || '';
          const productName = getVal(row, 'Ürün İsmi', ['ürün ismi', 'ürün adı', 'product name']) || '';
          const sellerStockCode = getVal(row, 'Satıcı Stok Kodu', ['satıcı stok', 'stok kodu', 'sku']) || '';

          const marketplaceProduct = marketplaceProducts.find(mp => mp.platform_account === selectedPlatform && mp.barkod === barcode);
          let matchedProduct;
          if (marketplaceProduct && marketplaceProduct.matched_product_id) {
            matchedProduct = products.find(p => p.id === marketplaceProduct.matched_product_id);
          }
          if (!matchedProduct) {
            matchedProduct = products.find(p => p.sku === sellerStockCode || (productName && p.name?.toLowerCase().includes(productName.toLowerCase())));
          }

          return {
            platform_account: selectedPlatform,
            start_date: startDate,
            end_date: endDate,
            product_name: productName,
            barcode: barcode,
            seller_stock_code: sellerStockCode,
            size: getVal(row, 'Beden', ['beden', 'size']) || '',
            model_code: getVal(row, 'Model Kodu', ['model kodu', 'model']) || '',
            category: matchedProduct?.category_name || getVal(row, 'Kategori', ['kategori', 'category']) || '',
            brand: getVal(row, 'Marka', ['marka', 'brand']) || '',
            stock: parseFloat(getVal(row, 'Stok', [])) || 0,
            current_base_price: parseFloat(getVal(row, 'Komisyona Esas Fiyat', ['komisyona esas'])) || 0,
            current_commission: parseFloat(getVal(row, 'Güncel Komisyon', ['güncel komisyon'])) || 0,
            plus_price_limit: parseFloat(getVal(row, 'Plus Fiyat Üst Limiti', ['plus fiyat üst', 'plus fiyat'])) || 0,
            plus_commission_offer: parseFloat(getVal(row, 'Plus Komisyon Teklifi', ['plus komisyon'])) || 0,
            plus_base_price: parseFloat(getVal(row, 'Plus Komisyona Esas Fiyatı', ['plus komisyona esas'])) || 0,
            selected_type: 'none',
            selected_price: 0,
            calculated_commission: 0,
            manual_price: 0,
            cancel_status: 'no',
            matched_product_id: matchedProduct?.id || null
          };
        });

        const oldRecords = savedPlusTariffs.filter(
          r => r.platform_account === selectedPlatform && r.start_date === startDate && r.end_date === endDate
        );
        if (oldRecords.length > 0) {
          for (let i = 0; i < oldRecords.length; i += 30) {
            const batch = oldRecords.slice(i, i + 30);
            await Promise.all(batch.map(r => PlusEntity.delete(r.id)));
            if (i + 30 < oldRecords.length) await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        setUploadProgress({ current: 0, total: parsed.length });
        for (let i = 0; i < parsed.length; i += 30) {
          const batch = parsed.slice(i, i + 30);
          if (i === 0 && batch.length > 0 && excelFileUrl) {
            batch[0].excel_file_url = excelFileUrl;
          }
          await PlusEntity.bulkCreate(batch);
          setUploadProgress({ current: Math.min(i + 30, parsed.length), total: parsed.length });
          if (i + 30 < parsed.length) await new Promise(resolve => setTimeout(resolve, 200));
        }

        setUploadedData(parsed);
        setUploadProgress({ current: 0, total: 0 });
        queryClient.invalidateQueries(['plusProductCommissionTariffs']);
        toast.success(`${parsed.length} ürün yüklendi ve kaydedildi`);
      } catch (error) {
        setUploadProgress({ current: 0, total: 0 });
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
        r.is_active !== false && (r.platform_id === platform.id || r.platform_type === platform.platform_type)
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
      return { profit: 0, profitRate: 0, breakdown: null };
    }
  };

  const openDetailModal = (price, commissionRate, item, baremOverride = null) => {
    const calc = calculateProfit(price, commissionRate, item);
    const matchedProduct = calc.matchedProduct || getMatchedProduct(item);
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
        corporate_tax_amount: calc.breakdown?.corporateTaxAmount || 0,
        net_profit_before_tax: calc.breakdown?.netProfitBeforeTax || 0,
        barem_used: baremOverride || calc.baremUsed || 'none'
      },
      calculationDetails: {
        productCost: matchedProduct?.cost || 0,
        productVatRate: matchedProduct?.vat_rate || 20,
        commissionRate: commissionRate,
        corporateTaxRate: (calc.platform?.corporate_tax_rate ?? 25),
        packagingCost: calc.breakdown?.packagingCost || 0,
        printingCost: matchedProduct?.printing_cost || 0,
        extraCost: matchedProduct?.extra_cost || 0,
        shippingCost: calc.breakdown?.shippingCost || 0,
      }
    });
  };

  const handleSelect = (index, type, price) => {
    const updated = [...uploadedData];
    if (updated[index].selected_type === type) {
      updated[index].selected_type = 'none';
      updated[index].selected_price = 0;
    } else {
      updated[index].selected_type = type;
      updated[index].selected_price = price;
      if (type === 'manual') updated[index].manual_price = price;
    }
    setUploadedData(updated);
  };

  const handleManualPriceChange = (index, value) => {
    const updated = [...uploadedData];
    const manualPrice = parseFloat(value) || 0;
    updated[index].manual_price = manualPrice;
    if (manualPrice > 0) {
      const item = updated[index];
      const commissionToUse = item.plus_commission_offer || 0;
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

  const handleBulkSelect = () => {
    const minRate = parseFloat(bulkMinProfitRate) || 0;
    const minAmount = parseFloat(bulkMinProfitAmount) || 0;
    const visibleBarcodes = new Set(filteredData.map(i => i.barcode));

    const updated = uploadedData.map(item => {
      if (!visibleBarcodes.has(item.barcode)) return item;
      if (item.selected_type === 'manual') return item;
      const price = item.plus_price_limit;
      if (!price || price <= 0) return item.selected_type === 'plus' ? { ...item, selected_type: 'none', selected_price: 0 } : item;
      const { profit, profitRate } = calculateProfit(price, item.plus_commission_offer || 0, item);
      if (profitRate >= minRate && profit >= minAmount) return { ...item, selected_type: 'plus', selected_price: price };
      if (item.selected_type === 'plus') return { ...item, selected_type: 'none', selected_price: 0 };
      return item;
    });
    setUploadedData(updated);
    toast.success('Toplu seçim yapıldı');
  };

  const handleSmartAutoSelect = () => {
    const platform = uniquePlatforms.find(p => p.name === selectedPlatform);
    if (!platform) { toast.error('Platform bulunamadı'); return; }

    let selectedCount = 0, skippedNoProduct = 0, skippedNoMatch = 0, skippedNoCommission = 0, skippedTargetNotMet = 0, skippedAlreadySelected = 0, skippedNoOffer = 0;

    const trendyolPlatformIds = trendyolPlatforms.map(p => String(p.id));
    const trendyolPlatformNames = trendyolPlatforms.map(p => p.name.toLowerCase().trim());

    const updated = uploadedData.map(item => {
      if (item.selected_type !== 'none' || (item.manual_price && item.manual_price > 0)) { skippedAlreadySelected++; return item; }
      const matchedProduct = getMatchedProduct(item);
      if (!matchedProduct) { skippedNoProduct++; return item; }

      const price = item.plus_price_limit;
      if (!price || price <= 0) { skippedNoOffer++; return item; }

      const commission = commissions.find(c =>
        c.is_active !== false &&
        (trendyolPlatformIds.includes(String(c.platform_id)) || trendyolPlatformNames.includes((c.platform_name || '').toLowerCase().trim())) &&
        ((matchedProduct.category_id && String(c.category_id) === String(matchedProduct.category_id)) ||
         (matchedProduct.category_name && (c.category_name || '').toLowerCase().trim() === (matchedProduct.category_name || '').toLowerCase().trim()))
      );
      if (!commission) { skippedNoMatch++; return item; }

      const toNum = (v) => (v != null && v !== '') ? Number(v) : null;
      const rawRate = toNum(commission.discounted_target_profit_rate);
      const rawAmount = toNum(commission.discounted_target_profit_amount);
      const rawMin = toNum(commission.discounted_minimum_profit_amount);
      const targetRate = (rawRate != null && rawRate > 0) ? rawRate : null;
      const targetAmount = (rawAmount != null && rawAmount > 0) ? rawAmount : null;
      const minAmount = (rawMin != null && rawMin > 0) ? rawMin : null;

      if (targetRate == null && targetAmount == null) { skippedNoCommission++; return item; }

      const calc = calculateProfit(price, item.plus_commission_offer || 0, item);
      const profit = calc.profit || 0;
      const profitRate = calc.profitRate || 0;

      if (minAmount != null && profit < minAmount) { skippedTargetNotMet++; return item; }
      let meetsTarget = true;
      if (targetRate != null && profitRate < targetRate) meetsTarget = false;
      if (targetAmount != null && profit < targetAmount) meetsTarget = false;

      if (meetsTarget) { selectedCount++; return { ...item, selected_type: 'plus', selected_price: price }; }
      skippedTargetNotMet++;
      return item;
    });

    setUploadedData(updated);

    const parts = [];
    if (selectedCount > 0) parts.push(`✅ ${selectedCount} ürün seçildi`);
    if (skippedAlreadySelected > 0) parts.push(`${skippedAlreadySelected} zaten seçili/manuel`);
    if (skippedNoProduct > 0) parts.push(`⚠️ ${skippedNoProduct} sistem ürünüyle eşleşmedi`);
    if (skippedNoOffer > 0) parts.push(`⚠️ ${skippedNoOffer} Plus teklifi yok`);
    if (skippedNoMatch > 0) parts.push(`⚠️ ${skippedNoMatch} komisyon kaydı bulunamadı`);
    if (skippedNoCommission > 0) parts.push(`⚠️ ${skippedNoCommission} indirimli hedef kâr tanımlı değil`);
    if (skippedTargetNotMet > 0) parts.push(`⚠️ ${skippedTargetNotMet} hedef karşılanmadı`);

    if (selectedCount === 0) toast.warning(parts.join(' • ') || 'Hiçbir ürün seçilemedi');
    else toast.success(parts.join(' • '));
  };

  const handleSave = async () => {
    const selectedItems = uploadedData.filter(item => item.selected_type !== 'none');
    if (selectedItems.length === 0) { toast.error('Lütfen en az bir ürün seçin'); return; }
    const cols = ['platform_account','start_date','end_date','product_name','barcode','seller_stock_code','size','model_code','category','brand','stock','current_base_price','current_commission','plus_price_limit','plus_commission_offer','plus_base_price','selected_type','selected_price','calculated_commission','manual_price','manual_profit','manual_profit_rate','manual_commission','cancel_status','matched_product_id'];
    const clean = (item) => { const o = {}; cols.forEach(c => { if (item[c] !== undefined) o[c] = item[c]; }); return o; };
    try {
      const all = uploadedData.filter(i => i.id);
      for (let i = 0; i < all.length; i += 30) {
        const batch = all.slice(i, i + 30);
        await Promise.all(batch.map(item => PlusEntity.update(item.id, clean(item))));
        if (i + 30 < all.length) await new Promise(r => setTimeout(r, 150));
      }
      const news = uploadedData.filter(i => !i.id && i.selected_type !== 'none');
      if (news.length > 0) await PlusEntity.bulkCreate(news.map(clean));
      toast.success(`${selectedItems.length} ürün kaydedildi`);
      queryClient.invalidateQueries(['plusProductCommissionTariffs']);
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

    // başlık -> sütun indeksini bul
    let colPlusSecim = -1, colIptal = -1, colBarkod = -1, colUrunId = -1;
    for (let C = range.s.c; C <= range.e.c; C++) {
      const h = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })]?.v;
      const hl = (h || '').toString().toLowerCase().trim();
      if (hl === 'plus fiyat seçimi') colPlusSecim = C;
      if (hl === 'i̇ptal' || hl === 'iptal') colIptal = C;
      if (hl === 'barkod') colBarkod = C;
      if (hl === 'ürün id') colUrunId = C;
    }
    if (colPlusSecim === -1) { toast.error('Excelde "Plus Fiyat Seçimi" sütunu bulunamadı'); return; }

    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const barcode = colBarkod >= 0 ? worksheet[XLSX.utils.encode_cell({ r: R, c: colBarkod })]?.v : null;
      const urunId = colUrunId >= 0 ? worksheet[XLSX.utils.encode_cell({ r: R, c: colUrunId })]?.v : null;
      const item = uploadedData.find(i =>
        (barcode != null && i.barcode && String(i.barcode) === String(barcode)) ||
        (urunId != null && i.product_id && String(i.product_id) === String(urunId))
      );
      // SADECE seçili satıra yaz; seçilmeyenlere DOKUNMA (Trendyol'un orijinal hücreleri/formülü korunsun)
      if (item && item.selected_type !== 'none' && item.selected_price > 0) {
        const secimCell = XLSX.utils.encode_cell({ r: R, c: colPlusSecim });
        worksheet[secimCell] = { v: Number(item.selected_price), t: 'n', z: '0.00' };
        if (colIptal >= 0) {
          const iptalCell = XLSX.utils.encode_cell({ r: R, c: colIptal });
          worksheet[iptalCell] = { v: 'Hayır', t: 's' };
        }
      }
    }

    const slugify = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const fromStr = dateRangeValue?.from ? format(dateRangeValue.from, 'd MMMM', { locale: tr }) : '';
    const toStr = dateRangeValue?.to ? format(dateRangeValue.to, 'd MMMM', { locale: tr }) : '';
    const fileName = `plus-komisyon-${slugify(fromStr)}-${slugify(toStr)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Excel dosyası indirildi');
  };

  const getMatchedProduct = (item) => {
    if (item.matched_product_id) {
      const direct = products.find(p => p.id === item.matched_product_id);
      if (direct) return direct;
    }
    const marketplaceProduct = marketplaceProducts.find(mp => mp.platform_account === selectedPlatform && mp.barkod === item.barcode && mp.matched_product_id);
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
    if (!priceInfo) return null;
    let commissionRate = item.current_commission || 0;
    if (priceInfo.commission_amount && priceInfo.sale_price && !commissionRate) {
      commissionRate = parseFloat(((priceInfo.commission_amount / priceInfo.sale_price) * 100).toFixed(2));
    }
    return { ...priceInfo, commission_rate: commissionRate };
  };

  const filteredData = uploadedData.filter(item => {
    if (searchTerm && !item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterModelCode && !item.model_code?.includes(filterModelCode)) return false;
    if (filterCategory) {
      const matchedProduct = getMatchedProduct(item);
      if ((matchedProduct?.category_name || item.category) !== filterCategory) return false;
    }
    if (filterBrand && item.brand !== filterBrand) return false;
    if (minStock && item.stock < parseFloat(minStock)) return false;
    if (maxStock && item.stock > parseFloat(maxStock)) return false;
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortBy) return 0;
    if (sortBy === 'product_name_asc') return (a.product_name || '').localeCompare(b.product_name || '');
    if (sortBy === 'product_name_desc') return (b.product_name || '').localeCompare(a.product_name || '');
    if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
    if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
    return 0;
  });

  const allCategories = [...new Set(uploadedData.map(item => getMatchedProduct(item)?.category_name || item.category).filter(Boolean))].sort();
  const uniqueBrands = [...new Set(uploadedData.map(item => item.brand).filter(Boolean))];
  const selectedCount = uploadedData.filter(i => i.selected_type !== 'none').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Plus Ürün Komisyon Tarifesi</h1>
          <p className="text-slate-500 mt-1">Trendyol Plus tekliflerini yükleyip kârlılık analizi yapın</p>
        </div>

        {!hasTrendyol && (
          <div className="mb-6 flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-base mb-1">Trendyol Platformu Aktif Değil</h3>
              <p className="text-amber-800 text-sm leading-relaxed">Bu sayfa yalnızca <strong>Trendyol</strong> platformu ile kullanılabilir. Önce <strong>Platformlar</strong> bölümünden Trendyol'u aktive edin.</p>
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
                    <SelectContent>{trendyolPlatforms.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tarih Aralığı *</Label>
                <Popover open={calendarOpen} onOpenChange={(open) => { if (open) setDateRangeValue({ from: undefined, to: undefined }); setCalendarOpen(open); }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRangeValue?.from ? (dateRangeValue.to ? (<>{format(dateRangeValue.from, 'd MMM yyyy', { locale: tr })} - {format(dateRangeValue.to, 'd MMM yyyy', { locale: tr })}</>) : format(dateRangeValue.from, 'd MMM yyyy', { locale: tr })) : <span>Tarih seçin</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={dateRangeValue} onSelect={(range) => { setDateRangeValue(range || { from: undefined, to: undefined }); if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) setCalendarOpen(false); }} defaultMonth={new Date()} numberOfMonths={2} locale={tr} classNames={{ day_today: "bg-blue-500 font-bold text-white" }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => document.getElementById('plusExcelUpload').click()} disabled={!selectedPlatform || !dateRangeValue?.from || !dateRangeValue?.to} className="bg-indigo-600 hover:bg-indigo-700">
                <Upload className="mr-2 h-4 w-4" />{uploadedData.length > 0 ? 'Yeni Excel Yükle' : 'Excel Yükle'}
              </Button>
              <input id="plusExcelUpload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              {uploadProgress.total > 0 && (<div className="flex items-center text-sm text-slate-500">{uploadProgress.current}/{uploadProgress.total} kaydediliyor...</div>)}
              {uploadedData.length > 0 && (
                <>
                  <Button onClick={handleSmartAutoSelect} className="bg-orange-500 hover:bg-orange-600 text-white gap-2"><Sparkles className="h-4 w-4" />Akıllı Otomatik Seç</Button>
                  <Button variant="outline" onClick={() => { setUploadedData([]); setOriginalExcelData(null); toast.success('Excel silindi'); }} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"><Trash2 className="mr-2 h-4 w-4" />Excel'i Sil</Button>
                  <Button variant="outline" onClick={handleSave}><Check className="mr-2 h-4 w-4" />Seçimleri Kaydet ({selectedCount})</Button>
                  <Button variant="outline" onClick={() => { setUploadedData(uploadedData.map(item => ({ ...item, selected_type: 'none', selected_price: 0 }))); toast.success('Tüm seçimler kaldırıldı'); }}>Seçimleri Kaldır</Button>
                  <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Excel İndir</Button>
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
                    <SelectContent><SelectItem value="all">Kategori</SelectItem>{allCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterBrand || "all"} onValueChange={(val) => setFilterBrand(val === 'all' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Marka" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tümü</SelectItem>{uniqueBrands.map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={sortBy || "none"} onValueChange={(v) => setSortBy(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Sırala" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sıralama Yok</SelectItem>
                      <SelectItem value="product_name_asc">Ürün Adı (A-Z)</SelectItem>
                      <SelectItem value="product_name_desc">Ürün Adı (Z-A)</SelectItem>
                      <SelectItem value="stock_asc">Stok (Artan)</SelectItem>
                      <SelectItem value="stock_desc">Stok (Azalan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <Input type="number" placeholder="Min Stok" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
                  <Input type="number" placeholder="Max Stok" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader><CardTitle>Toplu Seçim (Plus Teklifi)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <th className="p-3 text-center font-semibold min-w-[150px]">Sistem Fiyatı</th>
                        <th className="p-3 text-center font-semibold min-w-[170px]">Plus Teklifi</th>
                        <th className="p-3 text-center font-semibold min-w-[140px]">Barem</th>
                        <th className="p-3 text-center font-semibold min-w-[160px]">Manuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((item) => {
                        const index = uploadedData.indexOf(item);
                        const systemPrice = getSystemPrice(item);
                        const matchedProduct = getMatchedProduct(item);
                        const plusPrice = item.plus_price_limit;
                        const plusComm = item.plus_commission_offer || 0;
                        const plusCalc = plusPrice > 0 ? calculateProfit(plusPrice, plusComm, item) : { profit: 0, profitRate: 0 };
                        const isPlusSelected = item.selected_type === 'plus';

                        return (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{item.product_name}</div>
                              <div className="text-xs text-slate-500">{item.model_code}</div>
                            </td>
                            <td className="p-3 text-center">{item.stock}</td>
                            <td className="p-3">
                              {(matchedProduct?.category_name || item.category) ? (
                                <div className="text-center text-xs"><div className="font-medium text-slate-700">{matchedProduct?.category_name || item.category}</div></div>
                              ) : <div className="text-center text-slate-400 text-xs">-</div>}
                            </td>
                            <td className="p-3">
                              {systemPrice ? (
                                <div className="text-center">
                                  <div className="font-semibold text-slate-900">₺{systemPrice.sale_price?.toFixed(2)}</div>
                                  {matchedProduct && <div className="text-xs text-slate-500 mb-1">{matchedProduct.desi} desi • {systemPrice.barem_used === 'barem1' ? 'Barem 1' : systemPrice.barem_used === 'barem2' ? 'Barem 2' : 'Desi'}</div>}
                                  <div className="text-xs text-slate-500 mb-1">Kom: %{systemPrice.commission_rate || 0}</div>
                                  <div className={`text-xs font-medium ${(systemPrice.profit_rate || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₺{(systemPrice.net_profit || 0).toFixed(2)} (%{(systemPrice.profit_rate || 0).toFixed(1)})</div>
                                </div>
                              ) : <div className="text-center text-slate-400 text-xs">-</div>}
                            </td>
                            <td className="p-3">
                              {plusPrice > 0 ? (
                                <div className={`border rounded-lg p-2 ${isPlusSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                  <div className="text-xs font-semibold text-slate-700 mb-1">₺{plusPrice.toFixed(2)} ve altı</div>
                                  <div className="text-xs text-slate-500">Plus Kom: %{plusComm}</div>
                                  <div className="flex items-center justify-between mt-1">
                                    <div className={`text-xs font-semibold ${plusCalc.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{plusCalc.profit > 0 ? '+' : ''}₺{plusCalc.profit.toFixed(2)} (%{plusCalc.profitRate.toFixed(1)})</div>
                                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openDetailModal(plusPrice, plusComm, item)}><Info className="h-3 w-3" /></Button>
                                  </div>
                                  <Button size="sm" variant={isPlusSelected ? 'default' : 'outline'} onClick={() => handleSelect(index, 'plus', plusPrice)} className="w-full mt-2 h-7 text-xs">{isPlusSelected ? 'Seçili' : 'Seç'}</Button>
                                </div>
                              ) : <div className="text-center text-slate-400 text-xs">-</div>}
                            </td>
                            <td className="p-3">
                              {(() => {
                                const selectedPrice = item.selected_price || 0;
                                if (selectedPrice === 0 || item.selected_type === 'none') return <div className="text-center text-slate-400 text-xs">-</div>;
                                const currentCommission = item.selected_type === 'manual' ? (item.manual_commission || plusComm) : plusComm;
                                const currentCalc = calculateProfit(selectedPrice, currentCommission, item);
                                if (currentCalc.baremUsed === 'barem1' || currentCalc.baremUsed === 'barem2') return <div className="text-center text-slate-400 text-xs">-</div>;
                                let best = null;
                                if (selectedPrice > 299.99) {
                                  const c = calculateProfit(299.99, currentCommission, item);
                                  if (c.baremUsed === 'barem2' && c.profitRate > currentCalc.profitRate) best = { price: 299.99, ...c, baremType: 'Barem 2' };
                                }
                                if (selectedPrice > 149.99) {
                                  const c = calculateProfit(149.99, currentCommission, item);
                                  if (c.baremUsed === 'barem1' && c.profitRate > currentCalc.profitRate && (!best || c.profitRate > best.profitRate)) best = { price: 149.99, ...c, baremType: 'Barem 1' };
                                }
                                if (!best) return <div className="text-center text-slate-400 text-xs">-</div>;
                                return (
                                  <div className="border rounded-lg p-2 border-amber-300 bg-amber-50">
                                    <div className="text-xs font-semibold text-amber-800 mb-1">{best.baremType} Önerisi</div>
                                    <div className="text-xs text-slate-600">Fiyat: ₺{best.price.toFixed(2)}</div>
                                    <div className="flex items-center justify-between mt-1">
                                      <div className="text-xs font-semibold text-emerald-600">+₺{best.profit.toFixed(2)} (%{best.profitRate.toFixed(1)})</div>
                                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openDetailModal(best.price, currentCommission, item, best.baremType === 'Barem 1' ? 'barem1' : 'barem2')}><Info className="h-3 w-3" /></Button>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleSelect(index, item.selected_type, best.price)} className="w-full mt-2 h-7 text-xs border-amber-400 hover:bg-amber-100">Uygula</Button>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="p-3">
                              <div className={`border rounded-lg p-2 ${item.selected_type === 'manual' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                <div className="text-xs font-semibold text-slate-700 mb-2">Manuel Fiyat</div>
                                <Input type="number" step="0.01" value={item.manual_price || ''} onChange={(e) => handleManualPriceChange(index, e.target.value)} placeholder="Fiyat girin" className="h-8 text-xs mb-2" />
                                {item.manual_price > 0 && (
                                  <div className="flex items-center justify-between mb-2">
                                    <div className={`text-xs font-semibold ${(item.manual_profit || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(item.manual_profit || 0) > 0 ? '+' : ''}₺{(item.manual_profit || 0).toFixed(2)} (%{(item.manual_profit_rate || 0).toFixed(1)})</div>
                                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openDetailModal(item.manual_price, item.manual_commission || plusComm, item)}><Info className="h-3 w-3" /></Button>
                                  </div>
                                )}
                                <Button size="sm" variant={item.selected_type === 'manual' ? 'default' : 'outline'} onClick={() => handleSelect(index, 'manual', item.manual_price)} className="w-full h-7 text-xs" disabled={!item.manual_price || item.manual_price <= 0}>{item.selected_type === 'manual' ? 'Seçili' : 'Seç'}</Button>
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
              <p className="text-sm text-slate-400">Platform seçip tarih aralığı belirledikten sonra Plus Excel dosyasını yükleyin</p>
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
