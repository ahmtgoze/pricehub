import React, { useMemo, useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Trash2, RefreshCw, Search, Package } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function UpdatedCosts() {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [userEmail, setUserEmail] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => db.entities.Platform.list(),
  });

  const activePlatforms = platforms
    .filter(p => p.is_active !== false)
    .filter((p, idx, arr) => arr.findIndex(x => x.name === p.name) === idx);

  const { data: marketplaceProducts = [], refetch: refetchMarketplace } = useQuery({
    queryKey: ['marketplaceProducts', userEmail],
    queryFn: () => db.entities.MarketplaceProduct.filter({ created_by: userEmail }),
    enabled: !!userEmail,
    staleTime: 0,
    cacheTime: 0
  });

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.entities.Product.list(),
    staleTime: 0,
    cacheTime: 0
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => db.entities.MarketplaceProduct.delete(id))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] }),
  });

  const handleRefresh = async () => {
    toast.info('Veriler güncelleniyor...');
    await Promise.all([refetchMarketplace(), refetchProducts()]);
    toast.success('Veriler güncellendi');
  };

  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u');
  };

  const updatedCosts = useMemo(() => {
    let result = marketplaceProducts.filter(m => m.status === 'matched');

    if (selectedPlatform) {
      result = result.filter(m => m.platform_account === selectedPlatform);
    }

    result = result.map(m => {
      const product = products.find(p => p.id === m.matched_product_id);

      let desi = '-';
      if (product?.multi_package && product?.packages) {
        try {
          const pkgs = typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages;
          desi = pkgs.map(p => p.desi).join(', ');
        } catch (e) {
          desi = product?.desi || '-';
        }
      } else {
        desi = product?.desi || '-';
      }

      const stockCode = m.variant_sku || '';
      const extraCost = (product?.printing_cost || 0) + (product?.extra_cost || 0);
      const platformObj = platforms.find(p => p.name === m.platform_account);
      const isHepsiburada = platformObj?.platform_type === 'hepsiburada';

      return {
        id: m.id,
        barkod: m.barkod,
        hb_sku: m.hb_sku || '',
        model_code: isHepsiburada ? '' : (m.model_code || ''),
        merchant_sku: stockCode,
        category: m.category || '',
        product_name: m.platform_product_name || '-',
        sale_price: m.marketplace_sale_price || 0,
        stock: m.stock_quantity || 0,
        cost: product?.cost || 0,
        vat_rate: product?.vat_rate || 20,
        currency: 'TRY',
        desi,
        extra_cost: extraCost,
        platform: m.platform_account
      };
    });

    if (searchQuery.trim()) {
      const searchWords = searchQuery.trim().split(/\s+/).map(w => normalizeText(w)).filter(w => w.length > 0);
      result = result.filter(item => {
        const textToSearch = normalizeText(`${item.product_name || ''} ${item.barkod || ''} ${item.model_code || ''} ${item.merchant_sku || ''}`);
        return searchWords.every(word => textToSearch.includes(word));
      });
    }

    switch (sortBy) {
      case 'cost': result.sort((a, b) => (a.cost || 0) - (b.cost || 0)); break;
      case 'date': result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); break;
      default: result.sort((a, b) => (a.barkod || '').localeCompare(b.barkod || ''));
    }

    return result;
  }, [marketplaceProducts, products, platforms, sortBy, searchQuery, selectedPlatform]);

  const handleSelectRow = (id) => {
    const newSet = new Set(selectedRows);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedRows(newSet);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === updatedCosts.length && updatedCosts.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(updatedCosts.map(p => p.id)));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(Array.from(selectedRows));
      toast.success('Ürünler silindi');
      setSelectedRows(new Set());
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Silme hatası');
    }
  };

  const handleExcelDownload = () => {
    if (!selectedPlatform) { toast.error('Lütfen önce platform seçin'); return; }
    if (updatedCosts.length === 0) { toast.error('İndirilecek maliyet verisi yok'); return; }

    const selectedPlatformObj = activePlatforms.find(p => p.name === selectedPlatform);
    const isHepsiburada = selectedPlatformObj?.platform_type === 'hepsiburada';

    const exportData = isHepsiburada
      ? updatedCosts.map(p => ({
          'HB Sku': p.hb_sku, 'Barkod': p.barkod, 'Merchant Sku': p.merchant_sku,
          'Kategori İsmi': p.category, 'Ürün Adı': p.product_name,
          'Hepsiburada  Satış Fiyatı': p.sale_price, 'Stok': p.stock,
          'Ürün Maliyeti ( KDV Dahil)': p.cost, 'Maliyet KDV Oranı': p.vat_rate,
          'Para Birimi': p.currency, 'Ürün Desisi': p.desi,
          'Ekstra Maliyet (%)': '', 'Ekstra Maliyet (TL)': p.extra_cost || ''
        }))
      : updatedCosts.map(p => ({
          'Barkod': p.barkod, 'Model Kodu': p.model_code, 'Stok Kodu': p.merchant_sku,
          'Kategori İsmi': p.category, 'Ürün Adı': p.product_name,
          'Trendyol  Satış Fiyatı': p.sale_price, 'Stok': p.stock,
          'Ürün Maliyeti ( KDV Dahil)': p.cost, 'Maliyet KDV Oranı': p.vat_rate,
          'Para Birimi': p.currency, 'Ürün Desisi': p.desi,
          'Ekstra Maliyet (%)': '', 'Ekstra Maliyet (TL)': p.extra_cost || ''
        }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maliyetler');
    XLSX.writeFile(workbook, `${selectedPlatform.replace(/\s+/g, '_')}_guncellenenmis_maliyetler.xlsx`);
    toast.success('Excel indirildi');
  };

  const isHB = activePlatforms.find(p => p.name === selectedPlatform)?.platform_type === 'hepsiburada';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-6 py-8">

        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ürün Maliyetleri</h1>
          <p className="text-slate-500 text-sm mt-1">Eşleşmiş ürünlerin güncel maliyet verilerini görüntüleyin ve indirin</p>
        </div>

        {/* Kontrol Çubuğu */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
            {/* Platform seçici */}
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-full md:w-56 h-9 rounded-lg border-slate-200 text-sm">
                <SelectValue placeholder="Platform seçin" />
              </SelectTrigger>
              <SelectContent>
                {activePlatforms.map(p => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Arama */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Ürün, barkod veya SKU ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 rounded-lg border-slate-200 text-sm"
              />
            </div>

            {/* Sıralama */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-52 h-9 rounded-lg border-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Barkoda göre (A→Z)</SelectItem>
                <SelectItem value="cost">Maliyete göre (↑)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 md:ml-auto">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="h-9 rounded-lg border-slate-200 text-slate-600 text-sm gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Yenile
              </Button>

              {selectedPlatform && (
                <Button
                  onClick={handleExcelDownload}
                  disabled={updatedCosts.length === 0}
                  size="sm"
                  className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Excel İndir
                </Button>
              )}

              {selectedRows.size > 0 && (
                <Button
                  onClick={() => setDeleteDialogOpen(true)}
                  size="sm"
                  className="h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Sil ({selectedRows.size})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Özet Bant */}
        {updatedCosts.length > 0 && (
          <div className="flex items-center gap-4 mb-3 px-1">
            <span className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{updatedCosts.length}</span> ürün
              {selectedRows.size > 0 && (
                <span className="ml-2 text-indigo-600 font-medium">· {selectedRows.size} seçili</span>
              )}
            </span>
          </div>
        )}

        {/* Tablo */}
        {updatedCosts.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={selectedRows.size === updatedCosts.length && updatedCosts.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="border-slate-300"
                      />
                    </TableHead>
                    {isHB ? (
                      <>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">HB Sku</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Barkod</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Merchant Sku</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Barkod</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model Kodu</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stok Kodu</TableHead>
                      </>
                    )}
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kategori</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[200px]">Ürün Adı</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Satış Fiyatı</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Stok</TableHead>
                    {/* Sarı grup — maliyet sütunları */}
                    <TableHead className="text-xs font-semibold text-amber-700 uppercase tracking-wide text-right bg-amber-50 border-l border-amber-200">Maliyet (KDV Dahil)</TableHead>
                    <TableHead className="text-xs font-semibold text-amber-700 uppercase tracking-wide text-center bg-amber-50">KDV Oranı</TableHead>
                    <TableHead className="text-xs font-semibold text-amber-700 uppercase tracking-wide text-center bg-amber-50">Para Birimi</TableHead>
                    <TableHead className="text-xs font-semibold text-amber-700 uppercase tracking-wide text-center bg-amber-50">Desi</TableHead>
                    <TableHead className="text-xs font-semibold text-amber-700 uppercase tracking-wide text-right bg-amber-50">Ekstra Maliyet (%)</TableHead>
                    <TableHead className="text-xs font-semibold text-amber-700 uppercase tracking-wide text-right bg-amber-50 border-r border-amber-200">Ekstra Maliyet (TL)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {updatedCosts.map((row, idx) => (
                    <TableRow
                      key={row.id}
                      className={`border-b border-slate-100 transition-colors ${
                        selectedRows.has(row.id)
                          ? 'bg-indigo-50/60'
                          : idx % 2 === 0 ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/30 hover:bg-slate-50/60'
                      }`}
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selectedRows.has(row.id)}
                          onCheckedChange={() => handleSelectRow(row.id)}
                          className="border-slate-300"
                        />
                      </TableCell>
                      {isHB ? (
                        <>
                          <TableCell className="text-xs text-slate-600 font-mono">{row.hb_sku}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">{row.barkod}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">{row.merchant_sku}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-xs text-slate-600 font-mono">{row.barkod}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">{row.model_code}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">{row.merchant_sku}</TableCell>
                        </>
                      )}
                      <TableCell className="text-xs text-slate-500">{row.category}</TableCell>
                      <TableCell className="text-sm text-slate-800 font-medium max-w-xs">
                        <span className="line-clamp-2 leading-snug">{row.product_name}</span>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-900 text-right tabular-nums">
                        {row.sale_price > 0 ? `₺${row.sale_price.toFixed(2)}` : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 text-right tabular-nums">{row.stock}</TableCell>
                      {/* Maliyet grubu */}
                      <TableCell className="text-sm font-bold text-slate-900 text-right tabular-nums bg-amber-50/60 border-l border-amber-100">
                        {row.cost > 0 ? `₺${row.cost.toFixed(2)}` : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 text-center bg-amber-50/60">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium text-xs">
                          %{row.vat_rate}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 text-center bg-amber-50/60">{row.currency}</TableCell>
                      <TableCell className="text-xs text-slate-600 text-center bg-amber-50/60 tabular-nums">{row.desi}</TableCell>
                      <TableCell className="text-xs text-slate-400 text-right bg-amber-50/60">—</TableCell>
                      <TableCell className="text-xs text-slate-700 text-right tabular-nums bg-amber-50/60 border-r border-amber-100">
                        {row.extra_cost > 0 ? row.extra_cost.toFixed(2) : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* Boş durum */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Package className="h-7 w-7 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-700 font-medium">Gösterilecek ürün yok</p>
              <p className="text-slate-400 text-sm mt-1">
                {selectedPlatform
                  ? 'Bu platform için eşleşmiş ürün bulunamadı'
                  : 'Başlamak için yukarıdan bir platform seçin'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Silme Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünleri Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-slate-900">{selectedRows.size} ürün</span> kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end mt-2">
            <AlertDialogCancel className="rounded-lg">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg bg-rose-600 hover:bg-rose-700"
            >
              Sil
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
