import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, ArrowUp, ArrowDown, Minus, Archive, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchInput from '@/components/ui/SearchInput';
import DataTable from '@/components/ui/DataTable';
import ImportExport from '@/components/ImportExport';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import ProductHistoryModal from '@/components/modals/ProductHistoryModal';

const UpdateReport = db.entities.UpdateReport;
const Platform = db.entities.Platform;

export default function UpdateReports() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = React.useState(null);
  const [historyModal, setHistoryModal] = useState({ open: false, productId: null, productName: '' });
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tab, setTab] = useState('aktif');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const pageSize = 20;

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['updateReports', userEmail],
    queryFn: () => UpdateReport.filter({ created_by: userEmail }, '-created_date'),
    enabled: !!userEmail
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: () => Platform.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const archiveMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => UpdateReport.update(id, { archived: true }))),
    onSuccess: () => {
      queryClient.invalidateQueries(['updateReports']);
      setSelectedIds([]);
      toast.success('Seçili raporlar arşivlendi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => UpdateReport.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries(['updateReports']);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      toast.success('Seçili raporlar silindi');
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => UpdateReport.update(id, { archived: false }))),
    onSuccess: () => {
      queryClient.invalidateQueries(['updateReports']);
      setSelectedIds([]);
      toast.success('Seçili raporlar geri alındı');
    }
  });

  const filteredReports = useMemo(() => {
    let result = [...reports];
    
    // Arşiv durumuna göre filtrele
    result = result.filter(r => 
      tab === 'aktif' ? r.archived !== true : r.archived === true
    );
    
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => 
        r.product_name?.toLowerCase().includes(s) ||
        r.product_sku?.toLowerCase().includes(s)
      );
    }
    
    if (platformFilter !== 'all') {
      result = result.filter(r => r.platform_id === platformFilter);
    }
    
    if (typeFilter !== 'all') {
      result = result.filter(r => r.change_type === typeFilter);
    }
    
    return result;
  }, [reports, search, platformFilter, typeFilter, tab]);

  const paginatedReports = filteredReports.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedReports.length && paginatedReports.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedReports.map(r => r.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getPriceChange = (oldPrice, newPrice) => {
    const diff = newPrice - oldPrice;
    const percent = oldPrice > 0 ? (diff / oldPrice) * 100 : 0;
    
    if (diff > 0) {
      return (
        <div className="flex items-center gap-1 text-emerald-600">
          <ArrowUp className="h-4 w-4" />
          <span>+₺{diff.toFixed(2)} ({percent.toFixed(1)}%)</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="flex items-center gap-1 text-rose-600">
          <ArrowDown className="h-4 w-4" />
          <span>₺{diff.toFixed(2)} ({percent.toFixed(1)}%)</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-slate-400">
        <Minus className="h-4 w-4" />
        <span>Değişim yok</span>
      </div>
    );
  };

  const getChangeTypeBadge = (type) => {
    const types = {
      cost_update: { label: 'Maliyet', color: 'bg-blue-100 text-blue-700' },
      shipping_update: { label: 'Kargo', color: 'bg-purple-100 text-purple-700' },
      commission_update: { label: 'Komisyon', color: 'bg-amber-100 text-amber-700' },
      platform_update: { label: 'Platform', color: 'bg-indigo-100 text-indigo-700' },
      manual: { label: 'Manuel', color: 'bg-slate-100 text-slate-700' }
    };
    const config = types[type] || types.manual;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={selectedIds.length === paginatedReports.length && paginatedReports.length > 0}
          onChange={toggleSelectAll}
          className="rounded border-gray-300"
        />
      ),
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleSelect(row.id)}
          className="rounded border-gray-300"
        />
      )
    },
    {
      header: 'Tarih',
      accessor: 'created_date',
      cell: (row) => (
        <span className="text-sm text-slate-600">
          {row.created_date ? format(new Date(row.created_date), 'dd MMM yyyy HH:mm', { locale: tr }) : '-'}
        </span>
      )
    },
    {
      header: 'Ürün',
      cell: (row) => (
        <div>
          <button
            className="font-medium text-indigo-700 hover:text-indigo-900 hover:underline text-left"
            onClick={() => setHistoryModal({ open: true, productId: row.product_id, productName: row.product_name })}
          >
            {row.product_name}
          </button>
          <p className="text-xs text-slate-500 font-mono">{row.product_sku}</p>
        </div>
      )
    },
    {
      header: 'Platform',
      accessor: 'platform_name'
    },
    {
      header: 'Eski Fiyat',
      accessor: 'old_sale_price',
      cell: (row) => <span className="font-mono">₺{row.old_sale_price?.toFixed(2)}</span>
    },
    {
      header: 'Yeni Fiyat',
      accessor: 'new_sale_price',
      cell: (row) => <span className="font-mono font-semibold">₺{row.new_sale_price?.toFixed(2)}</span>
    },
    {
      header: 'Değişim',
      cell: (row) => getPriceChange(row.old_sale_price || 0, row.new_sale_price || 0)
    },
    {
      header: 'Eski Kâr',
      accessor: 'old_profit_rate',
      cell: (row) => <span>%{row.old_profit_rate?.toFixed(1)}</span>
    },
    {
      header: 'Yeni Kâr',
      accessor: 'new_profit_rate',
      cell: (row) => (
        <span className={`font-semibold ${
          (row.new_profit_rate || 0) >= (row.old_profit_rate || 0) ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          %{row.new_profit_rate?.toFixed(1)}
        </span>
      )
    },
    {
      header: 'Neden',
      accessor: 'change_type',
      cell: (row) => getChangeTypeBadge(row.change_type)
    }
  ];

  const exportColumns = [
    { key: 'created_date', label: 'Tarih' },
    { key: 'product_name', label: 'Ürün' },
    { key: 'product_sku', label: 'SKU' },
    { key: 'platform_name', label: 'Platform' },
    { key: 'old_sale_price', label: 'Eski Fiyat' },
    { key: 'new_sale_price', label: 'Yeni Fiyat' },
    { key: 'old_profit_rate', label: 'Eski Kâr (%)' },
    { key: 'new_profit_rate', label: 'Yeni Kâr (%)' },
    { key: 'change_reason', label: 'Neden' },
    { key: 'change_type', label: 'Değişiklik Tipi' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-indigo-600" />
              Güncelleme Raporları
            </h1>
            <p className="text-slate-500 mt-1">{filteredReports.length} değişiklik kaydı</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    if (tab === 'aktif') {
                      archiveMutation.mutate(selectedIds);
                    } else {
                      restoreMutation.mutate(selectedIds);
                    }
                  }}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4" />
                  {tab === 'aktif' ? 'Arşivle' : 'Geri Al'} ({selectedIds.length})
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Sil ({selectedIds.length})
                </Button>
              </>
            )}
            <ImportExport
              data={filteredReports}
              columns={exportColumns}
              filename="guncelleme_raporlari"
            />
          </div>
        </div>

        <div className="mb-4 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setTab('aktif')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === 'aktif'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Aktif Raporlar
          </button>
          <button
            onClick={() => setTab('arsiv')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === 'arsiv'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Arşiv
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Ürün adı veya SKU ara..."
              className="flex-1"
            />
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Platformlar</SelectItem>
                {platforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tipler</SelectItem>
                <SelectItem value="cost_update">Maliyet</SelectItem>
                <SelectItem value="shipping_update">Kargo</SelectItem>
                <SelectItem value="commission_update">Komisyon</SelectItem>
                <SelectItem value="platform_update">Platform</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginatedReports}
          isLoading={isLoading}
          page={page}
          pageSize={pageSize}
          totalItems={filteredReports.length}
          onPageChange={setPage}
          emptyMessage="Güncelleme raporu bulunamadı"
        />

        <ProductHistoryModal
          open={historyModal.open}
          onClose={() => setHistoryModal({ open: false, productId: null, productName: '' })}
          productId={historyModal.productId}
          productName={historyModal.productName}
        />

        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Raporları Sil</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedIds.length} raporu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(selectedIds)}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
