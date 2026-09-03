import React, { useState, useMemo, useEffect, useRef } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { sayiyaCevirVeya } from '@/lib/turkceSayi';
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
import FiltreEtiketi from '@/components/ui/FiltreEtiketi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable from '@/components/ui/DataTable';
import CategoryModal from '@/components/modals/CategoryModal';
import { toast } from 'sonner';

const Category = db.entities.Category;
const Product = db.entities.Product;

export default function Categories() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = React.useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Seçim (toplu/tek tek)
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const selectAllRef = useRef(null);

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', userEmail],
    queryFn: () => Category.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  // Kategorilere bağlı ürün sayısını bulmak için ürünleri çek (silme uyarısı için)
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products-cat-count', userEmail],
    queryFn: () => Product.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const productCountByCat = useMemo(() => {
    const m = {};
    (allProducts || []).forEach(p => {
      const cid = p.category_id;
      if (cid != null && cid !== '') {
        const key = String(cid);
        m[key] = (m[key] || 0) + 1;
      }
    });
    return m;
  }, [allProducts]);

  const countForCat = (id) => productCountByCat[String(id)] || 0;

  // Subscribe to category changes for real-time updates
  useEffect(() => {
    const unsubscribe = Category.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['categories'], exact: false });
    });
    return unsubscribe;
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingCategory) {
        return Category.update(editingCategory.id, data);
      }
      return Category.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'], exact: false });
      setModalOpen(false);
      setEditingCategory(null);
      toast.success('Kategori kaydedildi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Category.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['categories'], exact: false });
      setSelectedIds(prev => prev.filter(x => x !== id));
      setDeleteId(null);
      toast.success('Kategori silindi');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await Category.delete(id);
      }
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['categories'], exact: false });
      setBulkDeleteOpen(false);
      setSelectedIds([]);
      toast.success(`${ids.length} kategori silindi`);
    }
  });

  const importRef = useRef(null);

  const handleExport = () => {
    const rows = categories.map(c => ({
      'Kategori Adı': c.name,
      'Varsayılan KDV (%)': c.default_vat_rate || 20,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kategoriler');
    XLSX.writeFile(wb, 'kategoriler.xlsx');
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (!rows.length) { toast.error('Excel boş'); return; }

      const existingByName = {};
      categories.forEach(c => { existingByName[c.name?.trim().toLowerCase()] = c; });

      let created = 0, updated = 0, skipped = 0;

      // Bos hucre "eslesmeyi sil" demek degil; sadece dolu gelen deger yazilir.
      const metin = (v) => {
        const t = (v ?? '').toString().trim();
        return t === '' ? null : t;
      };

      for (const row of rows) {
        const name = (row['Kategori Adı'] || row['name'] || '').toString().trim();
        const vatRate = sayiyaCevirVeya(row['Varsayılan KDV (%)'] || row['default_vat_rate'] || 20, 20);
        const trendyol = metin(row['Trendyol Kategorisi'] || row['trendyol_category']);
        const hepsiburada = metin(row['HepsiBurada Kategorisi'] || row['hepsiburada_category']);
        if (!name) { skipped++; continue; }

        const existing = existingByName[name.toLowerCase()];
        if (existing) {
          const degisiklik = {};
          if ((existing.default_vat_rate || 20) !== vatRate) degisiklik.default_vat_rate = vatRate;
          if (trendyol !== null && trendyol !== existing.trendyol_category) degisiklik.trendyol_category = trendyol;
          if (hepsiburada !== null && hepsiburada !== existing.hepsiburada_category) degisiklik.hepsiburada_category = hepsiburada;

          if (Object.keys(degisiklik).length > 0) {
            await Category.update(existing.id, degisiklik);
            updated++;
          } else {
            skipped++;
          }
        } else {
          await Category.create({
            name,
            default_vat_rate: vatRate,
            trendyol_category: trendyol,
            hepsiburada_category: hepsiburada,
            is_active: true,
          });
          created++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['categories'], exact: false });
      toast.success(`✅ ${created} yeni eklendi, ${updated} güncellendi, ${skipped} atlandı.`);
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredCategories = useMemo(() => {
    let result = [...categories];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') {
      const aktifMi = statusFilter === 'active';
      result = result.filter(c => (c.is_active !== false) === aktifMi);
    }
    return result.sort((a, b) => a.name?.localeCompare(b.name));
  }, [categories, search, statusFilter]);

  const paginatedCategories = filteredCategories.slice((page - 1) * pageSize, page * pageSize);

  // Seçim yardımcıları (tüm filtrelenmiş kategoriler üzerinden)
  const allFilteredIds = useMemo(() => filteredCategories.map(c => c.id), [filteredCategories]);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : allFilteredIds);
  };
  const toggleOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Silinecekler arasında geçerli (hâlâ var olan) id'ler
  const validSelectedIds = useMemo(
    () => selectedIds.filter(id => categories.some(c => c.id === id)),
    [selectedIds, categories]
  );

  const singleAffected = deleteId ? countForCat(deleteId) : 0;
  const bulkAffected = validSelectedIds.reduce((s, id) => s + countForCat(id), 0);

  const columns = [
    {
      header: (
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4 cursor-pointer accent-gray-900"
          title="Tümünü seç"
        />
      ),
      accessor: '__select',
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleOne(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 cursor-pointer accent-gray-900"
        />
      )
    },
    {
      header: 'Kategori Adı',
      accessor: 'name',
      cell: (row) => <span className="font-medium text-foreground">{row.name}</span>
    },
    {
      header: 'Varsayılan KDV',
      accessor: 'default_vat_rate',
      cell: (row) => `%${row.default_vat_rate || 20}`
    },
    {
      id: 'trendyol_category',
      header: 'Trendyol Kategorisi',
      cell: (row) => row.trendyol_category
        ? <span className="text-muted-foreground">{row.trendyol_category}</span>
        : <span className="text-muted-foreground/60">—</span>
    },
    {
      id: 'hepsiburada_category',
      header: 'HepsiBurada Kategorisi',
      cell: (row) => row.hepsiburada_category
        ? <span className="text-muted-foreground">{row.hepsiburada_category}</span>
        : <span className="text-muted-foreground/60">—</span>
    },
    {
      header: 'Ürün Sayısı',
      accessor: '__pcount',
      cell: (row) => {
        const n = countForCat(row.id);
        return n > 0
          ? <span className="text-muted-foreground">{n}</span>
          : <span className="text-muted-foreground/70">0</span>;
      }
    },
    {
      header: 'Durum',
      accessor: 'is_active',
      cell: (row) => (
        <Badge variant={row.is_active !== false ? 'default' : 'secondary'}>
          {row.is_active !== false ? 'Aktif' : 'Pasif'}
        </Badge>
      )
    },
    {
      id: 'islemler',
      header: 'İşlemler',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCategory(row);
              setModalOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(row.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    },
    // ── Eklenebilir sutunlar: varsayilanda gizli, panelden acilir ──
    { id: 'description', header: 'Açıklama', optional: true, cell: (row) => row.description || '-' },
    { id: 'created_at', header: 'Eklenme Tarihi', optional: true, cell: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString('tr-TR') : '-' },
  ];

  return (
    <div className="min-h-screen bg-secondary">
      <div className="ph-page-flow mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="ph-title">Kategoriler</h1>
            <p className="text-muted-foreground mt-1">{filteredCategories.length} kategori</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Dışa Aktar
            </Button>
            <Button variant="outline" onClick={() => importRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              İçe Aktar
            </Button>
            <Button 
              onClick={() => { setEditingCategory(null); setModalOpen(true); }}
              className="bg-primary hover:bg-black dark:hover:bg-white/90 gap-2"
            >
              <Plus className="h-4 w-4" />
              Yeni Kategori
            </Button>
          </div>
        </div>

        <div className="rounded-[18px] border border-border bg-card p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Kategori ara..."
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

        {validSelectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3 mb-4">
            <span className="text-sm text-red-700 font-medium">
              {validSelectedIds.length} kategori seçildi
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                Seçimi Temizle
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 gap-2"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Seçilenleri Sil ({validSelectedIds.length})
              </Button>
            </div>
          </div>
        )}

        <DataTable pageKey="kategoriler"
          columns={columns}
          data={paginatedCategories}
          isLoading={isLoading}
          page={page}
          pageSize={pageSize}
          totalItems={filteredCategories.length}
          onPageChange={setPage}
          emptyMessage="Kategori bulunamadı"
        />

        <CategoryModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          category={editingCategory}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isPending}
        />

        {/* Tek kategori silme */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu kategoriyi silmek istediğinizden emin misiniz?
                {singleAffected > 0 && (
                  <span className="block mt-2 text-red-600 font-medium">
                    ⚠️ Bu kategoride {singleAffected} ürün var. Silersen bu ürünler kategorisiz kalır
                    ve fiyat/komisyon hesapları bozulabilir.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Toplu silme */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Seçili Kategorileri Sil</AlertDialogTitle>
              <AlertDialogDescription>
                {validSelectedIds.length} kategoriyi silmek istediğinizden emin misiniz?
                {bulkAffected > 0 && (
                  <span className="block mt-2 text-red-600 font-medium">
                    ⚠️ Seçili kategorilerde toplam {bulkAffected} ürün var. Silersen bu ürünler
                    kategorisiz kalır ve fiyat/komisyon hesapları bozulabilir.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bulkDeleteMutation.mutate(validSelectedIds)}
                disabled={bulkDeleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {bulkDeleteMutation.isPending ? 'Siliniyor...' : `Sil (${validSelectedIds.length})`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}