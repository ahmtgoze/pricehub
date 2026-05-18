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

export default function CategoryModal({
  open,
  onOpenChange,
  category,
  onSave,
  isSaving
}) {
  const [formData, setFormData] = useState({
    name: '',
    default_vat_rate: 20,
    is_active: true
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        default_vat_rate: category.default_vat_rate || 20,
        is_active: category.is_active !== false
      });
    } else {
      setFormData({
        name: '',
        default_vat_rate: 20,
        is_active: true
      });
    }
  }, [category, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      default_vat_rate: parseFloat(formData.default_vat_rate) || 20
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {category ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Kategori Adı *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Kategori adını girin"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vat_rate">Varsayılan KDV Oranı (%)</Label>
            <Select
              value={String(formData.default_vat_rate)}
              onValueChange={(v) => setFormData({ ...formData, default_vat_rate: parseFloat(v) })}
            >
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

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="active">Aktif</Label>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {category ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
