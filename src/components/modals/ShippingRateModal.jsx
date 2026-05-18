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
import { Loader2, Package } from "lucide-react";

const PLATFORM_TYPES = [
  { value: 'trendyol', label: 'Trendyol' },
  { value: 'hepsiburada', label: 'HepsiBurada' },
  { value: 'website', label: 'Web Sitesi' },
];

export default function ShippingRateModal({
  open,
  onOpenChange,
  shippingRate,
  platforms,
  onSave,
  isSaving,
  isAdmin = false,
  isSystemRate = false
}) {
  const [formData, setFormData] = useState({
    platform_type: '',
    platform_id: '',
    shipping_company: '',
    rate_type: 'desi',
    same_day_delivery: false,
    desi: '',
    price: '',
    vat_rate: 20,
    is_active: true
  });

  const isAdminRate = shippingRate?.is_admin_created === true;
  const isReadOnly = isAdminRate && !isAdmin;

  useEffect(() => {
    if (shippingRate) {
      setFormData({
        platform_type: shippingRate.platform_type || '',
        platform_id: shippingRate.platform_id || '',
        shipping_company: shippingRate.shipping_company || '',
        rate_type: shippingRate.rate_type || 'desi',
        same_day_delivery: shippingRate.same_day_delivery === true,
        desi: shippingRate.desi ?? '',
        price: shippingRate.price || '',
        vat_rate: shippingRate.vat_rate || 20,
        is_active: shippingRate.is_active !== false
      });
    } else {
      setFormData({
        platform_type: '',
        platform_id: '',
        shipping_company: '',
        rate_type: 'desi',
        same_day_delivery: false,
        desi: '',
        price: '',
        vat_rate: 20,
        is_active: true
      });
    }
  }, [shippingRate, open]);

  const handlePlatformChange = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    const isWebsite = platform?.platform_type === 'website';
    setFormData({ 
      ...formData, 
      platform_id: platformId,
      platform_type: platform?.platform_type || '',
      rate_type: isWebsite ? 'desi' : formData.rate_type,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSystemRate || (isAdmin && isAdminRate)) {
      // Admin sistem tarifesi: platform_type ile kaydet
      onSave({
        platform_type: formData.platform_type,
        platform_name: PLATFORM_TYPES.find(p => p.value === formData.platform_type)?.label || '',
        shipping_company: formData.shipping_company,
        rate_type: formData.rate_type,
        same_day_delivery: formData.same_day_delivery === true,
        desi: formData.rate_type === 'desi' ? parseFloat(formData.desi) || null : null,
        price: parseFloat(formData.price) || 0,
        vat_rate: parseFloat(formData.vat_rate) || 20,
        is_active: formData.is_active,
        is_manual: false,
        is_admin_created: true
      });
    } else {
      // Kullanıcı manuel tarifesi: platform_id ile kaydet
      const selectedPlatform = platforms.find(p => p.id === formData.platform_id);
      onSave({
        platform_id: formData.platform_id,
        platform_type: selectedPlatform?.platform_type || '',
        platform_name: selectedPlatform?.name || '',
        shipping_company: formData.shipping_company,
        rate_type: formData.rate_type,
        same_day_delivery: formData.same_day_delivery === true,
        desi: formData.rate_type === 'desi' ? parseFloat(formData.desi) || null : null,
        price: parseFloat(formData.price) || 0,
        vat_rate: parseFloat(formData.vat_rate) || 20,
        is_active: formData.is_active,
        is_manual: true,
        is_admin_created: false
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col p-0 gap-0" style={{maxHeight: '90dvh'}}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center justify-between">
            <span>
              {shippingRate ? 'Kargo Tarifesi' : 'Yeni Kargo Tarifesi Ekle'}
            </span>
            {isAdminRate && (
              <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">
                {isAdmin ? '🔧 Sistem Tarifesi (Admin)' : '🔒 Sistem Tarifesi'}
              </span>
            )}
            {isSystemRate && !isAdminRate && (
              <span className="text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700">
                🔧 Yeni Sistem Tarifesi
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Platform seçimi */}
          <div className="space-y-2">
            <Label>Platform *</Label>
            {isSystemRate || (isAdmin && isAdminRate) ? (
              // Admin sistem tarifesi: platform_type dropdown
              <Select
                value={formData.platform_type}
                onValueChange={(v) => setFormData({ ...formData, platform_type: v })}
                required
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Platform tipi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_TYPES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              // Kullanıcı manuel tarifesi: kendi platformları
              <Select
                value={formData.platform_id}
                onValueChange={handlePlatformChange}
                required
                disabled={isReadOnly}
              >
                <SelectTrigger className={isReadOnly ? 'opacity-50' : ''}>
                  <SelectValue placeholder="Platform seçin" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tarife Tipi *</Label>
              {formData.platform_type === 'website' ? (
                <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
                  Desi Tarifesi (Web Sitesi için sabit)
                </div>
              ) : (
              <Select
                value={formData.rate_type}
                onValueChange={(v) => setFormData({ ...formData, rate_type: v })}
                disabled={isReadOnly}
              >
                <SelectTrigger className={isReadOnly ? 'opacity-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barem1">Barem 1</SelectItem>
                  <SelectItem value="barem2">Barem 2</SelectItem>
                  <SelectItem value="desi">Desi Tarifesi</SelectItem>
                </SelectContent>
              </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Kargo Firması</Label>
              <Input
                value={formData.shipping_company}
                onChange={(e) => setFormData({ ...formData, shipping_company: e.target.value })}
                placeholder="Kargo firması"
                disabled={isReadOnly}
                className={isReadOnly ? 'opacity-50' : ''}
              />
            </div>
          </div>

          {/* Bugün Kargoda: sadece website olmayan platformlarda göster */}
          {formData.platform_type !== 'website' && (
            <div className="flex items-center justify-between border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                <Label className="text-sm font-medium text-amber-900 cursor-pointer">Bugün Kapında Seçeneği</Label>
              </div>
              <Switch
                checked={formData.same_day_delivery}
                onCheckedChange={(checked) => setFormData({ ...formData, same_day_delivery: checked })}
                disabled={isReadOnly}
              />
            </div>
          )}

          {formData.rate_type === 'desi' && (
            <div className="space-y-2">
              <Label>Desi</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.desi}
                onChange={(e) => setFormData({ ...formData, desi: e.target.value })}
                placeholder="5"
                disabled={isReadOnly}
                className={isReadOnly ? 'opacity-50' : ''}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kargo Ücreti (KDV Dahil) *</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
                disabled={isReadOnly}
                className={isReadOnly ? 'opacity-50' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>KDV Oranı (%)</Label>
              <Select
                value={String(formData.vat_rate)}
                onValueChange={(v) => setFormData({ ...formData, vat_rate: parseFloat(v) })}
                disabled={isReadOnly}
              >
                <SelectTrigger className={isReadOnly ? 'opacity-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">%20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <Label>Aktif</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              disabled={isReadOnly}
            />
          </div>

          {isReadOnly && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
              💡 Sistem tarafından yüklenen tarifeler sadece okunabilir. Yöneticiye başvurunuz.
            </div>
          )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {shippingRate ? 'Güncelle' : 'Ekle'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
