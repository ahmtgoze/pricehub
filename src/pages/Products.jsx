import React, { useState, useMemo, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Pencil, 
  Trash2,
  Package
} from 'lucide-react';
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
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SearchInput from '@/components/ui/SearchInput';
import DataTable from '@/components/ui/DataTable';
import ProductModal from '@/components/modals/ProductModal';
import BulkOperationsModal from '@/components/modals/BulkOperationsModal';
import ImportExport, { parseCSV } from '@/components/ImportExport';
import * as XLSX from 'xlsx';
import { calculateAllPlatformPrices } from '@/components/PriceCalculationEngine';
import { toast } from 'sonner';
import { useBackgroundTask } from '@/lib/BackgroundTaskContext';
import { useLocation } from 'react-router-dom';

const Product = db.entities.Product;
const Category = db.entities.Category;
const Platform = db.entities.Platform;
const ShippingRate = db.entities.ShippingRate;
const Commission = db.entities.Commission;
const ProductPrice = db.entities.ProductPrice;
const UpdateReport = db.entities.UpdateReport;
const PackageEntity = db.entities.Package;
const PackageItem = db.entities.PackageItem;

export default function Products() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = React.useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [multiPackageFilter, setMultiPackageFilter] = useState('all');
  const [sortField, setSortField] = useState('created_date');
  const [sortDir, setSortDir] = useState('desc');
  const [sortType, setSortType] = useState('eklenme_yeni');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [importProgress, setImportProgress] = useState({ isImporting: false, current: 0, total: 0, estimatedSecondsLeft: null });

  const [deletedCategory, setDeletedCategory] = React.useState(null);
  const { startTask, updateTask, finishTask } = useBackgroundTask();
  const location = useLocation();

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', userEmail],
    queryFn: () => Product.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  useEffect(() => {
    const unsubscribe = Category.subscribe((event) => {
      if (event.type === 'delete') {
        const affectedProducts = products.filter(p => p.category_id === event.id);
        if (affectedProducts.length > 0) {
          setDeletedCategory({ categoryId: event.id, affectedCount: affectedProducts.length });
        }
        queryClient.invalidateQueries(['categories']);
        queryClient.invalidateQueries(['commissions']);
      }
    });
    return unsubscribe;
  }, [products, queryClient]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', userEmail],
    queryFn: () => Category.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: () => Platform.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: shippingRates = [] } = useQuery({
    queryKey: ['shippingRates', userEmail],
    queryFn: () => ShippingRate.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions', userEmail],
    queryFn: () => Commission.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages', userEmail],
    queryFn: () => PackageEntity.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: packageItems = [] } = useQuery({
    queryKey: ['packageItems', userEmail],
    queryFn: () => PackageItem.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings', userEmail],
    queryFn: () => db.entities.Settings.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { _chainMembers, _matchMembers, ...saveData } = data;

      // Ana ürünü kaydet
      let savedProduct;
      if (editingProduct) {
        savedProduct = await Product.update(editingProduct.id, saveData);
        savedProduct = { ...editingProduct, ...saveData };
      } else {
        const existingProduct = products.find(p => p.sku === data.sku);
        if (existingProduct) {
          await Product.update(existingProduct.id, saveData);
          savedProduct = { ...existingProduct, ...saveData };
        } else {
          savedProduct = await Product.create(saveData);
        }
      }

      const productId = savedProduct?.id || editingProduct?.id;

      // Zincir grubu güncelle
      const currentChainGroupId = editingProduct?.chain_group_id;
      const newChainGroupId = (_chainMembers.length > 0)
        ? (currentChainGroupId || crypto.randomUUID())
        : null;

      if (productId) {
        await Product.update(productId, { chain_group_id: newChainGroupId });
      }

      // Mevcut zincir üyelerini bul
      const oldChainMembers = currentChainGroupId
        ? products.filter(p => p.chain_group_id === currentChainGroupId && p.id !== productId)
        : [];

      // Zincirden çıkarılanları temizle
      for (const old of oldChainMembers) {
        if (!_chainMembers.includes(old.id)) {
          await Product.update(old.id, { chain_group_id: null });
        }
      }

      // Zincire yeni eklenenleri güncelle + maliyet senkronizasyonu (oran bazlı)
      const oldCost = parseFloat(editingProduct?.cost) || 0;
      const newCost = parseFloat(saveData.cost) || 0;
      const costRatio = oldCost > 0 ? newCost / oldCost : 1;

      for (const memberId of _chainMembers) {
        const member = products.find(p => p.id === memberId);
        if (!member) continue;
        const memberNewCost = oldCost > 0
          ? Math.round(parseFloat(member.cost) * costRatio * 100) / 100
          : parseFloat(member.cost);
        await Product.update(memberId, {
          chain_group_id: newChainGroupId,
          cost: memberNewCost,
        });
      }

      // Zincir tutarsızlığı kontrolü
      if (_chainMembers.length > 0 && parseInt(saveData.unit_quantity) > 0 && newCost > 0) {
        const myUnitCost = newCost / parseInt(saveData.unit_quantity);
        const inconsistentMembers = [];
        for (const memberId of _chainMembers) {
          const member = products.find(p => p.id === memberId);
          if (!member || !member.unit_quantity || member.unit_quantity === 0) continue;
          const memberUnitCost = parseFloat(member.cost) / member.unit_quantity;
          const diff = Math.abs(memberUnitCost - myUnitCost) / myUnitCost;
          if (diff > 0.02) inconsistentMembers.push(member);
        }
        if (inconsistentMembers.length > 0) {
          try {
            await UpdateReport.create({
              created_by: userEmail,
              product_id: productId,
              product_name: saveData.name,
              product_sku: saveData.sku,
              change_type: 'chain_inconsistency',
              change_reason: `Zincir Tutarsızlığı — Bu ürün: ₺${myUnitCost.toFixed(4)}/adet | ${inconsistentMembers.map(m => `${m.name}: ₺${(parseFloat(m.cost) / m.unit_quantity).toFixed(4)}/adet`).join(', ')}`,
              old_sale_price: oldCost,
              new_sale_price: newCost,
            });
          } catch (e) {
            console.error('Zincir tutarsızlık raporu hatası:', e);
          }
        }
      }

      // Eşleştirme grubu güncelle
      const currentMatchGroupId = editingProduct?.match_group_id;
      const newMatchGroupId = (_matchMembers.length > 0)
        ? (currentMatchGroupId || crypto.randomUUID())
        : null;

      if (productId) {
        await Product.update(productId, { match_group_id: newMatchGroupId });
      }

      // Mevcut eşleştirme üyelerini bul
      const oldMatchMembers = currentMatchGroupId
        ? products.filter(p => p.match_group_id === currentMatchGroupId && p.id !== productId)
        : [];

      // Eşleştirmeden çıkarılanları temizle
      for (const old of oldMatchMembers) {
        if (!_matchMembers.includes(old.id)) {
          await Product.update(old.id, { match_group_id: null });
        }
      }

      // Eşleştirmeye yeni eklenenleri güncelle + maliyet senkronizasyonu
      for (const memberId of _matchMembers) {
        await Product.update(memberId, {
          match_group_id: newMatchGroupId,
          cost: saveData.cost,
        });
      }

      return savedProduct;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries(['products']);
      setModalOpen(false);
      setEditingProduct(null);
      toast.success('Ürün kaydedildi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setDeleteId(null);
      toast.success('Ürün silindi');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await Product.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setSelectedIds([]);
      setShowBulkDelete(false);
      toast.success('Seçili ürünler silindi');
    }
  });

  const cleanupDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const allProducts = await Product.filter({ created_by: userEmail });
      const groupedByNameSku = {};
      allProducts.forEach(product => {
        const key = `${product.name}||${product.sku}`;
        if (!groupedByNameSku[key]) groupedByNameSku[key] = [];
        groupedByNameSku[key].push(product);
      });
      let deletedCount = 0;
      for (const duplicates of Object.values(groupedByNameSku)) {
        if (duplicates.length > 1) {
          duplicates.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          for (let i = 1; i < duplicates.length; i++) {
            await Product.delete(duplicates[i].id);
            deletedCount++;
          }
        }
      }
      return deletedCount;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries(['products']);
      toast.success(`${deletedCount} duplicate ürün silindi`);
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates) => {
      for (const id of selectedIds) {
        await Product.update(id, updates);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setSelectedIds([]);
      setShowBulkOperations(false);
      toast.success('Seçili ürünler güncellendi');
    }
  });

  const getPackageCost = (packageId) => {
    if (!packageId) return 0;
    return packageItems
      .filter(item => item.package_id === packageId && item.is_active !== false)
      .reduce((sum, item) => sum + (item.cost || 0), 0);
  };

  const getAutoPackageId = (desi) => {
    if (!desi) return null;
    const activePackages = packages.filter(p => p.is_active !== false && p.desi_min !== null && p.desi_max !== null);
    const matched = activePackages.find(p => desi >= p.desi_min && desi <= p.desi_max);
    return matched?.id || null;
  };

  const recalculatePrices = async (productList) => {
    for (const product of productList) {
      const prices = calculateAllPlatformPrices({
        product,
        platforms: platforms.filter(p => p.is_active !== false),
        shippingRates,
        commissions,
        packages,
        packageItems,
        getPackageCost,
        settings
      });

      for (const priceData of prices) {
        const existingPrices = await ProductPrice.filter({
          product_id: product.id,
          platform_id: priceData.platform_id,
          created_by: userEmail
        });

        if (existingPrices.length > 0) {
          const existing = existingPrices[0];
          if (existing.sale_price !== priceData.sale_price) {
            await UpdateReport.create({
              product_id: product.id,
              product_name: product.name,
              product_sku: product.sku,
              platform_id: priceData.platform_id,
              platform_name: priceData.platform_name,
              old_sale_price: existing.sale_price,
              new_sale_price: priceData.sale_price,
              old_profit_rate: existing.profit_rate,
              new_profit_rate: priceData.profit_rate,
              change_reason: 'Ürün güncellendi',
              change_type: 'cost_update'
            });
          }
          await ProductPrice.update(existing.id, priceData);
        } else {
          await ProductPrice.create(priceData);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['productPrices', userEmail] });
  };

  const handleImport = async (data) => {
    if (data.length > 2000) {
      toast.error('Maksimum 2.000 satır yükleyebilirsiniz');
      return;
    }

    const normalizeField = (val) => {
      if (val === null || val === undefined) return '';
      return String(val).trim().replace(/\s+/g, ' ');
    };

    const matchKey = (sku, name, catName) =>
      `${normalizeField(sku)}|||${normalizeField(name)}|||${normalizeField(catName)}`;

    const parseDesi = (val) => {
      const parsed = parseFloat(val);
      return (!val || isNaN(parsed) || parsed <= 0) ? null : parsed;
    };

    const mapExcelHeaders = (row) => {
      const mapped = {
        sku: normalizeField(row['SKU'] || row.sku),
        name: normalizeField(row['Ürün Adı'] || row.name),
        cost: row['Maliyet'] ?? row.cost,
        desi: row['Desi'] ?? row.desi,
        category_name: normalizeField(row['Kategori'] || row.category_name),
        vat_rate: row['KDV Oranı'] ?? row.vat_rate,
        same_day_delivery: row['Bugün Kargoda'] !== undefined
          ? (row['Bugün Kargoda'] === 'true' || row['Bugün Kargoda'] === true)
          : false,
        is_active: row['Aktif'] !== undefined
          ? (row['Aktif'] === 'true' || row['Aktif'] === true)
          : true,
        printing_cost: parseFloat(row['Baskı Maliyeti'] ?? row.printing_cost ?? 0) || 0,
        extra_cost: parseFloat(row['Ek Maliyet'] ?? row.extra_cost ?? 0) || 0,
        special_shipping: false
      };

      const desiValues = [
        parseDesi(row['Desi 1']),
        parseDesi(row['Desi 2']),
        parseDesi(row['Desi 3']),
        parseDesi(row['Desi 4']),
        parseDesi(row['Desi 5'])
      ].filter(d => d !== null);

      if (desiValues.length > 0) {
        mapped.multi_package = true;
        mapped.packages = JSON.stringify(desiValues.map((desi) => ({ desi, package_id: '' })));
        mapped.desi = desiValues[0];
      }

      return mapped;
    };

    const seenKeys = new Set();
    const excelDuplicateRows = [];
    const processedData = [];

    for (const row of data) {
      const mapped = mapExcelHeaders(row);
      if (!mapped.sku) continue;
      const key = matchKey(mapped.sku, mapped.name, mapped.category_name);
      if (seenKeys.has(key)) {
        excelDuplicateRows.push(row);
      } else {
        seenKeys.add(key);
        processedData.push(mapped);
      }
    }

    if (excelDuplicateRows.length > 0) {
      toast.warning(
        `⚠️ Excel dosyasında ${excelDuplicateRows.length} duplicate satır tespit edildi (aynı SKU + Ürün Adı + Kategori). Bu satırlar atlandı.`,
        { duration: 8000 }
      );
    }

    if (processedData.length === 0) {
      toast.error('İşlenecek geçerli satır bulunamadı.');
      return;
    }

    setImportProgress({ isImporting: true, current: 0, total: processedData.length });
    startTask('products-import', 'Excel Yükleniyor', 'Ürünler', 'Products', processedData.length);

    const existingProducts = await Product.filter({ created_by: userEmail });
    const existingByTripleKey = {};
    existingProducts.forEach(p => {
      const key = matchKey(p.sku, p.name, p.category_name);
      existingByTripleKey[key] = p;
    });

    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failedRows = [];
    const startTime = Date.now();
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    const parseMultiPackage = (r) => {
      if (!r.multi_package) return { multi_package: false, packages: null };
      try {
        const pkgs = typeof r.packages === 'string' ? JSON.parse(r.packages) : r.packages;
        if (pkgs.length > 1) return { multi_package: true, packages: r.packages };
      } catch (e) {}
      return { multi_package: false, packages: null };
    };

    for (let i = 0; i < processedData.length; i++) {
      const row = processedData[i];
      const key = matchKey(row.sku, row.name, row.category_name);
      const existing = existingByTripleKey[key];
      const category = categories.find(c => normalizeField(c.name) === normalizeField(row.category_name));
      const pkgData = parseMultiPackage(row);

      let success = false;
      for (let attempt = 0; attempt < 5 && !success; attempt++) {
        try {
          if (existing) {
            const newCost = parseFloat(row.cost) || existing.cost;
            const newPrinting = parseFloat(row.printing_cost) || 0;
            const newExtra = parseFloat(row.extra_cost) || 0;
            const newDesi = parseFloat(row.desi) || existing.desi;
            const newCatId = category?.id || existing.category_id;
            const newVat = parseFloat(row.vat_rate) || existing.vat_rate;
            const newSameDay = row.same_day_delivery === true;
            const newActive = row.is_active !== false;

            const hasChange =
              existing.cost !== newCost ||
              (existing.printing_cost || 0) !== newPrinting ||
              (existing.extra_cost || 0) !== newExtra ||
              existing.desi !== newDesi ||
              existing.category_id !== newCatId ||
              (existing.vat_rate || 20) !== newVat ||
              (existing.same_day_delivery === true) !== newSameDay ||
              (existing.is_active !== false) !== newActive ||
              (existing.multi_package === true) !== pkgData.multi_package ||
              existing.packages !== pkgData.packages;

            if (hasChange) {
              await Product.update(existing.id, {
                cost: newCost, printing_cost: newPrinting, extra_cost: newExtra,
                desi: newDesi, category_id: newCatId, category_name: category?.name || existing.category_name,
                vat_rate: newVat, same_day_delivery: newSameDay, is_active: newActive,
                special_shipping: false, ...pkgData
              });
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            if (!row.name) { skippedCount++; break; }
            if (!category?.id) {
              failedCount++;
              failedRows.push({ SKU: row.sku, 'Ürün Adı': row.name, Kategori: row.category_name, _hata: `Kategori bulunamadı: "${row.category_name}"` });
              break;
            }
            const created = await Product.create({
              name: row.name, sku: row.sku,
              cost: parseFloat(row.cost) || 0,
              printing_cost: parseFloat(row.printing_cost) || 0,
              extra_cost: parseFloat(row.extra_cost) || 0,
              desi: parseFloat(row.desi) || 0,
              category_id: category.id, category_name: category.name,
              vat_rate: parseFloat(row.vat_rate) || 20,
              same_day_delivery: row.same_day_delivery === true,
              is_active: row.is_active !== false,
              special_shipping: false, ...pkgData
            });
            existingByTripleKey[key] = created;
            createdCount++;
          }
          success = true;
        } catch (e) {
          if (attempt < 4) {
            await delay(1500 * (attempt + 1));
          } else {
            failedCount++;
            failedRows.push({ SKU: row.sku, 'Ürün Adı': row.name, Kategori: row.category_name, _hata: 'API hatası (5 deneme başarısız)' });
          }
        }
      }

      const done = i + 1;
      const elapsed = (Date.now() - startTime) / 1000;
      const avgPerItem = elapsed / done;
      const remaining = done > 3 ? Math.round(avgPerItem * (processedData.length - done)) : null;
      setImportProgress({ isImporting: true, current: done, total: processedData.length, estimatedSecondsLeft: remaining });
      updateTask(done, processedData.length);
    }

    queryClient.invalidateQueries(['products']);
    setImportProgress({ isImporting: false, current: 0, total: 0, estimatedSecondsLeft: null });
    finishTask();

    if (failedRows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(failedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hatali Urunler');
      XLSX.writeFile(wb, 'hatali_urunler.xlsx');
    }

    let msg = `✅ Tamamlandı: ${createdCount} yeni eklendi, ${updatedCount} güncellendi, ${skippedCount} değişmeden atlandı.`;
    if (excelDuplicateRows.length > 0) msg += ` ⚠️ ${excelDuplicateRows.length} Excel içi duplicate satır atlandı.`;
    if (failedRows.length > 0) msg += ` ❌ ${failedRows.length} hatalı ürün "hatali_urunler.xlsx" olarak indirildi.`;
    toast.success(msg, { duration: 10000 });
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

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (search) result = result.filter(p => matchesSearch(p, search));
    if (categoryFilter !== 'all') result = result.filter(p => p.category_id === categoryFilter);
    if (activeFilter !== 'all') result = result.filter(p => activeFilter === 'active' ? p.is_active !== false : p.is_active === false);
    if (multiPackageFilter !== 'all') result = result.filter(p => multiPackageFilter === 'multi' ? p.multi_package === true : p.multi_package !== true);

    const getSortConfig = () => {
      switch (sortType) {
        case 'fiyat_artan': return { field: 'cost', dir: 'asc' };
        case 'fiyat_azalan': return { field: 'cost', dir: 'desc' };
        case 'desi_artan': return { field: 'desi', dir: 'asc' };
        case 'desi_azalan': return { field: 'desi', dir: 'desc' };
        case 'eklenme_yeni': return { field: 'created_date', dir: 'desc' };
        case 'eklenme_eski': return { field: 'created_date', dir: 'asc' };
        case 'ad_az': return { field: 'name', dir: 'asc' };
        case 'ad_za': return { field: 'name', dir: 'desc' };
        default: return { field: 'created_date', dir: 'desc' };
      }
    };

    const { field, dir } = getSortConfig();
    result.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];
      if (typeof valA === 'string') valA = valA?.toLowerCase();
      if (typeof valB === 'string') valB = valB?.toLowerCase();
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, search, categoryFilter, activeFilter, multiPackageFilter, sortType]);

  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0}
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
      header: 'SKU',
      accessor: 'sku',
      cell: (row) => <span className="font-mono text-sm text-slate-600">{row.sku || '-'}</span>
    },
    {
      header: 'Ürün Adı',
      accessor: 'name',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.category_name}</p>
        </div>
      )
    },
    {
      header: 'Maliyet',
      accessor: 'cost',
      cell: (row) => <span className="font-semibold">₺{row.cost?.toFixed(2)}</span>
    },
    {
      header: 'Baskı Maliyeti',
      accessor: 'printing_cost',
      cell: (row) => row.printing_cost ? <span className="font-semibold">₺{row.printing_cost?.toFixed(2)}</span> : <span className="text-slate-400">-</span>
    },
    {
      header: 'Ek Maliyet',
      accessor: 'extra_cost',
      cell: (row) => row.extra_cost ? <span className="font-semibold">₺{row.extra_cost?.toFixed(2)}</span> : <span className="text-slate-400">-</span>
    },
    {
      header: 'Desi',
      cell: (row) => {
        if (row.multi_package && row.packages) {
          try {
            const packages = typeof row.packages === 'string' ? JSON.parse(row.packages) : row.packages;
            return (
              <div className="flex gap-1 flex-wrap">
                {packages.map((pkg, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded">{pkg.desi}</span>
                ))}
              </div>
            );
          } catch (e) { return row.desi; }
        }
        return row.desi;
      }
    },
    {
      header: 'KDV',
      accessor: 'vat_rate',
      cell: (row) => `%${row.vat_rate || 20}`
    },
    {
      header: 'Bugün Kargoda',
      accessor: 'same_day_delivery',
      cell: (row) => (
        <Badge variant={row.same_day_delivery === true ? 'default' : 'outline'} className={row.same_day_delivery === true ? 'bg-green-600' : ''}>
          {row.same_day_delivery === true ? '✓ Aktif' : '-'}
        </Badge>
      )
    },
    {
      header: 'Paket',
      cell: (row) => {
        const autoPackageId = getAutoPackageId(row.desi);
        const selectedPackageId = row.package_id || autoPackageId;
        const selectedPackage = packages.find(p => p.id === selectedPackageId);
        const cost = getPackageCost(selectedPackageId);
        return (
          <div className="space-y-1">
            <Select
              value={row.package_id || ''}
              onValueChange={(value) => {
                Product.update(row.id, { package_id: value === 'none' ? null : value });
                queryClient.invalidateQueries(['products']);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Paket seç..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Paket Yok</SelectItem>
                {packages.filter(p => p.is_active !== false).map(pkg => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} ({getPackageCost(pkg.id).toFixed(2)} TL)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPackage && (
              <div className="flex items-center gap-1">
                <p className="text-xs text-slate-500">{cost.toFixed(2)} TL</p>
                {autoPackageId === selectedPackageId && !row.package_id && (
                  <Badge variant="secondary" className="text-xs">Otomatik</Badge>
                )}
              </div>
            )}
          </div>
        );
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
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditProduct(row); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      )
    }
  ];

  const exportData = filteredProducts.map(p => {
    const baseData = {
      'SKU': p.sku, 'Ürün Adı': p.name, 'Maliyet': p.cost,
      'Baskı Maliyeti': p.printing_cost || 0, 'Ek Maliyet': p.extra_cost || 0,
      'Desi': p.desi || '', 'Desi 1': '', 'Desi 2': '', 'Desi 3': '', 'Desi 4': '', 'Desi 5': '',
      'Kategori': p.category_name, 'KDV Oranı': p.vat_rate,
      'Bugün Kargoda': p.same_day_delivery === true ? 'true' : 'false',
      'Aktif': p.is_active !== false ? 'true' : 'false'
    };
    if (p.packages) {
      try {
        const pkgs = typeof p.packages === 'string' ? JSON.parse(p.packages) : p.packages;
        if (Array.isArray(pkgs)) pkgs.forEach((pkg, idx) => { if (idx < 5) baseData[`Desi ${idx + 1}`] = pkg.desi || ''; });
      } catch (e) {}
    }
    return baseData;
  });

  const exportColumns = [
    { key: 'SKU', label: 'SKU' }, { key: 'Ürün Adı', label: 'Ürün Adı' },
    { key: 'Maliyet', label: 'Maliyet' }, { key: 'Baskı Maliyeti', label: 'Baskı Maliyeti' },
    { key: 'Ek Maliyet', label: 'Ek Maliyet' }, { key: 'Desi', label: 'Desi' },
    { key: 'Desi 1', label: 'Desi 1' }, { key: 'Desi 2', label: 'Desi 2' },
    { key: 'Desi 3', label: 'Desi 3' }, { key: 'Desi 4', label: 'Desi 4' },
    { key: 'Desi 5', label: 'Desi 5' }, { key: 'Kategori', label: 'Kategori' },
    { key: 'KDV Oranı', label: 'KDV Oranı' }, { key: 'Bugün Kargoda', label: 'Bugün Kargoda' },
    { key: 'Aktif', label: 'Aktif' }
  ];

  const templateColumns = [
    { key: 'SKU', label: 'SKU', example: 'SKU-001' },
    { key: 'Ürün Adı', label: 'Ürün Adı', example: 'Örnek Ürün' },
    { key: 'Maliyet', label: 'Maliyet', example: '100' },
    { key: 'Baskı Maliyeti', label: 'Baskı Maliyeti', example: '0' },
    { key: 'Ek Maliyet', label: 'Ek Maliyet', example: '0' },
    { key: 'Desi 1', label: 'Desi 1', example: '2.5' },
    { key: 'Desi 2', label: 'Desi 2', example: '' },
    { key: 'Desi 3', label: 'Desi 3', example: '' },
    { key: 'Desi 4', label: 'Desi 4', example: '' },
    { key: 'Desi 5', label: 'Desi 5', example: '' },
    { key: 'Kategori', label: 'Kategori', example: categories[0]?.name || 'Kategori Adı' },
    { key: 'KDV Oranı', label: 'KDV Oranı', example: '20' },
    { key: 'Bugün Kargoda', label: 'Bugün Kargoda', example: 'false' },
    { key: 'Aktif', label: 'Aktif', example: 'true' }
  ];

  const handleEditProduct = (product) => {
    const autoPackageId = getAutoPackageId(product.desi);
    if (!product.package_id && autoPackageId) {
      setEditingProduct({ ...product, _autoPackageId: autoPackageId });
    } else {
      setEditingProduct(product);
    }
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {deletedCategory && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{deletedCategory.affectedCount} ürün</strong> silinmiş bir kategoriye ait.
              <Button variant="link" size="sm" className="ml-2 h-auto p-0" onClick={() => { setCategoryFilter('all'); setSearch(''); }}>Etkilenen ürünleri göster</Button>
              <Button variant="link" size="sm" className="ml-2 h-auto p-0" onClick={() => setDeletedCategory(null)}>Kapat</Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Package className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-600" />
              Ürünler
            </h1>
            <p className="text-slate-500 mt-1">{filteredProducts.length} ürün listeleniyor</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <Button onClick={() => setShowBulkOperations(true)} variant="outline" size="sm" className="gap-2">Toplu İşlemler ({selectedIds.length})</Button>
                <Button onClick={() => setShowBulkDelete(true)} variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />Sil ({selectedIds.length})
                </Button>
              </>
            )}
            <ImportExport
              data={exportData}
              columns={exportColumns}
              templateColumns={templateColumns}
              templateInfoData={{
                title: 'ÜRÜN ŞABLONU - DOLDURMA KILAVUZU',
                aciklama: {
                  title: 'SÜTUN AÇIKLAMALARI:',
                  items: [
                    'SKU: Ürünün benzersiz kodu (zorunlu)',
                    'Ürün Adı: Ürünün tam adı (zorunlu)',
                    'Maliyet: Ürün maliyeti, KDV dahil TL (zorunlu)',
                    'Baskı Maliyeti: Varsa baskı maliyeti KDV dahil TL (opsiyonel, 0 bırakın)',
                    'Ek Maliyet: Diğer ek maliyetler KDV dahil TL (opsiyonel, 0 bırakın)',
                    'Desi 1: İlk paket desisi (tek paket ise sadece bunu doldurun)',
                    'Desi 2-5: Çok paketli ürünler için ek paket desileri (opsiyonel)',
                    'Kategori: Aşağıdaki listeden tam olarak kopyalayın (zorunlu)',
                    'KDV Oranı: Ürün KDV oranı, örn: 20 veya 10 (zorunlu)',
                    'Bugün Kargoda: true veya false',
                    'Aktif: true veya false',
                  ]
                },
                categories: { title: 'KATEGORİLER (Tam ismi kopyalayın):', items: categories.map(c => c.name) }
              }}
              filename="urunler"
              onImport={handleImport}
            />
            <Button onClick={() => { setEditingProduct(null); setModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni Ürün</span>
              <span className="sm:hidden">Ekle</span>
            </Button>
            <Button onClick={() => cleanupDuplicatesMutation.mutate()} variant="outline" size="sm" className="gap-2 hidden sm:flex">
              Duplicate Temizle
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Ürün adı veya SKU ara..." className="flex-1" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Durum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={multiPackageFilter} onValueChange={setMultiPackageFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Paket Tipi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Ürünler</SelectItem>
                <SelectItem value="multi">Çok Paketli</SelectItem>
                <SelectItem value="single">Tek Paket</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortType} onValueChange={setSortType}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Sıralama" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="eklenme_yeni">Eklenme (Yeni)</SelectItem>
                <SelectItem value="eklenme_eski">Eklenme (Eski)</SelectItem>
                <SelectItem value="ad_az">Ürün Adı (A-Z)</SelectItem>
                <SelectItem value="ad_za">Ürün Adı (Z-A)</SelectItem>
                <SelectItem value="fiyat_artan">Fiyat (Artan)</SelectItem>
                <SelectItem value="fiyat_azalan">Fiyat (Azalan)</SelectItem>
                <SelectItem value="desi_artan">Desi (Artan)</SelectItem>
                <SelectItem value="desi_azalan">Desi (Azalan)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginatedProducts}
          isLoading={isLoading}
          page={page}
          pageSize={pageSize}
          totalItems={filteredProducts.length}
          onPageChange={setPage}
          emptyMessage="Ürün bulunamadı"
        />

        <ProductModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          product={editingProduct}
          categories={categories}
          packages={packages}
          products={products}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isPending}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ürünü Sil</AlertDialogTitle>
              <AlertDialogDescription>Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BulkOperationsModal
          open={showBulkOperations}
          onOpenChange={setShowBulkOperations}
          selectedCount={selectedIds.length}
          packages={packages}
          onApply={(updates) => bulkUpdateMutation.mutate(updates)}
          isApplying={bulkUpdateMutation.isPending}
        />

        <Dialog open={importProgress.isImporting && location.pathname === '/Products'}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Excel İçe Aktarma İşleniyor...</DialogTitle>
            </DialogHeader>
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
              {importProgress.estimatedSecondsLeft !== null && importProgress.estimatedSecondsLeft > 0 && (
                <div className="bg-indigo-50 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-indigo-500">Tahmini kalan süre</p>
                  <p className="text-lg font-bold text-indigo-700">
                    {importProgress.estimatedSecondsLeft >= 60
                      ? `${Math.floor(importProgress.estimatedSecondsLeft / 60)} dk ${importProgress.estimatedSecondsLeft % 60} sn`
                      : `${importProgress.estimatedSecondsLeft} saniye`}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Toplu Ürün Silme</AlertDialogTitle>
              <AlertDialogDescription>{selectedIds.length} ürünü silmek istediğinizden emin misiniz?</AlertDialogDescription>
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