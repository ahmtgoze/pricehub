import React, { useState, useEffect } from 'react';
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
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ADAPTER_OPTIONS } from "@/lib/platformAdapters";

export default function PlatformModal({
  open,
  onOpenChange,
  platform,
  onSave,
  isSaving
}) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    platform_type: 'trendyol',
    website_adapter: 'shopify',
    shipping_company: '',
    has_withholding: true,
    withholding_rate: 1,
    has_service_fee: true,
    service_fee_type: 'fixed_per_order',
    service_fee_amount: 0,
    service_fee_vat_rate: 20,
    has_transaction_fee: false,
    transaction_fee_amount: 0,
    transaction_fee_vat_rate: 20,
    has_same_day_delivery: false,
    same_day_delivery_fee: 0,
    same_day_delivery_vat_rate: 20,
    use_barem: true,
    barem_max_desi: 5,
    barem1_min: 0,
    barem1_max: 149.99,
    barem2_min: 150,
    barem2_max: 299.99,
    is_active: true
  });

  useEffect(() => {
    if (platform) {
      setFormData({
        name: platform.name || '',
        code: platform.code || '',
        platform_type: platform.platform_type || 'trendyol',
        website_adapter: platform.website_adapter || 'shopify',
        shipping_company: platform.shipping_company || '',
        has_withholding: platform.has_withholding !== false,
        withholding_rate: platform.withholding_rate ?? 1,
        has_service_fee: platform.has_service_fee !== false,
        service_fee_type: platform.service_fee_type || 'fixed_per_order',
        service_fee_amount: platform.service_fee_amount ?? 0,
        service_fee_vat_rate: platform.service_fee_vat_rate ?? 20,
        has_transaction_fee: platform.has_transaction_fee === true,
        transaction_fee_amount: platform.transaction_fee_amount ?? 0,
        transaction_fee_vat_rate: platform.transaction_fee_vat_rate ?? 20,
        has_same_day_delivery: platform.has_same_day_delivery === true,
        same_day_delivery_fee: platform.same_day_delivery_fee ?? 0,
        same_day_delivery_vat_rate: platform.same_day_delivery_vat_rate ?? 20,
        use_barem: platform.use_barem !== false,
        barem_max_desi: platform.barem_max_desi ?? 5,
        barem1_min: platform.barem1_min ?? 0,
        barem1_max: platform.barem1_max ?? 149.99,
        barem2_min: platform.barem2_min ?? 150,
        barem2_max: platform.barem2_max ?? 299.99,
        is_active: platform.is_active !== false
      });
    } else {
      setFormData({
        name: '',
        code: '',
        platform_type: 'trendyol',
        website_adapter: 'shopify',
        shipping_company: '',
        has_withholding: true,
        withholding_rate: 1,
        has_service_fee: true,
        service_fee_type: 'fixed_per_order',
        service_fee_amount: 0,
        service_fee_vat_rate: 20,
        has_transaction_fee: false,
        transaction_fee_amount: 0,
        transaction_fee_vat_rate: 20,
        has_same_day_delivery: false,
        same_day_delivery_fee: 0,
        same_day_delivery_vat_rate: 20,
        use_barem: true,
        barem_max_desi: 5,
        barem1_min: 0,
        barem1_max: 149.99,
        barem2_min: 150,
        barem2_max: 299.99,
        is_active: true
      });
    }
  }, [platform, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      withholding_rate: parseFloat(formData.withholding_rate) || 0,
      service_fee_amount: parseFloat(formData.service_fee_amount) || 0,
      service_fee_vat_rate: parseFloat(formData.service_fee_vat_rate) || 20,
      has_transaction_fee: formData.has_transaction_fee,
      transaction_fee_amount: parseFloat(formData.transaction_fee_amount) || 0,
      transaction_fee_vat_rate: parseFloat(formData.transaction_fee_vat_rate) || 20,
      has_same_day_delivery: formData.has_same_day_delivery,
      same_day_delivery_fee: parseFloat(formData.same_day_delivery_fee) || 0,
      same_day_delivery_vat_rate: parseFloat(formData.same_day_delivery_vat_rate) || 20,
      barem_max_desi: parseFloat(formData.barem_max_desi) || 5,
      barem1_min: parseFloat(formData.barem1_min) || 0,
      barem1_max: parseFloat(formData.barem1_max) || 0,
      barem2_min: parseFloat(formData.barem2_min) || 0,
      barem2_max: parseFloat(formData.barem2_max) || 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col p-0 gap-0 max-h-[90dvh]">
        <DialogHeader className="px-6 pt-4 pb-4 border-b border-slate-100 flex-shrink-0">
           <DialogTitle className="text-xl font-semibold">
             {platform ? 'Platform Düzenle' : 'Yeni Platform Ekle'}
           </DialogTitle>
         </DialogHeader>
         <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
           <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform Adı *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Web Sitem"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Platform Kodu *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="web_sitem"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform Tipi</Label>
              <Select value={formData.platform_type} onValueChange={(v) => setFormData({ ...formData, platform_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trendyol">Trendyol</SelectItem>
                  <SelectItem value="hepsiburada">HepsiBurada</SelectItem>
                  <SelectItem value="website">Web Sitesi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.platform_type === 'website' && (
              <div className="space-y-2">
                <Label>Web Altyapısı</Label>
                <Select value={formData.website_adapter} onValueChange={(v) => setFormData({ ...formData, website_adapter: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADAPTER_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Kargo Firması</Label>
            <Input
              value={formData.shipping_company}
              onChange={(e) => setFormData({ ...formData, shipping_company: e.target.value })}
              placeholder="Trendyol Express"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium text-slate-700">Stopaj Ayarları</h4>
            <div className="flex items-center justify-between">
              <Label>Stopaj Var mı?</Label>
              <Switch
                checked={formData.has_withholding}
                onCheckedChange={(checked) => setFormData({ ...formData, has_withholding: checked })}
              />
            </div>
            {formData.has_withholding && (
              <div className="space-y-2">
                <Label>Stopaj Oranı (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.withholding_rate}
                  onChange={(e) => setFormData({ ...formData, withholding_rate: e.target.value })}
                  placeholder="1"
                />
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium text-slate-700">Hizmet Bedeli Ayarları</h4>
            <div className="flex items-center justify-between">
              <Label>Hizmet Bedeli Var mı?</Label>
              <Switch
                checked={formData.has_service_fee}
                onCheckedChange={(checked) => setFormData({ ...formData, has_service_fee: checked })}
              />
            </div>
            {formData.has_service_fee && (
              <>
                <div className="space-y-2">
                  <Label>Hizmet Bedeli Tipi</Label>
                  <Select
                    value={formData.service_fee_type}
                    onValueChange={(v) => setFormData({ ...formData, service_fee_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Yok</SelectItem>
                      <SelectItem value="fixed_per_order">Sabit (Sipariş Başı)</SelectItem>
                      <SelectItem value="percent_of_sale">Yüzde (Satış Üzerinden)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {formData.service_fee_type === 'percent_of_sale' ? 'Oran (%)' : 'Tutar (₺)'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.service_fee_amount}
                      onChange={(e) => setFormData({ ...formData, service_fee_amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>KDV Oranı (%)</Label>
                    <Input
                      type="number"
                      value={formData.service_fee_vat_rate}
                      onChange={(e) => setFormData({ ...formData, service_fee_vat_rate: e.target.value })}
                    />
                  </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label>İşlem Başına Ücret</Label>
                      <p className="text-xs text-slate-500 mt-0.5">Sanal pos / ödeme sistemi işlem ücreti</p>
                    </div>
                    <Switch
                      checked={formData.has_transaction_fee}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_transaction_fee: checked })}
                    />
                  </div>
                  {formData.has_transaction_fee && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label>Tutar (₺, KDV dahil)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.transaction_fee_amount}
                          onChange={(e) => setFormData({ ...formData, transaction_fee_amount: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>KDV Oranı (%)</Label>
                        <Input
                          type="number"
                          value={formData.transaction_fee_vat_rate}
                          onChange={(e) => setFormData({ ...formData, transaction_fee_vat_rate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  </div>
                  <div className="border-t border-slate-200 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label>Bugün Kapında</Label>
                    <Switch
                      checked={formData.has_same_day_delivery}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_same_day_delivery: checked })}
                    />
                  </div>
                  {formData.has_same_day_delivery && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tutar (₺)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.same_day_delivery_fee}
                          onChange={(e) => setFormData({ ...formData, same_day_delivery_fee: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>KDV Oranı (%)</Label>
                        <Input
                          type="number"
                          value={formData.same_day_delivery_vat_rate}
                          onChange={(e) => setFormData({ ...formData, same_day_delivery_vat_rate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  </div>
                  </>
                  )}
                  </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium text-slate-700">Barem Ayarları</h4>
            <div className="flex items-center justify-between">
              <Label>Barem Desteği Var mı?</Label>
              <Switch
                checked={formData.use_barem}
                onCheckedChange={(checked) => setFormData({ ...formData, use_barem: checked })}
              />
            </div>
            {formData.use_barem && (
              <>
                <div className="space-y-2">
                  <Label>Geçerli Olduğu Maksimum Desi</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.barem_max_desi}
                    onChange={(e) => setFormData({ ...formData, barem_max_desi: e.target.value })}
                    placeholder="5"
                  />
                  <p className="text-xs text-slate-500">Bu değerin üzerindeki desili ürünler desi tarifesiyle hesaplanır</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Barem 1 Min (₺)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.barem1_min}
                  onChange={(e) => setFormData({ ...formData, barem1_min: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Barem 1 Max (₺)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.barem1_max}
                  onChange={(e) => setFormData({ ...formData, barem1_max: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Barem 2 Min (₺)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.barem2_min}
                  onChange={(e) => setFormData({ ...formData, barem2_min: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Barem 2 Max (₺)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.barem2_max}
                  onChange={(e) => setFormData({ ...formData, barem2_max: e.target.value })}
                />
              </div>
            </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <Label>Aktif</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              İptal
            </Button>
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {platform ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
          </form>
          </DialogContent>
          </Dialog>
          );
}
