import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Calculator as CalcIcon, ArrowRight, Info, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateProductPrice } from '@/components/PriceCalculationEngine';

const Platform = db.entities.Platform;
const ShippingRate = db.entities.ShippingRate;
const Product = db.entities.Product;
const Commission = db.entities.Commission;
const Category = db.entities.Category;

export default function Calculator() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [userEmail, setUserEmail] = React.useState(null);
  const [mode, setMode] = useState('manual'); // manual | product
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedShippingCompany, setSelectedShippingCompany] = useState('');
  const [shippingMode, setShippingMode] = useState('company'); // 'company' | 'manual'
  const [manualShippingCost, setManualShippingCost] = useState('');
  
  const [cost, setCost] = useState('');
  const [desi, setDesi] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [commissionRate, setCommissionRate] = useState('');
  const [targetProfit, setTargetProfit] = useState('');
  const [packagingCostMode, setPackagingCostMode] = useState('select'); // 'select' | 'manual'
  const [selectedPackage, setSelectedPackage] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [printingCost, setPrintingCost] = useState('');
  const [extraCost, setExtraCost] = useState('');
  const [isMultiPackage, setIsMultiPackage] = useState(false);
  const [packages, setPackages] = useState([{ desi: '', package_id: '' }]);
  const [isSameDayDelivery, setIsSameDayDelivery] = useState(false);
  
  const [result, setResult] = useState(null);

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: async () => {
      const userPlatforms = await Platform.filter({ created_by: userEmail });
      const marketplacePlatforms = await db.entities.Platform.filter({ is_system_admin: true });
      
      const merged = [...userPlatforms];
      for (const mp of marketplacePlatforms) {
        if (!merged.find(p => p.platform_type === mp.platform_type)) {
          merged.push(mp);
        }
      }
      return merged;
    },
    enabled: !!userEmail
  });

  const { data: shippingRates = [] } = useQuery({
    queryKey: ['shippingRates', userEmail],
    queryFn: () => ShippingRate.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', userEmail],
    queryFn: () => Category.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: packageOptions = [] } = useQuery({
    queryKey: ['packages', userEmail],
    queryFn: () => db.entities.Package.filter({ created_by: userEmail }),
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

  // Paket seçildiğinde maliyeti otomatik doldur
  useEffect(() => {
    if (packagingCostMode === 'select' && selectedPackage) {
      const packageData = packageOptions.find(p => p.id === selectedPackage);
      if (packageData) {
        setPackagingCost(String(packageData.total_cost || 0));
      }
    }
  }, [selectedPackage, packagingCostMode, packageOptions]);

  // Ürün seçildiğinde form alanlarını doldur
  useEffect(() => {
    if (mode === 'product' && selectedProduct && selectedPlatform) {
      const product = products.find(p => p.id === selectedProduct);
      const platform = platforms.find(p => p.id === selectedPlatform);
      
      if (product && platform) {
        setCost(String(product.cost || ''));
        setDesi(String(product.desi || ''));
        setVatRate(String(product.vat_rate || 20));
        setPrintingCost(String(product.printing_cost || ''));
        setIsMultiPackage(product.multi_package || false);
        
        // Komisyon bul
        const commission = commissions.find(
          c => c.platform_id === platform.id && c.category_id === product.category_id
        );
        
        if (commission) {
          setCommissionRate(String(commission.commission_rate || ''));
          setTargetProfit(String(commission.target_profit_rate || ''));
        }
      }
    }
  }, [selectedProduct, selectedPlatform, mode, products, platforms, commissions]);

  // Platform seçildiğinde otomatik olarak ilk kargo firmasını seç
  useEffect(() => {
    if (selectedPlatform && shippingRates.length > 0) {
      const platformShippingCompanies = [...new Set(
        shippingRates
          .filter(rate => rate.platform_id === selectedPlatform && rate.shipping_company)
          .map(rate => rate.shipping_company)
      )];
      
      if (platformShippingCompanies.length > 0 && !selectedShippingCompany) {
        setSelectedShippingCompany(platformShippingCompanies[0]);
      }
    }
  }, [selectedPlatform, shippingRates]);

  const getTotalPackagingCost = () => {
    if (!isMultiPackage || packages.length === 0) {
      return parseFloat(packagingCost) || 0;
    }
    
    let total = 0;
    for (const pkg of packages) {
      if (pkg.package_id) {
        const packageData = packageOptions.find(p => p.id === pkg.package_id);
        if (packageData) {
          total += packageData.total_cost || 0;
        }
      }
    }
    return total;
  };

  const handleCalculate = () => {
    const platform = platforms.find(p => p.id === selectedPlatform);
    if (!platform) return;

    // Fake ürün oluştur
    const fakeProduct = {
      id: 'manual',
      name: 'Manuel Hesaplama',
      sku: '-',
      cost: parseFloat(cost) || 0,
      desi: parseFloat(desi) || 1,
      vat_rate: parseFloat(vatRate) || 20,
      printing_cost: parseFloat(printingCost) || 0,
      extra_cost: 0,
      multi_package: isMultiPackage,
      special_shipping: false,
      packages: isMultiPackage ? JSON.stringify(packages.map(p => ({ desi: parseFloat(p.desi) || 0, package_id: p.package_id }))) : null,
      category_id: 'temp'
    };

    // Fake komisyon oluştur
    const fakeCommission = {
      commission_rate: parseFloat(commissionRate) || 0,
      commission_vat_rate: 20,
      target_profit_rate: parseFloat(targetProfit) || 30
    };

    const calcResult = calculateProductPrice({
      product: fakeProduct,
      platform,
      shippingRates,
      commission: fakeCommission,
      packagingCost: getTotalPackagingCost(),
      printingCost: parseFloat(printingCost) || 0,
      extraCost: 0,
      isSameDayDelivery,
      settings,
      overrideShippingCost: shippingMode === 'manual' ? (parseFloat(manualShippingCost) || 0) : null,
      overrideShippingCompany: shippingMode === 'company' ? selectedShippingCompany : null,
    });

    setResult(calcResult);
  };

  const handleReset = () => {
    setCost('');
    setDesi('');
    setVatRate('20');
    setCommissionRate('');
    setTargetProfit('');
    setPackagingCostMode('select');
    setSelectedPackage('');
    setPackagingCost('');
    setPrintingCost('');
    setExtraCost('');
    setIsMultiPackage(false);
    setPackages([{ desi: '', package_id: '' }]);
    setIsSameDayDelivery(false);
    setShippingMode('company');
    setManualShippingCost('');
    setSelectedProduct('');
    setSelectedPlatform('');
    setResult(null);
  };

  const addPackage = () => {
    setPackages([...packages, { desi: '', package_id: '' }]);
  };

  const removePackage = (index) => {
    if (packages.length > 1) {
      setPackages(packages.filter((_, i) => i !== index));
    }
  };

  const updatePackage = (index, field, value) => {
    const updated = [...packages];
    updated[index][field] = value;
    setPackages(updated);
  };

  const getBaremLabel = (barem) => {
    switch (barem) {
      case 'barem1': return 'Barem 1';
      case 'barem2': return 'Barem 2';
      case 'desi': return 'Desi Tarifesi';
      default: return '-';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <CalcIcon className="h-8 w-8 text-indigo-600" />
            Fiyat Hesaplayıcı
          </h1>
          <p className="text-slate-500 mt-1">Ürün fiyatını ve kârını hesaplayın (kaydetmez)</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={mode === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setMode('manual'); handleReset(); }}
                >
                  Manuel Giriş
                </Button>
                <Button
                  variant={mode === 'product' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setMode('product'); handleReset(); }}
                >
                  Ürün Seç
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {mode === 'product' && (
                <div className="space-y-2">
                  <Label>Ürün</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ürün seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Platform *</Label>
                <Select value={selectedPlatform} onValueChange={(val) => {
                  setSelectedPlatform(val);
                  setSelectedShippingCompany('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Platform seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.filter(p => p.is_active !== false).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maliyet (KDV Dahil) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Baskı Maliyeti (KDV Dahil)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={printingCost}
                    onChange={(e) => setPrintingCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ek Maliyet (KDV Dahil)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={extraCost}
                    onChange={(e) => setExtraCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
               </div>

{selectedPlatform && (() => {
               const selectedPlatformObj = platforms.find(p => p.id === selectedPlatform);
               const platformShippingCompanies = [...new Set(
                 shippingRates
                   .filter(rate => {
                     if (!rate.shipping_company || rate.is_active === false) return false;
                     // Manuel tarife: platform_id eşleşmeli
                     if (rate.is_manual === true) return rate.platform_id === selectedPlatform;
                     // Admin tarife: platform_type eşleşmeli
                     if (rate.is_admin_created === true) return rate.platform_type === selectedPlatformObj?.platform_type;
                     return false;
                   })
                   .map(rate => rate.shipping_company)
               )];

               return (
                 <div className="space-y-2">
                   <Label>Kargo *</Label>
                   <div className="flex gap-2">
                     <Select value={shippingMode} onValueChange={(val) => { setShippingMode(val); setSelectedShippingCompany(''); setManualShippingCost(''); }}>
                       <SelectTrigger className="w-36">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="company">Firmadan Seç</SelectItem>
                         <SelectItem value="manual">Manuel Gir</SelectItem>
                       </SelectContent>
                     </Select>
                     {shippingMode === 'company' ? (
                       <Select value={selectedShippingCompany} onValueChange={setSelectedShippingCompany}>
                         <SelectTrigger className="flex-1">
                           <SelectValue placeholder="Kargo firması seçin" />
                         </SelectTrigger>
                         <SelectContent>
                           {platformShippingCompanies.length > 0
                             ? platformShippingCompanies.map(company => (
                                 <SelectItem key={company} value={company}>{company}</SelectItem>
                               ))
                             : <SelectItem value="_none" disabled>Tarife bulunamadı</SelectItem>
                           }
                         </SelectContent>
                       </Select>
                     ) : (
                       <Input
                         type="number"
                         step="0.01"
                         value={manualShippingCost}
                         onChange={(e) => setManualShippingCost(e.target.value)}
                         placeholder="Kargo ücreti (₺)"
                         className="flex-1"
                       />
                     )}
                   </div>
                 </div>
               );
              })()}

              {!isMultiPackage && (
               <div className="space-y-2">
                <Label>Desi *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={desi}
                  onChange={(e) => setDesi(e.target.value)}
                  placeholder="1"
                />
               </div>
              )}

              {/* Bugün Kapında - sadece Trendyol/Hepsiburada için */}
              {(() => {
                const selectedPlatformObj = platforms.find(p => p.id === selectedPlatform);
                const isMarketplace = selectedPlatformObj?.platform_type === 'trendyol' || selectedPlatformObj?.platform_type === 'hepsiburada';
                if (!isMarketplace) return null;
                return (
                  <div className={`border rounded-xl p-4 transition-all ${isSameDayDelivery ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="sameDayDelivery"
                        checked={isSameDayDelivery}
                        onChange={(e) => setIsSameDayDelivery(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <Label htmlFor="sameDayDelivery" className="cursor-pointer font-medium text-slate-700">
                          Bugün Kapında
                        </Label>
                        <p className="text-xs text-slate-500 mt-0.5">İndirimli hizmet bedeli ve Bugün Kapında barem/desi tarifeleri kullanılır</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4">
               <div className={`border rounded-xl p-4 transition-all ${
                 isMultiPackage ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50'
               }`}>
                 <div className="flex items-center space-x-3">
                   <input
                     type="checkbox"
                     id="multiPackage"
                     checked={isMultiPackage}
                     onChange={(e) => setIsMultiPackage(e.target.checked)}
                     className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                   />
                   <div className="flex-1">
                     <Label htmlFor="multiPackage" className="cursor-pointer font-medium text-slate-700">
                       Çoklu Gönderim
                     </Label>
                     <p className="text-xs text-slate-500 mt-0.5">Bu ürün birden fazla paket halinde gönderilir</p>
                   </div>
                 </div>

                 {isMultiPackage && (
                   <div className="mt-4 space-y-3">
                     <div className="flex items-center justify-between">
                       <Label className="text-sm font-medium">Paketler</Label>
                       <Button
                         type="button"
                         size="sm"
                         variant="outline"
                         onClick={addPackage}
                         className="h-7 text-xs"
                       >
                         <Plus className="h-3 w-3 mr-1" />
                         Paket Ekle
                       </Button>
                     </div>
                     {packages.map((pkg, index) => (
                       <div key={index} className="flex gap-2 items-start bg-white rounded-lg p-3 border border-indigo-100">
                         <div className="flex-1 space-y-2">
                           <div className="flex gap-2">
                             <div className="flex-1">
                               <Label className="text-xs text-slate-600">Desi</Label>
                               <Input
                                 type="number"
                                 step="0.1"
                                 value={pkg.desi}
                                 onChange={(e) => updatePackage(index, 'desi', e.target.value)}
                                 placeholder="0"
                                 className="h-8 text-sm"
                               />
                             </div>
                             <div className="flex-1">
                               <Label className="text-xs text-slate-600">Paket</Label>
                               <Select 
                                 value={pkg.package_id} 
                                 onValueChange={(val) => updatePackage(index, 'package_id', val)}
                               >
                                 <SelectTrigger className="h-8 text-sm">
                                   <SelectValue placeholder="Seç" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   {packageOptions.filter(p => p.is_active !== false).map(p => (
                                     <SelectItem key={p.id} value={p.id}>
                                       {p.name}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             </div>
                           </div>
                         </div>
                         {packages.length > 1 && (
                           <Button
                             type="button"
                             size="icon"
                             variant="ghost"
                             onClick={() => removePackage(index)}
                             className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 mt-5"
                           >
                             <X className="h-4 w-4" />
                           </Button>
                         )}
                       </div>
                     ))}
                   </div>
                   )}
                   </div>
                   </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ürün KDV Oranı (%)</Label>
                  <Select value={vatRate} onValueChange={setVatRate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">%1</SelectItem>
                      <SelectItem value="10">%10</SelectItem>
                      <SelectItem value="20">%20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Komisyon Oranı (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Hedef Kâr Oranı (%)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Kâr Oranı = Net Kâr / Maliyet × 100</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={targetProfit}
                  onChange={(e) => setTargetProfit(e.target.value)}
                  placeholder="30"
                />
              </div>

              {!isMultiPackage && (
                <div className="space-y-2">
                  <Label>Paketleme Maliyeti (KDV Dahil)</Label>
                  <div className="flex gap-2">
                    <Select value={packagingCostMode} onValueChange={setPackagingCostMode}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select">Seç</SelectItem>
                        <SelectItem value="manual">Manuel</SelectItem>
                      </SelectContent>
                    </Select>
                    {packagingCostMode === 'select' ? (
                      <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Paket seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {packageOptions.filter(p => p.is_active !== false).map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (₺{p.total_cost?.toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        value={packagingCost}
                        onChange={(e) => setPackagingCost(e.target.value)}
                        placeholder="0.00"
                        className="flex-1"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleCalculate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={!selectedPlatform || (shippingMode === 'company' && !selectedShippingCompany) || (shippingMode === 'manual' && !manualShippingCost) || !cost || (!isMultiPackage && !desi) || (isMultiPackage && packages.some(p => !p.desi))}
                >
                  <CalcIcon className="mr-2 h-4 w-4" />
                  Hesapla
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Sıfırla
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result Section */}
          <Card className={`border-slate-200 shadow-sm transition-all ${result ? 'bg-white' : 'bg-slate-50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-indigo-600" />
                Hesaplama Sonucu
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <p>Hesaplama sonucu burada görünecek</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Main Result */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-6 text-center">
                    <p className="text-sm text-indigo-600 font-medium mb-1">Önerilen Satış Fiyatı</p>
                    <p className="text-4xl font-bold text-indigo-700">
                      ₺{result.sale_price?.toFixed(2)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Badge className={`${
                        result.profit_rate >= 30 ? 'bg-emerald-100 text-emerald-700' :
                        result.profit_rate >= 20 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        Kâr: %{result.profit_rate?.toFixed(1)}
                      </Badge>
                      <Badge variant="outline">
                        {getBaremLabel(result.barem_used)}
                      </Badge>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-700">Detaylı Hesaplama</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b-2 border-indigo-100 bg-indigo-50/30 px-3 rounded-t-lg">
                        <span className="font-semibold text-indigo-700">Satış Fiyatı (KDV Dahil)</span>
                        <span className="font-bold text-indigo-700">₺{result.sale_price?.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between py-2 pl-6 border-b border-slate-100">
                        <span className="text-slate-600">- Ürün Maliyeti (KDV Dahil)</span>
                        <span className="font-medium text-rose-600">-₺{parseFloat(cost || 0).toFixed(2)}</span>
                      </div>
                      {printingCost && parseFloat(printingCost) > 0 && (
                        <div className="flex justify-between py-2 pl-6 border-b border-slate-100">
                          <span className="text-slate-600">- Baskı Maliyeti (KDV Dahil)</span>
                          <span className="font-medium text-rose-600">-₺{parseFloat(printingCost).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 pl-6 border-b border-slate-100">
                        <span className="text-slate-600">- Kargo Ücreti (KDV Dahil)</span>
                        <span className="font-medium text-rose-600">-₺{result.shipping_cost?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 pl-6 border-b border-slate-100">
                        <span className="text-slate-600">- Paketleme Maliyeti (KDV Dahil)</span>
                        <span className="font-medium text-rose-600">-₺{result.packaging_cost?.toFixed(2)}</span>
                      </div>
                      {extraCost && parseFloat(extraCost) > 0 && (
                        <div className="flex justify-between py-2 pl-6 border-b border-slate-100">
                          <span className="text-slate-600">- Ek Maliyet (KDV Dahil)</span>
                          <span className="font-medium text-rose-600">-₺{parseFloat(extraCost).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 pl-6 border-b border-slate-100">
                        <span className="text-slate-600">- Komisyon Tutarı (KDV Dahil)</span>
                        <span className="font-medium text-rose-600">-₺{result.commission_amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 pl-6 border-b border-slate-100">
                        <span className="text-slate-600">- Stopaj Tutarı</span>
                        <span className="font-medium text-rose-600">-₺{result.withholding_amount?.toFixed(2)}</span>
                      </div>
                      {isAdmin && (
                      <div className="flex justify-between py-2 pl-6 border-b border-slate-100">
                        <span className="text-slate-600">- Hizmet Bedeli (KDV Dahil)</span>
                        <span className="font-medium text-rose-600">-₺{(result.service_fee || 0)?.toFixed(2)}</span>
                      </div>
                      )}
                      <div className="flex justify-between py-2 pl-6 border-b-2 border-slate-200">
                        <span className="text-slate-600">- Net KDV</span>
                        <span className="font-medium text-rose-600">-₺{result.net_vat?.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between py-3 bg-emerald-50 rounded-lg px-3 mt-3 border-2 border-emerald-200">
                        <span className="font-semibold text-emerald-700 text-base">= NET KÂR</span>
                        <span className="font-bold text-emerald-700 text-lg">₺{result.net_profit?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm border border-slate-200">
                   <div className="flex justify-between">
                     <span className="text-slate-600">Ürün Desisi:</span>
                     <span className="font-medium">{isMultiPackage ? packages.map(p => p.desi).join(', ') : desi}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-600">Kargo:</span>
                     <span className="font-medium">
                       {shippingMode === 'manual'
                         ? `Manuel (₺${parseFloat(manualShippingCost).toFixed(2)})`
                         : (selectedShippingCompany || '-')}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-600">Çoklu Gönderim:</span>
                     <span className="font-medium">{isMultiPackage ? 'Evet' : 'Hayır'}</span>
                   </div>
                   {(() => {
                     const selectedPlatformObj = platforms.find(p => p.id === selectedPlatform);
                     const isMarketplace = selectedPlatformObj?.platform_type === 'trendyol' || selectedPlatformObj?.platform_type === 'hepsiburada';
                     if (!isMarketplace) return null;
                     return (
                       <div className="flex justify-between">
                         <span className="text-slate-600">Bugün Kapında:</span>
                         <span className={`font-medium ${isSameDayDelivery ? 'text-amber-600' : ''}`}>{isSameDayDelivery ? 'Evet ✓' : 'Hayır'}</span>
                       </div>
                     );
                   })()}
                   <div className="flex justify-between">
                     <span className="text-slate-600">Komisyon Oranı:</span>
                     <span className="font-medium">%{commissionRate || '-'}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-600">Ürün KDV Oranı:</span>
                     <span className="font-medium">%{vatRate}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-600">Hedef Kâr Oranı:</span>
                     <span className="font-medium">%{targetProfit || '-'}</span>
                   </div>
                  </div>

                  <p className="text-xs text-slate-400 text-center">
                    * Bu hesaplama kaydedilmez. Sadece simülasyon amaçlıdır.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
