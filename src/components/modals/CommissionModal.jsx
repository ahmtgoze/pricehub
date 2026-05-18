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
import { Loader2, Tag } from "lucide-react";

export default function CommissionModal({
  open,
  onOpenChange,
  commission,
  platforms,
  categories,
  onSave,
  isSaving
}) {
  const [formData, setFormData] = useState({
    platform_id: '',
    category_id: '',
    commission_rate: '',
    commission_vat_rate: 20,
    minimum_profit_amount: '',
    target_profit_rate: '',
    target_profit_amount: '',
    discounted_target_profit_rate: '',
    discounted_target_profit_amount: '',
    discounted_minimum_profit_amount: '',
    transaction_fee: '',
    is_active: true
  });

  // ✅ Aktif + isme göre tekilleştirilmiş platformlar
  const uniquePlatforms = [...new Map(
    platforms
      .filter(p => p.is_active !== false)
      .map(p => [p.name.trim().toLowerCase(), p])
  ).values()];

  const selectedPlatformObj = uniquePlatforms.find(p => p.id === formData.platform_id);
  const isWebsite = selectedPlatformObj?.platform_type === 'website';

  useEffect(() => {
    if (commission) {
      setFormData({
        platform_id: commission.platform_id || '',
        category_id: commission.category_id || '',
        commission_rate: commission.commission_rate ?? '',
        commission_vat_rate: commission.commission_vat_rate || 20,
        minimum_profit_amount: commission.minimum_profit_amount ?? '',
        target_profit_rate: commission.target_profit_rate ?? '',
        target_profit_amount: commission.target_profit_amount ?? '',
        discounted_target_profit_rate: commission.discounted_target_profit_rate ?? '',
        discounted_target_profit_amount: commission.discounted_target_profit_amount ?? '',
        discounted_minimum_profit_amount: commission.discounted_minimum_profit_amount ?? '',
        transaction_fee: commission.transaction_fee ?? '',
        is_active: commission.is_active !== false
      });
    } else {
      setFormData({
        platform_id: '',
        category_id: '',
        commission_rate: '',
        commission_vat_rate: 20,
        minimum_profit_amount: '',
        target_profit_rate: '',
        target_profit_amount: '',
        discounted_target_profit_rate: '',
        discounted_target_profit_amount: '',
        discounted_minimum_profit_amount: '',
        transaction_fee: '',
        is_active: true
      });
    }
  }, [commission, open]);

  // ✅ undefined yerine null döndür — backend undefined alanları siliyor, null koruyor
  const toNum = (val) => {
    if (val === '' || val === null || val === undefined) return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const hasRate = formData.target_profit_rate !== '' && formData.target_profit_rate != null;
    const hasAmount = formData.target_profit_amount !== '' && formData.target_profit_amount != null;

    if (!hasRate && !hasAmount) {
      alert('Lütfen hedef kâr oranı veya hedef kâr tutarından en az birini girin.');
      return;
    }

    const selectedPlatform = uniquePlatforms.find(p => p.id === formData.platform_id);
    const selectedCategory = categories.find(c => c.id === formData.category_id);
    const platformIsWebsite = selectedPlatform?.platform_type === 'website';

    const dataToSave = {
      platform_id: formData.platform_id,
      category_id: formData.category_id,
      platform_name: selectedPlatform?.name || '',
      category_name: selectedCategory?.name || '',
      commission_rate: parseFloat(formData.commission_rate) || 0,
      commission_vat_rate: parseFloat(formData.commission_vat_rate) || 20,
      minimum_profit_amount: toNum(formData.minimum_profit_amount),
      target_profit_rate: toNum(formData.target_profit_rate),
      target_profit_amount: toNum(formData.target_profit_amount),
      discounted_minimum_profit_amount: toNum(formData.discounted_minimum_profit_amount),
      discounted_target_profit_rate: toNum(formData.discounted_target_profit_rate),
      discounted_target_profit_amount: toNum(formData.discounted_target_profit_amount),
      transaction_fee: platformIsWebsite ? toNum(formData.transaction_fee) : null,
      is_active: formData.is_active
    };

    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col p-0 gap-0" style={{maxHeight: '90dvh'}}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {commission ? 'Komisyon & Kâr Düzenle' : 'Yeni Komisyon & Kâr Ekle'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform *</Label>
                <Select value={formData.platform_id} onValueChange={(v) => setFormData({ ...formData, platform_id: v })} required>
                  <SelectTrigger><SelectValue placeholder="Platform seçin" /></SelectTrigger>
                  <SelectContent>
                    {uniquePlatforms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })} required>
                  <SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Komisyon Oranı (%) *</Label>
                <Input type="number" step="0.01" min="0" max="100" value={formData.commission_rate} onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })} placeholder="15" required />
              </div>
              <div className="space-y-2">
                <Label>Komisyon KDV Oranı (%)</Label>
                <Select value={String(formData.commission_vat_rate)} onValueChange={(v) => setFormData({ ...formData, commission_vat_rate: parseFloat(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">%20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-700">Normal Kâr Hedefleri</p>
              <div className="space-y-2">
                <Label>Minimum Kâr Tutarı (₺)</Label>
                <Input type="number" step="0.01" min="0" value={formData.minimum_profit_amount} onChange={(e) => setFormData({ ...formData, minimum_profit_amount: e.target.value })} placeholder="0" />
                <p className="text-xs text-slate-500">Satış fiyatı hesaplanırken dikkate alınır</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hedef Kâr Oranı (%)</Label>
                  <Input type="number" step="0.01" min="0" value={formData.target_profit_rate} onChange={(e) => setFormData({ ...formData, target_profit_rate: e.target.value })} placeholder="30" />
                  <p className="text-xs text-slate-500">Net Kâr / Maliyet × 100</p>
                </div>
                <div className="space-y-2">
                  <Label>Hedef Kâr Tutarı (₺)</Label>
                  <Input type="number" step="0.01" min="0" value={formData.target_profit_amount} onChange={(e) => setFormData({ ...formData, target_profit_amount: e.target.value })} placeholder="50" />
                  <p className="text-xs text-slate-500">Sabit kâr tutarı</p>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                * En az bir kâr değeri (oran veya tutar) girmelisiniz
              </p>
            </div>

            <div className="space-y-3 border border-orange-200 rounded-xl p-4 bg-orange-50/40">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-semibold text-orange-700">İndirimli Kâr Hedefleri</p>
                <span className="text-xs text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">Opsiyonel</span>
              </div>
              <p className="text-xs text-orange-600">Trendyol promosyon sayfalarındaki "Akıllı Otomatik Seç" butonu için kullanılır</p>
              <div className="space-y-2">
                <Label>İndirimli Min Kâr Tutarı (₺)</Label>
                <Input type="number" step="0.01" min="0" value={formData.discounted_minimum_profit_amount} onChange={(e) => setFormData({ ...formData, discounted_minimum_profit_amount: e.target.value })} placeholder="Boş bırakılabilir" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>İndirimli Hedef Kâr Oranı (%)</Label>
                  <Input type="number" step="0.01" min="0" value={formData.discounted_target_profit_rate} onChange={(e) => setFormData({ ...formData, discounted_target_profit_rate: e.target.value })} placeholder="Boş bırakılabilir" />
                </div>
                <div className="space-y-2">
                  <Label>İndirimli Hedef Kâr Tutarı (₺)</Label>
                  <Input type="number" step="0.01" min="0" value={formData.discounted_target_profit_amount} onChange={(e) => setFormData({ ...formData, discounted_target_profit_amount: e.target.value })} placeholder="Boş bırakılabilir" />
                </div>
              </div>
            </div>

            {isWebsite && (
              <div className="space-y-2 border border-blue-100 bg-blue-50/50 rounded-lg p-3">
                <Label>İşlem Bedeli (₺, KDV dahil)</Label>
                <Input type="number" step="0.01" min="0" value={formData.transaction_fee} onChange={(e) => setFormData({ ...formData, transaction_fee: e.target.value })} placeholder="0.00" />
                <p className="text-xs text-blue-600">Sadece Web Sitesi platformuna özel ek işlem ücreti</p>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <Label>Aktif</Label>
              <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
            </div>

          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {commission ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
