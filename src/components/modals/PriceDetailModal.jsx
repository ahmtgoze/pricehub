import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Store, Calculator } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function PriceDetailModal({ open, onClose, product, platform, priceData: priceDataProp, calculationDetails: calculationDetailsProp, productPrices = [], commissions = [] }) {
  const { user } = useAuth();

  const platformData = useMemo(() => {
    if (!platform) return {};
    return {
      hasWithholding: platform.has_withholding !== false,
      withholdingRate: platform.withholding_rate || 0,
      hasServiceFee: platform.has_service_fee !== false,
      serviceFeeType: platform.service_fee_type || 'fixed_per_order',
      serviceFeeAmount: platform.service_fee_amount || 0,
      serviceFeeVatRate: platform.service_fee_vat_rate || 20,
    };
  }, [platform]);

  const priceData = priceDataProp || productPrices.find(
    pp => pp.product_id === product?.id && pp.platform_id === platform?.id
  );

  let calculationDetails = calculationDetailsProp || {};
  if (!calculationDetailsProp && priceData?.calculation_details) {
    try { calculationDetails = JSON.parse(priceData.calculation_details); } catch (e) {}
  }

  const commission = commissions.find(
    c => c.category_id === product?.category_id && c.platform_id === platform?.id && c.is_active !== false
  );
  if (commission?.target_profit_rate) calculationDetails.targetProfitRate = commission.target_profit_rate;

  if (!open) return null;

  const getBaremLabel = (barem) => {
    switch (barem) {
      case 'barem1': return 'Barem 1';
      case 'barem2': return 'Barem 2';
      case 'desi': return 'Desi Tarifesi';
      default: return '-';
    }
  };

  const printingCost = calculationDetails.printingCost ?? priceData?.printing_cost ?? 0;
  const extraCost = calculationDetails.extraCost ?? priceData?.extra_cost ?? 0;
  const packagingCost = calculationDetails.packagingCost ?? priceData?.packaging_cost ?? 0;
  const productCost = calculationDetails.productCost ?? priceData?.product_cost ?? 0;
  const shippingCost = calculationDetails.shippingCost ?? priceData?.shipping_cost ?? 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl flex flex-col p-0 gap-0" style={{maxHeight: '90dvh'}}>
        <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calculator className="h-5 w-5 text-indigo-600 flex-shrink-0" />
            Fiyat Hesaplama Detayları
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 px-4 pb-6 sm:px-6 pt-4">
          {!priceData ? (
            <div className="text-center py-12 text-slate-400">
              <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Bu ürün için hesaplama detayı bulunamadı.</p>
              <p className="text-xs mt-1">Ürün sisteme eşleştirilmemiş olabilir.</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <Package className="h-5 w-5 text-slate-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Ürün</p>
                    <p className="font-semibold text-slate-900">{product?.name}</p>
                    <p className="text-xs text-slate-500 mt-1">SKU: {product?.sku || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <Store className="h-5 w-5 text-slate-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Platform</p>
                    <p className="font-semibold text-slate-900">{platform?.name}</p>
                    <Badge variant="outline" className="mt-2">
                      {getBaremLabel(priceData.barem_used)}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 sm:p-6">
                <p className="text-sm text-indigo-600 font-medium mb-2 text-center">Satış Fiyatı</p>
                <p className="text-3xl sm:text-4xl font-bold text-indigo-700 text-center">
                  ₺{priceData.sale_price?.toFixed(2)}
                </p>
                <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                  <Badge className="bg-emerald-100 text-emerald-700">
                    Kâr: ₺{(priceData.net_profit || 0)?.toFixed(2)}
                  </Badge>
                  <Badge className={`${
                    (priceData.profit_rate || 0) >= 30 ? 'bg-emerald-100 text-emerald-700' :
                    (priceData.profit_rate || 0) >= 20 ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    %{(priceData.profit_rate || 0)?.toFixed(1)}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-700 mb-3">Detaylı Hesaplama</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between py-2 border-b-2 border-indigo-100 bg-indigo-50/30 px-3 rounded-t-lg">
                    <span className="font-semibold text-indigo-700">Satış Fiyatı (KDV Dahil)</span>
                    <span className="font-bold text-indigo-700 ml-2 shrink-0">₺{priceData.sale_price?.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100">
                    <span className="text-slate-600">- Ürün Maliyeti (KDV Dahil)</span>
                    <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{Number(productCost).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100">
                    <span className="text-slate-600">- Baskı Maliyeti (KDV Dahil)</span>
                    <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{Number(printingCost).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100">
                    <span className="text-slate-600">- Ek Maliyet (KDV Dahil)</span>
                    <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{Number(extraCost).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100">
                    <span className="text-slate-600">- Kargo Ücreti (KDV Dahil)</span>
                    <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{Number(shippingCost).toFixed(2)}</span>
                  </div>

                  {priceData.service_fee != null && (
                    <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100">
                      <span className="text-slate-600">
                        {product?.same_day_delivery && platform?.has_same_day_delivery
                          ? '- Bugün Kargoda Hizmet Bedeli (İndirimli, KDV Dahil)'
                          : '- Hizmet Bedeli (KDV Dahil)'}
                      </span>
                      <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{(priceData.service_fee ?? 0).toFixed(2)}</span>
                    </div>
                  )}

                  {(calculationDetails.posServiceFee > 0) && (
                    <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100">
                      <span className="text-slate-600">- POS Hizmet Bedeli (KDV Dahil)</span>
                      <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{Number(calculationDetails.posServiceFee).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100">
                    <span className="text-slate-600">- Paketleme Maliyeti (KDV Dahil)</span>
                    <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{Number(packagingCost).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100">
                    <span className="text-slate-600">- Komisyon Tutarı (KDV Dahil)</span>
                    <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{(priceData.commission_amount || 0)?.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100">
                    <span className="text-slate-600">- Stopaj Tutarı</span>
                    <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{(priceData.withholding_amount || 0)?.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-200">
                    <span className="text-slate-600">- Net KDV</span>
                    <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{(priceData.net_vat || 0)?.toFixed(2)}</span>
                  </div>

                  {/* Vergi Öncesi Net Kâr */}
                  {((priceData.corporate_tax_amount ?? 0) > 0) && (
                    <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b border-slate-100 bg-slate-50/50">
                      <span className="text-slate-600 font-medium">= Vergi Öncesi Net Kâr</span>
                      <span className="font-medium text-slate-700 ml-2 shrink-0">
                        ₺{(priceData.net_profit_before_tax ?? ((priceData.net_profit ?? 0) + (priceData.corporate_tax_amount ?? 0))).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Kurumlar (Gelir) Vergisi */}
                  {((priceData.corporate_tax_amount ?? 0) > 0) && (
                    <div className="flex justify-between py-2 pl-3 sm:pl-6 border-b-2 border-slate-200">
                      <span className="text-slate-600">- Kurumlar (Gelir) Vergisi (%{calculationDetails.corporateTaxRate ?? 25})</span>
                      <span className="font-medium text-rose-600 ml-2 shrink-0">-₺{(priceData.corporate_tax_amount ?? 0).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Net Kâr */}
                  <div className="flex justify-between py-3 bg-emerald-50 rounded-lg px-3 mt-3 border-2 border-emerald-200">
                    <span className="font-semibold text-emerald-700 text-base">= NET KÂR</span>
                    <span className="font-bold text-emerald-700 text-lg">₺{(priceData.net_profit || 0)?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Ürün Desisi:</span>
                  <span className="font-medium">{product?.desi || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Komisyon Oranı:</span>
                  <span className="font-medium">%{Number(calculationDetails.commissionRate || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Ürün KDV Oranı:</span>
                  <span className="font-medium">%{calculationDetails.productVatRate || 20}</span>
                </div>

                <div className="border-t border-slate-200 pt-2 mt-2">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Platform Ayarları</p>
                  {platformData.hasWithholding && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Stopaj Oranı:</span>
                      <span className="font-medium">%{platformData.withholdingRate?.toFixed(2)}</span>
                    </div>
                  )}
                  {platformData.hasServiceFee && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Hizmet Bedeli Tipi:</span>
                      <span className="font-medium">
                        {platformData.serviceFeeType === 'fixed_per_order' ? 'Sabit (Sipariş Başı)' :
                         platformData.serviceFeeType === 'percent_of_sale' ? 'Yüzde (Satış Üzerinden)' : 'Yok'}
                      </span>
                    </div>
                  )}
                  {platformData.hasServiceFee && platformData.serviceFeeType !== 'none' && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Hizmet Bedeli Tutarı:</span>
                      <span className="font-medium">
                        {platformData.serviceFeeType === 'percent_of_sale'
                          ? `%${platformData.serviceFeeAmount?.toFixed(2)}`
                          : `₺${platformData.serviceFeeAmount?.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">Gerçekleşen Kâr Oranı:</span>
                  <span className="font-medium">%{(priceData.profit_rate || 0)?.toFixed(1)}</span>
                </div>

                {calculationDetails.targetProfitRate && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Hedef Kâr Oranı:</span>
                    <span className="font-medium">%{calculationDetails.targetProfitRate}</span>
                  </div>
                )}

                {((priceData.corporate_tax_amount ?? 0) > 0) && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kurumlar Vergisi Oranı:</span>
                    <span className="font-medium">%{calculationDetails.corporateTaxRate ?? 25}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}