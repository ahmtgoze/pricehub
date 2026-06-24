import React, { useMemo, useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function PriceSynchronization() {
  const [syncing, setSyncing] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('percent'); // 'percent' veya 'amount'
  const [filterCondition, setFilterCondition] = useState('equal'); // 'equal', 'above' veya 'below'
  const [filterValue, setFilterValue] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const queryClient = useQueryClient();

  // Veri çekme
  const { data: marketplaceProducts = [] } = useQuery({
    queryKey: ['marketplaceProducts'],
    queryFn: () => db.entities.MarketplaceProduct.list(),
  });

  const { data: productPrices = [] } = useQuery({
    queryKey: ['productPrices'],
    queryFn: () => db.entities.ProductPrice.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.entities.Product.list(),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.MarketplaceProduct.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => db.entities.MarketplaceProduct.delete(id))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] }),
  });

  // Fiyat senkronizasyonu
  const handleSyncPrices = async () => {
    setSyncing(true);
    try {
      const matchedProducts = marketplaceProducts.filter(m => m.status === 'matched');

      for (const mp of matchedProducts) {
        const product = products.find(p => p.id === mp.matched_product_id);
        if (!product) continue;

        // Platform kodunu belirle
        let platformCode = '';
        if (mp.platform_account.includes('Trendyol')) {
          platformCode = 'trendyol';
        } else if (mp.platform_account.includes('HepsiBurada')) {
          platformCode = 'hepsiburada';
        }

        // Ürünün bu platform için fiyatını bul
        const price = productPrices.find(
          pp => pp.product_id === product.id && pp.platform_name.toLowerCase() === platformCode
        );

        if (price && price.sale_price !== mp.marketplace_sale_price) {
          await updateMutation.mutateAsync({
            id: mp.id,
            data: { marketplace_sale_price: price.sale_price },
          });
        }
      }

      toast.success('Fiyatlar senkronize edildi');
    } catch (error) {
      toast.error('Senkronizasyon hatası');
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  // Normalized text helper for search
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u');
  };

  // Senkronize edilmiş ürünler - sıralanmış
  const synchronizedProducts = useMemo(() => {
    let result = marketplaceProducts
      .filter(m => m.status === 'matched');
    
    // Platform filtresi
    if (selectedPlatform) {
      result = result.filter(m => m.platform_account === selectedPlatform);
    }
    
    result = result.map(m => {
        const product = products.find(p => p.id === m.matched_product_id);
        let platformCode = '';
        if (m.platform_account.includes('Trendyol')) {
          platformCode = 'trendyol';
        } else if (m.platform_account.includes('HepsiBurada')) {
          platformCode = 'hepsiburada';
        }

        const price = productPrices.find(
          pp => pp.product_id === product?.id && pp.platform_name.toLowerCase() === platformCode
        );

        const systemPrice = price?.sale_price || 0;
        const marketplacePrice = m.marketplace_sale_price || 0;
        const priceDiff = systemPrice - marketplacePrice;
        const priceChangePercent = marketplacePrice > 0 ? ((priceDiff / marketplacePrice) * 100) : 0;

        // Desi bilgilerini al
        let desi1 = '-', desi2 = '-';
        
        if (product?.multi_package && product?.packages) {
          try {
            const packages = typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages;
            desi1 = packages[0]?.desi || '-';
            desi2 = packages[1]?.desi || '-';
          } catch (e) {
            desi1 = product?.desi || '-';
          }
        } else {
          desi1 = product?.desi || '-';
        }
        
        return {
          ...m,
          product_name: product?.name || '-',
          product_sku: product?.sku || '-',
          desi1,
          desi2,
          system_price: systemPrice,
          price_matched: systemPrice === marketplacePrice,
          price_diff: priceDiff,
          price_change_percent: priceChangePercent,
        };
      });

    // Search filter
    if (searchQuery.trim()) {
      const searchWords = searchQuery.trim().split(/\s+/).map(w => normalizeText(w)).filter(w => w.length > 0);
      result = result.filter(item => {
        const textToSearch = normalizeText(
          `${item.platform_product_name || ''} ${item.barkod || ''} ${item.product_name || ''} ${item.product_sku || ''}`
        );
        return searchWords.every(word => textToSearch.includes(word));
      });
    }

    // Price change filter
    if (filterValue && !isNaN(parseFloat(filterValue))) {
      const threshold = parseFloat(filterValue);
      result = result.filter(item => {
        if (filterType === 'percent') {
          const absChangePercent = Math.abs(item.price_change_percent);
          if (filterCondition === 'equal') {
            return Math.abs(absChangePercent - threshold) < 0.01;
          }
          return filterCondition === 'above' 
            ? absChangePercent >= threshold 
            : absChangePercent <= threshold;
        } else {
          const absChangAmount = Math.abs(item.price_diff);
          if (filterCondition === 'equal') {
            return Math.abs(absChangAmount - threshold) < 0.01;
          }
          return filterCondition === 'above' 
            ? absChangAmount >= threshold 
            : absChangAmount <= threshold;
        }
      });
    }

    // Sıralama
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
        break;
      case 'name_desc':
        result.sort((a, b) => (b.product_name || '').localeCompare(a.product_name || ''));
        break;
      case 'price':
        result.sort((a, b) => (a.system_price || 0) - (b.system_price || 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.system_price || 0) - (a.system_price || 0));
        break;
      case 'date':
        result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        break;
      case 'date_asc':
        result.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        break;
      case 'change_percent':
        result.sort((a, b) => Math.abs(a.price_change_percent) - Math.abs(b.price_change_percent));
        break;
      case 'change_percent_desc':
        result.sort((a, b) => Math.abs(b.price_change_percent) - Math.abs(a.price_change_percent));
        break;
      case 'change_amount':
        result.sort((a, b) => Math.abs(a.price_diff) - Math.abs(b.price_diff));
        break;
      case 'change_amount_desc':
        result.sort((a, b) => Math.abs(b.price_diff) - Math.abs(a.price_diff));
        break;
      default:
        result.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
    }

    return result;
  }, [marketplaceProducts, products, productPrices, sortBy, searchQuery, filterType, filterCondition, filterValue, selectedPlatform]);

  const handleSelectRow = (id) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRows(newSet);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === synchronizedProducts.length && synchronizedProducts.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(synchronizedProducts.map(p => p.id)));
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



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fiyat Senkronizasyonu</h1>
          <p className="text-gray-600">Ana ürün fiyatlarını pazaryeri ürünlerine senkronize edin</p>
        </div>

        {/* Kontrol Paneli */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex gap-4 items-center mb-4">
            <div className="flex-1">
              <Label className="text-sm mb-2 block font-semibold">Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="Tüm Platformlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Tüm Platformlar</SelectItem>
                  <SelectItem value="Trendyol SVS">Trendyol SVS</SelectItem>
                  <SelectItem value="Trendyol GözePack">Trendyol GözePack</SelectItem>
                  <SelectItem value="HepsiBurada SVS">HepsiBurada SVS</SelectItem>
                  <SelectItem value="Web Sitesi - SVS">Web Sitesi - SVS</SelectItem>
                  <SelectItem value="Web Sitesi - Gözepack">Web Sitesi - Gözepack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 max-w-md">
              <Label className="text-sm mb-2 block">&nbsp;</Label>
              <Input
                placeholder="Ürün, barkod veya SKU ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Fiyat Değişim Filtresi */}
          <div className="flex gap-3 items-end border-t pt-4">
            <div className="flex-1">
              <Label className="text-xs mb-2 block">Filtre Tipi</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Yüzdelik (%)</SelectItem>
                  <SelectItem value="amount">Tutar (₺)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-2 block">Koşul</Label>
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Eşittir</SelectItem>
                  <SelectItem value="above">
                    {filterType === 'percent' ? '% ve Üzeri' : '₺ ve Üstü'}
                  </SelectItem>
                  <SelectItem value="below">
                    {filterType === 'percent' ? '% ve Altı' : '₺ ve Altı'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-2 block">Değer</Label>
              <Input
                type="number"
                placeholder={filterType === 'percent' ? 'Örn: 10' : 'Örn: 10'}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full"
              />
            </div>
            {filterValue && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterValue('')}
              >
                Temizle
              </Button>
            )}
          </div>
        </div>

        {/* Senkronize Edilmiş Ürünler */}
        {synchronizedProducts.length > 0 ? (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-900">Toplam: {synchronizedProducts.length} ürün</span>
                {selectedRows.size > 0 && (
                  <span className="text-sm text-gray-600">{selectedRows.size} seçildi</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Sırala:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Alfabetik (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Alfabetik (Z-A)</SelectItem>
                    <SelectItem value="price">Fiyata (Düşükten Yükseğe)</SelectItem>
                    <SelectItem value="price_desc">Fiyata (Yüksekten Düşüğe)</SelectItem>
                    <SelectItem value="date">Tarihte (Yeni)</SelectItem>
                    <SelectItem value="date_asc">Tarihte (Eski)</SelectItem>
                    <SelectItem value="change_percent">Değişim Oranı Yüzdelik (Düşükten Yükseğe)</SelectItem>
                    <SelectItem value="change_percent_desc">Değişim Oranı Yüzdelik (Yüksekten Düşüğe)</SelectItem>
                    <SelectItem value="change_amount">Değişim Oranı Tutar (Düşükten Yükseğe)</SelectItem>
                    <SelectItem value="change_amount_desc">Değişim Oranı Tutar (Yüksekten Düşüğe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedRows.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Seçilenleri Sil ({selectedRows.size})
                </Button>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.size === synchronizedProducts.length && synchronizedProducts.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Barkod</TableHead>
                    <TableHead>Ana Ürün</TableHead>
                    <TableHead>Desi 1</TableHead>
                    <TableHead>Desi 2</TableHead>
                    <TableHead>Sistemdeki Fiyat</TableHead>
                    <TableHead>Pazaryeri Fiyatı</TableHead>
                    <TableHead>Değişim Oranı</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {synchronizedProducts.map((row) => (
                    <TableRow key={row.id} className={selectedRows.has(row.id) ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(row.id)}
                          onCheckedChange={() => handleSelectRow(row.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">{row.platform_account}</TableCell>
                      <TableCell className="text-sm">{row.barkod}</TableCell>
                      <TableCell className="text-sm">{row.product_name}</TableCell>
                      <TableCell className="text-sm">{row.desi1 || '-'}</TableCell>
                      <TableCell className="text-sm">{row.desi2 || '-'}</TableCell>
                      <TableCell className="text-sm font-medium">₺{row.system_price?.toFixed(2)}</TableCell>
                      <TableCell className="text-sm font-medium">₺{row.marketplace_sale_price?.toFixed(2)}</TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <span className={`font-medium ${row.price_change_percent > 0 ? 'text-green-600' : row.price_change_percent < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {row.price_change_percent > 0 ? '+' : ''}{row.price_change_percent?.toFixed(2)}%
                          </span>
                          <div className="text-xs text-gray-500">
                            ({row.price_diff > 0 ? '+' : ''}₺{row.price_diff?.toFixed(2)})
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${row.price_matched ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {row.price_matched ? 'Güncel' : 'Güncellenmesi Gerekli'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
            ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500">Henüz eşleştirilmiş ürün yok</p>
            </div>
            )}

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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </AlertDialogAction>
            </div>
            </AlertDialogContent>
            </AlertDialog>
            </div>
            </div>
            );
            }
