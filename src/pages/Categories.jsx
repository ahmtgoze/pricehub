import React, { useState, useMemo, useEffect, useRef } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FolderTree, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
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

      for (const row of rows) {
        const name = (row['Kategori Adı'] || row['name'] || '').toString().trim();
        const vatRate = parseFloat(row['Varsayılan KDV (%)'] || row['default_vat_rate'] || 20);
        if (!name) { skipped++; continue; }

        const existing = existingByName[name.toLowerCase()];
        if (existing) {
          if ((existing.default_vat_rate || 20) !== vatRate) {
            await Category.update(existing.id, { default_vat_rate: vatRate });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await Category.create({ name, default_vat_rate: vatRate, is_active: true });
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
    return result.sort((a, b) => a.name?.localeCompare(b.name));
  }, [categories, search]);

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
          className="h-4 w-4 cursor-pointer accent-indigo-600"
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
          className="h-4 w-4 cursor-pointer accent-indigo-600"
        />
      )
    },
    {
      header: 'Kategori Adı',
      accessor: 'name',
      cell: (row) => <span className="font-medium text-slate-900">{row.name}</span>
    },
    {
      header: 'Varsayılan KDV',
      accessor: 'default_vat_rate',
      cell: (row) => `%${row.default_vat_rate || 20}`
    },
    {
      header: 'Ürün Sayısı',
      accessor: '__pcount',
      cell: (row) => {
        const n = countForCat(row.id);
        return n > 0
          ? <span className="text-slate-700">{n}</span>
          : <span className="text-slate-400">0</span>;
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
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <FolderTree className="h-8 w-8 text-indigo-600" />
              Kategoriler
            </h1>
            <p className="text-slate-500 mt-1">{filteredCategories.length} kategori</p>
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
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              Yeni Kategori
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Kategori ara..."
            className="max-w-md"
          />
        </div>

        {validSelectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
            <span className="text-sm text-rose-700 font-medium">
              {validSelectedIds.length} kategori seçildi
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                Seçimi Temizle
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 gap-2"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Seçilenleri Sil ({validSelectedIds.length})
              </Button>
            </div>
          </div>
        )}

        <DataTable
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
                  <span className="block mt-2 text-rose-600 font-medium">
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
                className="bg-rose-600 hover:bg-rose-700"
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
                  <span className="block mt-2 text-rose-600 font-medium">
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
                className="bg-rose-600 hover:bg-rose-700"
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