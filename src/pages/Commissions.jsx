import React, { useState, useMemo, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Percent, Trash, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SearchInput from '@/components/ui/SearchInput';
import DataTable from '@/components/ui/DataTable';
import CommissionModal from '@/components/modals/CommissionModal';
import ImportExport from '@/components/ImportExport';
import { toast } from 'sonner';

const Commission = db.entities.Commission;
const Platform = db.entities.Platform;
const Category = db.entities.Category;

export default function Commissions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [userEmail, setUserEmail] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sortType, setSortType] = useState('kategori_az');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [importProgress, setImportProgress] = useState({ isImporting: false, current: 0, total: 0 });

  useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['commissions', userEmail],
    queryFn: async () => {
      const userPlatforms = await Platform.filter({ created_by: userEmail });
      const userPlatformIds = new Set(userPlatforms.map(p => p.id));
      // ✅ Commission.list() yerine filter kullan
      const allCommissions = await Commission.filter({ created_by: userEmail });
      return allCommissions.filter(c => userPlatformIds.has(c.platform_id));
    },
    enabled: !!userEmail
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: async () => {
      const result = await Platform.filter({ created_by: userEmail });
      const active = result.filter(p => p.is_active !== false);
      return [...new Map(active.map(p => [p.platform_type, p])).values()];
    },
    enabled: !!userEmail
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', userEmail],
    queryFn: () => Category.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  useEffect(() => {
    if (!userEmail) return;
    const unsubscribe = Commission.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['commissions', userEmail] });
    });
    return unsubscribe;
  }, [queryClient, userEmail]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
      );
      if (editingCommission) {
        return Commission.update(editingCommission.id, cleanData);
      }
      return Commission.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['commissions']);
      setModalOpen(false);
      setEditingCommission(null);
      toast.success('Komisyon kaydedildi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Commission.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['commissions']);
      setDeleteId(null);
      toast.success('Komisyon silindi');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => Commission.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['commissions']);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      toast.success(`${selectedIds.length} komisyon silindi`);
    }
  });

  const handleImport = async (data) => {
    const parseNum = (val) => {
      if (val == null || val === '') return undefined;
      const cleaned = String(val).replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
    };

    const getVal = (row, ...keys) => {
      for (const key of keys) {
        if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key];
      }
      return undefined;
    };

    const normalizeString = (str) => {
      return String(str || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[ç]/g, 'c')
        .replace(/[ğ]/g, 'g')
        .replace(/[ı]/g, 'i')
        .replace(/[ö]/g, 'o')
        .replace(/[ş]/g, 's')
        .replace(/[ü]/g, 'u');
    };

    const validRows = [];
    const skippedRows = [];
    const invalidRows = [];

    for (const row of data) {
      const platformNameRaw = (row['Platform'] || row.platform_name || '').toString().trim();
      const categoryNameRaw = (row['Kategori'] || row.category_name || '').toString().trim();
      const platformName = normalizeString(platformNameRaw);
      const categoryName = normalizeString(categoryNameRaw);

      const platform = platforms.find(p => normalizeString(p.name) === platformName);
      // Kategori: tam eşleşme veya Excel değeri sistemdeki kategorinin başlangıcıyla eşleşiyorsa
      const category = categories.find(c => {
        const normalized = normalizeString(c.name);
        return normalized === categoryName || normalized.startsWith(categoryName + ' ');
      });

      if (!platform) {
        invalidRows.push(`"${platformNameRaw}" adlı platform sistemde yok`);
        continue;
      }
      if (!category) {
        invalidRows.push(`"${categoryNameRaw}" adlı kategori sistemde yok`);
        continue;
      }

      validRows.push({ platform, category, row });
    }

    if (invalidRows.length > 0) {
      toast.error(
        `❌ ${invalidRows.length} satır reddedildi (sistemde olmayan platform/kategori):\n${invalidRows.slice(0, 5).join('\n')}${invalidRows.length > 5 ? `\n...ve ${invalidRows.length - 5} satır daha` : ''}`
      );
      return;
    }

    if (skippedRows.length > 0) {
      toast.warning(`${skippedRows.length} satır eşleştirilemedi: ${skippedRows.slice(0, 3).join(', ')}${skippedRows.length > 3 ? '...' : ''}`);
    }

    setImportProgress({ isImporting: true, current: 0, total: validRows.length });
    const currentCommissions = await Commission.filter({ created_by: userEmail });

    let successCount = 0;
    let updateCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const { platform, category, row } = validRows[i];
      const commissionData = {
        platform_id: platform.id,
        platform_name: platform.name,
        category_id: category.id,
        category_name: category.name,
        commission_rate: parseNum(getVal(row, 'Komisyon Oranı', 'Komisyon %', 'commission_rate')) || 0,
        commission_vat_rate: parseNum(getVal(row, 'Komisyon KDV', 'Kom. KDV %', 'commission_vat_rate')) || 20,
        minimum_profit_amount: parseNum(getVal(row, 'Min Kâr Tutarı', 'Min Kâr ₺')),
        target_profit_rate: parseNum(getVal(row, 'Hedef Kâr Oranı', 'Hedef Kâr %')),
        target_profit_amount: parseNum(getVal(row, 'Hedef Kâr Tutarı', 'Hedef Kâr ₺')),
        transaction_fee: platform.platform_type === 'website'
          ? (parseNum(getVal(row, 'İşlem Bedeli', 'İşlem Bedeli (₺)', 'İşlem Bedeli ₺')) || undefined)
          : undefined,
        discounted_minimum_profit_amount: parseNum(getVal(row, 'İndirimli Min Kâr Tutarı', 'İndirimli Min Kâr ₺')),
        discounted_target_profit_rate: parseNum(getVal(row, 'İndirimli Hedef Kâr Oranı (%)', 'İndirimli Hedef Kâr Oranı', 'İndirimli Hedef Kâr %')),
        discounted_target_profit_amount: parseNum(getVal(row, 'İndirimli Hedef Kâr Tutarı (₺)', 'İndirimli Hedef Kâr Tutarı', 'İndirimli Hedef Kâr ₺')),
        is_active: true
      };

      const cleanData = Object.fromEntries(
        Object.entries(commissionData).filter(([_, v]) => v !== null && v !== undefined)
      );

      const existing = currentCommissions.find(
        c => c.platform_id === platform.id && c.category_id === category.id
      );

      if (existing) {
        const { platform_id, platform_name, category_id, category_name, ...updateData } = cleanData;
        await Commission.update(existing.id, updateData);
        updateCount++;
      } else {
        await Commission.create(cleanData);
        successCount++;
      }

      setImportProgress({ isImporting: true, current: i + 1, total: validRows.length });
    }

    setImportProgress({ isImporting: false, current: 0, total: 0 });
    await queryClient.refetchQueries({ queryKey: ['commissions', userEmail] });
    toast.success(`✅ ${successCount + updateCount}/${validRows.length} komisyon işlendi\n➕ ${successCount} yeni  🔄 ${updateCount} güncellendi`);
  };

  const missingRateIds = useMemo(() => {
    return new Set(commissions.filter(c =>
      !c.commission_rate || c.commission_rate === 0
    ).map(c => c.id));
  }, [commissions]);

  const filteredCommissions = useMemo(() => {
    let result = [...commissions];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.platform_name?.toLowerCase().includes(s) ||
        c.category_name?.toLowerCase().includes(s)
      );
    }
    if (platformFilter !== 'all') result = result.filter(c => c.platform_id === platformFilter);
    if (categoryFilter !== 'all') result = result.filter(c => c.category_id === categoryFilter);
    if (showMissingOnly) result = result.filter(c => missingRateIds.has(c.id));

    const getSortConfig = () => {
      switch (sortType) {
        case 'kategori_az': return { field: 'category_name', dir: 'asc' };
        case 'kategori_za': return { field: 'category_name', dir: 'desc' };
        case 'platform_az': return { field: 'platform_name', dir: 'asc' };
        case 'platform_za': return { field: 'platform_name', dir: 'desc' };
        default: return { field: 'category_name', dir: 'asc' };
      }
    };

    const { field, dir } = getSortConfig();
    
    let sorted = result.sort((a, b) => {
      let valA, valB;
      
      if (sortField) {
        // Sıralanabilir kolon sıralaması
        valA = a[sortField];
        valB = b[sortField];
        
        if (typeof valA === 'string') {
          valA = valA?.toLowerCase() || '';
          valB = valB?.toLowerCase() || '';
          if (valA < valB) return sortDir === 'asc' ? -1 : 1;
          if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        } else {
          valA = valA || 0;
          valB = valB || 0;
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
      } else {
        // Varsayılan sıralama
        valA = a[field]?.toLowerCase() || '';
        valB = b[field]?.toLowerCase() || '';
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return sorted;
  }, [commissions, search, platformFilter, categoryFilter, sortType, showMissingOnly, missingRateIds, sortField, sortDir]);

  const paginatedCommissions = filteredCommissions.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = paginatedCommissions.length > 0 && paginatedCommissions.every(r => selectedIds.includes(r.id));
  const someSelected = paginatedCommissions.some(r => selectedIds.includes(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !paginatedCommissions.find(r => r.id === id)));
    } else {
      setSelectedIds([...new Set([...selectedIds, ...paginatedCommissions.map(r => r.id)])]);
    }
  };

  const toggleRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const columns = [
    {
      header: () => (
        <input
          type="checkbox"
          checked={allSelected}
          ref={input => input && (input.indeterminate = someSelected && !allSelected)}
          onChange={toggleAll}
          className="rounded border-gray-300"
        />
      ),
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleRow(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300"
        />
      )
    },
    {
      header: 'Platform',
      accessor: 'platform_name',
      cell: (row) => <span className="font-medium">{row.platform_name}</span>
    },
    { header: 'Kategori', accessor: 'category_name' },
    {
      header: (
        <button
          onClick={() => {
            if (sortField === 'commission_rate') {
              setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
            } else {
              setSortField('commission_rate');
              setSortDir('asc');
            }
          }}
          className="flex items-center gap-1 hover:text-amber-700"
        >
          Komisyon
          {sortField === 'commission_rate' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
        </button>
      ),
      accessor: 'commission_rate',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-amber-600">%{row.commission_rate}</span>
          {missingRateIds.has(row.id) && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
        </div>
      )
    },
    {
      header: 'Komisyon KDV',
      accessor: 'commission_vat_rate',
      cell: (row) => `%${row.commission_vat_rate || 20}`
    },
    {
      header: (
        <button
          onClick={() => {
            if (sortField === 'target_profit_amount') {
              setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
            } else {
              setSortField('target_profit_amount');
              setSortDir('asc');
            }
          }}
          className="flex items-center gap-1 hover:text-blue-700"
        >
          Kâr Hedefleri
          {sortField === 'target_profit_amount' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
        </button>
      ),
      cell: (row) => (
        <div className="text-sm space-y-1">
          {row.minimum_profit_amount != null && row.minimum_profit_amount !== '' && <div className="text-slate-600">Min: ₺{Number(row.minimum_profit_amount).toFixed(2)}</div>}
          {row.target_profit_rate != null && row.target_profit_rate !== '' && <div className="font-medium text-emerald-600">Oran: %{Number(row.target_profit_rate).toFixed(1)}</div>}
          {row.target_profit_amount != null && row.target_profit_amount !== '' && <div className="font-medium text-blue-600">Tutar: ₺{Number(row.target_profit_amount).toFixed(2)}</div>}
          {(row.minimum_profit_amount == null || row.minimum_profit_amount === '') && (row.target_profit_rate == null || row.target_profit_rate === '') && (row.target_profit_amount == null || row.target_profit_amount === '') && <div className="text-slate-300 text-xs">-</div>}
        </div>
      )
    },
    {
      header: (
        <button
          onClick={() => {
            if (sortField === 'discounted_target_profit_amount') {
              setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
            } else {
              setSortField('discounted_target_profit_amount');
              setSortDir('asc');
            }
          }}
          className="flex items-center gap-1 hover:text-orange-700"
        >
          İndirimli Kâr Hedefleri
          {sortField === 'discounted_target_profit_amount' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
        </button>
      ),
      cell: (row) => (
        <div className="text-sm space-y-1">
          {row.discounted_minimum_profit_amount != null && row.discounted_minimum_profit_amount !== '' && <div className="text-slate-600">Min: ₺{Number(row.discounted_minimum_profit_amount).toFixed(2)}</div>}
          {row.discounted_target_profit_rate != null && row.discounted_target_profit_rate !== '' && <div className="font-medium text-orange-600">Oran: %{Number(row.discounted_target_profit_rate).toFixed(1)}</div>}
          {row.discounted_target_profit_amount != null && row.discounted_target_profit_amount !== '' && <div className="font-medium text-orange-500">Tutar: ₺{Number(row.discounted_target_profit_amount).toFixed(2)}</div>}
          {(row.discounted_minimum_profit_amount == null || row.discounted_minimum_profit_amount === '') && (row.discounted_target_profit_rate == null || row.discounted_target_profit_rate === '') && (row.discounted_target_profit_amount == null || row.discounted_target_profit_amount === '') && <div className="text-slate-300 text-xs">-</div>}
        </div>
      )
    },
    {
      header: 'Durum',
      cell: (row) => (
        <Badge variant={row.is_active !== false ? 'default' : 'secondary'}>
          {row.is_active !== false ? 'Aktif' : 'Pasif'}
        </Badge>
      )
    },
    {
      header: 'İşlemler',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingCommission(row); setModalOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      )
    }
  ];

  const exportColumns = [
    { key: 'platform_name', label: 'Platform' },
    { key: 'category_name', label: 'Kategori' },
    { key: 'commission_rate', label: 'Komisyon Oranı' },
    { key: 'commission_vat_rate', label: 'Komisyon KDV' },
    { key: 'minimum_profit_amount', label: 'Min Kâr Tutarı' },
    { key: 'target_profit_rate', label: 'Hedef Kâr Oranı' },
    { key: 'target_profit_amount', label: 'Hedef Kâr Tutarı' },
    { key: 'transaction_fee', label: 'İşlem Bedeli' },
    { key: 'discounted_minimum_profit_amount', label: 'İndirimli Min Kâr Tutarı' },
    { key: 'discounted_target_profit_rate', label: 'İndirimli Hedef Kâr Oranı (%)' },
    { key: 'discounted_target_profit_amount', label: 'İndirimli Hedef Kâr Tutarı (₺)' },
  ];

  const templateColumns = [
    { key: 'Platform', label: 'Platform', example: platforms[0]?.name || 'Trendyol' },
    { key: 'Kategori', label: 'Kategori', example: categories[0]?.name || 'Elektronik' },
    { key: 'Komisyon Oranı', label: 'Komisyon Oranı', example: '15' },
    { key: 'Komisyon KDV', label: 'Komisyon KDV', example: '20' },
    { key: 'Min Kâr Tutarı', label: 'Min Kâr Tutarı', example: '10' },
    { key: 'Hedef Kâr Oranı', label: 'Hedef Kâr Oranı', example: '30' },
    { key: 'Hedef Kâr Tutarı', label: 'Hedef Kâr Tutarı', example: '50' },
    { key: 'İşlem Bedeli', label: 'İşlem Bedeli (₺)', example: '2.50' },
    { key: 'İndirimli Min Kâr Tutarı', label: 'İndirimli Min Kâr Tutarı', example: '5' },
    { key: 'İndirimli Hedef Kâr Oranı (%)', label: 'İndirimli Hedef Kâr Oranı (%)', example: '20' },
    { key: 'İndirimli Hedef Kâr Tutarı (₺)', label: 'İndirimli Hedef Kâr Tutarı (₺)', example: '30' },
  ];

  const templateInfoData = {
    title: 'KOMİSYON ŞABLONU - DOLDURMA KILAVUZU',
    aciklama: {
      title: 'SÜTUN AÇIKLAMALARI:',
      items: [
        'Platform: Aşağıdaki listeden tam ismi kopyalayın (zorunlu)',
        'Kategori: Aşağıdaki listeden tam ismi kopyalayın (zorunlu)',
        'Komisyon Oranı: Platform komisyon yüzdesi, örn: 15 (zorunlu)',
        'Komisyon KDV: Komisyon KDV oranı, örn: 20 (varsayılan 20)',
        'Min Kâr Tutarı: Minimum kâr tutarı TL (opsiyonel)',
        'Hedef Kâr Oranı: Hedef kâr yüzdesi (opsiyonel)',
        'Hedef Kâr Tutarı: Hedef kâr tutarı TL (opsiyonel)',
        'İşlem Bedeli: İşlem başına ek ücret TL (SADECE Web Sitesi platformları için)',
        'İndirimli Min Kâr Tutarı: Promosyon için min kâr tutarı TL (opsiyonel)',
        'İndirimli Hedef Kâr Oranı (%): Promosyon için hedef kâr yüzdesi (opsiyonel)',
        'İndirimli Hedef Kâr Tutarı (₺): Promosyon için hedef kâr tutarı TL (opsiyonel)',
      ]
    },
    platforms: {
      title: 'SİSTEMDEKİ PLATFORMLAR (Tam ismi kopyalayın):',
      items: platforms.map(p => p.name)
    },
    categories: {
      title: 'SİSTEMDEKİ KATEGORİLER (Tam ismi kopyalayın):',
      items: categories.map(c => c.name)
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Percent className="h-8 w-8 text-indigo-600" />
              Komisyon & Hedef Kâr
            </h1>
            <p className="text-slate-500 mt-1">Platform ve kategori bazlı komisyon oranları</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {selectedIds.length > 0 && (
              <Button variant="destructive" onClick={() => setBulkDeleteOpen(true)} className="gap-2 w-full sm:w-auto">
                <Trash className="h-4 w-4" />
                Seçilenleri Sil ({selectedIds.length})
              </Button>
            )}
            <ImportExport
              data={filteredCommissions}
              columns={exportColumns}
              templateColumns={templateColumns}
              templateInfoData={templateInfoData}
              filename="komisyonlar"
              onImport={handleImport}
            />
            <Button onClick={() => { setEditingCommission(null); setModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Yeni Komisyon
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Platform veya kategori ara..." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Platformlar</SelectItem>
                  {platforms.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={sortType} onValueChange={setSortType}>
                <SelectTrigger><SelectValue placeholder="Sıralama" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kategori_az">Kategori (A-Z)</SelectItem>
                  <SelectItem value="kategori_za">Kategori (Z-A)</SelectItem>
                  <SelectItem value="platform_az">Platform (A-Z)</SelectItem>
                  <SelectItem value="platform_za">Platform (Z-A)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showMissingOnly ? 'default' : 'outline'}
                onClick={() => { setShowMissingOnly(v => !v); setPage(1); }}
                className={`gap-2 w-full ${showMissingOnly ? 'bg-red-600 hover:bg-red-700' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
              >
                <AlertCircle className="h-4 w-4" />
                Eksik Oranlar {missingRateIds.size > 0 && `(${missingRateIds.size})`}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={paginatedCommissions}
              isLoading={isLoading}
              page={page}
              pageSize={pageSize}
              totalItems={filteredCommissions.length}
              onPageChange={setPage}
              emptyMessage="Komisyon kaydı bulunamadı"
            />
          </div>
        </div>

        <CommissionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          commission={editingCommission}
          platforms={platforms}
          categories={categories}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isPending}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Komisyonu Sil</AlertDialogTitle>
              <AlertDialogDescription>Bu komisyon kaydını silmek istediğinizden emin misiniz?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={importProgress.isImporting}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Excel İçe Aktarma İşleniyor...</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">{importProgress.current} / {importProgress.total} kayıt</p>
                <p className="text-2xl font-bold text-indigo-600">%{Math.round((importProgress.current / (importProgress.total || 1)) * 100)}</p>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div className="bg-indigo-600 h-3 rounded-full transition-all duration-300" style={{ width: `${(importProgress.current / (importProgress.total || 1)) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-500 text-center">Lütfen bekleyin, veriler işleniyor...</p>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Toplu Silme</AlertDialogTitle>
              <AlertDialogDescription>{selectedIds.length} komisyon kaydını silmek istediğinizden emin misiniz?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={() => bulkDeleteMutation.mutate(selectedIds)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
