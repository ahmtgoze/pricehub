import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Truck, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SearchInput from '@/components/ui/SearchInput';
import DataTable from '@/components/ui/DataTable';
import ShippingRateModal from '@/components/modals/ShippingRateModal';
import ImportExport from '@/components/ImportExport';
import { toast } from 'sonner';

const ShippingRate = db.entities.ShippingRate;
const Platform = db.entities.Platform;

export default function ShippingRates() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = React.useState(null);
  const [userRole, setUserRole] = React.useState(null);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [isSystemRate, setIsSystemRate] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [importProgress, setImportProgress] = useState({ isImporting: false, current: 0, total: 0, estimatedSecondsLeft: null, startTime: null });

  React.useEffect(() => {
    db.auth.me().then(user => {
      setUserEmail(user.email);
      setUserRole(user.role);
    }).catch(() => {});
  }, []);

  const { data: shippingRates = [], isLoading } = useQuery({
    queryKey: ['shippingRates', userEmail],
    queryFn: async () => {
      if (userRole === 'admin') return ShippingRate.list('-id', 10000);
      const systemRates = await ShippingRate.filter({ is_admin_created: true }, '-id', 10000);
      const userRates = await ShippingRate.filter({ is_manual: true, created_by: userEmail }, '-id', 10000);
      const seen = new Set();
      return [...systemRates, ...userRates].filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    },
    enabled: !!userEmail
  });

  const { data: rawPlatforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: () => Platform.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const platforms = rawPlatforms.filter((p, idx, arr) => arr.findIndex(x => x.name === p.name) === idx);

  const { data: shippingCompanies = [] } = useQuery({
    queryKey: ['shipping-companies'],
    queryFn: () => db.entities.ShippingCompany.filter({ is_active: true }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingRate ? ShippingRate.update(editingRate.id, data) : ShippingRate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shippingRates']);
      setModalOpen(false);
      setEditingRate(null);
      toast.success('Kargo tarifesi kaydedildi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ShippingRate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['shippingRates']);
      setDeleteId(null);
      toast.success('Kargo tarifesi silindi');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => { for (const id of ids) await ShippingRate.delete(id); },
    onSuccess: () => {
      queryClient.invalidateQueries(['shippingRates']);
      setSelectedIds([]);
      setShowBulkDelete(false);
      toast.success('Seçili tarifeler silindi');
    }
  });

  const handleImport = async (data) => {
    setImportProgress({ isImporting: true, current: 0, total: data.length, estimatedSecondsLeft: null, startTime: Date.now() });

    const toCreate = [];
    const toUpdate = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || Object.keys(row).length === 0) continue;

      const platformName = row['Platform'] || row.platform_name;
      let platform = platforms.find(p => p.name?.toLowerCase() === platformName?.toLowerCase());

      if (!platform) {
        const existingRate = shippingRates.find(r => r.platform_name?.toLowerCase() === platformName?.toLowerCase());
        if (existingRate) platform = { id: existingRate.platform_id, name: existingRate.platform_name, platform_type: existingRate.platform_type };
      }

      if (!platform) { errors.push(`Satır ${i + 1}: Platform bulunamadı: ${platformName}`); continue; }

      const rateType = (row['Tarife Tipi'] || row.rate_type || 'desi').toLowerCase().trim();
      const isWebsite = platform.platform_type === 'website';
      if (isWebsite && (rateType === 'barem1' || rateType === 'barem2')) { errors.push(`Satır ${i + 1}: Web sitesi için barem kullanılamaz`); continue; }

      const sameDayDelivery = isWebsite ? false : (String(row['Bugün Kapında'] || 'false').toLowerCase() === 'true');
      const desiValue = rateType === 'desi' ? parseFloat(row['Desi'] || row.desi || 0) : null;
      const price = parseFloat(row['Ücret'] || row.price || 0);

      if (!price || price <= 0) { errors.push(`Satır ${i + 1}: Geçersiz fiyat`); continue; }

      const existingRate = shippingRates.find(r =>
        (r.platform_id === platform.id || (r.is_admin_created && r.platform_type === platform.platform_type)) &&
        r.rate_type === rateType &&
        r.same_day_delivery === sameDayDelivery &&
        (rateType !== 'desi' || r.desi === desiValue)
      );

      if (existingRate) {
        if (existingRate.price !== price) toUpdate.push({ id: existingRate.id, price });
      } else {
        toCreate.push({
          platform_id: platform.id,
          platform_name: platform.name,
          platform_type: platform.platform_type || '',
          shipping_company: row['Kargo Firması'] || row.shipping_company || '',
          rate_type: rateType,
          same_day_delivery: sameDayDelivery,
          desi: desiValue,
          price,
          vat_rate: parseFloat(row['KDV Oranı'] || row.vat_rate || 20),
          is_active: true,
          is_admin_created: userRole === 'admin',
          is_manual: userRole !== 'admin',
        });
      }

      setImportProgress(prev => ({ ...prev, current: i + 1 }));
    }

    // Toplu ekle (100'lük gruplar)
    const BATCH = 100;
    let successCount = 0;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      try {
        await ShippingRate.bulkCreate(toCreate.slice(i, i + BATCH));
        successCount += Math.min(BATCH, toCreate.length - i);
      } catch (e) {
        errors.push(`Toplu ekleme hatası: ${e.message}`);
      }
    }

    // Güncellemeleri paralel yap
    let updateCount = 0;
    await Promise.all(toUpdate.map(async ({ id, price }) => {
      try { await ShippingRate.update(id, { price }); updateCount++; }
      catch (e) { errors.push(`Güncelleme hatası: ${e.message}`); }
    }));

    queryClient.invalidateQueries(['shippingRates']);
    setImportProgress({ isImporting: false, current: 0, total: 0, estimatedSecondsLeft: null, startTime: null });

    const total = successCount + updateCount;
    if (total > 0) toast.success(`✅ ${total}/${data.length} tarife yüklendi\n➕ ${successCount} yeni\n🔄 ${updateCount} güncellendi`);
    if (errors.length > 0) toast.error(`❌ ${errors.length} hata oluştu`);
  };

  const filteredRates = useMemo(() => {
    let result = [...shippingRates];
    if (userRole !== 'admin') result = result.filter(r => r.is_admin_created === true || r.created_by === userEmail);

    if (search) {
      const normalized = search.trim().toLowerCase().replace(/i̇/g, 'i').replace(/ı/g, 'i');
      const desiMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*desi?$/i) || normalized.match(/^(\d+(?:\.\d+)?)$/);
      if (desiMatch) {
        const desiValue = parseFloat(desiMatch[1]);
        result = result.filter(r => r.rate_type === 'desi' && r.desi === desiValue);
      } else {
        const s = search.toLowerCase();
        result = result.filter(r => r.platform_name?.toLowerCase().includes(s) || r.shipping_company?.toLowerCase().includes(s));
      }
    }

    if (platformFilter !== 'all') result = result.filter(r => r.platform_type === platformFilter);
    if (typeFilter !== 'all') result = result.filter(r => r.rate_type === typeFilter);
    if (companyFilter !== 'all') result = result.filter(r => r.shipping_company === companyFilter);
    if (sourceFilter === 'manual') result = result.filter(r => r.is_manual === true);

    return result.sort((a, b) => {
      if (a.platform_name !== b.platform_name) return a.platform_name?.localeCompare(b.platform_name);
      if (a.rate_type !== b.rate_type) {
        const order = { barem1: 0, barem2: 1, desi: 2 };
        return (order[a.rate_type] || 2) - (order[b.rate_type] || 2);
      }
      return (a.desi_min || 0) - (b.desi_min || 0);
    });
  }, [shippingRates, search, platformFilter, typeFilter, userRole, userEmail, companyFilter, sourceFilter]);

  const paginatedRates = filteredRates.slice((page - 1) * pageSize, page * pageSize);

  const getRateTypeBadge = (type) => {
    switch (type) {
      case 'barem1': return <Badge className="bg-emerald-100 text-emerald-700">Barem 1</Badge>;
      case 'barem2': return <Badge className="bg-blue-100 text-blue-700">Barem 2</Badge>;
      default: return <Badge variant="outline">Desi</Badge>;
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRates.length) setSelectedIds([]);
    else setSelectedIds(paginatedRates.map(r => r.id));
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const columns = [
    {
      header: <input type="checkbox" checked={selectedIds.length === paginatedRates.length && paginatedRates.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />,
      cell: (row) => <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-gray-300" />
    },
    { header: 'Platform', accessor: 'platform_name', cell: (row) => <span className="font-medium">{row.platform_name}</span> },
    { header: 'Kargo Firması', accessor: 'shipping_company' },
    {
      header: 'Tarife Tipi', accessor: 'rate_type',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getRateTypeBadge(row.rate_type)}
          {row.same_day_delivery && row.platform_type !== 'website' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
              <Package className="h-3 w-3" />Bugün Kapında
            </span>
          )}
        </div>
      )
    },
    { header: 'Desi', cell: (row) => row.rate_type === 'desi' ? `${row.desi || 0} desi` : '-' },
    { header: 'Ücret', accessor: 'price', cell: (row) => <span className="font-semibold">₺{row.price?.toFixed(2)}</span> },
    { header: 'KDV', accessor: 'vat_rate', cell: (row) => `%${row.vat_rate || 20}` },
    { header: 'Durum', cell: (row) => <Badge variant={row.is_active !== false ? 'default' : 'secondary'}>{row.is_active !== false ? 'Aktif' : 'Pasif'}</Badge> },
    {
      header: 'İşlemler',
      cell: (row) => {
        const canEdit = userRole === 'admin' || (row.created_by === userEmail && row.is_manual);
        const canDelete = userRole === 'admin' || (row.created_by === userEmail && row.is_manual);
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled={!canEdit} className={!canEdit ? 'opacity-30 cursor-not-allowed' : ''}
              onClick={(e) => { e.stopPropagation(); if (canEdit) { setEditingRate(row); setIsSystemRate(row.is_admin_created === true); setModalOpen(true); } }}>
              <Pencil className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}>
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  const exportColumns = [
    { key: 'platform_name', label: 'Platform' },
    { key: 'shipping_company', label: 'Kargo Firması' },
    { key: 'rate_type', label: 'Tarife Tipi' },
    { key: 'same_day_delivery', label: 'Bugün Kapında' },
    { key: 'desi', label: 'Desi' },
    { key: 'price', label: 'Ücret' },
    { key: 'vat_rate', label: 'KDV Oranı' }
  ];

  const templateColumns = [
    { key: 'Platform', label: 'Platform', example: platforms[0]?.name || 'Trendyol' },
    { key: 'Kargo Firması', label: 'Kargo Firması', example: 'Trendyol Express' },
    { key: 'Tarife Tipi', label: 'Tarife Tipi', example: 'desi' },
    { key: 'Bugün Kapında', label: 'Bugün Kapında', example: 'false' },
    { key: 'Desi', label: 'Desi', example: '5' },
    { key: 'Ücret', label: 'Ücret', example: '35' },
    { key: 'KDV Oranı', label: 'KDV Oranı', example: '20' }
  ];

  const templateInfoData = {
    title: 'KARGO TARİFESİ ŞABLONU - DOLDURMA KILAVUZU',
    aciklama: {
      title: 'SÜTUN AÇIKLAMALARI:',
      items: [
        'Platform: Aşağıdaki listeden tam ismi kopyalayın (zorunlu)',
        'Kargo Firması: Kargo şirketi adı (opsiyonel)',
        'Tarife Tipi: barem1, barem2 veya desi yazın (zorunlu)',
        'Bugün Kapında: true veya false (opsiyonel, varsayılan false)',
        'Desi: Sadece "desi" tipi tarifeler için desi değeri girin',
        'Ücret: Kargo ücreti KDV dahil TL (zorunlu)',
        'KDV Oranı: Kargo KDV oranı, örn: 20 (varsayılan 20)',
      ]
    },
    platforms: { title: 'SİSTEMDEKİ PLATFORMLAR (Tam ismi kopyalayın):', items: platforms.map(p => p.name) }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Truck className="h-8 w-8 text-indigo-600" />Kargo Tarifeleri
            </h1>
            <p className="text-slate-500 mt-1">
              {filteredRates.length} tarife
              {userRole === 'admin' && <span className="ml-4 text-xs font-medium">👨‍💼 Sistem Yöneticisi Paneli</span>}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selectedIds.length > 0 && (
              <Button onClick={() => setShowBulkDelete(true)} variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />Seçilenleri Sil ({selectedIds.length})
              </Button>
            )}
            <ImportExport data={filteredRates} columns={exportColumns} templateColumns={templateColumns} templateInfoData={templateInfoData} filename="kargo_tarifeleri" onImport={handleImport} />
            {userRole === 'admin' && (
              <Button onClick={() => { setEditingRate(null); setIsSystemRate(true); setModalOpen(true); }} variant="outline" className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
                <Plus className="h-4 w-4" />Sistem Tarifesi Ekle
              </Button>
            )}
            <Button onClick={() => { setEditingRate(null); setIsSystemRate(false); setModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="h-4 w-4" />Manuel Tarife Ekle
            </Button>
          </div>
        </div>

        {userRole === 'admin' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-slate-900 text-sm mb-2">⚙️ Sistem Yöneticisi</h3>
            <p className="text-sm text-slate-600">Trendyol ve HepsiBurada kargo tarifelerini Excel'den yükleyebilirsiniz. Yüklenen tarifeler kullanıcılar tarafından görüntülenebilir ancak düzenlenemez.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Platform, firma veya desi ara (örn: 4, 4 desi)..." className="flex-1" />
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Platformlar</SelectItem>
                <SelectItem value="trendyol">Trendyol</SelectItem>
                <SelectItem value="hepsiburada">HepsiBurada</SelectItem>
                <SelectItem value="website">Web Sitesi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tip" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tipler</SelectItem>
                <SelectItem value="barem1">Barem 1</SelectItem>
                <SelectItem value="barem2">Barem 2</SelectItem>
                <SelectItem value="desi">Desi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setSourceFilter('all'); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Kargo Firması" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Firmalar</SelectItem>
                {[...new Set(shippingRates.map(r => r.shipping_company).filter(Boolean))].sort().map(company => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setCompanyFilter('all'); }}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Kaynak" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tarifeler</SelectItem>
                <SelectItem value="manual">📋 Manuel Anlaşmalı Fiyatlar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable columns={columns} data={paginatedRates} isLoading={isLoading} page={page} pageSize={pageSize} totalItems={filteredRates.length} onPageChange={setPage} emptyMessage="Kargo tarifesi bulunamadı" rowClassName={(row) => row.is_manual ? "bg-amber-50 hover:bg-amber-100/70" : "hover:bg-slate-50/50"} />

        <ShippingRateModal open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setIsSystemRate(false); }} shippingRate={editingRate} platforms={platforms} onSave={(data) => saveMutation.mutate({ ...data, is_admin_created: isSystemRate, is_manual: !isSystemRate })} isSaving={saveMutation.isPending} isAdmin={userRole === 'admin'} isSystemRate={isSystemRate} />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Tarifeyi Sil</AlertDialogTitle><AlertDialogDescription>Bu kargo tarifesini silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Toplu Tarife Silme</AlertDialogTitle><AlertDialogDescription>{selectedIds.length} tarifeyi silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={() => bulkDeleteMutation.mutate(selectedIds)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={importProgress.isImporting}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Excel İçe Aktarma İşleniyor...</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">İlerleme</span>
                <span className="text-sm font-bold text-indigo-600">{importProgress.current} / {importProgress.total}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                <div className="bg-indigo-600 h-4 rounded-full transition-all duration-300" style={{ width: `${(importProgress.current / (importProgress.total || 1)) * 100}%` }} />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">%{Math.round((importProgress.current / (importProgress.total || 1)) * 100)}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}