import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DataTable from "@/components/ui/DataTable";
import SearchInput from '@/components/ui/SearchInput';
import FiltreEtiketi from '@/components/ui/FiltreEtiketi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Loader2, Wand2, X, Package as PaketIkonu } from "lucide-react";
import { otomatikAtamaPlani, paketeAtananlar, araligiVar } from '@/lib/paketAtama';
import { toast } from "sonner";

export default function PackageManagement() {
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const queryClient = useQueryClient();

  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => db.entities.Package.list('-created_date'),
  });

  const { data: packageItems = [] } = useQuery({
    queryKey: ['packageItems'],
    queryFn: () => db.entities.PackageItem.list('-created_date'),
  });

  // Otomatik atama ve "atanan urunler" listesi icin
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.entities.Product.list('-created_date'),
  });

  const [atananlarPaketi, setAtananlarPaketi] = useState(null);   // liste modali
  const [atamaOnayi, setAtamaOnayi] = useState(null);             // { paket, plan }

  /** Bir urunun paketini degistirir (atama ya da listeden cikarma). */
  const paketAtaMutation = useMutation({
    mutationFn: async ({ urunIdleri, paketId }) => {
      // Sinirli es zamanlilik: yuzlerce urun ayni anda gonderilince
      // baglanti doyuyor ve "Failed to fetch" aliniyor.
      const OBEK = 20;
      for (let i = 0; i < urunIdleri.length; i += OBEK) {
        await Promise.all(urunIdleri.slice(i, i + OBEK).map(
          (id) => db.entities.Product.update(id, { package_id: paketId })
        ));
      }
      return urunIdleri.length;
    },
    onSuccess: (adet) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${adet} ürün güncellendi`, {
        description: 'Fiyatlar sayfasından "Fiyatları Hesapla" demeyi unutmayın.',
      });
    },
    onError: (e) => toast.error('Güncellenemedi', { description: e?.message }),
  });

  const createPackageMutation = useMutation({
    mutationFn: (data) => db.entities.Package.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setPackageModalOpen(false);
      setEditingPackage(null);
      toast.success('Paket kaydedildi');
    },
    onError: (e) => toast.error(e?.message || 'İşlem başarısız'),
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Package.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setPackageModalOpen(false);
      setEditingPackage(null);
      toast.success('Paket güncellendi');
    },
    onError: (e) => toast.error(e?.message || 'İşlem başarısız'),
  });

  const deletePackageMutation = useMutation({
    mutationFn: (id) => db.entities.Package.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Paket silindi');
    },
    onError: (e) => toast.error(e?.message || 'İşlem başarısız'),
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => db.entities.PackageItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packageItems'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setItemModalOpen(false);
      setEditingItem(null);
      toast.success('Kalem kaydedildi');
    },
    onError: (e) => toast.error(e?.message || 'İşlem başarısız'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.PackageItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packageItems'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setItemModalOpen(false);
      setEditingItem(null);
      toast.success('Kalem güncellendi');
    },
    onError: (e) => toast.error(e?.message || 'İşlem başarısız'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => db.entities.PackageItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packageItems'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Kalem silindi');
    },
    onError: (e) => toast.error(e?.message || 'İşlem başarısız'),
  });

  const getPackageItems = (packageId) => {
    return packageItems.filter(item => item.package_id === packageId);
  };

  const getPackageTotal = (packageId) => {
    return getPackageItems(packageId).reduce((sum, item) => sum + (item.cost || 0), 0);
  };

  const handleSavePackage = (data) => {
    if (editingPackage) {
      updatePackageMutation.mutate({ id: editingPackage.id, data });
    } else {
      createPackageMutation.mutate(data);
    }
  };

  const handleSaveItem = (data) => {
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const packageColumns = [
    { header: 'Paket Adı', accessor: 'name' },
    { header: 'Grup', accessor: 'group' },
    { id: 'desi_araligi', header: 'Desi Aralığı', cell: (row) => row.desi_min && row.desi_max ? `${row.desi_min} - ${row.desi_max}` : '-' },
    { id: 'toplam_maliyet', header: 'Toplam Maliyet', cell: (row) => `${getPackageTotal(row.id).toFixed(2)} TL` },
    {
      id: 'atanan_urun',
      header: 'Atanan Ürün',
      cell: (row) => {
        const adet = paketeAtananlar(products, row.id).length;
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 gap-1.5 text-[13px]"
            onClick={() => setAtananlarPaketi(row)}
            title="Atanan ürünleri gör"
          >
            <PaketIkonu className="h-3.5 w-3.5 text-muted-foreground" />
            {adet}
          </Button>
        );
      },
    },
    { 
      id: 'aktif',
      header: 'Aktif', 
      cell: (row) => <span className={row.is_active ? 'text-green-600' : 'text-red-600'}>{row.is_active ? 'Evet' : 'Hayır'}</span>
    },
    {
      id: 'islemler',
      header: 'İşlemler',
      cell: (row) => (
        <div className="flex gap-2">
          {/* Desi araligi tanimli degilse kime atanacagi belli olmaz. */}
          <Button
            size="sm"
            variant="outline"
            disabled={!araligiVar(row) || paketAtaMutation.isPending}
            title={araligiVar(row)
              ? `Desi ${row.desi_min}-${row.desi_max} aralığındaki ürünlere ata`
              : 'Önce paketin desi aralığını girin'}
            onClick={() => setAtamaOnayi({ paket: row, plan: otomatikAtamaPlani(products, row) })}
          >
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingPackage(row);
              setPackageModalOpen(true);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedPackageId(row.id);
              setEditingItem(null);
              setItemModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Kalem
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deletePackageMutation.mutate(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
    // ── Eklenebilir sutunlar: varsayilanda gizli, panelden acilir ──
    { id: 'description', header: 'Açıklama', optional: true, cell: (row) => row.description || '-' },
    { id: 'created_at', header: 'Eklenme Tarihi', optional: true, cell: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString('tr-TR') : '-' },
  ];

  const suzulmusPaketler = useMemo(() => {
    let sonuc = [...packages];
    if (search) {
      const a = search.trim().toLowerCase();
      sonuc = sonuc.filter(p => p.name?.toLowerCase().includes(a));
    }
    if (statusFilter !== 'all') {
      const aktifMi = statusFilter === 'active';
      sonuc = sonuc.filter(p => (p.is_active !== false) === aktifMi);
    }
    return sonuc;
  }, [packages, search, statusFilter]);

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="ph-title">Paketleme Yönetimi</h1>
        <Button
          onClick={() => {
            setEditingPackage(null);
            setPackageModalOpen(true);
          }}
          className="bg-primary hover:bg-black dark:hover:bg-white/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Yeni Paket
        </Button>
      </div>

      {/* DataTable kendi kartini (ph-panel) ciziyor; ayrica kart icine
          sarilirsa kart-icinde-kart gorunumu olusuyordu. */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Paketler</h2>

        <div className="rounded-[18px] border border-border bg-card p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Paket ara..."
              className="flex-1 max-w-md"
            />
            <FiltreEtiketi ad="Durum">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Durum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="passive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </FiltreEtiketi>
          </div>
        </div>

        <DataTable pageKey="paketleme"
          columns={packageColumns}
          data={suzulmusPaketler}
          isLoading={packagesLoading}
          emptyMessage="Paket bulunamadı"
        />
      </div>

      {selectedPackageId && (
        <div className="rounded-[18px] border border-border bg-card">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {packages.find(p => p.id === selectedPackageId)?.name} - Paket İçeriği
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4 mb-4">
              {getPackageItems(selectedPackageId).map(item => (
                <div key={item.id} className="flex justify-between items-center p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.size} - {item.cost?.toFixed(2) ?? 0} TL</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingItem(item);
                        setItemModalOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => {
                setEditingItem(null);
                setItemModalOpen(true);
              }}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Kalem Ekle
            </Button>
          </div>
        </div>
      )}

      <PackageModal
        open={packageModalOpen}
        onOpenChange={setPackageModalOpen}
        package={editingPackage}
        onSave={handleSavePackage}
        isSaving={createPackageMutation.isPending || updatePackageMutation.isPending}
      />

      <PackageItemModal
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
        item={editingItem}
        packageId={selectedPackageId}
        onSave={handleSaveItem}
        isSaving={createItemMutation.isPending || updateItemMutation.isPending}
      />

      {/* ── Otomatik atama onayi ──────────────────────────────────────── */}
      <Dialog open={!!atamaOnayi} onOpenChange={(a) => !a && setAtamaOnayi(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Otomatik Paket Atama</DialogTitle></DialogHeader>
          {atamaOnayi && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{atamaOnayi.paket.name}</span> paketi,
                desi <span className="font-medium text-foreground">
                  {atamaOnayi.paket.desi_min}–{atamaOnayi.paket.desi_max}
                </span> aralığındaki ürünlere atanacak.
              </p>

              <div className="rounded-xl border border-border divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm">Atanacak ürün</span>
                  <span className="text-sm font-semibold tabular-nums">{atamaOnayi.plan.atanacak.length}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">Zaten bu pakette</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{atamaOnayi.plan.zatenBu.length}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">Başka pakette (dokunulmaz)</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{atamaOnayi.plan.cakisan.length}</span>
                </div>
              </div>

              {atamaOnayi.plan.cakisan.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Başka bir pakete elle atanmış ürünlerin üzerine yazılmaz. Değiştirmek
                  isterseniz o ürünleri önce mevcut paketlerinin listesinden çıkarın.
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAtamaOnayi(null)}>İptal</Button>
                <Button
                  disabled={atamaOnayi.plan.atanacak.length === 0 || paketAtaMutation.isPending}
                  onClick={() => {
                    paketAtaMutation.mutate({
                      urunIdleri: atamaOnayi.plan.atanacak.map((u) => u.id),
                      paketId: atamaOnayi.paket.id,
                    });
                    setAtamaOnayi(null);
                  }}
                >
                  {paketAtaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {atamaOnayi.plan.atanacak.length} ürüne ata
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Pakete atanmis urunler; buradan cikarilabilir ─────────────── */}
      <Dialog open={!!atananlarPaketi} onOpenChange={(a) => !a && setAtananlarPaketi(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{atananlarPaketi?.name} — Atanan Ürünler</DialogTitle>
          </DialogHeader>
          {atananlarPaketi && (() => {
            const atananlar = paketeAtananlar(products, atananlarPaketi.id);
            if (atananlar.length === 0) {
              return <p className="ph-empty">Bu pakete atanmış ürün yok.</p>;
            }
            return (
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {atananlar.map((u) => (
                  <div key={u.id}
                       className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-secondary">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground font-mono-numeric truncate">
                        {u.sku} · {u.desi} desi
                      </p>
                    </div>
                    <Button
                      size="sm" variant="ghost"
                      className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      title="Paketten çıkar"
                      disabled={paketAtaMutation.isPending}
                      onClick={() => paketAtaMutation.mutate({ urunIdleri: [u.id], paketId: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageModal({ open, onOpenChange, package: pkg, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    name: '',
    group: '',
    desi_min: null,
    desi_max: null,
    is_active: true,
  });

  React.useEffect(() => {
    if (pkg) {
      setFormData({
        name: pkg.name || '',
        group: pkg.group || '',
        desi_min: pkg.desi_min || null,
        desi_max: pkg.desi_max || null,
        is_active: pkg.is_active !== false,
      });
    } else {
      setFormData({
        name: '',
        group: '',
        desi_min: null,
        desi_max: null,
        is_active: true,
      });
    }
  }, [pkg, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      group: formData.group,
      desi_min: formData.desi_min ? parseFloat(formData.desi_min) : null,
      desi_max: formData.desi_max ? parseFloat(formData.desi_max) : null,
      is_active: formData.is_active,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pkg ? 'Paket Düzenle' : 'Yeni Paket Ekle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Paket Adı *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Küçük Paket 1"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Paket Grubu *</Label>
            <Input
              value={formData.group}
              onChange={(e) => setFormData({ ...formData, group: e.target.value })}
              placeholder="Küçük Ürünler"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Desi (opsiyonel)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.desi_min ?? ''}
                onChange={(e) => setFormData({ ...formData, desi_min: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Desi (opsiyonel)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.desi_max ?? ''}
                onChange={(e) => setFormData({ ...formData, desi_max: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Aktif</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-black dark:hover:bg-white/90">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pkg ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PackageItemModal({ open, onOpenChange, item, packageId, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    item_type: 'ek_gider',
    name: '',
    size: '',
    cost: 0,
  });

  React.useEffect(() => {
    if (item) {
      setFormData({
        item_type: item.item_type || 'ek_gider',
        name: item.name || '',
        size: item.size || '',
        cost: item.cost || 0,
      });
    } else {
      setFormData({
        item_type: 'ek_gider',
        name: '',
        size: '',
        cost: 0,
      });
    }
  }, [item, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      package_id: packageId,
      item_type: formData.item_type,
      name: formData.name,
      size: formData.size,
      cost: parseFloat(formData.cost) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Kalem Düzenle' : 'Kalem Ekle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Kalem Tipi *</Label>
            <select
              value={formData.item_type}
              onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option value="poşet">Poşet</option>
              <option value="kutu">Kutu</option>
              <option value="etiket">Etiket</option>
              <option value="bant">Bant</option>
              <option value="ek_gider">Ek Gider</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Kalem Adı *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Kargo Poşeti / Termal Etiket"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Ölçü</Label>
            <Input
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              placeholder="25x30+5"
            />
          </div>
          <div className="space-y-2">
            <Label>Maliyet (KDV dahil, TL)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-black dark:hover:bg-white/90">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {item ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
