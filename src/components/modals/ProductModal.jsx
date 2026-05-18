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
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function ProductModal({
  open,
  onOpenChange,
  product,
  categories,
  packages = [],
  onSave,
  isSaving
}) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    cost: '',
    printing_cost: '',
    extra_cost: '',
    desi: '',
    multi_package: false,
    packages: [],
    category_id: '',
    vat_rate: 20,
    same_day_delivery: false,
    is_active: true
  });
  
  const [showPackages, setShowPackages] = useState(false);

  useEffect(() => {
    if (product) {
      let packages = [];
      if (product.packages) {
        try {
          packages = typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages;
        } catch (e) {
          packages = [];
        }
      }
      
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        cost: product.cost || '',
        printing_cost: product.printing_cost || '',
        extra_cost: product.extra_cost || '',
        desi: product.desi || '',
        multi_package: product.multi_package || false,
        packages: packages,
        category_id: product.category_id || '',
        vat_rate: product.vat_rate || 20,
        same_day_delivery: product.same_day_delivery === true,
        is_active: product.is_active !== false
      });
      setShowPackages(product.multi_package || false);
    } else {
      setFormData({
        name: '',
        sku: '',
        cost: '',
        printing_cost: '',
        extra_cost: '',
        desi: '',
        multi_package: false,
        packages: [],
        category_id: '',
        vat_rate: 20,
        same_day_delivery: false,
        is_active: true
      });
      setShowPackages(false);
    }
  }, [product, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedCategory = categories.find(c => c.id === formData.category_id);
    
    let finalMultiPackage = formData.multi_package;
    // Geçersiz (0 veya boş desi) paketleri filtrele, sonra normalize et
    let validPackages = formData.multi_package
      ? formData.packages.filter(pkg => pkg.desi && parseFloat(pkg.desi) > 0)
      : [];
    let finalPackages = validPackages;
    
    if (!formData.multi_package || validPackages.length <= 1) {
      finalMultiPackage = false;
      finalPackages = [];
    }
    
    const saveData = {
      ...formData,
      cost: parseFloat(formData.cost) || 0,
      printing_cost: parseFloat(formData.printing_cost) || 0,
      extra_cost: parseFloat(formData.extra_cost) || 0,
      desi: parseFloat(formData.desi) || 0,
      vat_rate: parseFloat(formData.vat_rate) || 20,
      category_name: selectedCategory?.name || '',
      sku: formData.sku || `SKU-${Date.now()}`,
      multi_package: finalMultiPackage,
      packages: finalMultiPackage ? JSON.stringify(finalPackages) : null,
      special_shipping: false // kaldırıldı, her zaman false
    };
    
    onSave(saveData);
  };
  
  const addPackage = () => {
    setFormData({ ...formData, packages: [...formData.packages, { desi: 0, package_id: '' }] });
  };
  
  const removePackage = (index) => {
    setFormData({ ...formData, packages: formData.packages.filter((_, i) => i !== index) });
  };
  
  const updatePackage = (index, field, value) => {
    const newPackages = [...formData.packages];
    newPackages[index] = { ...newPackages[index], [field]: value };
    setFormData({ ...formData, packages: newPackages });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col p-0 gap-0" style={{maxHeight: '90dvh'}}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Ürün Adı */}
          <div className="space-y-2">
            <Label htmlFor="name">Ürün Adı *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ürün adını girin"
              required
            />
          </div>

          {/* SKU */}
          <div className="space-y-2">
            <Label htmlFor="sku">SKU (Opsiyonel)</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="SKU-001"
            />
          </div>

          {/* Maliyet + Baskı Maliyeti */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Maliyet (KDV Dahil) *</Label>
              <Input
                id="cost"
                type="number" step="0.01" min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="printing_cost">Baskı Maliyeti</Label>
              <Input
                id="printing_cost"
                type="number" step="0.01" min="0"
                value={formData.printing_cost}
                onChange={(e) => setFormData({ ...formData, printing_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Ek Maliyet */}
          <div className="space-y-2">
            <Label htmlFor="extra_cost">Ek Maliyet (KDV Dahil)</Label>
            <Input
              id="extra_cost"
              type="number" step="0.01" min="0"
              value={formData.extra_cost}
              onChange={(e) => setFormData({ ...formData, extra_cost: e.target.value })}
              placeholder="0.00"
            />
          </div>

          {/* Desi + KDV (tek paket) */}
          {!formData.multi_package && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desi">Desi *</Label>
                <Input
                  id="desi"
                  type="number" step="0.1" min="0"
                  value={formData.desi}
                  onChange={(e) => setFormData({ ...formData, desi: e.target.value })}
                  placeholder="1.0"
                  required={!formData.multi_package}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat_rate">KDV Oranı (%)</Label>
                <Select
                  value={String(formData.vat_rate)}
                  onValueChange={(v) => setFormData({ ...formData, vat_rate: parseFloat(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">%1</SelectItem>
                    <SelectItem value="10">%10</SelectItem>
                    <SelectItem value="20">%20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* KDV (çok paket) */}
          {formData.multi_package && (
            <div className="space-y-2">
              <Label htmlFor="vat_rate">KDV Oranı (%)</Label>
              <Select
                value={String(formData.vat_rate)}
                onValueChange={(v) => setFormData({ ...formData, vat_rate: parseFloat(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">%1</SelectItem>
                  <SelectItem value="10">%10</SelectItem>
                  <SelectItem value="20">%20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Çok Paketli */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => {
                setShowPackages(!showPackages);
                if (!showPackages && formData.packages.length === 0) {
                  setFormData({ ...formData, multi_package: true, packages: [{ desi: 0, package_id: '' }] });
                }
              }}
            >
              <Label className="cursor-pointer flex items-center gap-2">
                Çok Paketli Gönderim
                {showPackages ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Label>
              <Switch
                checked={formData.multi_package}
                onCheckedChange={(checked) => {
                  setFormData({
                    ...formData,
                    multi_package: checked,
                    packages: checked ? (formData.packages.length > 0 ? formData.packages : [{ desi: 0, package_id: '' }]) : []
                  });
                  setShowPackages(checked);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {showPackages && formData.multi_package && (
              <div className="space-y-3 pt-2">
                {formData.packages.map((pkg, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Paket Seç</Label>
                        <Select
                          value={pkg.package_id || ''}
                          onValueChange={(v) => updatePackage(index, 'package_id', v)}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Paket seçin" /></SelectTrigger>
                          <SelectContent>
                            {packages.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Desi</Label>
                        <Input
                          type="number" step="0.1" min="0"
                          value={pkg.desi || ''}
                          onChange={(e) => updatePackage(index, 'desi', parseFloat(e.target.value) || 0)}
                          placeholder="0.0"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button" variant="ghost" size="sm"
                      onClick={() => removePackage(index)}
                      disabled={formData.packages.length === 1}
                      className="text-rose-500 hover:text-rose-700 w-full justify-center"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Sil
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPackage} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Paket Ekle
                </Button>
              </div>
            )}
          </div>

          {/* Kategori */}
          <div className="space-y-2">
            <Label htmlFor="category">Kategori *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bugün Kargoda */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="sdd">Bugün Kargoda</Label>
            <Switch
              id="sdd"
              checked={formData.same_day_delivery}
              onCheckedChange={(checked) => setFormData({ ...formData, same_day_delivery: checked })}
            />
          </div>

          {/* Aktif */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="active">Aktif</Label>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
