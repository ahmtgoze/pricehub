import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Truck, Info, Zap, Link2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { ADAPTER_OPTIONS } from '@/lib/platformAdapters';

export default function PlatformSettingsModal({
  open,
  onOpenChange,
  platform,
  onSave,
  isSaving,
  isAdmin = false
}) {
  const isMarketplace =
    platform?.platform_type === 'trendyol' ||
    platform?.platform_type === 'hepsiburada';

  const { data: systemRates = [] } = useQuery({
    queryKey: ['shipping-rates-system', platform?.platform_type],
    queryFn: () =>
      db.entities.ShippingRate.filter({
        platform_type: platform?.platform_type,
        is_admin_created: true,
      }),
    enabled: open && !!platform?.platform_type,
  });

  const { data: manualRates = [] } = useQuery({
    queryKey: ['shipping-rates-manual', platform?.id],
    queryFn: async () => {
      const user = await db.auth.me();
      return db.entities.ShippingRate.filter({
        created_by: user.email,
        is_manual: true,
      });
    },
    enabled: open && !!platform?.id,
  });

  const systemCompanies = useMemo(() => {
    const names = [
      ...new Set(
        systemRates.filter((r) => r.shipping_company).map((r) => r.shipping_company)
      ),
    ];
    return names.map((name) => ({ id: name, name }));
  }, [systemRates]);

  const manualCompanies = useMemo(() => {
    const names = [
      ...new Set(
        manualRates.filter((r) => r.shipping_company).map((r) => r.shipping_company)
      ),
    ];
    return names.map((name) => ({ id: name, name }));
  }, [manualRates]);

  const [formData, setFormData] = useState({
    website_adapter: 'shopify',
    shipping_company_id: '',
    shipping_company_name: '',
    use_custom_shipping_price: false,
    custom_shipping_price: 0,
    has_same_day_delivery: false,
    same_day_delivery_service_fee: 0,
    has_withholding: false,
    withholding_rate: 0,
    has_service_fee: false,
    service_fee_type: 'fixed_per_order',
    service_fee_amount: 0,
    service_fee_vat_rate: 20,
    has_pos_service_fee: false,
    pos_service_fee_rate: 0,
    has_corporate_tax: true,
    corporate_tax_rate: 25,
    use_barem: false,
    barem_max_desi: 5,
    barem1_min: 0,
    barem1_max: 149.99,
    barem2_min: 150,
    barem2_max: 299.99,
    integration_supplier_id: '',
    integration_api_key: '',
    integration_api_secret: '',
    integration_username: '',
    integration_password: '',
    integration_merchant_id: '',
  });

  useEffect(() => {
    if (!platform || !open) return;
    const isWebsite = platform.platform_type === 'website';

    setFormData({
      shipping_company_id: platform.shipping_company_id || '',
      shipping_company_name: platform.shipping_company_name || '',
      use_custom_shipping_price:
        platform.use_custom_shipping_price === true ||
        (isWebsite && platform.use_custom_shipping_price == null),
      custom_shipping_price: platform.custom_shipping_price ?? 0,
      has_same_day_delivery: platform.has_same_day_delivery === true,
      has_withholding: platform.has_withholding ?? false,
      withholding_rate: platform.withholding_rate ?? 0,
      has_service_fee: platform.has_service_fee ?? false,
      service_fee_type: platform.service_fee_type || 'fixed_per_order',
      service_fee_amount: platform.service_fee_amount ?? 0,
      service_fee_vat_rate: platform.service_fee_vat_rate ?? 20,
      same_day_delivery_service_fee: platform.same_day_delivery_service_fee ?? 0,
      has_pos_service_fee: platform.has_pos_service_fee === true,
      pos_service_fee_rate: platform.pos_service_fee_rate ?? 0,
      has_corporate_tax: platform.has_corporate_tax ?? true,
      corporate_tax_rate: platform.corporate_tax_rate ?? 25,
      use_barem: platform.use_barem ?? false,
      barem_max_desi: platform.barem_max_desi ?? 5,
      barem1_min: platform.barem1_min ?? 0,
      barem1_max: platform.barem1_max ?? 149.99,
      barem2_min: platform.barem2_min ?? 150,
      barem2_max: platform.barem2_max ?? 299.99,
      integration_supplier_id: platform.integration_supplier_id || '',
      integration_api_key: platform.integration_api_key || '',
      integration_api_secret: platform.integration_api_secret || '',
      integration_username: platform.integration_username || '',
      integration_password: platform.integration_password || '',
      integration_merchant_id: platform.integration_merchant_id || '',
      website_adapter: platform.website_adapter || 'shopify',
    });
  }, [platform, open]);

  const shippingCompanies = formData.use_custom_shipping_price
    ? manualCompanies
    : systemCompanies;

  useEffect(() => {
    if (!open) return;
    if (shippingCompanies.length === 1) {
      const only = shippingCompanies[0];
      setFormData((prev) => ({
        ...prev,
        shipping_company_id: only.id,
        shipping_company_name: only.name,
      }));
    } else if (formData.shipping_company_id && shippingCompanies.length > 1) {
      const stillExists = shippingCompanies.find(
        (c) => c.id === formData.shipping_company_id
      );
      if (!stillExists) {
        setFormData((prev) => ({
          ...prev,
          shipping_company_id: '',
          shipping_company_name: '',
        }));
      }
    }
  }, [shippingCompanies, open]);

  const handleShippingCompanyChange = (id) => {
    const company = shippingCompanies.find((c) => c.id === id);
    setFormData((prev) => ({
      ...prev,
      shipping_company_id: id === 'none' ? '' : id,
      shipping_company_name: company ? company.name : '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      website_adapter: formData.website_adapter,
      shipping_company_id: formData.shipping_company_id || (shippingCompanies[0]?.id ?? ''),
      shipping_company_name: formData.shipping_company_name || (shippingCompanies[0]?.name ?? ''),
      use_custom_shipping_price: formData.use_custom_shipping_price,
      custom_shipping_price: parseFloat(formData.custom_shipping_price) || 0,
      has_same_day_delivery: formData.has_same_day_delivery,
      same_day_delivery_vat_rate: 20,
      has_corporate_tax: formData.has_corporate_tax,
      corporate_tax_rate: parseFloat(formData.corporate_tax_rate) || 25,
    };

    if (isMarketplace && isAdmin) {
      Object.assign(payload, {
        has_withholding: formData.has_withholding,
        withholding_rate: parseFloat(formData.withholding_rate) || 0,
        has_service_fee: formData.has_service_fee,
        service_fee_type: formData.service_fee_type,
        service_fee_amount: parseFloat(formData.service_fee_amount) || 0,
        service_fee_vat_rate: parseFloat(formData.service_fee_vat_rate) || 20,
        same_day_delivery_service_fee: parseFloat(formData.same_day_delivery_service_fee) || 0,
        has_pos_service_fee: formData.has_pos_service_fee,
        pos_service_fee_rate: parseFloat(formData.pos_service_fee_rate) || 0,
        use_barem: formData.use_barem,
        barem_max_desi: parseFloat(formData.barem_max_desi) || 5,
        barem1_min: parseFloat(formData.barem1_min) || 0,
        barem1_max: parseFloat(formData.barem1_max) || 0,
        barem2_min: parseFloat(formData.barem2_min) || 0,
        barem2_max: parseFloat(formData.barem2_max) || 0,
      });
    }

    onSave(payload);
  };

  const platformColor =
    platform?.platform_type === 'trendyol'
      ? 'from-orange-500 to-orange-600'
      : platform?.platform_type === 'hepsiburada'
      ? 'from-yellow-500 to-orange-500'
      : 'from-indigo-500 to-purple-600';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col p-0 gap-0 max-h-[90dvh]">
        <div className={`h-1 w-full bg-gradient-to-r ${platformColor} rounded-t-lg flex-shrink-0`} />
        <DialogHeader className="px-6 pt-4 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {platform?.name} Ayarları
          </DialogTitle>
          {isMarketplace && !isAdmin && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 text-xs text-amber-800">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Barem ücretleri, stopaj oranı ve hizmet bedelleri yalnızca sistem yöneticisi tarafından düzenlenebilir.</span>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-5 space-y-5">

            {/* WEB SİTESİ ALTYAPI SEÇİMİ */}
            {!isMarketplace && (
              <div className="space-y-2">
                <Label className="font-semibold">Web Altyapısı</Label>
                <Select value={formData.website_adapter} onValueChange={(v) => setFormData({ ...formData, website_adapter: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADAPTER_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Dosya yükleme ve dışa aktarma formatı bu seçime göre belirlenir.</p>
              </div>
            )}

            {/* KARGO AYARLARI */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-500" />
                <h4 className="font-semibold text-slate-700">Kargo Ayarları</h4>
              </div>

              {!isMarketplace && (
                <div className="space-y-2">
                  <Label>Kargo Firması</Label>
                  {shippingCompanies.length === 0 ? (
                    <div className="text-sm text-slate-400 italic bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      Henüz sisteme kargo firması eklenmemiş.
                    </div>
                  ) : shippingCompanies.length === 1 ? (
                    <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      {shippingCompanies[0].name}{' '}
                      <span className="text-xs text-slate-400">(otomatik seçildi)</span>
                    </div>
                  ) : (
                    <Select
                      value={formData.shipping_company_id || 'none'}
                      onValueChange={handleShippingCompanyChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kargo firması seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Seçilmedi --</SelectItem>
                        {shippingCompanies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {isMarketplace && (
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <Label className="text-sm font-semibold text-slate-700">Kargo Fiyat Modu</Label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="shipping_mode"
                        checked={!formData.use_custom_shipping_price}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            use_custom_shipping_price: false,
                            shipping_company_id: '',
                            shipping_company_name: '',
                          }))
                        }
                        className="mt-0.5 accent-indigo-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">Sistem Tarifesi</p>
                        <p className="text-xs text-slate-400">Yüklenen kargo tarifeleri üzerinden otomatik hesaplanır</p>
                        {!formData.use_custom_shipping_price && (
                          <div className="mt-2">
                            {shippingCompanies.length === 0 ? (
                              <div className="text-xs text-slate-400 italic bg-white border border-slate-100 rounded-lg px-3 py-2">
                                Henüz sisteme kargo firması eklenmemiş.
                              </div>
                            ) : shippingCompanies.length === 1 ? (
                              <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                {shippingCompanies[0].name}{' '}
                                <span className="text-slate-400">(otomatik seçildi)</span>
                              </div>
                            ) : (
                              <Select
                                value={formData.shipping_company_id || 'none'}
                                onValueChange={handleShippingCompanyChange}
                              >
                                <SelectTrigger className="bg-white text-sm">
                                  <SelectValue placeholder="Kargo firması seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Seçilmedi --</SelectItem>
                                  {shippingCompanies.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="shipping_mode"
                        checked={formData.use_custom_shipping_price}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            use_custom_shipping_price: true,
                            shipping_company_id: '',
                            shipping_company_name: '',
                          }))
                        }
                        className="mt-0.5 accent-indigo-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">Manuel Anlaşmalı Fiyat</p>
                        <p className="text-xs text-slate-400">Kargo Tarifeleri sayfasında tanımladığınız manuel tarifeler kullanılır</p>
                        {formData.use_custom_shipping_price && (
                          <div className="mt-2">
                            {shippingCompanies.length === 0 ? (
                              <div className="text-xs text-slate-400 italic bg-white border border-slate-100 rounded-lg px-3 py-2">
                                Henüz sisteme kargo firması eklenmemiş.
                              </div>
                            ) : shippingCompanies.length === 1 ? (
                              <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                {shippingCompanies[0].name}{' '}
                                <span className="text-slate-400">(otomatik seçildi)</span>
                              </div>
                            ) : (
                              <Select
                                value={formData.shipping_company_id || 'none'}
                                onValueChange={handleShippingCompanyChange}
                              >
                                <SelectTrigger className="bg-white text-sm">
                                  <SelectValue placeholder="Kargo firması seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Seçilmedi --</SelectItem>
                                  {shippingCompanies.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* SİSTEM YÖNETİM AYARLARI / PLATFORM BİLGİLERİ */}
            {isMarketplace && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 text-sm bg-slate-100 rounded-lg px-3 py-2">
                    {isAdmin ? '⚙️ Sistem Yönetim Ayarları' : 'Platform Bilgileri'}
                  </h4>

                  {/* Kurumlar (Gelir) Vergisi */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Kurumlar (Gelir) Vergisi</Label>
                        <p className="text-xs text-slate-400 mt-0.5">Kâr üzerinden alınan vergi (%{formData.corporate_tax_rate})</p>
                      </div>
                      {isAdmin ? (
                        <Switch
                          checked={formData.has_corporate_tax}
                          onCheckedChange={(checked) => setFormData({ ...formData, has_corporate_tax: checked })}
                        />
                      ) : (
                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${formData.has_corporate_tax ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {formData.has_corporate_tax ? 'Aktif' : 'Pasif'}
                        </span>
                      )}
                    </div>
                    {formData.has_corporate_tax && (
                      <div className="space-y-2 ml-2">
                        <Label className="text-sm">Vergi Oranı (%)</Label>
                        {isAdmin ? (
                          <Input
                            type="number" step="0.01" min="0" max="100"
                            value={formData.corporate_tax_rate}
                            onChange={(e) => setFormData({ ...formData, corporate_tax_rate: e.target.value })}
                            placeholder="25"
                          />
                        ) : (
                          <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                            %{formData.corporate_tax_rate}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stopaj */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Stopaj {isAdmin ? 'Var mı?' : ''}</Label>
                      {isAdmin ? (
                        <Switch
                          checked={formData.has_withholding}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, has_withholding: checked })
                          }
                        />
                      ) : (
                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${formData.has_withholding ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {formData.has_withholding ? 'Aktif' : 'Pasif'}
                        </span>
                      )}
                    </div>
                    {formData.has_withholding && (
                      <div className="space-y-2 ml-2">
                        <Label className="text-sm">Stopaj Oranı (%)</Label>
                        {isAdmin ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.withholding_rate}
                            onChange={(e) =>
                              setFormData({ ...formData, withholding_rate: e.target.value })
                            }
                            placeholder="1"
                          />
                        ) : (
                          <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                            %{formData.withholding_rate}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hizmet Bedeli */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Hizmet Bedeli {isAdmin ? 'Var mı?' : ''}</Label>
                      {isAdmin ? (
                        <Switch
                          checked={formData.has_service_fee}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, has_service_fee: checked })
                          }
                        />
                      ) : (
                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${formData.has_service_fee ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {formData.has_service_fee ? 'Aktif' : 'Pasif'}
                        </span>
                      )}
                    </div>
                    {formData.has_service_fee && (
                      <div className="space-y-2 ml-2">
                        <Label className="text-sm">Hizmet Bedeli Tipi</Label>
                        {isAdmin ? (
                          <Select
                            value={formData.service_fee_type}
                            onValueChange={(v) =>
                              setFormData({ ...formData, service_fee_type: v })
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Yok</SelectItem>
                              <SelectItem value="fixed_per_order">Sabit (Sipariş Başı)</SelectItem>
                              <SelectItem value="percent_of_sale">Yüzde (Satış Üzerinden)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                            {formData.service_fee_type === 'fixed_per_order' ? 'Sabit (Sipariş Başı)' :
                             formData.service_fee_type === 'percent_of_sale' ? 'Yüzde (Satış Üzerinden)' : 'Yok'}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div>
                            <Label className="text-sm">
                              {formData.service_fee_type === 'percent_of_sale' ? 'Oran (%)' : 'Tutar (₺)'}
                            </Label>
                            {isAdmin ? (
                              <Input
                                type="number" step="0.01" min="0"
                                value={formData.service_fee_amount}
                                onChange={(e) => setFormData({ ...formData, service_fee_amount: e.target.value })}
                              />
                            ) : (
                              <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                                {formData.service_fee_type === 'percent_of_sale' ? `%${formData.service_fee_amount}` : `\u20ba${formData.service_fee_amount}`}
                              </div>
                            )}
                          </div>
                          <div>
                            <Label className="text-sm">KDV (%)</Label>
                            {isAdmin ? (
                              <Input
                                type="number"
                                value={formData.service_fee_vat_rate}
                                onChange={(e) => setFormData({ ...formData, service_fee_vat_rate: e.target.value })}
                              />
                            ) : (
                              <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                                %{formData.service_fee_vat_rate}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-3 mt-3">
                          <Label className="text-sm font-medium block mb-2">Bugün Kargoda Hizmet Bedeli (İndirimli)</Label>
                          {isAdmin ? (
                            <>
                              <Input
                                type="number" step="0.01" min="0"
                                value={formData.same_day_delivery_service_fee}
                                onChange={(e) => setFormData({ ...formData, same_day_delivery_service_fee: e.target.value })}
                                placeholder="0" className="text-sm"
                              />
                              <p className="text-xs text-slate-500 mt-1">"Bugün Kargoda" seçildiğinde bu bedel uygulanır</p>
                            </>
                          ) : (
                            <>
                              <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                                \u20ba{formData.same_day_delivery_service_fee}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">"Bugün Kargoda" seçildiğinde bu bedel uygulanır</p>
                            </>
                          )}
                        </div>

                        {/* POS Hizmet Bedeli - sadece HepsiBurada */}
                        {platform?.platform_type === 'hepsiburada' && (
                          <div className="border-t border-slate-200 pt-3 mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <Label className="text-sm font-medium">POS Hizmet Bedeli</Label>
                                <p className="text-xs text-slate-500 mt-0.5">Sipariş başına yüzdelik kesinti (Bugün Kargoda dahil)</p>
                              </div>
                              {isAdmin ? (
                                <Switch
                                  checked={formData.has_pos_service_fee}
                                  onCheckedChange={(checked) => setFormData({ ...formData, has_pos_service_fee: checked })}
                                />
                              ) : (
                                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${formData.has_pos_service_fee ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {formData.has_pos_service_fee ? 'Aktif' : 'Pasif'}
                                </span>
                              )}
                            </div>
                            {formData.has_pos_service_fee && (
                              isAdmin ? (
                                <>
                                  <Input
                                    type="number" step="0.0001" min="0"
                                    value={formData.pos_service_fee_rate}
                                    onChange={(e) => setFormData({ ...formData, pos_service_fee_rate: e.target.value })}
                                    placeholder="0" className="text-sm"
                                  />
                                  <p className="text-xs text-slate-500 mt-1">KDV dahil satış fiyatı üzerinden yüzde olarak kesilir</p>
                                </>
                              ) : (
                                <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                                  %{formData.pos_service_fee_rate}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Barem */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Barem Desteği Var mı?</Label>
                      {isAdmin ? (
                        <Switch
                          checked={formData.use_barem}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, use_barem: checked })
                          }
                        />
                      ) : (
                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${formData.use_barem ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {formData.use_barem ? 'Aktif' : 'Pasif'}
                        </span>
                      )}
                    </div>
                    {formData.use_barem && (
                      <div className="space-y-2 ml-2">
                        <Label className="text-sm">Maksimum Desi</Label>
                        {isAdmin ? (
                          <>
                            <Input
                              type="number" step="1" min="0"
                              value={formData.barem_max_desi}
                              onChange={(e) => setFormData({ ...formData, barem_max_desi: e.target.value })}
                            />
                            <p className="text-xs text-slate-500">Bu değerin üzerindeki ürünler desi tarifesiyle hesaplanır</p>
                          </>
                        ) : (
                          <>
                            <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                              {formData.barem_max_desi} desi
                            </div>
                            <p className="text-xs text-slate-500">Bu değerin üzerindeki ürünler desi tarifesiyle hesaplanır</p>
                          </>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div>
                            <Label className="text-xs">Barem 1 Aralığı (\u20ba)</Label>
                            <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                              {formData.barem1_min} - {formData.barem1_max}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Barem 2 Aralığı (\u20ba)</Label>
                            <div className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 border border-slate-100">
                              {formData.barem2_min} - {formData.barem2_max}
                            </div>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-xs font-semibold text-slate-600 mb-2">Admin: Aralıkları Düzenle</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Barem 1 Min (\u20ba)</Label>
                                <Input type="number" step="0.01" value={formData.barem1_min}
                                  onChange={(e) => setFormData({ ...formData, barem1_min: e.target.value })} />
                              </div>
                              <div>
                                <Label className="text-xs">Barem 1 Max (\u20ba)</Label>
                                <Input type="number" step="0.01" value={formData.barem1_max}
                                  onChange={(e) => setFormData({ ...formData, barem1_max: e.target.value })} />
                              </div>
                              <div>
                                <Label className="text-xs">Barem 2 Min (\u20ba)</Label>
                                <Input type="number" step="0.01" value={formData.barem2_min}
                                  onChange={(e) => setFormData({ ...formData, barem2_min: e.target.value })} />
                              </div>
                              <div>
                                <Label className="text-xs">Barem 2 Max (\u20ba)</Label>
                                <Input type="number" step="0.01" value={formData.barem2_max}
                                  onChange={(e) => setFormData({ ...formData, barem2_max: e.target.value })} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {isMarketplace && <Separator />}

            {/* BUGÜN KARGODA */}
            {isMarketplace && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-slate-500" />
                  <h4 className="font-semibold text-slate-700">Bugün Kargoda</h4>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Bugün Kargoda özelliği</Label>
                    <p className="text-xs text-slate-400 mt-0.5">Müşteri ürün bazında bu seçeneği açıp kapatabilir</p>
                  </div>
                  <Switch
                    checked={formData.has_same_day_delivery}
                    onCheckedChange={(v) =>
                      setFormData((prev) => ({ ...prev, has_same_day_delivery: v }))
                    }
                  />
                </div>
                {!formData.has_same_day_delivery && (
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 mt-1">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Bu seçenek aktif olduğunda aynı gün kargoya verilen siparişler için indirimli hizmet bedeli otomatik uygulanır.</span>
                  </div>
                )}
              </div>
            )}

            {/* ENTEGRASYON BİLGİLERİ */}
            {isMarketplace && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-slate-500" />
                    <h4 className="font-semibold text-slate-700">Entegrasyon Bilgileri</h4>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Yakında Aktif</span>
                  </div>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Bu bölüm şu an aktif değildir. Entegrasyon özelliği yakında devreye girecektir.</span>
                  </div>

                  {platform?.platform_type === 'trendyol' && (
                    <div className="space-y-3 opacity-75">
                      <div className="space-y-2">
                        <Label className="text-sm">Satıcı ID (Supplier ID)</Label>
                        <Input type="text" placeholder="Örn: 123456"
                          value={formData.integration_supplier_id}
                          onChange={(e) => setFormData({ ...formData, integration_supplier_id: e.target.value })}
                          disabled />
                        <p className="text-xs text-slate-400">Trendyol Satıcı Paneli \u2192 Entegrasyon \u2192 API Bilgileri</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">API Key</Label>
                        <Input type="text" placeholder="API Key"
                          value={formData.integration_api_key}
                          onChange={(e) => setFormData({ ...formData, integration_api_key: e.target.value })}
                          disabled />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">API Secret</Label>
                        <Input type="password" placeholder="API Secret"
                          value={formData.integration_api_secret}
                          onChange={(e) => setFormData({ ...formData, integration_api_secret: e.target.value })}
                          disabled />
                      </div>
                    </div>
                  )}

                  {platform?.platform_type === 'hepsiburada' && (
                    <div className="space-y-3 opacity-75">
                      <div className="space-y-2">
                        <Label className="text-sm">Kullanıcı Adı (Username)</Label>
                        <Input type="text" placeholder="API Kullanıcı Adı"
                          value={formData.integration_username}
                          onChange={(e) => setFormData({ ...formData, integration_username: e.target.value })}
                          disabled />
                        <p className="text-xs text-slate-400">Hepsiburada Satıcı Paneli \u2192 Hesap Ayarları \u2192 API Bilgileri</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Şifre (Password)</Label>
                        <Input type="password" placeholder="API Şifresi"
                          value={formData.integration_password}
                          onChange={(e) => setFormData({ ...formData, integration_password: e.target.value })}
                          disabled />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Merchant ID</Label>
                        <Input type="text" placeholder="Merchant ID"
                          value={formData.integration_merchant_id}
                          onChange={(e) => setFormData({ ...formData, integration_merchant_id: e.target.value })}
                          disabled />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              İptal
            </Button>
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}