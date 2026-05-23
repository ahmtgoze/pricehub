import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Check, X, Settings2, Truck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import PlatformSettingsModal from '@/components/modals/PlatformSettingsModal';

const PlatformEntity = db.entities.Platform;

const PLATFORM_DEFAULTS = [
  {
    platform_type: 'trendyol',
    name: 'Trendyol',
    code: 'trendyol',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  {
    platform_type: 'hepsiburada',
    name: 'HepsiBurada',
    code: 'hepsiburada',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeColor: 'bg-yellow-100 text-yellow-700',
  },
  {
    platform_type: 'website',
    name: 'Web Sitesi',
    code: 'website',
    color: 'from-indigo-500 to-purple-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    badgeColor: 'bg-indigo-100 text-indigo-700',
  }
];

const SYSTEM_FIELDS = [
  'has_withholding',
  'withholding_rate',
  'has_service_fee',
  'service_fee_type',
  'service_fee_amount',
  'service_fee_vat_rate',
  'same_day_delivery_service_fee',
  'has_pos_service_fee',
  'pos_service_fee_rate',
  'use_barem',
  'barem_max_desi',
  'barem1_min',
  'barem1_max',
  'barem2_min',
  'barem2_max',
];

export default function Platforms() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    db.auth.me().then(u => {
      setUserEmail(u.email);
      setUser(u);
    }).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

const { data: platforms = [], isLoading } = useQuery({
    queryKey: ['platforms', userEmail],
    queryFn: async () => {
      const userPlatforms = await PlatformEntity.filter({ created_by: userEmail });
      const adminPlatforms = await PlatformEntity.filter({ is_system_admin: true });
      const adminMap = {};
      adminPlatforms.forEach(p => { adminMap[p.platform_type] = p; });
      const merged = userPlatforms.map(p => {
        const admin = adminMap[p.platform_type];
        if (!admin) return p;
        return {
          ...p,
          has_withholding: admin.has_withholding,
          withholding_rate: admin.withholding_rate,
          has_service_fee: admin.has_service_fee,
          service_fee_type: admin.service_fee_type,
          service_fee_amount: admin.service_fee_amount,
          service_fee_vat_rate: admin.service_fee_vat_rate,
          same_day_delivery_service_fee: admin.same_day_delivery_service_fee,
          has_pos_service_fee: admin.has_pos_service_fee,
          pos_service_fee_rate: admin.pos_service_fee_rate,
          use_barem: admin.use_barem,
          barem_max_desi: admin.barem_max_desi,
          barem1_min: admin.barem1_min,
          barem1_max: admin.barem1_max,
          barem2_min: admin.barem2_min,
          barem2_max: admin.barem2_max,
        };
      });
      const seen = new Map();
      const sorted = [...merged].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      for (const p of sorted) {
        if (!seen.has(p.platform_type)) seen.set(p.platform_type, p);
      }
      return Array.from(seen.values());
    },
    enabled: !!userEmail,
  });
      // ✅ Her platform_type için sadece en güncel kaydı göster — silme yok
      const seen = new Map();
      const sorted = [...userPlatforms].sort((a, b) =>
        new Date(b.created_date || 0) - new Date(a.created_date || 0)
      );
      for (const p of sorted) {
        if (!seen.has(p.platform_type)) {
          seen.set(p.platform_type, p);
        }
      }
      return Array.from(seen.values());
    },
    enabled: !!userEmail,
  });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && platforms !== undefined && userEmail && !initialized) {
      setInitialized(true);
      const existingTypes = platforms.map(p => p.platform_type);
      const missing = PLATFORM_DEFAULTS.filter(d => !existingTypes.includes(d.platform_type));
      if (missing.length > 0) {
        Promise.all(missing.map(m => PlatformEntity.create({
          platform_type: m.platform_type,
          name: m.name,
          code: m.code,
          is_active: true,
          has_withholding: false,
          withholding_rate: 0,
          has_service_fee: false,
          service_fee_type: 'fixed_per_order',
          service_fee_amount: 0,
          service_fee_vat_rate: 20,
          has_same_day_delivery: false,
          same_day_delivery_service_fee: 0,
          same_day_delivery_vat_rate: 20,
          use_barem: false,
          barem_max_desi: 5,
          barem1_min: 0,
          barem1_max: 149.99,
          barem2_min: 150,
          barem2_max: 299.99,
          use_custom_shipping_price: m.platform_type === 'website',
        }))).then(() => queryClient.invalidateQueries(['platforms']));
      }
    }
  }, [isLoading, platforms, userEmail, initialized]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => PlatformEntity.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['platforms']);
      toast.success('Platform durumu güncellendi');
    }
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data, platformType }) => {
      await PlatformEntity.update(id, data);
      if (isAdmin && (platformType === 'trendyol' || platformType === 'hepsiburada')) {
        const systemData = {};
        SYSTEM_FIELDS.forEach(field => {
          if (data[field] !== undefined) systemData[field] = data[field];
        });
        if (Object.keys(systemData).length > 0) {
          const allRecords = await PlatformEntity.filter({ platform_type: platformType });
          const othersToUpdate = allRecords.filter(r => r.id !== id);
          await Promise.all(
            othersToUpdate.map(r => PlatformEntity.update(r.id, systemData))
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setSettingsOpen(false);
      setSelectedPlatform(null);
      toast.success('Platform ayarları kaydedildi');
    },
    onError: () => {
      toast.error('Kaydetme sırasında bir hata oluştu');
    }
  });

  const getMergedPlatform = (platformType) => {
    const defaults = PLATFORM_DEFAULTS.find(d => d.platform_type === platformType);
    const record = platforms.find(p => p.platform_type === platformType);
    return record ? { ...defaults, ...record } : null;
  };

  const handleOpenSettings = (platformType) => {
    const merged = getMergedPlatform(platformType);
    if (merged) {
      setSelectedPlatform(merged);
      setSettingsOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Store className="h-8 w-8 text-indigo-600" />
            Platformlar
          </h1>
          <p className="text-slate-500 mt-1">Satış kanallarını aktif veya pasif yapın, kargo firması seçin</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLATFORM_DEFAULTS.map((def) => {
            const record = platforms.find(p => p.platform_type === def.platform_type);
            const isActive = record?.is_active !== false;
            const hasShipping = record?.shipping_company_name;
            const canEdit = def.platform_type === 'website';

            return (
              <div
                key={def.platform_type}
                className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
                  isActive ? 'border-slate-200 shadow-md' : 'border-slate-100 opacity-70'
                }`}
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${def.color}`} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${def.bgColor} flex items-center justify-center`}>
                        <Store className={`h-6 w-6 ${def.platform_type === 'trendyol' ? 'text-orange-600' : def.platform_type === 'hepsiburada' ? 'text-yellow-600' : 'text-indigo-600'}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{def.name}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${def.badgeColor}`}>
                          {def.platform_type === 'website' ? 'E-Ticaret' : 'Pazaryeri'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => {
                          if (record) toggleMutation.mutate({ id: record.id, is_active: checked });
                        }}
                        disabled={!record || !userEmail}
                      />
                      <span className="text-xs text-slate-400">{isActive ? 'Aktif' : 'Pasif'}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      {hasShipping ? (
                        <span className="text-slate-700 font-medium">{record.shipping_company_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Kargo firması seçilmedi</span>
                      )}
                    </div>

                    {def.platform_type !== 'website' && (
                      <div className="flex items-center gap-2 text-sm">
                        {record?.use_barem && !record?.use_custom_shipping_price ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-slate-600">Barem aktif</span>
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 text-slate-300 flex-shrink-0" />
                            <span className="text-slate-400">Barem aktif değil</span>
                          </>
                        )}
                      </div>
                    )}

                    {def.platform_type !== 'website' && (
                      <div className="flex items-center gap-2 text-sm">
                        {record?.has_same_day_delivery ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-slate-600">Bugün Kargoda aktif</span>
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 text-slate-300 flex-shrink-0" />
                            <span className="text-slate-400">Bugün Kargoda kapalı</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {!canEdit && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mb-4 text-xs text-slate-500 flex items-center gap-2">
                      <Settings2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Barem ücretleri, stopaj oranı ve hizmet bedelleri sistem yöneticisi tarafından belirlenir.</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenSettings(def.platform_type)}
                      disabled={!record}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        canEdit
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Settings2 className="h-4 w-4" />
                      {canEdit ? 'Tüm Ayarlar' : 'Kargo & Seçenekler'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Settings2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800 space-y-2">
            <p className="font-semibold">Pazaryeri Platformları Hakkında</p>
            <p>Trendyol ve Hepsiburada için barem ücretleri, komisyon oranları, stopaj ve hizmet bedelleri sistem yöneticisi tarafından belirlenmekte olup sabit olarak uygulanır.</p>
            <p>"Bugün Kargoda" seçeneğinin hem platform ayarlarında hem de ürün bazında aktif olması durumunda, ilgili ürün için standart hizmet bedeli yerine indirimli hizmet bedeli esas alınır.</p>
            <p className="font-semibold">Kargo ve Barem Uygulama Esasları:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Manuel kargo tarifesi seçilmesi durumunda barem uygulaması devre dışı kalır.</li>
              <li>Sistem kargo fiyatları tercih edildiğinde barem uygulaması aktif hale gelir.</li>
              <li>Manuel tarife seçili olduğu sürece barem hesaplaması dikkate alınmaz.</li>
            </ul>
          </div>
        </div>
      </div>

      {selectedPlatform && (
        <PlatformSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          platform={selectedPlatform}
          onSave={(data) => saveMutation.mutate({
            id: selectedPlatform.id,
            data,
            platformType: selectedPlatform.platform_type
          })}
          isSaving={saveMutation.isPending}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
