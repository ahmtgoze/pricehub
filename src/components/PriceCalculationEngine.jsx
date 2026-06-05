/**
 * MERKEZİ FİYAT HESAPLAMA MOTORU
 * Tüm fiyat hesaplamaları bu modülden yapılır.
 * Hiçbir UI sayfasında hesaplama kodu olmayacak.
 */

// KDV dahil fiyattan KDV hariç fiyatı hesapla
export const removeVat = (priceWithVat, vatRate) => {
  return priceWithVat / (1 + vatRate / 100);
};

// KDV hariç fiyattan KDV dahil fiyatı hesapla
export const addVat = (priceExclVat, vatRate) => {
  return priceExclVat * (1 + vatRate / 100);
};

// KDV tutarını hesapla
export const calculateVat = (priceWithVat, vatRate) => {
  const priceExclVat = removeVat(priceWithVat, vatRate);
  return priceWithVat - priceExclVat;
};

/**
 * Desi bazlı kargo ücretini bul (same_day_delivery alanına bakılmaz)
 */
export const findDesiShippingRate = (shippingRates, desi) => {
  const desiRates = shippingRates
    .filter(r => r.rate_type === 'desi' && r.is_active !== false && r.desi != null)
    .sort((a, b) => a.desi - b.desi);
  
  // Ürünün desisine eşit veya daha büyük olan en küçük desi tarifesini bul
  for (const rate of desiRates) {
    if (desi <= rate.desi) {
      return rate;
    }
  }
  
  // Eğer uygun tarife bulunamazsa en yüksek desi tarifesini kullan
  if (desiRates.length > 0) {
    return desiRates[desiRates.length - 1];
  }
  
  return null;
};

/**
 * Barem kargo ücretini bul
 * "Bugün Kargoda" (isSameDayDelivery=true) için indirimli tarife aranır
 */
export const findBaremShippingRate = (shippingRates, baremType, isSameDayDelivery = false) => {
  if (isSameDayDelivery) {
    // İndirimli tarife ara
    const sameDayRate = shippingRates.find(
      r => r.rate_type === baremType && r.same_day_delivery === true && r.is_active !== false
    );
    if (sameDayRate) return sameDayRate;
  }
  
  // Normal tarife ara
  return shippingRates.find(
    r => r.rate_type === baremType && r.same_day_delivery !== true && r.is_active !== false
  );
};

/**
 * Komisyon bilgisini bul
 */
export const findCommission = (commissions, platformId, categoryId) => {
  return commissions.find(
    c => c.platform_id === platformId && 
         c.category_id === categoryId && 
         c.is_active !== false
  );
};

/**
 * Hizmet bedelini hesapla
 */
export const calculateServiceFee = (platform, salePriceInclVat, isSameDayDelivery = false) => {
  if (!platform || !platform.has_service_fee) return { amount: 0, vat: 0, amountExclVat: 0 };
  
  let feeExclVat = 0;
  let vatRate = platform.service_fee_vat_rate || 20;
  
  const shouldUseSameDayFee = isSameDayDelivery && platform.has_same_day_delivery;
  
  if (shouldUseSameDayFee) {
    const sameDayFee = platform.same_day_delivery_service_fee || 0;
    feeExclVat = removeVat(sameDayFee, vatRate);
  } else {
    if (platform.service_fee_type === 'fixed_per_order') {
      const feeAmount = platform.service_fee_amount || 0;
      feeExclVat = removeVat(feeAmount, vatRate);
    } else if (platform.service_fee_type === 'percent_of_sale') {
      const salePriceExclVat = removeVat(salePriceInclVat, 20);
      feeExclVat = salePriceExclVat * (platform.service_fee_amount || 0) / 100;
    }
  }
  
  const feeVat = feeExclVat * vatRate / 100;
  
  return {
    amount: feeExclVat + feeVat,
    amountExclVat: feeExclVat,
    vat: feeVat
  };
};

/**
 * Stopaj tutarını hesapla
 */
export const calculateWithholding = (platform, salePriceExclVat) => {
  if (!platform.has_withholding) return 0;
  if (platform.platform_type === 'website') return 0;
  return salePriceExclVat * (platform.withholding_rate || 0) / 100;
};

/**
 * Komisyon tutarını hesapla
 */
export const calculateCommission = (salePriceExclVat, commissionRate, commissionVatRate) => {
  const commissionExclVat = salePriceExclVat * commissionRate / 100;
  const commissionVat = commissionExclVat * (commissionVatRate || 20) / 100;
  
  return {
    amount: commissionExclVat + commissionVat,
    amountExclVat: commissionExclVat,
    vat: commissionVat
  };
};

/**
 * Belirli bir satış fiyatı için tüm kesintileri ve kârı hesapla
 */
export const calculatePriceBreakdown = ({
  salePriceInclVat,
  productCost,
  productVatRate,
  shippingCost,
  shippingVatRate,
  commissionRate,
  commissionVatRate,
  platform,
  baremUsed,
  packagingCost = 0,
  printingCost = 0,
  extraCost = 0,
  isSameDayDelivery = false
}) => {
  const salePriceExclVat = removeVat(salePriceInclVat, productVatRate);
  const saleVat = salePriceInclVat - salePriceExclVat;
  const productCostExclVat = removeVat(productCost, productVatRate);
  const productVat = productCost - productCostExclVat;
  const printingCostExclVat = removeVat(printingCost, productVatRate);
  const printingVat = printingCost - printingCostExclVat;
  const extraCostExclVat = removeVat(extraCost, productVatRate);
  const extraCostVat = extraCost - extraCostExclVat;
  const shippingExclVat = removeVat(shippingCost, shippingVatRate);
  const shippingVat = shippingCost - shippingExclVat;
  const packagingCostExclVat = removeVat(packagingCost, productVatRate);
  const packagingVat = packagingCost - packagingCostExclVat;
  const commission = calculateCommission(salePriceExclVat, commissionRate, commissionVatRate);
  const serviceFee = calculateServiceFee(platform, salePriceInclVat, isSameDayDelivery);
  const withholdingAmount = calculateWithholding(platform, salePriceExclVat);
  const transactionFeeInclVat = platform.has_transaction_fee ? (platform.transaction_fee_amount || 0) : 0;
  const transactionFeeVatRate = platform.transaction_fee_vat_rate || 20;
  const transactionFeeExclVat = transactionFeeInclVat / (1 + transactionFeeVatRate / 100);
  const transactionFeeVat = transactionFeeInclVat - transactionFeeExclVat;
  const posServiceFeeRate = (platform.has_pos_service_fee && platform.platform_type === 'hepsiburada')
    ? (platform.pos_service_fee_rate || 0)
    : 0;
  const posServiceFeeInclVat = salePriceInclVat * posServiceFeeRate / 100;
  const posServiceFeeExclVat = removeVat(posServiceFeeInclVat, productVatRate);
  const posServiceFeeVat = posServiceFeeInclVat - posServiceFeeExclVat;
  const netVat = saleVat - productVat - printingVat - extraCostVat - shippingVat - packagingVat - commission.vat - serviceFee.vat - transactionFeeVat - posServiceFeeVat;
  
  // Net Kâr (vergi öncesi)
  const netProfitBeforeTax = salePriceInclVat - productCost - printingCost - extraCost - shippingCost - packagingCost - commission.amount - withholdingAmount - serviceFee.amount - transactionFeeInclVat - posServiceFeeInclVat - netVat;
  // Kurumlar (Gelir) Vergisi
  const corporateTaxAmount = (platform?.has_corporate_tax !== false && netProfitBeforeTax > 0) ? netProfitBeforeTax * (platform?.corporate_tax_rate ?? 25) / 100 : 0;
  // Vergi sonrası net kâr
  const netProfit = netProfitBeforeTax - corporateTaxAmount;
  
  // Kâr oranı = Net Kâr / Ürün Maliyeti × 100
  const profitRate = productCost > 0 ? (netProfit / productCost) * 100 : 0;
  
  return {
    salePriceInclVat,
    salePriceExclVat,
    saleVat,
    productCost,
    productCostExclVat,
    productVat,
    shippingCost,
    shippingExclVat,
    shippingVat,
    packagingCost,
    packagingCostExclVat,
    packagingVat,
    printingCost,
    printingCostExclVat,
    printingVat,
    extraCost,
    extraCostExclVat,
    extraCostVat,
    commissionAmount: commission.amount,
    commissionExclVat: commission.amountExclVat,
    commissionVat: commission.vat,
    commissionRate,
    withholdingAmount,
    serviceFee: serviceFee.amount,
    serviceFeeExclVat: serviceFee.amountExclVat,
    serviceFeeVat: serviceFee.vat,
    transactionFee: transactionFeeInclVat,
    transactionFeeExclVat,
    transactionFeeVat,
    posServiceFee: posServiceFeeInclVat,
    posServiceFeeExclVat,
    posServiceFeeVat,
    posServiceFeeRate,
    netVat,
    netProfitBeforeTax,
    corporateTaxAmount,
    netProfit,
    profitRate,
    baremUsed
  };
};

/**
 * Satış fiyatının barem aralığında olup olmadığını kontrol et
 */
export const isPriceInBaremRange = (salePrice, platform, baremType) => {
  if (baremType === 'barem1') {
    return salePrice >= (platform.barem1_min || 0) && salePrice <= (platform.barem1_max || 149.99);
  } else if (baremType === 'barem2') {
    return salePrice >= (platform.barem2_min || 150) && salePrice <= (platform.barem2_max || 299.99);
  }
  return true;
};

/**
 * Hedef kâr oranını veya tutarını sağlayan satış fiyatını binary search ile bul
 */
export const findSalePriceForTargetProfit = ({
  productCost,
  productVatRate,
  shippingCost,
  shippingVatRate,
  commissionRate,
  commissionVatRate,
  platform,
  targetProfitRate = null,
  targetProfitAmount = null,
  minimumProfitAmount = null,
  packagingCost = 0,
  printingCost = 0,
  extraCost = 0,
  minPrice = 1,
  maxPrice = 100000,
  tolerance = 0.01,
  maxIterations = 100,
  isSameDayDelivery = false
}) => {
  let low = minPrice;
  let high = Math.max(maxPrice, productCost * 20);
  
 // Her iki hedefi de hesapla, en yüksek fiyatı seç
  const candidateResults = [];

  if (targetProfitRate != null) {
    let lo = minPrice, hi = Math.max(maxPrice, productCost * 20), best = null, iter = 0;
    while (lo <= hi && iter < maxIterations) {
      iter++;
      const mid = (lo + hi) / 2;
      const bd = calculatePriceBreakdown({ salePriceInclVat: mid, productCost, productVatRate, shippingCost, shippingVatRate, commissionRate, commissionVatRate, platform, packagingCost, printingCost, extraCost, baremUsed: 'search', isSameDayDelivery });
      const diff = bd.profitRate - targetProfitRate;
      if (Math.abs(diff) <= tolerance) { best = { ...bd, salePriceInclVat: mid }; break; }
      if (diff < 0) lo = mid + 0.01; else { hi = mid - 0.01; best = { ...bd, salePriceInclVat: mid }; }
    }
    if (!best) best = calculatePriceBreakdown({ salePriceInclVat: lo, productCost, productVatRate, shippingCost, shippingVatRate, commissionRate, commissionVatRate, platform, packagingCost, printingCost, extraCost, baremUsed: 'search', isSameDayDelivery });
    candidateResults.push(best);
  }

  if (targetProfitAmount != null) {
    let lo = minPrice, hi = Math.max(maxPrice, productCost * 20), best = null, iter = 0;
    while (lo <= hi && iter < maxIterations) {
      iter++;
      const mid = (lo + hi) / 2;
      const bd = calculatePriceBreakdown({ salePriceInclVat: mid, productCost, productVatRate, shippingCost, shippingVatRate, commissionRate, commissionVatRate, platform, packagingCost, printingCost, extraCost, baremUsed: 'search', isSameDayDelivery });
      const diff = bd.netProfit - targetProfitAmount;
      if (Math.abs(diff) <= tolerance) { best = { ...bd, salePriceInclVat: mid }; break; }
      if (diff < 0) lo = mid + 0.01; else { hi = mid - 0.01; best = { ...bd, salePriceInclVat: mid }; }
    }
    if (!best) best = calculatePriceBreakdown({ salePriceInclVat: lo, productCost, productVatRate, shippingCost, shippingVatRate, commissionRate, commissionVatRate, platform, packagingCost, printingCost, extraCost, baremUsed: 'search', isSameDayDelivery });
    candidateResults.push(best);
  }

  let bestResult = candidateResults.reduce((a, b) => a.salePriceInclVat > b.salePriceInclVat ? a : b);
  
  return bestResult;
};

/**
 * ANA HESAPLAMA FONKSİYONU
 */
export const calculateProductPrice = ({
  product,
  platform,
  shippingRates,
  commission,
  packagingCost = 0,
  printingCost = 0,
  extraCost = 0,
  targetProfitOverride = null,
  isSameDayDelivery = false,
  settings = [],
  overrideShippingCost = null,
  overrideShippingCompany = null,
}) => {
  const targetProfitRate = targetProfitOverride ?? commission?.target_profit_rate ?? null;
  const targetProfitAmount = commission?.target_profit_amount ?? null;
  const minimumProfitAmount = commission?.minimum_profit_amount ?? null;
  const commissionRate = commission?.commission_rate ?? 0;
  const commissionVatRate = commission?.commission_vat_rate ?? 20;
  const productVatRate = product.vat_rate ?? 20;

  // ÇİFT KARGO: ürün "double_shipping" işaretliyse tüm kargo bedelleri 2 ile çarpılır
  // (üretim→depo + depo→müşteri = iki kargo)
  const shippingMultiplier = product.double_shipping ? 2 : 1;
  
  if (targetProfitRate == null && targetProfitAmount == null) {
    throw new Error('Hedef kâr oranı veya tutarından en az biri belirtilmelidir');
  }
  
  const hasOverrideShipping = overrideShippingCost !== null && overrideShippingCost !== undefined;

  const platformShippingRates = hasOverrideShipping ? [] : shippingRates.filter(r => {
    if (r.is_active === false) return false;
    if (overrideShippingCompany && r.shipping_company !== overrideShippingCompany) return false;
    if (platform.use_custom_shipping_price) {
      if (r.is_manual !== true || r.is_admin_created === true) return false;
      if (r.platform_id !== platform.id) return false;
      if (!overrideShippingCompany && platform.shipping_company_name && platform.shipping_company_name.trim() !== '') {
        return r.shipping_company === platform.shipping_company_name;
      }
      return true;
    } else {
      if (r.is_admin_created === true) {
        if (r.platform_type !== platform.platform_type) return false;
        if (!overrideShippingCompany && platform.shipping_company_name && platform.shipping_company_name.trim() !== '') {
          return r.shipping_company === platform.shipping_company_name;
        }
        return true;
      }
      if (r.is_manual === true) {
        if (r.platform_id !== platform.id) return false;
        if (!overrideShippingCompany && platform.shipping_company_name && platform.shipping_company_name.trim() !== '') {
          return r.shipping_company === platform.shipping_company_name;
        }
        return true;
      }
      return false;
    }
  });
  
  let totalDesi = product.desi || 0;
  let actualPackageCount = 0;
  if (product.multi_package && product.packages) {
    try {
      const productPackages = typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages;
      actualPackageCount = productPackages.length;
      totalDesi = productPackages.reduce((sum, pkg) => sum + (pkg.desi || 0), 0);
    } catch (e) {
      totalDesi = product.desi || 0;
      actualPackageCount = 0;
    }
  }
  
  const isActuallyMultiPackage = product.multi_package && actualPackageCount > 1;
  const baremMaxDesi = platform.barem_max_desi ?? 5;
  const isWebsite = platform.platform_type === 'website';
  const canUseBarem = !isWebsite && platform.use_barem && !product.special_shipping && !isActuallyMultiPackage && totalDesi <= baremMaxDesi;
  const effectiveSameDayDelivery = isWebsite ? false : isSameDayDelivery;
  
  let result = null;
  let candidates = [];

  if (hasOverrideShipping) {
    const ovShippingCost = overrideShippingCost * shippingMultiplier;
    const overrideResult = findSalePriceForTargetProfit({
      productCost: product.cost,
      productVatRate,
      shippingCost: ovShippingCost,
      shippingVatRate: 20,
      commissionRate,
      commissionVatRate,
      platform,
      packagingCost,
      printingCost,
      extraCost,
      targetProfitRate,
      targetProfitAmount,
      minimumProfitAmount,
      isSameDayDelivery
    });
    result = { ...overrideResult, shippingCost: ovShippingCost, shippingVatRate: 20, baremUsed: 'desi' };
  }
  
  if (!result && canUseBarem) {
    const barem1Rate = findBaremShippingRate(platformShippingRates, 'barem1', effectiveSameDayDelivery);
    if (barem1Rate) {
      const barem1Cost = barem1Rate.price * shippingMultiplier;
      const barem1Result = findSalePriceForTargetProfit({
        productCost: product.cost,
        productVatRate,
        shippingCost: barem1Cost,
        shippingVatRate: barem1Rate.vat_rate || 20,
        commissionRate,
        commissionVatRate,
        platform,
        packagingCost,
        printingCost,
        extraCost,
        targetProfitRate,
        targetProfitAmount,
        minimumProfitAmount,
        isSameDayDelivery: effectiveSameDayDelivery
      });
      
      if (isPriceInBaremRange(barem1Result.salePriceInclVat, platform, 'barem1')) {
        candidates.push({
          ...barem1Result,
          shippingCost: barem1Cost,
          shippingVatRate: barem1Rate.vat_rate || 20,
          baremUsed: 'barem1'
        });
      }
    }
    
    const barem2Rate = findBaremShippingRate(platformShippingRates, 'barem2', effectiveSameDayDelivery);
    if (barem2Rate) {
      const barem2Cost = barem2Rate.price * shippingMultiplier;
      const barem2Result = findSalePriceForTargetProfit({
        productCost: product.cost,
        productVatRate,
        shippingCost: barem2Cost,
        shippingVatRate: barem2Rate.vat_rate || 20,
        commissionRate,
        commissionVatRate,
        platform,
        packagingCost,
        printingCost,
        extraCost,
        targetProfitRate,
        targetProfitAmount,
        minimumProfitAmount,
        isSameDayDelivery: effectiveSameDayDelivery
      });
      
      if (isPriceInBaremRange(barem2Result.salePriceInclVat, platform, 'barem2')) {
        candidates.push({
          ...barem2Result,
          shippingCost: barem2Cost,
          shippingVatRate: barem2Rate.vat_rate || 20,
          baremUsed: 'barem2'
        });
      }
    }
    
    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        if (Math.abs(a.salePriceInclVat - b.salePriceInclVat) > 0.5) {
          return a.salePriceInclVat - b.salePriceInclVat;
        }
        if (a.baremUsed === 'barem1') return -1;
        if (b.baremUsed === 'barem1') return 1;
        return 0;
      });
      result = candidates[0];
    }
  }
  
  if (!result && !hasOverrideShipping) {
    let shippingCost = 0;
    let shippingVatRate = 20;

    if (isActuallyMultiPackage && product.packages) {
      let productPackages = [];
      try {
        productPackages = typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages;
      } catch (e) {
        console.error('Paket bilgisi parse edilemedi:', e);
        productPackages = [];
      }

      if (productPackages.length > 0) {
        if (product.special_shipping) {
          const returnCostSetting = settings.find(s => s.setting_key === 'return_cost_per_package');
          const returnCostPerPackage = returnCostSetting ? parseFloat(returnCostSetting.setting_value) : 180.096;

          for (const pkg of productPackages) {
            const desiRate = findDesiShippingRate(platformShippingRates, pkg.desi || 0);
            if (desiRate) {
              const desiShippingCost = desiRate.price * 2;
              shippingCost += desiShippingCost + returnCostPerPackage;
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
      } else {
        const desiRate = findDesiShippingRate(platformShippingRates, product.desi || 0);
        shippingCost = desiRate?.price || 0;
        shippingVatRate = desiRate?.vat_rate || 20;
      }
    } else {
      const desiRate = findDesiShippingRate(platformShippingRates, product.desi || 0);
      shippingCost = desiRate?.price || 0;
      shippingVatRate = desiRate?.vat_rate || 20;
    }

    // ÇİFT KARGO: hesaplanan kargo bedelini 2 ile çarp (gerekirse)
    shippingCost = shippingCost * shippingMultiplier;
    
    const desiResult = findSalePriceForTargetProfit({
      productCost: product.cost,
      productVatRate,
      shippingCost,
      shippingVatRate,
      commissionRate,
      commissionVatRate,
      platform,
      packagingCost,
      printingCost,
      extraCost,
      targetProfitRate,
      targetProfitAmount,
      minimumProfitAmount,
      isSameDayDelivery: effectiveSameDayDelivery
    });
    
    result = {
      ...desiResult,
      shippingCost,
      shippingVatRate,
      baremUsed: 'desi'
    };
    
    if (canUseBarem) {
      const desiPrice = result.salePriceInclVat;
      
       if (isPriceInBaremRange(desiPrice, platform, 'barem1')) {
         const barem1Rate = findBaremShippingRate(platformShippingRates, 'barem1', effectiveSameDayDelivery);
         const barem1Cost = barem1Rate ? barem1Rate.price * shippingMultiplier : null;
         if (barem1Rate && barem1Cost < shippingCost) {
          const barem1Result = findSalePriceForTargetProfit({
            productCost: product.cost,
            productVatRate,
            shippingCost: barem1Cost,
            shippingVatRate: barem1Rate.vat_rate || 20,
            commissionRate,
            commissionVatRate,
            platform,
            packagingCost,
            printingCost,
            extraCost,
            targetProfitRate,
            targetProfitAmount,
            minimumProfitAmount,
            isSameDayDelivery: effectiveSameDayDelivery
          });
          
          if (isPriceInBaremRange(barem1Result.salePriceInclVat, platform, 'barem1')) {
            result = {
              ...barem1Result,
              shippingCost: barem1Cost,
              shippingVatRate: barem1Rate.vat_rate || 20,
              baremUsed: 'barem1'
            };
          }
        }
      } 
      else if (isPriceInBaremRange(desiPrice, platform, 'barem2')) {
        const barem2Rate = findBaremShippingRate(platformShippingRates, 'barem2', effectiveSameDayDelivery);
        const barem2Cost = barem2Rate ? barem2Rate.price * shippingMultiplier : null;
        if (barem2Rate && barem2Cost < shippingCost) {
          const barem2Result = findSalePriceForTargetProfit({
            productCost: product.cost,
            productVatRate,
            shippingCost: barem2Cost,
            shippingVatRate: barem2Rate.vat_rate || 20,
            commissionRate,
            commissionVatRate,
            platform,
            packagingCost,
            printingCost,
            extraCost,
            targetProfitRate,
            targetProfitAmount,
            minimumProfitAmount,
            isSameDayDelivery: effectiveSameDayDelivery
          });
          
          if (isPriceInBaremRange(barem2Result.salePriceInclVat, platform, 'barem2')) {
            result = {
              ...barem2Result,
              shippingCost: barem2Cost,
              shippingVatRate: barem2Rate.vat_rate || 20,
              baremUsed: 'barem2'
            };
          }
        }
      }
    }
  }
  
  const roundToPrice = (price) => {
    const integer = Math.floor(price);
    const decimal = price - integer;
    if (decimal < 0.50) {
      return integer + 0.49;
    } else {
      return integer + 0.99;
    }
  };

  const finalSalePrice = roundToPrice(result.salePriceInclVat);
  const finalSalePriceExclVat = roundToPrice(result.salePriceExclVat);
  
  const finalBreakdown = calculatePriceBreakdown({
    salePriceInclVat: finalSalePrice,
    productCost: product.cost,
    productVatRate,
    shippingCost: result.shippingCost,
    shippingVatRate: result.shippingVatRate,
    commissionRate,
    commissionVatRate,
    platform,
    packagingCost,
    printingCost,
    extraCost,
    baremUsed: result.baremUsed,
    isSameDayDelivery: effectiveSameDayDelivery
  });
  
  return {
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    platform_id: platform.id,
    platform_name: platform.name,
    sale_price: finalSalePrice,
    sale_price_excl_vat: finalSalePriceExclVat,
    net_profit: Math.round(finalBreakdown.netProfit * 100) / 100,
    net_profit_before_tax: Math.round((finalBreakdown.netProfitBeforeTax || 0) * 100) / 100,
    corporate_tax_amount: Math.round((finalBreakdown.corporateTaxAmount || 0) * 100) / 100,
    profit_rate: Math.round(finalBreakdown.profitRate * 100) / 100,
    shipping_cost: Math.round(finalBreakdown.shippingCost * 100) / 100,
    commission_amount: Math.round(finalBreakdown.commissionAmount * 100) / 100,
    withholding_amount: Math.round(finalBreakdown.withholdingAmount * 100) / 100,
    service_fee: Math.round(finalBreakdown.serviceFee * 100) / 100,
    packaging_cost: Math.round(finalBreakdown.packagingCost * 100) / 100,
    extra_cost: Math.round(finalBreakdown.extraCost * 100) / 100,
    net_vat: Math.round(finalBreakdown.netVat * 100) / 100,
    barem_used: result.baremUsed,
    calculation_details: JSON.stringify({
      productCost: product.cost,
      printingCost,
      extraCost,
      packagingCost,
      productVatRate,
      commissionRate,
      commissionVatRate,
      targetProfitRate,
      shippingCost: Math.round(result.shippingCost * 100) / 100,
      doubleShipping: !!product.double_shipping,
      baremUsed: result.baremUsed,
      saleVat: Math.round(finalBreakdown.saleVat * 100) / 100,
      productVat: Math.round(finalBreakdown.productVat * 100) / 100,
      printingVat: Math.round(finalBreakdown.printingVat * 100) / 100,
      extraCostVat: Math.round(finalBreakdown.extraCostVat * 100) / 100,
      shippingVat: Math.round(finalBreakdown.shippingVat * 100) / 100,
      packagingVat: Math.round(finalBreakdown.packagingVat * 100) / 100,
      commissionVat: Math.round(finalBreakdown.commissionVat * 100) / 100,
      serviceFeeVat: Math.round(finalBreakdown.serviceFeeVat * 100) / 100,
      posServiceFee: Math.round(finalBreakdown.posServiceFee * 100) / 100,
      posServiceFeeVat: Math.round(finalBreakdown.posServiceFeeVat * 100) / 100,
      posServiceFeeRate: finalBreakdown.posServiceFeeRate,
      corporateTaxAmount: Math.round((finalBreakdown.corporateTaxAmount || 0) * 100) / 100,
    })
  };
};

/**
 * Tüm platformlar için ürün fiyatlarını hesapla
 */
export const calculateAllPlatformPrices = ({
  product,
  platforms,
  shippingRates,
  commissions,
  packages = [],
  packageItems = [],
  getPackageCost = null,
  settings = [],
  systemAdminPlatforms = []
}) => {
  const results = [];
  const isSameDayDelivery = product.same_day_delivery === true;
  const printingCost = product.printing_cost || 0;
  const extraCost = product.extra_cost || 0;
  let packagingCost = 0;
  
  if (product.multi_package && product.packages) {
    try {
      const productPackages = typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages;
      for (const pkg of productPackages) {
        const packageId = pkg.package_id;
        if (packageId) {
          if (getPackageCost) {
            packagingCost += getPackageCost(packageId);
          } else if (packageItems && packageItems.length > 0) {
            packagingCost += packageItems
              .filter(item => item.package_id === packageId && item.is_active !== false)
              .reduce((sum, item) => sum + (item.cost || 0), 0);
          } else if (packages && packages.length > 0) {
            const pkg = packages.find(p => p.id === packageId);
            if (pkg) packagingCost += pkg.total_cost || 0;
          }
        }
      }
    } catch (e) {}
  } else if (!product.multi_package && (product.package_id || product.auto_package_id)) {
    const packageId = product.package_id || product.auto_package_id;
    if (getPackageCost) {
      packagingCost = getPackageCost(packageId);
    } else if (packageItems && packageItems.length > 0) {
      packagingCost = packageItems
        .filter(item => item.package_id === packageId && item.is_active !== false)
        .reduce((sum, item) => sum + (item.cost || 0), 0);
    } else if (packages && packages.length > 0) {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) packagingCost = pkg.total_cost || 0;
    }
  }

  // Baz maliyet varsa ve normal maliyetten yüksekse onu kullan
  const effectiveCost = (product.ref_product_id && product.base_cost && product.base_cost > product.cost)
    ? product.base_cost
    : product.cost;
  const productForCalc = { ...product, cost: effectiveCost };
  
  for (const platform of platforms) {
    if (!platform.is_active) continue;
    
    try {
      let platformForCalculation = platform;
      
      if (platform.platform_type === 'trendyol' || platform.platform_type === 'hepsiburada') {
        const adminPlatformData = systemAdminPlatforms.find(p => p.platform_type === platform.platform_type);
        if (adminPlatformData) {
          platformForCalculation = {
            ...platform,
            has_withholding: adminPlatformData.has_withholding,
            withholding_rate: adminPlatformData.withholding_rate,
            has_service_fee: adminPlatformData.has_service_fee,
            service_fee_type: adminPlatformData.service_fee_type,
            service_fee_amount: adminPlatformData.service_fee_amount,
            service_fee_vat_rate: adminPlatformData.service_fee_vat_rate,
            same_day_delivery_service_fee: adminPlatformData.same_day_delivery_service_fee,
            has_pos_service_fee: adminPlatformData.has_pos_service_fee,
            pos_service_fee_rate: adminPlatformData.pos_service_fee_rate,
            use_barem: adminPlatformData.use_barem,
            barem_max_desi: adminPlatformData.barem_max_desi,
            barem1_min: adminPlatformData.barem1_min,
            barem1_max: adminPlatformData.barem1_max,
            barem2_min: adminPlatformData.barem2_min,
            barem2_max: adminPlatformData.barem2_max,
            has_corporate_tax: adminPlatformData.has_corporate_tax,
            corporate_tax_rate: adminPlatformData.corporate_tax_rate,
          };
        }
      }
      
      let commission = findCommission(commissions, platform.id, product.category_id);
      
      if (!commission) {
        const samePlatforms = platforms.filter(p => p.platform_type === platform.platform_type && p.id !== platform.id);
        for (const samePlatform of samePlatforms) {
          commission = findCommission(commissions, samePlatform.id, product.category_id);
          if (commission) break;
        }
      }
      
      if (!commission) {
        console.warn(`Komisyon bulunamadı: ${product.name} (${product.category_name}) - ${platform.name}`);
        continue;
      }
      
      const priceResult = calculateProductPrice({
        product: productForCalc,
        platform: platformForCalculation,
        shippingRates,
        commission,
        packagingCost,
        printingCost,
        extraCost,
        isSameDayDelivery,
        settings
      });
      
      results.push(priceResult);
    } catch (error) {
      console.error(`Fiyat hesaplama hatası: ${product.name} - ${platform.name}`, error.message);
    }
  }
  
  return results;
};

/**
 * Manuel hesaplama (Calculator sayfası için)
 */
export const calculateManual = ({
  productCost,
  productVatRate,
  desi,
  platform,
  shippingRates,
  commissionRate,
  commissionVatRate,
  targetProfitRate,
  packagingCost = 0,
  printingCost = 0,
  isMultiPackage = false,
  packages = [],
  specialShipping = false,
  doubleShipping = false,
  settings = []
}) => {
  const fakeProduct = {
    id: 'manual',
    name: 'Manuel Hesaplama',
    sku: '-',
    cost: productCost,
    desi,
    vat_rate: productVatRate,
    printing_cost: printingCost,
    multi_package: isMultiPackage,
    special_shipping: specialShipping,
    double_shipping: doubleShipping,
    packages: isMultiPackage ? JSON.stringify(packages) : null
  };
  
  const fakeCommission = {
    commission_rate: commissionRate,
    commission_vat_rate: commissionVatRate,
    target_profit_rate: targetProfitRate
  };
  
  const result = calculateProductPrice({
    product: fakeProduct,
    platform,
    shippingRates,
    commission: fakeCommission,
    packagingCost,
    printingCost,
    isSameDayDelivery: false,
    settings
  });

  return result;
};

export default {
  removeVat,
  addVat,
  calculateVat,
  calculatePriceBreakdown,
  calculateProductPrice,
  calculateAllPlatformPrices,
  calculateManual,
  findCommission,
  findDesiShippingRate,
  findBaremShippingRate,
  isPriceInBaremRange,
  findSalePriceForTargetProfit,
  calculateServiceFee,
  calculateWithholding,
  calculateCommission
};
