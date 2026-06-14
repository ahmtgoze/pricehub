import React, { useMemo, useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Trash2, RefreshCw, Search, PackageOpen } from 'lucide-react';
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
          'HB Sku': p.hb_sku,
          'Barkod': p.barkod,
          'Merchant Sku': p.merchant_sku,
          'Kategori İsmi': p.category,
          'Ürün Adı': p.product_name,
          'Hepsiburada  Satış Fiyatı': p.sale_price,
          'Stok': p.stock,
          'Ürün Maliyeti ( KDV Dahil)': p.cost,
          'Maliyet KDV Oranı': p.vat_rate,
          'Para Birimi': p.currency,
          'Ürün Desisi': p.desi,
          'Ekstra Maliyet (%)': '',
          'Ekstra Maliyet (TL)': p.extra_cost || ''
        }))
      : updatedCosts.map(p => ({
          'Barkod': p.barkod,
          'Model Kodu': p.model_code,
          'Stok Kodu': p.merchant_sku,
          'Kategori İsmi': p.category,
          'Ürün Adı': p.product_name,
          'Trendyol  Satış Fiyatı': p.sale_price,
          'Stok': p.stock,
          'Ürün Maliyeti ( KDV Dahil)': p.cost,
          'Maliyet KDV Oranı': p.vat_rate,
          'Para Birimi': p.currency,
          'Ürün Desisi': p.desi,
          'Ekstra Maliyet (%)': '',
          'Ekstra Maliyet (TL)': p.extra_cost || ''
        }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maliyetler');
    XLSX.writeFile(workbook, `${selectedPlatform.replace(/\s+/g, '_')}_guncellenen_maliyetler.xlsx`);
    toast.success('Excel indirildi');
  };

  const isHB = activePlatforms.find(p => p.name === selectedPlatform)?.platform_type === 'hepsiburada';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-5 sm:py-8">

        {/* Başlık */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ürün Maliyetleri</h1>
          <p className="text-slate-500 text-sm mt-1">Eşleşmiş pazaryeri ürünlerinin maliyet verilerini görüntüleyin ve dışa aktarın</p>
        </div>

        {/* Filtre / Kontrol Kartı */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Platform</p>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Platform seçin" />
                </SelectTrigger>
                <SelectContent>
                  {activePlatforms.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px] max-w-xs">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Arama</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Ürün, barkod veya SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Sırala</p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Barkod (A→Z)</SelectItem>
                  <SelectItem value="cost">Maliyet (Artan)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" onClick={handleRefresh} className="gap-1.5">
                <RefreshCw className="h-4 w-4" />
                Güncelle
              </Button>
              {selectedPlatform && (
                <Button
                  onClick={handleExcelDownload}
                  disabled={updatedCosts.length === 0}
                  className="bg-green-600 hover:bg-green-700 gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Excel'e Aktar
                </Button>
              )}
              {selectedRows.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Sil ({selectedRows.size})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Özet satırı */}
        {updatedCosts.length > 0 && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="text-sm text-slate-500">
              Toplam <span className="font-semibold text-slate-900">{updatedCosts.length}</span> ürün
            </span>
            {selectedRows.size > 0 && (
              <span className="text-sm text-indigo-600 font-medium">· {selectedRows.size} seçili</span>
            )}
          </div>
        )}

        {/* Tablo */}
        {updatedCosts.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.size === updatedCosts.length && updatedCosts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {isHB ? (
                    <>
                      <TableHead>HB Sku</TableHead>
                      <TableHead>Barkod</TableHead>
                      <TableHead>Merchant Sku</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Barkod</TableHead>
                      <TableHead>Model Kodu</TableHead>
                      <TableHead>Stok Kodu</TableHead>
                    </>
                  )}
                  <TableHead>Kategori</TableHead>
                  <TableHead className="min-w-[180px]">Ürün Adı</TableHead>
                  <TableHead>{isHB ? 'HB Satış Fiyatı' : 'Trendyol Satış Fiyatı'}</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead className="bg-yellow-50">Maliyet (KDV Dahil)</TableHead>
                  <TableHead className="bg-yellow-50">KDV Oranı</TableHead>
                  <TableHead className="bg-yellow-50">Para Birimi</TableHead>
                  <TableHead className="bg-yellow-50">Desi</TableHead>
                  <TableHead className="bg-yellow-50">Ekstra Maliyet (%)</TableHead>
                  <TableHead className="bg-yellow-50">Ekstra Maliyet (TL)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {updatedCosts.map((row) => (
                  <TableRow key={row.id} className={selectedRows.has(row.id) ? 'bg-blue-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(row.id)}
                        onCheckedChange={() => handleSelectRow(row.id)}
                      />
                    </TableCell>
                    {isHB ? (
                      <>
                        <TableCell className="text-sm">{row.hb_sku}</TableCell>
                        <TableCell className="text-sm">{row.barkod}</TableCell>
                        <TableCell className="text-sm">{row.merchant_sku}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-sm">{row.barkod}</TableCell>
                        <TableCell className="text-sm">{row.model_code}</TableCell>
                        <TableCell className="text-sm">{row.merchant_sku}</TableCell>
                      </>
                    )}
                    <TableCell className="text-sm">{row.category}</TableCell>
                    <TableCell className="text-sm">{row.product_name}</TableCell>
                    <TableCell className="text-sm font-medium">₺{row.sale_price?.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{row.stock}</TableCell>
                    <TableCell className="text-sm font-medium bg-yellow-50">₺{row.cost?.toFixed(2)}</TableCell>
                    <TableCell className="text-sm bg-yellow-50">%{row.vat_rate}</TableCell>
                    <TableCell className="text-sm bg-yellow-50">{row.currency}</TableCell>
                    <TableCell className="text-sm bg-yellow-50">{row.desi}</TableCell>
                    <TableCell className="text-sm bg-yellow-50"></TableCell>
                    <TableCell className="text-sm bg-yellow-50">{row.extra_cost > 0 ? row.extra_cost.toFixed(2) : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <PackageOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {selectedPlatform ? 'Bu platform için gösterilecek ürün yok' : 'Başlamak için bir platform seçin'}
            </p>
          </div>
        )}
      </div>

      {/* Silme Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünleri Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRows.size} ürün kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
