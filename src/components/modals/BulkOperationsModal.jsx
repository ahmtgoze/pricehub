import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function BulkOperationsModal({ 
  open, 
  onOpenChange, 
  selectedCount,
  packages = [],
  onApply,
  isApplying = false
}) {
  const [operation, setOperation] = useState('status');
  const [statusValue, setStatusValue] = useState('active');
  const [packageId, setPackageId] = useState('');
  const [sameDayDelivery, setSameDayDelivery] = useState(false);

  const handleApply = () => {
    let updates = {};
    
    switch (operation) {
      case 'status':
        updates.is_active = statusValue === 'active';
        break;
      case 'package':
        if (packageId) {
          updates.package_id = packageId;
        }
        break;
      case 'same_day_delivery':
        updates.same_day_delivery = sameDayDelivery;
        break;
    }
    
    onApply(updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Toplu İşlemler ({selectedCount} ürün)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>İşlem Türü</Label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Durum Güncelle</SelectItem>
                <SelectItem value="package">Paket Ata</SelectItem>
                <SelectItem value="same_day_delivery">Bugün Kargoda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {operation === 'status' && (
            <div className="space-y-2">
              <Label>Yeni Durum</Label>
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {operation === 'package' && (
            <div className="space-y-2">
              <Label>Paket Seç</Label>
              <Select value={packageId} onValueChange={setPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Paket seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {packages.filter(p => p.is_active !== false).map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - {pkg.group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}



          {operation === 'same_day_delivery' && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bugün Kargoda</Label>
                <p className="text-xs text-slate-500">Hızlı teslimat seçeneği</p>
              </div>
              <Switch
                checked={sameDayDelivery}
                onCheckedChange={setSameDayDelivery}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            İptal
          </Button>
          <Button 
            onClick={handleApply}
            disabled={isApplying || (operation === 'package' && !packageId)}
          >
            {isApplying ? 'Uygulanıyor...' : 'Uygula'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
