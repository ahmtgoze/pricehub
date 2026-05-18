import React, { useMemo, useState, useEffect } from 'react';
import { db } from '@/api/db';
import { getAdapter, downloadFile } from '@/lib/platformAdapters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const HEPSIBURADA_FIYAT_ADIMLARI = [
  'Bu sayfada sağ üstteki "Sırala" butonuna tıklayarak "Değişim Oranı (Yüksekten Düşüğe)" veya "Değişim Tutarı (Yüksekten Düşüğe)" seçeneğini seçin.',
  'Değişim oranı veya tutarı çok yüksek olan ürünler varsa Pazaryeri Ürünleri sayfasında eşleştirme hatasını düzeltin.',
  'Hata düzeltildikten sonra bu sayfaya geri dönün ve "Güncelle" butonuna tıklayın.',
  'Sıralamayı tekrar kontrol edin. Her şey doğruysa "Excel\'e Aktar" butonuna tıklayın.',
  'İndirdiğiniz Excel\'i HepsiBurada panelinde yüklemek için: "Ürünler" → "Envanter" → "Toplu Güncelleme" sayfasına gidin.',
  '"Hazırladığınız Excel dosyasını sisteme yükleyin" bölümüne Excel dosyanızı yükleyin.',
  '"Yükleme Tipi" olarak "Fiyat Güncelleme" tipini seçin.',
  'En alttaki "Yükle" butonuna tıklayın.',
];

const TRENDYOL_FIYAT_ADIMLARI = [
  'Bu sayfada sağ üstteki "Sırala" butonuna tıklayarak "Değişim Oranı (Yüksekten Düşüğe)" veya "Değişim Tutarı (Yüksekten Düşüğe)" seçeneğini seçin.',
  'Değişim oranı veya tutarı çok yüksek olan ürünler varsa Pazaryeri Ürünleri sayfasında eşleştirme hatasını düzeltin.',
  'Hata düzeltildikten sonra bu sayfaya geri dönün ve "Güncelle" butonuna tıklayın.',
  'Sıralamayı tekrar kontrol edin. Her şey doğruysa "Excel\'e Aktar" butonuna tıklayın.',
  'İndirdiğiniz Excel\'i Trendyol panelinde yüklemek için: "Ürün" → "Toplu Ürün İşlemleri" sayfasına gidin.',
  '"Şablon Yükle" butonuna tıklayın.',
  '"Şablon Tipi" olarak "Stok & Fiyat Güncelleme" tipini seçin.',
  'Hazırladığınız Excel dosyasını sisteme yükleyin ve "Yükle" butonuna tıklayın.',
];

const WEBSITE_FIYAT_ADIMLARI = [
  'Bu sayfada Web Sitesi platformunu seçin.',
  'Sistem fiyatlarını kontrol edin — eski fiyat ile yeni fiyat karşılaştırılır.',
  'Değişim oranı çok yüksek olan ürünleri kontrol edin.',
  '"Excel\'e Aktar" butonuna tıklayın.',
  'İndirilen Excel\'i Shopify Admin → Ürünler → İçe Aktar bölümünden yükleyin.',
  '⚠️ Shopify\'a yüklemeden önce dosyayı kontrol edin!',
];

export default function UpdatedPrices() {
  const [userEmail, setUserEmail] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showHepsiGuide, setShowHepsiGuide] = useState(false);
  const [showTrendyolGuide, setShowTrendyolGuide] = useState(false);
  const [showWebsiteGuide, setShowWebsiteGuide] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(null); // { step, stepNum, totalSteps, detail }
  const queryClient = useQueryClient();

  useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => db.entities.Platform.list('-updated_date', 500),
  });

  const activePlatforms = platforms
    .filter(p => p.is_active !== false)
    .filter((p, idx, arr) => arr.findIndex(x => x.name === p.name) === idx);

  const { data: marketplaceProducts = [], refetch: refetchMarketplace } = useQuery({
    queryKey: ['marketplaceProducts', userEmail],
    queryFn: () => db.entities.MarketplaceProduct.filter({ created_by: userEmail }, '-updated_date', 10000),
    enabled: !!userEmail,
    staleTime: 0,
    cacheTime: 0
  });

  const { data: productPrices = [], refetch: refetchPrices } = useQuery({
    queryKey: ['productPrices'],
    queryFn: () => db.entities.ProductPrice.list('-updated_date', 5000),
    staleTime: 0,
    cacheTime: 0
  });

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.entities.Product.list('-updated_date', 5000),
    staleTime: 0,
    cacheTime: 0
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => db.entities.MarketplaceProduct.delete(id))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] }),
  });

  const handleRefresh = async () => {
    if (!userEmail) { toast.error('Kullanıcı bilgisi yüklenemedi'); return; }
    setRefreshProgress({ step: 'Pazaryeri ürünleri yükleniyor...', stepNum: 1, totalSteps: 3, detail: '' });
    try {
      const allMarketplace = await db.entities.MarketplaceProduct.filter({ created_by: userEmail }, '-updated_date', 20000);
      queryClient.setQueryData(['marketplaceProducts', userEmail], allMarketplace);

      setRefreshProgress({ step: 'Ürün fiyatları yükleniyor...', stepNum: 2, totalSteps: 3, detail: `${allMarketplace.length} pazaryeri ürünü yüklendi` });
      const allPrices = await db.entities.ProductPrice.list('-updated_date', 20000);
      queryClient.setQueryData(['productPrices'], allPrices);

      setRefreshProgress({ step: 'Ana ürünler yükleniyor...', stepNum: 3, totalSteps: 3, detail: `${allPrices.length} fiyat yüklendi` });
      const allProducts = await db.entities.Product.list('-updated_date', 10000);
      queryClient.setQueryData(['products'], allProducts);

      setRefreshProgress(null);
      toast.success(`Güncellendi: ${allMarketplace.length} pazaryeri ürünü, ${allPrices.length} sistem fiyatı`);
    } catch (error) {
      setRefreshProgress(null);
      toast.error('Güncelleme hatası: ' + error.message);
    }
  };

  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u');
  };

  const selectedPlatformObj = activePlatforms.find(p => p.name === selectedPlatform);
  const isWebsite = selectedPlatformObj?.platform_type === 'website';
  const isHepsiburada = selectedPlatformObj?.platform_type === 'hepsiburada';

  const updatedPrices = useMemo(() => {
    if (!selectedPlatform) return [];

    let result = marketplaceProducts
      .filter(m => m.status === 'matched')
      .filter(m => m.platform_account === selectedPlatform);

    result = result.map(m => {
      const product = products.find(p => p.id === m.matched_product_id);
      const platformObj = platforms.find(p => p.name === m.platform_account);
      // platform_id ile eşleştir, bulamazsa platform_name ile dene
      const price = productPrices.find(pp =>
        pp.product_id === product?.id &&
        (pp.platform_id === platformObj?.id || pp.platform_name === platformObj?.name)
      );

      const systemPrice = price?.sale_price || 0;
      const marketplacePrice = m.marketplace_sale_price || 0;
      const priceDiff = systemPrice - marketplacePrice;
      const priceChangePercent = marketplacePrice > 0 ? ((priceDiff / marketplacePrice) * 100) : 0;

      return {
        id: m.id,
        barkod: m.barkod,
        hb_sku: m.hb_sku || '',
        variant_sku: m.variant_sku || '',
        platform_product_name: m.platform_product_name,
        product_name: product?.name || '-',
        product_sku: product?.sku || '-',
        model_code: m.model_code || '',
        market_price: marketplacePrice,
        system_price: systemPrice,
        price_diff: priceDiff,
        price_change_percent: priceChangePercent,
        stock_quantity: m.stock_quantity || 0,
        platform: m.platform_account,
        updated: systemPrice > 0 && systemPrice !== marketplacePrice,
        raw_data: m.raw_data
      };
    });

    if (searchQuery.trim()) {
      const searchWords = searchQuery.trim().split(/\s+/).map(w => normalizeText(w)).filter(w => w.length > 0);
      result = result.filter(item => {
        const textToSearch = normalizeText(`${item.platform_product_name || ''} ${item.barkod || ''} ${item.hb_sku || ''} ${item.product_name || ''} ${item.product_sku || ''}`);
        return searchWords.every(word => textToSearch.includes(word));
      });
    }

    switch (sortBy) {
      case 'price': result.sort((a, b) => (a.system_price || 0) - (b.system_price || 0)); break;
      case 'price_desc': result.sort((a, b) => (b.system_price || 0) - (a.system_price || 0)); break;
      case 'change_percent_asc': result.sort((a, b) => Math.abs(a.price_change_percent) - Math.abs(b.price_change_percent)); break;
      case 'change_percent_desc': result.sort((a, b) => Math.abs(b.price_change_percent) - Math.abs(a.price_change_percent)); break;
      case 'change_amount_asc': result.sort((a, b) => Math.abs(a.price_diff) - Math.abs(b.price_diff)); break;
      case 'change_amount_desc': result.sort((a, b) => Math.abs(b.price_diff) - Math.abs(a.price_diff)); break;
      default: result.sort((a, b) => (a.platform_product_name || '').localeCompare(b.platform_product_name || ''));
    }
    return result;
  }, [marketplaceProducts, products, productPrices, sortBy, searchQuery, selectedPlatform, platforms]);

  const handleSelectRow = (id) => {
    const newSet = new Set(selectedRows);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedRows(newSet);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === updatedPrices.length && updatedPrices.length > 0) setSelectedRows(new Set());
    else setSelectedRows(new Set(updatedPrices.map(p => p.id)));
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

  const handleExcelDownload = async () => {
    if (!selectedPlatform) { toast.error('Lütfen önce platform seçin'); return; }
    if (updatedPrices.length === 0) { toast.error('İndirilecek güncellenen fiyat yok'); return; }

    let exportData;
    let wb = XLSX.utils.book_new();

    if (isWebsite) {
      const adapter = getAdapter(selectedPlatformObj);
      if (!adapter) { toast.error('Platform adapterı bulunamadı'); return; }

      // Orijinal dosyayı Settings'ten bul
      const settingKey = `original_file_url_${selectedPlatform.replace(/\s+/g, '_')}`;
      // Geriye dönük uyumluluk: eski key de dene
      const settingKeyOld = `original_csv_url_${selectedPlatform.replace(/\s+/g, '_')}`;
      const settings = await db.entities.Settings.filter({ setting_key: settingKey });
      const settingsOld = settings.length === 0 ? await db.entities.Settings.filter({ setting_key: settingKeyOld }) : [];
      const fileRecord = settings[0] || settingsOld[0];

      if (!fileRecord?.setting_value) {
        toast.error('Orijinal dosya bulunamadı. Pazaryeri Ürünleri sayfasından dosyayı tekrar yükleyin.');
        return;
      }

      // priceMap: adaptöre özel anahtar → sistem fiyatı (çakışma riski yok)
      const priceMap = {};
      const mapKey = adapter.priceMapKey || 'variant_sku';
      for (const up of updatedPrices) {
        const key = mapKey === 'barkod' ? up.barkod : up.variant_sku;
        if (key) priceMap[key] = up.system_price;
      }

      const result = await adapter.exportFile(fileRecord.setting_value, priceMap);
      if (!result) { toast.error('Export hatası'); return; }

      downloadFile({
        ...result,
        filename: `${selectedPlatform.replace(/\s+/g, '_')}_guncellenmis_fiyatlar.${result.ext}`
      });

    } else if (isHepsiburada) {
      // Açıklamalar sekmesi — boş, sadece başlık satırı
      const wsAciklamalar = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, wsAciklamalar, 'Açıklamalar');

      // Listelerim sekmesi — 1. satır başlıklar, 2. satırdan veriler
      const headers = [['SKU', 'Satıcı Stok Kodu', 'Fiyat']];
      const rows = updatedPrices.map(p => [
        p.hb_sku || '',
        p.model_code || p.variant_sku || '',
        p.system_price
      ]);
      const wsListelerim = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, wsListelerim, 'Listelerim');

      XLSX.writeFile(wb, `${selectedPlatform.replace(/\s+/g, '_')}_guncellenmis_fiyatlar.xlsx`);

    } else {
      // Trendyol
      exportData = updatedPrices.map(p => ({
        'Barkod': p.barkod,
        'Piyasa Satış Fiyatı (KDV Dahil)': p.system_price,
        'Trendyol\'da Satılacak Fiyat (KDV Dahil)': p.system_price,
        'Ürün Stok Adedi': p.stock_quantity || 0
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Fiyatlar');
      XLSX.writeFile(wb, `${selectedPlatform.replace(/\s+/g, '_')}_guncellenmis_fiyatlar.xlsx`);
    }

    toast.success('Excel indirildi');
  };

  const changeOranCell = (row) => (
    <TableCell className="text-sm">
      <span className={`font-medium ${row.price_change_percent > 0 ? 'text-green-600' : row.price_change_percent < 0 ? 'text-red-600' : 'text-gray-600'}`}>
        {row.price_change_percent > 0 ? '+' : ''}{row.price_change_percent?.toFixed(2)}%
      </span>
    </TableCell>
  );

  const changeTutarCell = (row) => (
    <TableCell className="text-sm">
      <span className={`font-medium ${row.price_diff > 0 ? 'text-green-600' : row.price_diff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
        {row.price_diff > 0 ? '+' : ''}₺{row.price_diff?.toFixed(2)}
      </span>
    </TableCell>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Düzenlenen Fiyatlar</h1>
          <p className="text-gray-600">Sistemde güncellenen fiyatları görüntüleyin ve indirin</p>
        </div>

        {/* HepsiBurada Kılavuz */}
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 overflow-hidden">
          <button onClick={() => setShowHepsiGuide(!showHepsiGuide)} className="w-full flex items-center justify-between px-5 py-3 text-left">
            <span className="font-semibold text-orange-800 text-sm">📦 HepsiBurada — Fiyat Güncelleme Nasıl Yapılır?</span>
            {showHepsiGuide ? <ChevronUp className="w-4 h-4 text-orange-600" /> : <ChevronDown className="w-4 h-4 text-orange-600" />}
          </button>
          {showHepsiGuide && (
            <div className="px-5 pb-4 border-t border-orange-200">
              <ol className="mt-3 space-y-1.5">
                {HEPSIBURADA_FIYAT_ADIMLARI.map((adim, i) => (
                  <li key={i} className="text-sm flex gap-2 text-orange-900">
                    <span className="font-bold text-orange-600 shrink-0">{i + 1}.</span>
                    <span>{adim}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Trendyol Kılavuz */}
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 overflow-hidden">
          <button onClick={() => setShowTrendyolGuide(!showTrendyolGuide)} className="w-full flex items-center justify-between px-5 py-3 text-left">
            <span className="font-semibold text-amber-800 text-sm">🛒 Trendyol — Fiyat Güncelleme Nasıl Yapılır?</span>
            {showTrendyolGuide ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
          </button>
          {showTrendyolGuide && (
            <div className="px-5 pb-4 border-t border-amber-200">
              <ol className="mt-3 space-y-1.5">
                {TRENDYOL_FIYAT_ADIMLARI.map((adim, i) => (
                  <li key={i} className="text-sm flex gap-2 text-amber-900">
                    <span className="font-bold text-amber-600 shrink-0">{i + 1}.</span>
                    <span>{adim}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* ✅ Web Sitesi Kılavuz */}
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden">
          <button onClick={() => setShowWebsiteGuide(!showWebsiteGuide)} className="w-full flex items-center justify-between px-5 py-3 text-left">
            <span className="font-semibold text-indigo-800 text-sm">🌐 Web Sitesi — Fiyat Güncelleme Nasıl Yapılır?</span>
            {showWebsiteGuide ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
          </button>
          {showWebsiteGuide && (
            <div className="px-5 pb-4 border-t border-indigo-200">
              <ol className="mt-3 space-y-1.5">
                {WEBSITE_FIYAT_ADIMLARI.map((adim, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${adim.startsWith('⚠️') ? 'text-red-700 font-medium' : 'text-indigo-900'}`}>
                    {!adim.startsWith('⚠️') && <span className="font-bold text-indigo-600 shrink-0">{i + 1}.</span>}
                    <span>{adim}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Platform & Kontroller */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:gap-2 md:items-end">
            <div className="flex-1">
              <Label className="text-sm mb-2 block font-semibold">Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue placeholder="Platform Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {activePlatforms.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 max-w-md">
              <Input placeholder="Ürün, barkod veya SKU ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full" />
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />Güncelle
            </Button>
            {selectedPlatform && (
              <Button onClick={handleExcelDownload} disabled={updatedPrices.length === 0} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />Excel'e Aktar
              </Button>
            )}
          </div>
        </div>

        {!selectedPlatform && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500">Ürünleri görüntülemek için lütfen platform seçin</p>
          </div>
        )}

        {selectedPlatform && updatedPrices.length > 0 && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-900">Toplam: {updatedPrices.length} ürün</span>
                {selectedRows.size > 0 && <span className="text-sm text-gray-600">{selectedRows.size} seçildi</span>}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Sırala:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Ürün Adı (A-Z)</SelectItem>
                    <SelectItem value="price">Fiyata (Düşükten Yükseğe)</SelectItem>
                    <SelectItem value="price_desc">Fiyata (Yüksekten Düşüğe)</SelectItem>
                    <SelectItem value="change_percent_asc">Değişim Oranı (Düşükten Yükseğe)</SelectItem>
                    <SelectItem value="change_percent_desc">Değişim Oranı (Yüksekten Düşüğe)</SelectItem>
                    <SelectItem value="change_amount_asc">Değişim Tutarı (Düşükten Yükseğe)</SelectItem>
                    <SelectItem value="change_amount_desc">Değişim Tutarı (Yüksekten Düşüğe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedRows.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />Seçilenleri Sil ({selectedRows.size})
                </Button>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox checked={selectedRows.size === updatedPrices.length && updatedPrices.length > 0} onCheckedChange={handleSelectAll} />
                    </TableHead>
                    {isWebsite && <>
                      <TableHead>Platform Ürün Adı</TableHead>
                      <TableHead>Sistem Ürünü</TableHead>
                      <TableHead>Eski Fiyat</TableHead>
                      <TableHead>Yeni Fiyat (Sistem)</TableHead>
                      <TableHead>Değişim Oranı</TableHead>
                      <TableHead>Değişim Tutarı</TableHead>
                    </>}
                    {isHepsiburada && <>
                      <TableHead>SKU</TableHead>
                      <TableHead>Ürün Adı</TableHead>
                      <TableHead>Eski Fiyat</TableHead>
                      <TableHead>Yeni Fiyat</TableHead>
                      <TableHead>Değişim Oranı</TableHead>
                      <TableHead>Değişim Tutarı</TableHead>
                      <TableHead>Stok</TableHead>
                    </>}
                    {!isHepsiburada && !isWebsite && <>
                      <TableHead>Barkod</TableHead>
                      <TableHead>Ürün Adı</TableHead>
                      <TableHead>Eski Fiyat</TableHead>
                      <TableHead>Yeni Fiyat</TableHead>
                      <TableHead>Değişim Oranı</TableHead>
                      <TableHead>Değişim Tutarı</TableHead>
                      <TableHead>Stok</TableHead>
                    </>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {updatedPrices.map((row) => (
                    <TableRow key={row.id} className={selectedRows.has(row.id) ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <Checkbox checked={selectedRows.has(row.id)} onCheckedChange={() => handleSelectRow(row.id)} />
                      </TableCell>
                      {isWebsite && <>
                        <TableCell className="text-sm">
                          <p className="font-medium">{row.platform_product_name}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          <p>{row.product_name}</p>
                          <p className="text-xs text-gray-400">{row.product_sku}</p>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-500">₺{row.market_price?.toFixed(2)}</TableCell>
                        <TableCell className="text-sm font-bold text-green-700">₺{row.system_price?.toFixed(2)}</TableCell>
                        {changeOranCell(row)}
                        {changeTutarCell(row)}
                      </>}
                      {isHepsiburada && <>
                        <TableCell className="text-sm">{row.hb_sku || ''}</TableCell>
                        <TableCell className="text-sm">{row.platform_product_name}</TableCell>
                        <TableCell className="text-sm font-medium text-gray-500">₺{row.market_price?.toFixed(2)}</TableCell>
                        <TableCell className="text-sm font-bold text-green-700">₺{row.system_price?.toFixed(2)}</TableCell>
                        {changeOranCell(row)}
                        {changeTutarCell(row)}
                        <TableCell className="text-sm">{row.stock_quantity || 0}</TableCell>
                      </>}
                      {!isHepsiburada && !isWebsite && <>
                        <TableCell className="text-sm">{row.barkod}</TableCell>
                        <TableCell className="text-sm">{row.platform_product_name}</TableCell>
                        <TableCell className="text-sm font-medium text-gray-500">₺{row.market_price?.toFixed(2)}</TableCell>
                        <TableCell className="text-sm font-bold text-green-700">₺{row.system_price?.toFixed(2)}</TableCell>
                        {changeOranCell(row)}
                        {changeTutarCell(row)}
                        <TableCell className="text-sm">{row.stock_quantity || 0}</TableCell>
                      </>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {selectedPlatform && updatedPrices.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500">Bu platform için eşleştirilmiş ürün bulunamadı</p>
            <p className="text-xs text-gray-400 mt-2">Pazaryeri Ürünleri sayfasında ürünleri eşleştirin, sonra "Ürünleri Güncelle" butonuna basın</p>
          </div>
        )}

        {/* Güncelleme İlerleme Popup */}
        {refreshProgress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Veriler Güncelleniyor</h3>
              <p className="text-sm text-blue-600 font-medium mb-1">{refreshProgress.step}</p>
              {refreshProgress.detail && <p className="text-xs text-gray-500 mb-4">{refreshProgress.detail}</p>}
              {!refreshProgress.detail && <p className="text-xs text-gray-400 mb-4">Lütfen bekleyin...</p>}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Adım {refreshProgress.stepNum} / {refreshProgress.totalSteps}</span>
                  <span>%{Math.round((refreshProgress.stepNum / refreshProgress.totalSteps) * 100)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(refreshProgress.stepNum / refreshProgress.totalSteps) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">Tüm veriler yüklenene kadar bekleyin, kapatmayın</p>
            </div>
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ürünleri Sil</AlertDialogTitle>
              <AlertDialogDescription>{selectedRows.size} ürün kalıcı olarak silinecek. Bu işlem geri alınamaz.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
