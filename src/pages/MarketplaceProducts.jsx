import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/api/db';
import { getAdapter, getCombinedName } from '@/lib/platformAdapters';
import { findBestMatch, findTopMatches, MIN_AUTO_SCORE } from '@/lib/matchingEngine';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, X, Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import StockSyncModal from '@/components/marketplace/StockSyncModal';
import UploadSummaryModal from '@/components/marketplace/UploadSummaryModal';
import MissingProductsModal from '@/components/marketplace/MissingProductsModal';

const HEPSIBURADA_YUKLE_ADIMLARI = [
  'HepsiBurada paneline girin.',
  'Üst menüden "Ürünler" butonuna tıklayın.',
  '"Envanter" seçeneğine girin.',
  '"Tümü" veya "Satışta" olarak ürünleri listeleyin.',
  '"İndir" butonuna basın.',
  'Açılan pencerede "Satış Bilgisi Listeleri" → "Satıştaki Ürünler" butonuna tıklayın.',
  'Excel oluşturulduktan sonra "İndirme Geçmişi" butonuna tıklayın.',
  'En üstteki oluşturulan Excel için "İndir" butonuna basın.',
  'İndirilen Excel\'i bu sayfada HepsiBurada platformunu seçip "Excel Yükle" butonuyla yükleyin.',
  'Ürünler yüklendikten sonra sistemizdeki master ürünlerle eşleştirin.',
  '⚠️ Otomatik eşleştirme yaparsanız mutlaka kontrol edin!',
];

const TRENDYOL_YUKLE_ADIMLARI = [
  'Trendyol Satıcı Paneline girin.',
  'Üst menüden "Ürün" butonuna tıklayın.',
  'Açılan dropdown\'dan "Ürün Listesi" seçeneğine tıklayın.',
  '"Tüm Ürünler" veya "Aktif Ürünler" seçeneğini seçin.',
  'Sağ tarafta bulunan "Excel ile İndir" butonuna tıklayın.',
  '"İndirme Geçmişim" bölümünde oluşturulan son Excel\'i indirin.',
  'İndirilen Excel\'i bu sayfada Trendyol platformunu seçip "Excel Yükle" butonuyla yükleyin.',
  'Ürünler yüklendikten sonra sistemizdeki master ürünlerle eşleştirin.',
  '⚠️ Otomatik eşleştirme yaparsanız mutlaka kontrol edin!',
];

const WEBSITE_YUKLE_ADIMLARI = [
  'Shopify Admin paneline girin.',
  'Sol menüden "Ürünler" → "Tüm Ürünler" seçeneğine tıklayın.',
  'Sağ üstteki "Dışa Aktar" butonuna tıklayın.',
  '"Tüm ürünler" seçeneğini seçip CSV formatında indirin.',
  'İndirilen dosyayı bu sayfada Web Sitesi platformunu seçip "Excel Yükle" butonuyla yükleyin.',
  'Ürünler yüklendikten sonra "Otomatik Eşleştir" butonuna basın.',
  '⚠️ Otomatik eşleştirme yaparsanız mutlaka kontrol edin!',
];

export default function MarketplaceProducts() {
  const [userEmail, setUserEmail] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [activeSearchRow, setActiveSearchRow] = useState(null);
  const [searchCriteria, setSearchCriteria] = useState('name');
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const [showHepsiGuide, setShowHepsiGuide] = useState(false);
  const [showTrendyolGuide, setShowTrendyolGuide] = useState(false);
  const [showWebsiteGuide, setShowWebsiteGuide] = useState(false);
  const [progressPopup, setProgressPopup] = useState(null); // { title, current, total, currentItemName }
  const [stockSyncItems, setStockSyncItems] = useState(null); // null | [{id, ...}]
  const [uploadSummary, setUploadSummary] = useState(null); // null | { newCount, updateCount, zeroStockCount, stockChangedCount, platform }
  const [missingItems, setMissingItems] = useState(null); // null | [{id, barkod, platform_product_name, ...}]
  const [showMissingModal, setShowMissingModal] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  const { data: marketplaceProducts = [] } = useQuery({
    queryKey: ['marketplaceProducts', userEmail],
    queryFn: () => db.entities.MarketplaceProduct.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.entities.Product.list(),
  });

  const { data: productPrices = [] } = useQuery({
    queryKey: ['productPrices'],
    queryFn: () => db.entities.ProductPrice.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.MarketplaceProduct.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.functions.invoke('updateMarketplaceProduct', { id, data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      const failed = [];
      let successCount = 0;
      setProgressPopup({ title: 'Ürünler Siliniyor', current: 0, total: ids.length, currentItemName: '' });
      let done = 0;
      const CHUNK = 10;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const results = await Promise.allSettled(chunk.map(id => db.entities.MarketplaceProduct.delete(id)));
        results.forEach((res, idx) => {
          const id = chunk[idx];
          const mp = marketplaceProducts.find(m => m.id === id);
          done++;
          if (res.status === 'fulfilled') {
            successCount++;
          } else {
            failed.push(mp?.platform_product_name || id);
          }
          setProgressPopup(prev => prev ? { ...prev, current: done, currentItemName: mp?.platform_product_name || '' } : null);
        });
        if (i + CHUNK < ids.length) await new Promise(r => setTimeout(r, 400));
      }
      setProgressPopup(null);
      return { successCount, failed };
    },
    onSuccess: ({ successCount, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] });
      if (failed.length === 0) {
        toast.success(`${successCount} ürün başarıyla silindi`);
      } else {
        toast.success(`${successCount} ürün silindi`);
        toast.error(`${failed.length} ürün silinemedi: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}`);
      }
    },
    onError: (err) => { setProgressPopup(null); toast.error('Silme hatası: ' + err.message); },
  });

  // ─── Duplicate kontrol yardımcıları ─────────────────────────────────────────

  // Değeri normalize et: trim, çift boşluk → tek, küçük harf
  const normVal = (v) => {
    if (v === null || v === undefined || v === '') return null;
    return String(v).trim().replace(/\s+/g, ' ').toLowerCase();
  };

  // İki normalize değeri karşılaştır; biri null ise eşleşme sayılmaz
  const normEq = (a, b) => {
    const na = normVal(a); const nb = normVal(b);
    return na !== null && nb !== null && na === nb;
  };

  // Trendyol duplicate: Barkod + Model Kodu + Marka + Kategori — en az 3/4 eşleşmeli
  const isTrendyolDuplicate = (excelRow, existing) => {
    let matches = 0;
    if (normEq(excelRow.barkod, existing.barkod)) matches++;
    if (normEq(excelRow.model_code, existing.model_code)) matches++;
    if (normEq(excelRow.brand, existing.brand)) matches++;
    if (normEq(excelRow.category, existing.category)) matches++;
    return matches >= 3;
  };

  // HepsiBurada duplicate: Satıcı Stok Kodu + SKU + Alt Kategori + Ana Kategori + Temel Kategori + Marka — en az 5/6 eşleşmeli
  const isHepsiDuplicate = (excelRow, existing) => {
    let matches = 0;
    if (normEq(excelRow.model_code, existing.model_code)) matches++;         // Satıcı Stok Kodu
    if (normEq(excelRow.hb_sku, existing.hb_sku)) matches++;                 // HB SKU
    if (normEq(excelRow.category, existing.category)) matches++;             // kategori (birleşik)
    if (normEq(excelRow.brand, existing.brand)) matches++;                   // marka
    if (normEq(excelRow.barkod, existing.barkod)) matches++;                 // barkod
    if (normEq(excelRow.platform_product_name, existing.platform_product_name)) matches++; // ürün adı
    return matches >= 5;
  };

  // Website duplicate: ürün adı aynı VE (SKU / Barkod / Model Kodu'ndan en az biri aynı)
  const isWebsiteDuplicate = (excelRow, existing) => {
    if (!normEq(excelRow.platform_product_name, existing.platform_product_name)) return false;
    return (
      normEq(excelRow.variant_sku, existing.variant_sku) ||
      normEq(excelRow.barkod, existing.barkod) ||
      normEq(excelRow.model_code, existing.model_code)
    );
  };

  const handleFileUpload = async (e) => {
    if (!selectedPlatform) { toast.error('Platform seçiniz'); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Service role ile platform'a ait TÜM kayıtları çek (RLS bypass)
      const res = await db.functions.invoke('getMarketplaceProductsByPlatform', { platform_account: selectedPlatform });
      const freshMarketplaceProducts = res.data?.products || [];

      const selectedPlatformObj = activePlatforms.find(p => p.name === selectedPlatform);
      const isHepsiburada = selectedPlatformObj?.platform_type === 'hepsiburada';
      const isWebsite = selectedPlatformObj?.platform_type === 'website';
      const adapter = getAdapter(selectedPlatformObj);

      let data = [];

      // ─── WEBSITE ────────────────────────────────────────────────────────────
      if (isWebsite && adapter) {
        const parsedItems = await adapter.parseFile(file);
        data = parsedItems;

        // Orijinal dosyayı sakla
        const fileToUpload = new File([await file.arrayBuffer()], `original_${selectedPlatform.replace(/\s+/g, '_')}.${adapter.fileType}`, { type: file.type });
        const { file_url } = await db.integrations.Core.UploadFile({ file: fileToUpload });
        const settingKey = `original_file_url_${selectedPlatform.replace(/\s+/g, '_')}`;
        const existingSettings = await db.entities.Settings.filter({ setting_key: settingKey });
        if (existingSettings.length > 0) {
          await db.entities.Settings.update(existingSettings[0].id, { setting_value: file_url });
        } else {
          await db.entities.Settings.create({ setting_key: settingKey, setting_value: file_url, description: `Orijinal dosya - ${selectedPlatform}` });
        }

        let newCount = 0, stockUpdatedCount = 0, excelDupCount = 0;
        const seenWebsiteKeys = new Set(); // Excel içi duplicate takibi
        setProgressPopup({ title: 'Ürünler Yükleniyor', current: 0, total: data.length, currentItemName: '' });

        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          const combinedName = getCombinedName(item);
          setProgressPopup(prev => prev ? { ...prev, current: i + 1, currentItemName: combinedName } : null);
          if (!item.product_name) continue;

          // Excel içi duplicate anahtarı
          const excelKey = `${normVal(combinedName)}|||${normVal(item.sku)}|||${normVal(item.barcode)}`;
          if (seenWebsiteKeys.has(excelKey)) { excelDupCount++; continue; }
          seenWebsiteKeys.add(excelKey);

          const excelRowNorm = {
            platform_product_name: combinedName,
            variant_sku: item.sku,
            barkod: item.barcode || item.sku,
            model_code: item.sku,
          };

          const existing = freshMarketplaceProducts.find(m => isWebsiteDuplicate(excelRowNorm, m));

          if (existing) {
            // Mevcut ürün: fiyatı güncelle (website CSV'de stok yok, 0 kalır — eşleşme korunur)
            await db.functions.invoke('updateMarketplaceProduct', { id: existing.id, data: { stock_quantity: 0, marketplace_sale_price: item.price } });
            stockUpdatedCount++;
          } else {
            await createMutation.mutateAsync({
              platform_account: selectedPlatform,
              barkod: item.barcode || item.sku || combinedName,
              variant_sku: item.sku,
              model_code: item.sku,
              platform_product_name: combinedName,
              variant_title: item.variant_title,
              marketplace_sale_price: item.price,
              stock_quantity: 0,
              raw_data: JSON.stringify(item.raw),
              shopify_data: JSON.stringify(item.raw),
              shipping_type: '',
              status: 'not_matched',
              matched_product_id: null,
            });
            newCount++;
          }
        }

        setProgressPopup(null);
        e.target.value = '';
        setUploading(false);
        setUploadSummary({ newCount, updateCount: stockUpdatedCount, websiteStockUpdated: stockUpdatedCount, excelDupCount, zeroStockCount: 0, platform: selectedPlatform });
        if (excelDupCount > 0) toast.warning(`⚠️ Excel içinde ${excelDupCount} duplicate satır tespit edildi ve atlandı.`);
        return;
      }

      // ─── TRENDYOL / HEPSİBURADA ─────────────────────────────────────────────
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheetIndex = isHepsiburada ? 1 : 0;
      const worksheet = workbook.Sheets[workbook.SheetNames[sheetIndex]];
      data = XLSX.utils.sheet_to_json(worksheet);

      let newCount = 0;
      let trendyolStockUpdated = 0;
      let hepsiSkipped = 0;
      let excelDupCount = 0;
      let stockChangedCount = 0;
      const excelStockMap = {};
      const seenExcelKeys = new Set(); // Excel içi duplicate takibi

      setProgressPopup({ title: 'Ürünler Yükleniyor', current: 0, total: data.length, currentItemName: '' });

      for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        const itemLabel = row['Barkod'] || row['SKU'] || '-';
        setProgressPopup(prev => prev ? { ...prev, current: rowIdx + 1, currentItemName: itemLabel } : null);

        // Stok değerini çıkar (ortak)
        const extractStock = (r) => {
          let stockValue = null;
          for (const col of ['Ürün Stok Adedi', 'Stok Adedi', 'Stok']) {
            if (r[col] !== undefined && r[col] !== null && r[col] !== '') { stockValue = r[col]; break; }
          }
          if (stockValue === null) {
            for (const key of Object.keys(r)) {
              if (key.toLowerCase().trim().includes('stok')) { stockValue = r[key]; break; }
            }
          }
          if (stockValue === null || stockValue === undefined || stockValue === '') return 0;
          const parsed = parseFloat(String(stockValue).replace(',', '.'));
          return isNaN(parsed) ? 0 : parsed;
        };

        if (isHepsiburada) {
          const hbSku = String(row['SKU'] || '').trim();
          const barkod = row['Barkod'] || row['SKU'] || row['Satıcı Stok Kodu'] || hbSku;
          if (!barkod) continue;

          const barkodStr = String(barkod).trim();
          const hbSkuStr = String(hbSku || '').trim();
          const stockQuantity = extractStock(row);

          const hepsiCategory = row['En Alt Kategori'] || row['Ana Kategori'] || row['Kategori İsmi'] || row['Kategori'] || row['Kategori Adı'] || row['Kategori Adi'] || row['Ürün Kategorisi'] ||
            Object.entries(row).find(([k]) => k.toLowerCase().includes('kategori'))?.[1] || '';

          const excelRowNorm = {
            barkod: barkodStr,
            hb_sku: hbSkuStr,
            model_code: String(row['Satıcı Stok Kodu'] || '').trim(),
            brand: String(row['Marka'] || '').trim(),
            category: String(hepsiCategory || '').trim(),
            platform_product_name: String(row['Ürün Adı'] || '').trim(),
          };

          // Excel içi duplicate key
          const excelKey = `${excelRowNorm.barkod}|||${excelRowNorm.hb_sku}|||${excelRowNorm.model_code}`;
          if (seenExcelKeys.has(excelKey)) { excelDupCount++; continue; }
          seenExcelKeys.add(excelKey);

          excelStockMap[barkodStr] = stockQuantity;
          if (hbSkuStr) excelStockMap[hbSkuStr] = stockQuantity;

          const existing = freshMarketplaceProducts.find(m => isHepsiDuplicate(excelRowNorm, m));

          if (existing) {
            // Hepsiburada: mevcut ürünün fiyat ve stoğunu güncelle
            await db.functions.invoke('updateMarketplaceProduct', { id: existing.id, data: { stock_quantity: stockQuantity, marketplace_sale_price: parseFloat(row['Fiyat'] || 0) } });
            hepsiSkipped++;
          } else {
            await db.entities.MarketplaceProduct.create({
              platform_account: selectedPlatform, barkod,
              hb_sku: hbSku,
              model_code: row['Satıcı Stok Kodu'] || '',
              variant_sku: row['Merchant Sku'] || row['Satıcı Stok Kodu'] || '',
              brand: row['Marka'] || '',
              category: hepsiCategory,
              platform_product_name: row['Ürün Adı'] || '',
              marketplace_sale_price: parseFloat(row['Fiyat'] || 0),
              stock_quantity: stockQuantity,
              shipping_type: row['Teslimat Profili'] || '',
              status: 'not_matched',
              matched_product_id: null,
            });
            newCount++;
          }

        } else {
          // Trendyol
          const barkod = row['Barkod'];
          if (!barkod) continue;

          const barkodStr = String(barkod).trim();
          const stockQuantity = extractStock(row);
          const newPrice = parseFloat(row['Trendyol\'da Satılacak Fiyat (KDV Dahil)'] || row['Piyasa Satış Fiyatı (KDV Dahil)'] || row['Pazaryerinde Satılacak Fiyat (KDV Dahil)'] || 0);
          const categoryVal = row['En Alt Kategori'] || row['Ana Kategori'] || row['Kategori'] || row['Kategori İsmi'] || '';

          const excelRowNorm = {
            barkod: barkodStr,
            model_code: String(row['Model Kodu'] || '').trim(),
            brand: String(row['Marka'] || '').trim(),
            category: String(categoryVal || '').trim(),
          };

          // Excel içi duplicate key
          const excelKey = `${excelRowNorm.barkod}|||${excelRowNorm.model_code}`;
          if (seenExcelKeys.has(excelKey)) { excelDupCount++; continue; }
          seenExcelKeys.add(excelKey);

          excelStockMap[barkodStr] = stockQuantity;

          const existing = freshMarketplaceProducts.find(m => isTrendyolDuplicate(excelRowNorm, m));

          if (existing) {
            // Trendyol: mevcut ürünün stok ve fiyatını güncelle, eşleşme korunur
            if (existing.stock_quantity !== stockQuantity) stockChangedCount++;
            await db.functions.invoke('updateMarketplaceProduct', { id: existing.id, data: { stock_quantity: stockQuantity, marketplace_sale_price: newPrice } });
            trendyolStockUpdated++;
          } else {
            await db.entities.MarketplaceProduct.create({
              platform_account: selectedPlatform, barkod,
              model_code: row['Model Kodu'] || '',
              variant_sku: row['Stok Kodu'] || '',
              brand: row['Marka'] || '',
              category: categoryVal,
              platform_product_name: row['Ürün Adı'] || '',
              marketplace_sale_price: newPrice,
              stock_quantity: stockQuantity,
              shipping_type: row['Sevkiyat Tipi'] || 'Bugün Kargoda',
              status: 'not_matched',
              matched_product_id: null,
            });
            newCount++;
          }
        }
      }

      // Excel'de olmayan ürünleri tespit et
      const missingFromExcel = freshMarketplaceProducts.filter(mp => {
        if (mp.platform_account !== selectedPlatform) return false;
        const mpBarkod = String(mp.barkod || '').trim();
        const mpHbSku = String(mp.hb_sku || '').trim();
        if (!mpBarkod && !mpHbSku) return false;
        return !(mpBarkod in excelStockMap) && !(mpHbSku && mpHbSku in excelStockMap);
      });

      const zeroStockCandidates = freshMarketplaceProducts.filter(mp => {
        if (mp.platform_account !== selectedPlatform) return false;
        if (mp.status !== 'matched') return false;
        const mpBarkod = String(mp.barkod || '').trim();
        const mpHbSku = String(mp.hb_sku || '').trim();
        const key = (mpBarkod in excelStockMap) ? mpBarkod : (mpHbSku in excelStockMap) ? mpHbSku : null;
        return key !== null && excelStockMap[key] === 0;
      });

      setProgressPopup(null);
      e.target.value = '';
      queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] });
      setMissingItems(missingFromExcel);
      setUploadSummary({
        newCount,
        updateCount: trendyolStockUpdated,
        trendyolStockUpdated,
        hepsiSkipped,
        excelDupCount,
        zeroStockCount: zeroStockCandidates.length,
        stockChangedCount,
        missingCount: missingFromExcel.length,
        platform: selectedPlatform
      });
      if (zeroStockCandidates.length > 0) setStockSyncItems(zeroStockCandidates);
      if (excelDupCount > 0) toast.warning(`⚠️ Excel içinde ${excelDupCount} duplicate satır tespit edildi ve atlandı.`);

    } catch (error) {
      setProgressPopup(null);
      toast.error('Dosya yükleme hatası: ' + error.message);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const autoCleanUpdatedPrices = async (barcodes, platform) => {
    try {
      const toCheck = marketplaceProducts.filter(mp => barcodes.includes(mp.barkod) && mp.platform_account === platform && mp.status === 'matched');
      const idsToDelete = [];
      for (const mp of toCheck) {
        const product = products.find(p => p.id === mp.matched_product_id);
        if (!product) continue;
        const mpPlatformObj = platforms.find(p => p.name === mp.platform_account);
        const platformCode = mpPlatformObj?.platform_type || '';
        const price = productPrices.find(pp => pp.product_id === product.id && pp.platform_name.toLowerCase() === platformCode);
        if (price && mp.marketplace_sale_price === price.sale_price) idsToDelete.push(mp.id);
      }
      if (idsToDelete.length > 0) {
        await Promise.all(idsToDelete.map(id => db.entities.MarketplaceProduct.delete(id)));
        queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] });
        toast.success(`${idsToDelete.length} güncellenmiş ürün temizlendi`);
      }
    } catch (error) {
      console.error('Otomatik temizleme hatası:', error);
    }
  };

  const handleMatchProduct = async (marketplaceId, productId) => {
    setMatching(marketplaceId);
    try {
      await updateMutation.mutateAsync({ id: marketplaceId, data: { matched_product_id: productId, status: 'matched' } });
      toast.success('Ürün eşleştirildi');
    } finally {
      setMatching(null);
    }
  };

  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u');
  };

  const matchesSearch = (product, searchText) => {
    if (!searchText.trim()) return true;
    const searchWords = searchText.trim().split(/\s+/).map(word => normalizeText(word)).filter(word => word.length > 0);
    if (searchWords.length === 0) return true;
    const productText = normalizeText(`${product.name || ''} ${product.sku || ''}`);
    return searchWords.every(word => productText.includes(word));
  };

  const getAutoSuggestion = (row) => {
    const { product, score } = findBestMatch(row, products);
    return product && score >= MIN_AUTO_SCORE ? product : null;
  };

  const getTopSuggestions = (row) => {
    return findTopMatches(row, products, 3);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = normalizeText(searchQuery.trim());
    return products.filter(p => {
      if (searchCriteria === 'sku') return normalizeText(p.sku || '').includes(q);
      else if (searchCriteria === 'barcode') return normalizeText(p.sku || '').includes(q) || normalizeText(p.name || '').includes(q);
      return matchesSearch(p, searchQuery);
    });
  }, [searchQuery, products, searchCriteria]);

  useEffect(() => {
    if (activeSearchRow && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const dropdownWidth = 500;
      setDropdownPosition({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - dropdownWidth, width: dropdownWidth });
    } else {
      setDropdownPosition(null);
    }
  }, [activeSearchRow]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveSearchRow(null); setSearchQuery('');
      }
    };
    if (activeSearchRow) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeSearchRow]);

  const [sortBy, setSortBy] = useState('name');

  const filtered = useMemo(() => {
    let result = marketplaceProducts;
    if (selectedPlatform) result = result.filter(m => m.platform_account === selectedPlatform);
    if (filterStatus === 'matched') result = result.filter(m => m.status === 'matched');
    else if (filterStatus === 'not_matched') result = result.filter(m => m.status === 'not_matched');
    if (tableSearchQuery.trim()) {
      const searchWords = tableSearchQuery.trim().split(/\s+/).map(w => normalizeText(w)).filter(w => w.length > 0);
      result = result.filter(m => {
        const matchedProduct = products.find(p => p.id === m.matched_product_id);
        const textToSearch = normalizeText(`${m.platform_product_name || ''} ${m.barkod || ''} ${m.model_code || ''} ${matchedProduct?.name || ''} ${matchedProduct?.sku || ''}`);
        return searchWords.every(word => textToSearch.includes(word));
      });
    }
    const sorted = [...result];
    switch (sortBy) {
      case 'price': sorted.sort((a, b) => (a.marketplace_sale_price || 0) - (b.marketplace_sale_price || 0)); break;
      case 'date': sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); break;
      default: sorted.sort((a, b) => (a.platform_product_name || '').localeCompare(b.platform_product_name || ''));
    }
    return sorted;
  }, [marketplaceProducts, selectedPlatform, sortBy, filterStatus, tableSearchQuery, products]);

  const handleSelectRow = (id) => {
    const newSet = new Set(selectedRows);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedRows(newSet);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filtered.length && filtered.length > 0) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map(p => p.id)));
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(Array.from(selectedRows));
    setSelectedRows(new Set());
    setDeleteDialogOpen(false);
  };

  const handleUnmatchSelected = async () => {
    const ids = Array.from(selectedRows);
    setProgressPopup({ title: 'Bağlar Kesiliyor', current: 0, total: ids.length, currentItemName: '' });
    let done = 0;
    for (const id of ids) {
      const mp = marketplaceProducts.find(m => m.id === id);
      try {
        await db.functions.invoke('updateMarketplaceProduct', { id, data: { matched_product_id: null, status: 'not_matched' } });
      } catch (e) {
        // Kayıt bulunamazsa atla
      }
      done++;
      setProgressPopup(prev => prev ? { ...prev, current: done, currentItemName: mp?.platform_product_name || '' } : null);
      await new Promise(r => setTimeout(r, 150));
    }
    setProgressPopup(null);
    queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] });
    toast.success('Bağlantılar kesildi');
    setSelectedRows(new Set());
  };

  const handleStockSyncDelete = async (ids) => {
    const CHUNK = 10;
    setProgressPopup({ title: 'Ürünler Siliniyor', current: 0, total: ids.length, currentItemName: '' });
    let done = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      await Promise.allSettled(chunk.map(id => db.entities.MarketplaceProduct.delete(id)));
      done += chunk.length;
      setProgressPopup(prev => prev ? { ...prev, current: done } : null);
      if (i + CHUNK < ids.length) await new Promise(r => setTimeout(r, 300));
    }
    setProgressPopup(null);
    setStockSyncItems(null);
    queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] });
    toast.success(`${ids.length} ürün silindi`);
  };

  const handleStockSyncPassive = async (ids) => {
    for (const id of ids) {
      await db.functions.invoke('updateMarketplaceProduct', { id, data: { stock_quantity: 0 } });
    }
    queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] });
    toast.success(`${ids.length} ürün pasife alındı (stok: 0)`);
  };

  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      let matchedCount = 0;
      const toMatch = filtered.filter(mp => mp.status !== 'matched');

      setProgressPopup({ title: 'Otomatik Eşleştirme', current: 0, total: toMatch.length, currentItemName: '' });

      for (let mpIdx = 0; mpIdx < toMatch.length; mpIdx++) {
        const mp = toMatch[mpIdx];
        setProgressPopup(prev => prev ? { ...prev, current: mpIdx + 1, currentItemName: mp.platform_product_name || '-' } : null);

        const { product: bestMatch, score: bestScore } = findBestMatch(mp, products);

        if (bestMatch && bestScore >= MIN_AUTO_SCORE) {
          await updateMutation.mutateAsync({ id: mp.id, data: { matched_product_id: bestMatch.id, status: 'matched' } });
          matchedCount++;
        }
        // Düşük skorlu eşleşmeler otomatik uygulanmaz — kullanıcıya bırakılır
      }
      return matchedCount;
    },
    onSuccess: (count) => {
      setProgressPopup(null);
      if (count > 0) toast.success(`${count} ürün yüksek güvenle eşleştirildi`);
      else toast.info('Yüksek güvenli otomatik eşleşme bulunamadı. Lütfen manuel eşleştirin.');
    },
    onError: (err) => { setProgressPopup(null); toast.error('Eşleştirme hatası: ' + err.message); }
  });

  const selectedPlatformObj = activePlatforms.find(p => p.name === selectedPlatform);
  const isSelectedWebsite = selectedPlatformObj?.platform_type === 'website';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pazaryeri Ürünleri</h1>
          <p className="text-gray-600">Pazaryeri ürünlerini sisteme yükleyin ve ana ürünlere bağlayın</p>
        </div>

        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 overflow-hidden">
          <button onClick={() => setShowHepsiGuide(!showHepsiGuide)} className="w-full flex items-center justify-between px-5 py-3 text-left">
            <span className="font-semibold text-orange-800 text-sm">📦 HepsiBurada — Ürün Listesi Nasıl Yüklenir?</span>
            {showHepsiGuide ? <ChevronUp className="w-4 h-4 text-orange-600" /> : <ChevronDown className="w-4 h-4 text-orange-600" />}
          </button>
          {showHepsiGuide && (
            <div className="px-5 pb-4 border-t border-orange-200">
              <ol className="mt-3 space-y-1.5">
                {HEPSIBURADA_YUKLE_ADIMLARI.map((adim, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${adim.startsWith('⚠️') ? 'text-red-700 font-medium' : 'text-orange-900'}`}>
                    {!adim.startsWith('⚠️') && <span className="font-bold text-orange-600 shrink-0">{i + 1}.</span>}
                    <span>{adim}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-orange-300 bg-amber-50 overflow-hidden">
          <button onClick={() => setShowTrendyolGuide(!showTrendyolGuide)} className="w-full flex items-center justify-between px-5 py-3 text-left">
            <span className="font-semibold text-amber-800 text-sm">🛒 Trendyol — Ürün Listesi Nasıl Yüklenir?</span>
            {showTrendyolGuide ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
          </button>
          {showTrendyolGuide && (
            <div className="px-5 pb-4 border-t border-amber-200">
              <ol className="mt-3 space-y-1.5">
                {TRENDYOL_YUKLE_ADIMLARI.map((adim, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${adim.startsWith('⚠️') ? 'text-red-700 font-medium' : 'text-amber-900'}`}>
                    {!adim.startsWith('⚠️') && <span className="font-bold text-amber-600 shrink-0">{i + 1}.</span>}
                    <span>{adim}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden">
          <button onClick={() => setShowWebsiteGuide(!showWebsiteGuide)} className="w-full flex items-center justify-between px-5 py-3 text-left">
            <span className="font-semibold text-indigo-800 text-sm">🌐 Web Sitesi (Shopify) — Ürün Listesi Nasıl Yüklenir?</span>
            {showWebsiteGuide ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
          </button>
          {showWebsiteGuide && (
            <div className="px-5 pb-4 border-t border-indigo-200">
              <ol className="mt-3 space-y-1.5">
                {WEBSITE_YUKLE_ADIMLARI.map((adim, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${adim.startsWith('⚠️') ? 'text-red-700 font-medium' : 'text-indigo-900'}`}>
                    {!adim.startsWith('⚠️') && <span className="font-bold text-indigo-600 shrink-0">{i + 1}.</span>}
                    <span>{adim}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <Label className="text-sm mb-3 block font-semibold">Platform Seçiniz</Label>
          <div className="flex gap-4 items-end flex-wrap">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Platform seçin" />
              </SelectTrigger>
              <SelectContent>
                {activePlatforms.map(p => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={!selectedPlatform || uploading} className="hidden" />
              <Button asChild disabled={!selectedPlatform || uploading} className="cursor-pointer">
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Yükleniyor...' : 'Excel / CSV Yükle'}
                </span>
              </Button>
            </label>
            {isSelectedWebsite && (
              <div className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                📋 Shopify Admin'den standart ürün export CSV'sini yükleyin. <strong>Title + Option Values</strong> birleştirilerek gösterilir. Eşleştirme <strong>Variant SKU</strong> üzerinden yapılır.
              </div>
            )}
          </div>
        </div>

        {selectedPlatform && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-900">Toplam: {filtered.length} ürün</span>
                {selectedRows.size > 0 && <span className="text-sm text-gray-600">{selectedRows.size} seçildi</span>}
              </div>
              <div className="flex-1 max-w-md">
                <Input placeholder="Ürün adı ara..." value={tableSearchQuery} onChange={(e) => setTableSearchQuery(e.target.value)} className="w-full" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Filtre:</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="matched">Eşleşmiş</SelectItem>
                    <SelectItem value="not_matched">Eşleşmemiş</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Label className="text-sm">Sırala:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Alfabetik (A-Z)</SelectItem>
                    <SelectItem value="price">Fiyata (Düşükten Yükseğe)</SelectItem>
                    <SelectItem value="date">Tarihte (Yeni)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedRows.size > 0 && (
                <>
                  <Button variant="secondary" size="sm" onClick={handleUnmatchSelected}>
                    <X className="w-4 h-4 mr-2" />Bağları Ayır ({selectedRows.size})
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />Seçilenleri Sil ({selectedRows.size})
                  </Button>
                </>
              )}
              <Button size="sm" onClick={() => autoMatchMutation.mutate()} disabled={autoMatchMutation.isPending}>
                {autoMatchMutation.isPending ? 'Eşleştiriliyor...' : 'Otomatik Eşleştir'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['marketplaceProducts', userEmail] })}>Güncelle</Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
              <div className="overflow-x-auto overflow-y-visible">
                <Table className="relative">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox checked={selectedRows.size === filtered.length && filtered.length > 0} onCheckedChange={handleSelectAll} />
                      </TableHead>
                      <TableHead>Platform</TableHead>
                      {!isSelectedWebsite && <TableHead>Barkod</TableHead>}
                      {!isSelectedWebsite && <TableHead>Model Kodu</TableHead>}
                      <TableHead>Ürün Adı</TableHead>
                      <TableHead>Bağlı Ürün</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isSelectedWebsite ? 5 : 7} className="text-center text-gray-500 py-8">
                          {isSelectedWebsite ? 'Henüz ürün yüklenmemiş. CSV Yükle butonunu kullanın.' : 'Ürün bulunamadı'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((row) => {
                        const matchedProduct = products.find(p => p.id === row.matched_product_id);
                        return (
                          <TableRow key={row.id} className={`${selectedRows.has(row.id) ? 'bg-blue-50' : ''} relative`}>
                            <TableCell>
                              <Checkbox checked={selectedRows.has(row.id)} onCheckedChange={() => handleSelectRow(row.id)} />
                            </TableCell>
                            <TableCell className="text-sm">{row.platform_account}</TableCell>
                            {!isSelectedWebsite && <TableCell className="text-sm">{row.barkod}</TableCell>}
                            {!isSelectedWebsite && <TableCell className="text-sm">{row.model_code}</TableCell>}
                            <TableCell className="text-sm">
                              <p className="font-medium">{row.platform_product_name}</p>
                            </TableCell>
                            <TableCell className="relative overflow-visible">
                              <div className="flex items-center gap-2">
                                {matchedProduct ? (
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{matchedProduct.name}</p>
                                    <p className="text-xs text-gray-500">{matchedProduct.sku}</p>
                                  </div>
                                ) : (
                                  <div className="flex-1 space-y-1">
                                    {activeSearchRow !== row.id && (() => {
                                      const suggestion = getAutoSuggestion(row);
                                      if (suggestion) {
                                        return (
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Öneri</span>
                                            <button onClick={() => handleMatchProduct(row.id, suggestion.id)} className="text-xs text-blue-600 hover:underline">{suggestion.name}</button>
                                          </div>
                                        );
                                      }
                                      // Yüksek güvenli öneri yoksa top-3 aday göster
                                      const topMatches = getTopSuggestions(row);
                                      if (topMatches.length === 0) return null;
                                      return (
                                        <div className="space-y-0.5">
                                          <span className="text-xs text-gray-400">Adaylar:</span>
                                          {topMatches.map(({ product: p, score: s }) => (
                                            <div key={p.id} className="flex items-center gap-1">
                                              <span className="text-xs text-gray-400 shrink-0">%{s}</span>
                                              <button onClick={() => handleMatchProduct(row.id, p.id)} className="text-xs text-indigo-600 hover:underline">{p.name}</button>                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                    {activeSearchRow === row.id ? (
                                      <div className="flex gap-1">
                                        <select value={searchCriteria} onChange={e => setSearchCriteria(e.target.value)} className="text-xs border border-gray-200 rounded px-1 py-1 bg-white">
                                          <option value="name">Ad</option>
                                          <option value="sku">SKU</option>
                                        </select>
                                        <Input ref={inputRef} placeholder={searchCriteria === 'sku' ? 'SKU ara...' : 'Ürün adı ara...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="text-xs" autoFocus />
                                      </div>
                                    ) : (
                                      <button onClick={() => { setActiveSearchRow(row.id); setSearchQuery(''); }} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 border border-dashed border-gray-200 rounded px-2 py-1 w-full">
                                        <Search className="w-3 h-3" />Ürün bul
                                      </button>
                                    )}
                                  </div>
                                )}
                                {matchedProduct && (
                                  <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: row.id, data: { matched_product_id: null, status: 'not_matched' } })} className="h-6 w-6">
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded ${row.status === 'matched' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {row.status === 'matched' ? 'Eşleştirildi' : 'Eşleşmedi'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {!selectedPlatform && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500">Platform seçerek başlayın</p>
          </div>
        )}

        {/* İlerleme Popup */}
        {progressPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{progressPopup.title}</h3>
              <p className="text-sm text-gray-500 mb-4">Lütfen bekleyin, işlem devam ediyor...</p>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="truncate max-w-xs">{progressPopup.currentItemName}</span>
                  <span className="shrink-0 ml-2">{progressPopup.current} / {progressPopup.total}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-200"
                    style={{ width: progressPopup.total > 0 ? `${(progressPopup.current / progressPopup.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">%{progressPopup.total > 0 ? Math.round((progressPopup.current / progressPopup.total) * 100) : 0} tamamlandı</p>
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

        {/* Yükleme Özet Ekranı */}
        {uploadSummary && (
          <UploadSummaryModal
            summary={uploadSummary}
            onClose={() => setUploadSummary(null)}
            onReviewZeroStock={() => setUploadSummary(null)}
            onReviewMissing={() => { setUploadSummary(null); setShowMissingModal(true); }}
          />
        )}

        {/* Sistemde var Excel'de yok modal */}
        {showMissingModal && missingItems && (
          <MissingProductsModal
            items={missingItems}
            onClose={() => setShowMissingModal(false)}
          />
        )}

        {/* Stok Senkronizasyon Modal — özet kapandıktan sonra göster */}
        {stockSyncItems && !uploadSummary && (
          <StockSyncModal
            zeroStockItems={stockSyncItems}
            onDelete={handleStockSyncDelete}
            onPassive={handleStockSyncPassive}
            onDismiss={() => setStockSyncItems(null)}
          />
        )}

        {activeSearchRow && dropdownPosition && searchResults.length > 0 && createPortal(
          <div ref={dropdownRef} style={{ position: 'absolute', top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, width: `${dropdownPosition.width}px`, zIndex: 9999 }} className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            {searchResults.map((p) => (
              <button key={p.id} onClick={() => { handleMatchProduct(activeSearchRow, p.id); setSearchQuery(''); setActiveSearchRow(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-100 text-xs border-b last:border-b-0">
                <p className="font-medium">{p.name}</p>
                <p className="text-gray-500 text-xs">{p.sku}</p>
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
