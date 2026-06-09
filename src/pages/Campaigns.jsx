import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

const Campaign = db.entities.Campaign;

// Kampanya türü seçenekleri (ana kategori + bölge kaldırıldı)
const CAMPAIGN_TYPES = [
  { value: 'all_countries', label: 'Tüm Ülkeler' },
  { value: 'trendyol_plus', label: 'Trendyol Plus (Ek İndirim)' },
];

const emptyForm = {
  campaign_type: '',
  start_date: null,
  end_date: null,
  cart_amount: '',
  cart_condition: 'over',
  discount_type: 'percent',
  discount_amount: '',
  trendyol_coverage_rate: '',
};

export default function Campaigns() {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', userEmail],
    queryFn: () => Campaign.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  const isAllCountries = formData.campaign_type === 'all_countries';

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setFormData({
      campaign_type: c.campaign_type || '',
      start_date: c.start_date ? new Date(c.start_date) : null,
      end_date: c.end_date ? new Date(c.end_date) : null,
      cart_amount: c.cart_amount ?? '',
      cart_condition: c.cart_condition || 'over',
      discount_type: c.discount_type || 'percent',
      discount_amount: c.discount_amount ?? '',
      trendyol_coverage_rate: c.trendyol_coverage_rate ?? '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTypeChange = (type) => {
    // Tür değişince sepet alanlarını ilgisizse temizle
    setFormData({
      ...formData,
      campaign_type: type,
      cart_amount: type === 'all_countries' ? formData.cart_amount : '',
      cart_condition: type === 'all_countries' ? formData.cart_condition : 'over',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.campaign_type) {
      toast.error('Lütfen kampanya türünü seçin');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error('Lütfen tarih aralığını seçin');
      return;
    }
    if (formData.discount_amount === '' || formData.discount_amount === null) {
      toast.error('Lütfen indirim tutarını/oranını girin');
      return;
    }

    const payload = {
      campaign_type: formData.campaign_type,
      start_date: format(formData.start_date, 'yyyy-MM-dd'),
      end_date: format(formData.end_date, 'yyyy-MM-dd'),
      discount_type: formData.discount_type,
      discount_amount: Number(formData.discount_amount),
      // Sepet şartı sadece Tüm Ülkeler'de ve doluysa gönderilir
      cart_amount: (isAllCountries && formData.cart_amount !== '' && formData.cart_amount !== null)
        ? Number(formData.cart_amount) : null,
      cart_condition: (isAllCountries && formData.cart_amount !== '' && formData.cart_amount !== null)
        ? formData.cart_condition : null,
      // Karşılama opsiyonel; boşsa null
      trendyol_coverage_rate: (formData.trendyol_coverage_rate !== '' && formData.trendyol_coverage_rate !== null)
        ? Number(formData.trendyol_coverage_rate) : null,
      is_active: true,
    };

    try {
      if (editingId) {
        await Campaign.update(editingId, payload);
        toast.success('Kampanya güncellendi');
      } else {
        await Campaign.create(payload);
        toast.success('Kampanya oluşturuldu');
      }
      resetForm();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      toast.error('İşlem başarısız: ' + (error?.message || 'Bilinmeyen hata'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
    try {
      await Campaign.delete(id);
      toast.success('Kampanya silindi');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      toast.error('Silme işlemi başarısız: ' + (error?.message || 'Bilinmeyen hata'));
    }
  };

  const handleAddProducts = () => {
    toast.info('Ürün ekleme (Excel yükle / seç / çıktı al) bir sonraki güncellemede gelecek.');
  };

  const getTypeLabel = (type) => {
    const found = CAMPAIGN_TYPES.find(t => t.value === type);
    return found ? found.label : (type || '-');
  };

  // Kampanya kartı için okunabilir başlık üret (name kolonu yok)
  const campaignTitle = (c) => {
    const disc = c.discount_type === 'percent'
      ? `%${c.discount_amount} indirim`
      : `${c.discount_amount} TL indirim`;
    const cart = (c.cart_amount !== null && c.cart_amount !== undefined && c.cart_amount !== '')
      ? ` · ${c.cart_amount} TL ${c.cart_condition === 'under' ? 'altı' : 'üzeri'}`
      : '';
    const cov = (c.trendyol_coverage_rate !== null && c.trendyol_coverage_rate !== undefined && c.trendyol_coverage_rate !== '' && Number(c.trendyol_coverage_rate) > 0)
      ? ` · %${c.trendyol_coverage_rate} Trendyol karşılamalı`
      : '';
    return `${getTypeLabel(c.campaign_type)}${cart} · ${disc}${cov}`;
  };

  const safeDate = (d) => {
    if (!d) return '';
    try { return format(new Date(d), 'd MMM yyyy', { locale: tr }); } catch { return d; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Kampanyalar</h1>
            <p className="text-slate-500 mt-1">Kampanya oluşturun ve yönetin</p>
          </div>
          <Button onClick={() => (showForm ? (resetForm(), setShowForm(false)) : openNew())} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Kampanya
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Kampanya Türü */}
                <div className="space-y-2">
                  <Label>Kampanya Türü *</Label>
                  <Select value={formData.campaign_type} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kampanya türü seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Tarih Aralığı */}
                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Tarih Aralığı *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date && formData.end_date ? (
                            <>{format(formData.start_date, 'd MMM yyyy', { locale: tr })} - {format(formData.end_date, 'd MMM yyyy', { locale: tr })}</>
                          ) : 'Tarih aralığı seçin'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="range"
                          selected={{ from: formData.start_date, to: formData.end_date }}
                          onSelect={(range) => setFormData({ ...formData, start_date: range?.from, end_date: range?.to })}
                          defaultMonth={formData.start_date || new Date()}
                          numberOfMonths={2}
                          locale={tr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* 3. Sepet Tutarı (sadece Tüm Ülkeler, opsiyonel) */}
                {isAllCountries && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-2">
                      <Label>Sepet Tutarı (TL)</Label>
                      <Input
                        type="number"
                        placeholder="Opsiyonel"
                        value={formData.cart_amount}
                        onChange={(e) => setFormData({ ...formData, cart_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Koşul</Label>
                      <Select value={formData.cart_condition} onValueChange={(value) => setFormData({ ...formData, cart_condition: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="over">Üzeri</SelectItem>
                          <SelectItem value="under">Altı</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {isAllCountries && (
                  <p className="text-xs text-slate-500 -mt-2">Sepet şartı yoksa (örn. düz %20 indirim) boş bırakın.</p>
                )}

                {/* 4. İndirim Tipi ve Tutarı (her ikisinde) */}
                {formData.campaign_type && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>İndirim Tipi *</Label>
                      <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">% İndirimi</SelectItem>
                          <SelectItem value="tl">TL İndirimi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>İndirim {formData.discount_type === 'percent' ? 'Oranı (%)' : 'Tutarı (TL)'} *</Label>
                      <Input
                        type="number"
                        placeholder={formData.discount_type === 'percent' ? '20' : '50'}
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                )}

                {/* 5. Trendyol Karşılama Oranı (opsiyonel, her ikisinde) */}
                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Trendyol Karşılama Oranı (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Opsiyonel — örn. 40"
                        value={formData.trendyol_coverage_rate}
                        onChange={(e) => setFormData({ ...formData, trendyol_coverage_rate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                    </div>
                    <p className="text-xs text-slate-500">Boş bırakılırsa karşılama yok sayılır. Örn: %40 → indirimin %40'ını Trendyol karşılar, kalanı satıcı.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{editingId ? 'Güncelle' : 'Oluştur'}</Button>
                  <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>İptal</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Kampanyalar Listesi */}
        <div className="grid gap-4">
          {campaigns.map(campaign => (
            <Card key={campaign.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{campaignTitle(campaign)}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge className="bg-indigo-100 text-indigo-700">{getTypeLabel(campaign.campaign_type)}</Badge>
                      {campaign.discount_type === 'percent'
                        ? <Badge variant="outline">%{campaign.discount_amount} indirim</Badge>
                        : <Badge variant="outline">{campaign.discount_amount} TL indirim</Badge>}
                      {campaign.cart_amount ? (
                        <Badge variant="outline">{campaign.cart_amount} TL {campaign.cart_condition === 'under' ? 'altı' : 'üzeri'}</Badge>
                      ) : null}
                      {Number(campaign.trendyol_coverage_rate) > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700">%{campaign.trendyol_coverage_rate} karşılama</Badge>
                      ) : null}
                      {campaign.is_active ? (
                        <Badge className="bg-green-100 text-green-700">Aktif</Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-700">İnaktif</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-3">
                      {safeDate(campaign.start_date)} - {safeDate(campaign.end_date)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={handleAddProducts}>
                      <PackagePlus className="h-4 w-4 mr-1" />
                      Ürün Ekle
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(campaign)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(campaign.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {campaigns.length === 0 && !showForm && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">Henüz kampanya oluşturulmadı</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
