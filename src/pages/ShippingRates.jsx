import React, { useState, useMemo, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Truck, Package } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SearchInput from '@/components/ui/SearchInput';
import DataTable from '@/components/ui/DataTable';
import ShippingRateModal from '@/components/modals/ShippingRateModal';
import ImportExport from '@/components/ImportExport';
import { toast } from 'sonner';

const ShippingRate = db.entities.ShippingRate;
const Platform = db.entities.Platform;

export default function ShippingRates() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = React.useState(null);
  const [userRole, setUserRole] = React.useState(null);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all'); // platform_type bazlı filtre
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'manual'
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [isSystemRate, setIsSystemRate] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [importProgress, setImportProgress] = useState({ isImporting: false, current: 0, total: 0, estimatedSecondsLeft: null, startTime: null });

  React.useEffect(() => {
    db.auth.me().then(user => {
      setUserEmail(user.email);
      setUserRole(user.role);
    }).catch(() => {});
  }, []);

  const { data: shippingRates = [], isLoading } = useQuery({
   queryKey: ['shippingRates', userEmail],
   queryFn: async () => {
     if (userRole === 'admin') {
       return ShippingRate.list('-id', 10000);
     }
     // Kullanıcılar: sistem tarifeleri + kendi manuel tarifeleri
     const systemRates = await ShippingRate.filter({ is_admin_created: true }, '-id', 10000);
     const userRates = await ShippingRate.filter({ is_manual: true, created_by: userEmail }, '-id', 10000);
     // Duplicate ID'leri temizle
     const seen = new Set();
     const merged = [...systemRates, ...userRates].filter(r => {
       if (seen.has(r.id)) return false;
       seen.add(r.id);
       return true;
     });
     return merged;
   },
   enabled: !!userEmail
  });

  const { data: rawPlatforms = [] } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: () => Platform.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  // Aynı isimde duplicate platformları temizle
  const platforms = rawPlatforms.filter((p, idx, arr) =>
    arr.findIndex(x => x.name === p.name) === idx
  );

  const { data: shippingCompanies = [] } = useQuery({
    queryKey: ['shipping-companies'],
    queryFn: () => db.entities.ShippingCompany.filter({ is_active: true }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingRate) {
        return ShippingRate.update(editingRate.id, data);
      }
      return ShippingRate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shippingRates']);
      setModalOpen(false);
      setEditingRate(null);
      toast.success('Kargo tarifesi kaydedildi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ShippingRate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['shippingRates']);
      setDeleteId(null);
      toast.success('Kargo tarifesi silindi');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await ShippingRate.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shippingRates']);
      setSelectedIds([]);
      setShowBulkDelete(false);
      toast.success('Seçili tarifeler silindi');
    }
  });

  const handleImport = async (data) => {
    let successCount = 0;
    let updateCount = 0;
    let errors = [];
    
    const importStartTime = Date.now();
    setImportProgress({ isImporting: true, current: 0, total: data.length, estimatedSecondsLeft: null, startTime: importStartTime });
    console.log('Excel verisi:', data);
    console.log('Toplam satır:', data.length);
    console.log('Mevcut tarifeler:', shippingRates.length);
    console.log('Platformlar:', platforms.map(p => ({ id: p.id, name: p.name })));
    
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const MAX_RETRIES = 3;
    
    // Create with retry logic
    const createWithRetry = async (data) => {
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
          await ShippingRate.create(data);
          return true;
        } catch (error) {
          console.log(`Deneme ${retry + 1}/${MAX_RETRIES} başarısız, ${1000 * (retry + 1)}ms bekle...`);
          await delay(1000 * (retry + 1)); // Exponential backoff
        }
      }
      throw new Error('3 denemeyi de başarısız oldu');
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`İşleniyor satır ${i + 1}:`, row);
      
      try {
        // Boş satırları atla
        if (!row || Object.keys(row).length === 0) {
          console.log(`Satır ${i + 1} boş, atlanıyor`);
          continue;
        }

        // Platform bulma - önce kullanıcının kendi platformlarında ara, sonra mevcut tarifelerdeki platform bilgilerinden
        const platformName = row['Platform'] || row.platform_name;
        
        let platform = platforms.find(p => 
          p.name === platformName || 
          p.name.toLowerCase() === platformName?.toLowerCase()
        );

        // Kullanıcının platformlarında bulunamadıysa, mevcut tarifelerden platform bilgisini çek
        if (!platform) {
          const existingRateWithPlatform = shippingRates.find(r =>
            r.platform_name === platformName ||
            r.platform_name?.toLowerCase() === platformName?.toLowerCase()
          );
          if (existingRateWithPlatform) {
            platform = { id: existingRateWithPlatform.platform_id, name: existingRateWithPlatform.platform_name };
          }
        }
        
        if (!platform) {
          errors.push(`Satır ${i + 1}: Platform bulunamadı: ${platformName}`);
          console.error(`Satır ${i + 1}: Platform bulunamadı:`, platformName);
          continue;
        }

        // Rate type - Türkçe ve İngilizce kontrol
         let rateType = (row['Tarife Tipi'] || row.rate_type || 'desi').toLowerCase().trim();

         // Web sitesi için barem kullanılamaz, sadece desi tarifesi kabul edilir
         const platformObj = platforms.find(p => p.name === platformName || p.name?.toLowerCase() === platformName?.toLowerCase());
         const isWebsitePlatform = platformObj?.platform_type === 'website';
         if (isWebsitePlatform && (rateType === 'barem1' || rateType === 'barem2')) {
           errors.push(`Satır ${i + 1}: Web sitesi platformu için barem tarifesi kullanılamaz. Sadece desi tarifesi tanımlanabilir. (${platformName}, ${rateType})`);
           continue;
         }

         // Bugün Kapında - website platformları için her zaman false
         const isWebsiteImport = platformObj?.platform_type === 'website';
         const sameDayValue = row['Bugün Kapında'] || row.same_day_delivery || 'false';
         const sameDayDelivery = isWebsiteImport ? false : (String(sameDayValue).toLowerCase() === 'true' || sameDayValue === true);

         // Desi değeri - sadece desi tipi için
         let desiValue = null;
         if (rateType === 'desi') {
           desiValue = parseFloat(row['Desi'] || row.desi || 0);
         }

        // Fiyat
        const price = parseFloat(row['Ücret'] || row.price || 0);

        if (!price || price <= 0) {
          errors.push(`Satır ${i + 1}: Geçersiz fiyat: ${price}`);
          console.error(`Satır ${i + 1}: Geçersiz fiyat`);
          continue;
        }

        // Mevcut tarifeyi bul (database'de) - admin tarifeleri için platform_type üzerinden eşleştir
         const existingRate = shippingRates.find(r => 
           (r.platform_id === platform.id || (r.is_admin_created && r.platform_type === platform.platform_type)) &&
           r.rate_type === rateType &&
           r.same_day_delivery === sameDayDelivery &&
           (rateType !== 'desi' || r.desi === desiValue)
         );

        if (existingRate) {
           // Database'de varsa ve fiyat farklıysa güncelle
           if (existingRate.price !== price) {
             console.log(`Satır ${i + 1} - Mevcut tarife bulundu, fiyat güncelleniyor:`, existingRate.id);
             await ShippingRate.update(existingRate.id, { price });
             updateCount++;
             console.log(`Satır ${i + 1} - Fiyat güncellendi!`);
             await delay(1500); // Her işlem sonrası delay
           } else {
             console.log(`Satır ${i + 1} - Aynı tarife zaten var, skip ediliyor`);
           }
        } else {
          // Yeni tarife - direkt oluştur (batch yerine sequential)
           const rateData = {
             platform_id: platform.id,
             platform_name: platform.name,
             platform_type: platform.platform_type || '',
             shipping_company: row['Kargo Firması'] || row.shipping_company || platform.shipping_company_name || '',
             rate_type: rateType,
             same_day_delivery: sameDayDelivery,
             desi: desiValue,
             price: price,
             vat_rate: parseFloat(row['KDV Oranı'] || row.vat_rate || 20),
             is_active: row.is_active !== false,
             is_admin_created: userRole === 'admin',
             is_manual: userRole !== 'admin',
           };
          
          console.log(`Satır ${i + 1} - Yeni tarife oluşturuluyor...`);
          await createWithRetry(rateData);
          successCount++;
          console.log(`Satır ${i + 1} - Tarife oluşturuldu!`);
          await delay(1500); // Her create sonrası delay
        }
      } catch (error) {
        const errorMsg = `Satır ${i + 1}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`Satır ${i + 1} - Hata:`, error);
        console.error(`Satır ${i + 1} - Veri:`, row);
      }
      
      // İlerleme güncellemesi
      const elapsed = (Date.now() - importStartTime) / 1000;
      const avg = elapsed / (i + 1);
      const remaining = i + 1 > 2 ? Math.round(avg * (data.length - (i + 1))) : null;
      setImportProgress(prev => ({ ...prev, current: i + 1, estimatedSecondsLeft: remaining }));
    }
    
    queryClient.invalidateQueries(['shippingRates']);
    
    const totalProcessed = successCount + updateCount;
    const successPercentage = data.length > 0 ? Math.round((totalProcessed / data.length) * 100) : 0;
    const errorPercentage = data.length > 0 ? Math.round((errors.length / data.length) * 100) : 0;
    
    console.log('İçe aktarma tamamlandı. Yeni:', successCount, 'Güncellenen:', updateCount, 'Hatalı:', errors.length);
    console.log(`İstatistik: ${totalProcessed}/${data.length} (%${successPercentage}) başarılı, ${errors.length} (%${errorPercentage}) başarısız`);
    console.log('Hata detayları:', errors);
    
    setImportProgress({ isImporting: false, current: 0, total: 0, estimatedSecondsLeft: null, startTime: null });
    
    if (successCount > 0 || updateCount > 0) {
      toast.success(
        `✅ ${totalProcessed}/${data.length} tarife yüklendi (%${successPercentage})\n` +
        `➕ ${successCount} yeni\n` +
        `🔄 ${updateCount} güncellendi`
      );
    }
    if (errors.length > 0) {
      console.error('Import hataları:', errors);
      // Başarısız satırları CSV olarak indir
      const failedRows = data.filter((_, i) => errors.some(err => err.includes(`Satır ${i + 1}`)));
      if (failedRows.length > 0) {
        const csv = [
          'Platform,Kargo Firması,Tarife Tipi,Desi,Fiyat,KDV,Bugün Kargoda',
          ...failedRows.map(row => [
            row.platform || '',
            row.shipping_company || '',
            row.rate_type || '',
            row.desi || '',
            row.price || '',
            row.vat_rate || '',
            row.same_day_delivery ? 'Evet' : 'Hayır'
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'basarisiz_tarifeler.csv';
        link.click();
      }
      
      const errorSummary = errors.slice(0, 5).join('\n');
      toast.error(
        `❌ ${errors.length}/${data.length} tarife işlenemedi (%${errorPercentage})\n\n` +
        `${errorSummary}${errors.length > 5 ? '\n\n➡️ "basarisiz_tarifeler.csv" indirildi' : ''}`
      );
    }
  };

  const filteredRates = useMemo(() => {
    let result = [...shippingRates];
    
    // Normal kullanıcılar: sistem tarifeleri (is_admin_created=true) + kendi manuel tarifeleri görünsün
    if (userRole !== 'admin') {
      result = result.filter(r => r.is_admin_created === true || r.created_by === userEmail);
    }
    
    if (search) {
      // Desi araması: "4", "4 desi", "4desi", "4DESİ" vb. formatları destekle
      const normalized = search.trim().toLowerCase()
        .replace(/i̇/g, 'i') // Türkçe büyük İ → i
        .replace(/ı/g, 'i'); // Türkçe ı → i
      const desiMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*desi?$/i) || 
                        normalized.match(/^(\d+(?:\.\d+)?)$/);
      
      if (desiMatch) {
        const desiValue = parseFloat(desiMatch[1]);
        result = result.filter(r => r.rate_type === 'desi' && r.desi === desiValue);
      } else {
        const s = search.toLowerCase();
        result = result.filter(r => 
          r.platform_name?.toLowerCase().includes(s) ||
          r.shipping_company?.toLowerCase().includes(s)
        );
      }
    }
    
    if (platformFilter !== 'all') {
      result = result.filter(r => r.platform_type === platformFilter);
    }
    
    if (typeFilter !== 'all') {
      result = result.filter(r => r.rate_type === typeFilter);
    }
    
    if (companyFilter !== 'all') {
      result = result.filter(r => r.shipping_company === companyFilter);
    }

    if (sourceFilter === 'manual') {
      result = result.filter(r => r.is_manual === true);
    }
    
    return result.sort((a, b) => {
      if (a.platform_name !== b.platform_name) {
        return a.platform_name?.localeCompare(b.platform_name);
      }
      if (a.rate_type !== b.rate_type) {
        const order = { barem1: 0, barem2: 1, desi: 2 };
        return (order[a.rate_type] || 2) - (order[b.rate_type] || 2);
      }
      return (a.desi_min || 0) - (b.desi_min || 0);
    });
  }, [shippingRates, search, platformFilter, typeFilter, userRole, userEmail]);

  const paginatedRates = filteredRates.slice((page - 1) * pageSize, page * pageSize);

  const getRateTypeBadge = (type) => {
    switch (type) {
      case 'barem1':
        return <Badge className="bg-emerald-100 text-emerald-700">Barem 1</Badge>;
      case 'barem2':
        return <Badge className="bg-blue-100 text-blue-700">Barem 2</Badge>;
      default:
        return <Badge variant="outline">Desi</Badge>;
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRates.map(r => r.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleOpenModal = (platform = null) => {
    if (platform && platform.shipping_company_id) {
      setEditingRate({
        platform_id: platform.id,
        platform_name: platform.name,
        shipping_company_id: platform.shipping_company_id,
        shipping_company_name: platform.shipping_company_name
      });
    } else {
      setEditingRate(null);
    }
    setModalOpen(true);
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={selectedIds.length === paginatedRates.length && paginatedRates.length > 0}
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
      header: 'Platform',
      accessor: 'platform_name',
      cell: (row) => (
        <span className="font-medium">{row.platform_name}</span>
      )
    },
    {
      header: 'Kargo Firması',
      accessor: 'shipping_company'
    },
    {
      header: 'Tarife Tipi',
      accessor: 'rate_type',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getRateTypeBadge(row.rate_type)}
          {row.same_day_delivery && row.platform_type !== 'website' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
              <Package className="h-3 w-3" />
              Bugün Kapında
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Desi',
      cell: (row) => row.rate_type === 'desi' 
        ? `${row.desi || 0} desi` 
        : '-'
    },
    {
      header: 'Ücret',
      accessor: 'price',
      cell: (row) => <span className="font-semibold">₺{row.price?.toFixed(2)}</span>
    },
    {
      header: 'KDV',
      accessor: 'vat_rate',
      cell: (row) => `%${row.vat_rate || 20}`
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
      cell: (row) => {
        const isAdminRate = row.is_admin_created === true;
        const isUserOwned = row.created_by === userEmail;
        const canEdit = userRole === 'admin' || (isUserOwned && row.is_manual);
        const canDelete = userRole === 'admin' || (isUserOwned && row.is_manual);

        return (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingRate(row);
                  setIsSystemRate(row.is_admin_created === true);
                  setModalOpen(true);
                }}
                title="Düzenle"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {!canEdit && (
              <Button
                variant="ghost"
                size="icon"
                disabled
                title="Sistem tarifesi düzenlenemez"
                className="opacity-30 cursor-not-allowed"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
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
            )}
          </div>
        );
      }
    }
  ];

  const exportColumns = [
    { key: 'platform_name', label: 'Platform' },
    { key: 'shipping_company', label: 'Kargo Firması' },
    { key: 'rate_type', label: 'Tarife Tipi' },
    { key: 'same_day_delivery', label: 'Bugün Kapında' },
    { key: 'desi', label: 'Desi' },
    { key: 'price', label: 'Ücret' },
    { key: 'vat_rate', label: 'KDV Oranı' }
  ];

  const templateColumns = [
    { key: 'Platform', label: 'Platform', example: platforms[0]?.name || 'Trendyol' },
    { key: 'Kargo Firması', label: 'Kargo Firması', example: 'Trendyol Express' },
    { key: 'Tarife Tipi', label: 'Tarife Tipi', example: 'desi' },
    { key: 'Bugün Kapında', label: 'Bugün Kapında', example: 'false' },
    { key: 'Desi', label: 'Desi', example: '5' },
    { key: 'Ücret', label: 'Ücret', example: '35' },
    { key: 'KDV Oranı', label: 'KDV Oranı', example: '20' }
  ];

  const templateInfoData = {
    title: 'KARGO TARİFESİ ŞABLONU - DOLDURMA KILAVUZU',
    aciklama: {
      title: 'SÜTUN AÇIKLAMALARI:',
      items: [
        'Platform: Aşağıdaki listeden tam ismi kopyalayın (zorunlu)',
        'Kargo Firması: Kargo şirketi adı (opsiyonel)',
        'Tarife Tipi: barem1, barem2 veya desi yazın (zorunlu)',
        'Bugün Kapında: true veya false (opsiyonel, varsayılan false)',
        'Desi: Sadece "desi" tipi tarifeler için desi değeri girin',
        'Ücret: Kargo ücreti KDV dahil TL (zorunlu)',
        'KDV Oranı: Kargo KDV oranı, örn: 20 (varsayılan 20)',
      ]
    },
    platforms: {
      title: 'SİSTEMDEKİ PLATFORMLAR (Tam ismi kopyalayın):',
      items: platforms.map(p => p.name)
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Truck className="h-8 w-8 text-indigo-600" />
              Kargo Tarifeleri
            </h1>
            <p className="text-slate-500 mt-1">
              {filteredRates.length} tarife
              {userRole === 'admin' && (
                <span className="ml-4 text-xs font-medium">
                  👨‍💼 Sistem Yöneticisi Paneli
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selectedIds.length > 0 && (
              <Button 
                onClick={() => setShowBulkDelete(true)}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Seçilenleri Sil ({selectedIds.length})
              </Button>
            )}
            <ImportExport
              data={filteredRates}
              columns={exportColumns}
              templateColumns={templateColumns}
              templateInfoData={templateInfoData}
              filename="kargo_tarifeleri"
              onImport={handleImport}
            />
            {userRole === 'admin' && (
              <Button
                onClick={() => { setEditingRate(null); setIsSystemRate(true); setModalOpen(true); }}
                variant="outline"
                className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Plus className="h-4 w-4" />
                Sistem Tarifesi Ekle
              </Button>
            )}
            <Button 
              onClick={() => { setEditingRate(null); setIsSystemRate(false); setModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              Manuel Tarife Ekle
            </Button>
          </div>
        </div>

        {userRole === 'admin' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-slate-900 text-sm mb-2">⚙️ Sistem Yöneticisi</h3>
            <p className="text-sm text-slate-600">
              Trendyol ve HepsiBurada kargo tarifelerini Excel'den yükleyebilirsiniz. Yüklenen tarifeler kullanıcılar tarafından görüntülenebilir ancak düzenlenemez. Kullanıcılar sadece kendi manuel tarifelerini ekleyebilir.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Platform, firma veya desi ara (örn: 4, 4 desi)..."
              className="flex-1"
            />
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Platformlar</SelectItem>
                <SelectItem value="trendyol">Trendyol</SelectItem>
                <SelectItem value="hepsiburada">HepsiBurada</SelectItem>
                <SelectItem value="website">Web Sitesi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tipler</SelectItem>
                <SelectItem value="barem1">Barem 1</SelectItem>
                <SelectItem value="barem2">Barem 2</SelectItem>
                <SelectItem value="desi">Desi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setSourceFilter('all'); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Kargo Firması" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Firmalar</SelectItem>
                {[...new Set(shippingRates.map(r => r.shipping_company).filter(Boolean))].sort().map(company => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setCompanyFilter('all'); }}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Kaynak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tarifeler</SelectItem>
                <SelectItem value="manual">📋 Manuel Anlaşmalı Fiyatlar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginatedRates}
          isLoading={isLoading}
          page={page}
          pageSize={pageSize}
          totalItems={filteredRates.length}
          onPageChange={setPage}
          emptyMessage="Kargo tarifesi bulunamadı"
          rowClassName={(row) => row.is_manual ? "bg-amber-50 hover:bg-amber-100/70" : "hover:bg-slate-50/50"}
        />

        <ShippingRateModal
          open={modalOpen}
          onOpenChange={(open) => { setModalOpen(open); if (!open) setIsSystemRate(false); }}
          shippingRate={editingRate}
          platforms={platforms}
          onSave={(data) => saveMutation.mutate({ ...data, is_admin_created: isSystemRate, is_manual: !isSystemRate })}
          isSaving={saveMutation.isPending}
          isAdmin={userRole === 'admin'}
          isSystemRate={isSystemRate}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tarifeyi Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu kargo tarifesini silmek istediğinizden emin misiniz?
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

        <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Toplu Tarife Silme</AlertDialogTitle>
               <AlertDialogDescription>
                 {selectedIds.length} tarifeyi silmek istediğinizden emin misiniz?
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel>İptal</AlertDialogCancel>
               <AlertDialogAction
                 onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                 className="bg-rose-600 hover:bg-rose-700"
               >
                 Sil
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>

         {/* İçe Aktarma Progress Modal */}
         <Dialog open={importProgress.isImporting}>
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
                 <div
                   className="bg-indigo-600 h-4 rounded-full transition-all duration-300"
                   style={{ width: `${(importProgress.current / (importProgress.total || 1)) * 100}%` }}
                 />
               </div>
               <div className="text-center">
                 <p className="text-3xl font-bold text-indigo-600">
                   %{Math.round((importProgress.current / (importProgress.total || 1)) * 100)}
                 </p>
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
        </div>
        </div>
        );
        }
