import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon } from 'lucide-react';
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

export default function Campaigns() {
  const [userEmail, setUserEmail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [formData, setFormData] = useState({
    campaign_category: '',
    campaign_type: '',
    region: '',
    start_date: null,
    end_date: null,
    cart_amount: '',
    cart_condition: 'over',
    discount_type: 'tl',
    discount_amount: '',
    trendyol_coverage_rate: ''
  });

  React.useEffect(() => {
    db.auth.me().then(user => setUserEmail(user.email)).catch(() => {});
  }, []);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', userEmail],
    queryFn: () => Campaign.filter({ created_by: userEmail }),
    enabled: !!userEmail
  });

  const campaignTypesByCategory = {
    turkey: [
      { value: 'turkey_campaign', label: 'Türkiye Kampanya' },
      { value: 'turkey_plus_extra_discount', label: 'Trendyol Plus Ek İndirim' },
      { value: 'turkey_plus_coupon', label: 'Trendyol Plus Kupon İndirimi' }
    ],
    all_countries: [
      { value: 'turkey_campaign', label: 'Tüm Ülkeler Kampanya' },
      { value: 'turkey_plus_extra_discount', label: 'Trendyol Plus Ek İndirim' },
      { value: 'turkey_plus_coupon', label: 'Trendyol Plus Kupon İndirimi' }
    ],
    micro_export: [
      { value: 'micro_export_campaign', label: 'Mikro İhracat Kampanya' },
      { value: 'micro_export_plus_extra_discount', label: 'Mikro İhracat Trendyol Plus Ek İndirim' },
      { value: 'micro_export_plus_coupon', label: 'Mikro İhracat Trendyol Plus Kupon İndirimi' }
    ]
  };

  const getRegionOptionsByCategory = (category) => {
    if (category === 'turkey') {
      return [{ value: 'turkey', label: 'Türkiye' }];
    } else if (category === 'all_countries') {
      return [{ value: 'all_countries', label: 'Tüm Ülkeler' }];
    } else if (category === 'micro_export') {
      return [
        { value: 'azerbaijan', label: 'Azerbaycan' },
        { value: 'gulf_countries', label: 'Körfez Ülkeleri' },
        { value: 'europe', label: 'Avrupa Ülkeleri' }
      ];
    }
    return [];
  };

  const getPlusAllowedRegions = (region) => {
    return ['turkey', 'azerbaijan'].includes(region);
  };

  const isPlusCouponCampaign = (type) => {
    return type.includes('coupon');
  };

  const handleCategoryChange = (category) => {
    const regionOptions = getRegionOptionsByCategory(category);
    const defaultRegion = regionOptions.length > 0 ? regionOptions[0].value : '';
    
    setFormData({
      ...formData,
      campaign_category: category,
      region: defaultRegion,
      campaign_type: '',
      start_date: null,
      end_date: null
    });
  };

  const handleRegionChange = (region) => {
    setFormData({
      ...formData,
      region: region,
      campaign_type: ''
    });
  };

  const handleCampaignTypeChange = (type) => {
    let newFormData = { ...formData, campaign_type: type };
    
    // Trendyol Plus Kupon İndirimi seçilirse tarih aralığını otomatik atama
    if (type === 'turkey_plus_coupon' || type === 'micro_export_plus_coupon') {
      // Bugünden başlayıp çok uzak bir tarihe kadar (örneğin 5 yıl sonra)
      const today = new Date();
      const farFuture = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
      newFormData = { ...newFormData, start_date: today, end_date: farFuture };
    } else {
      newFormData = { ...newFormData, start_date: null, end_date: null };
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.campaign_category || !formData.campaign_type || !formData.region || !formData.start_date || !formData.end_date) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (!formData.cart_amount || !formData.discount_amount) {
      toast.error('Lütfen kampanya şartlarını doldurun');
      return;
    }

    if (!excelFile) {
      toast.error('Excel dosyası yüklemek zorunludur');
      return;
    }

    try {
      const campaignData = {
        campaign_category: formData.campaign_category,
        campaign_type: formData.campaign_type,
        region: formData.region,
        start_date: format(formData.start_date, 'yyyy-MM-dd'),
        end_date: format(formData.end_date, 'yyyy-MM-dd'),
        cart_amount: formData.cart_amount,
        cart_condition: formData.cart_condition,
        discount_type: formData.discount_type,
        discount_amount: formData.discount_amount,
        trendyol_coverage_rate: formData.trendyol_coverage_rate ? formData.trendyol_coverage_rate : 0,
        is_active: true
      };

      await Campaign.create(campaignData);
      toast.success('Kampanya oluşturuldu');
      setFormData({ 
        campaign_category: '', 
        campaign_type: '', 
        region: '', 
        start_date: null, 
        end_date: null,
        cart_amount: '',
        cart_condition: 'over',
        discount_type: 'tl',
        discount_amount: '',
        trendyol_coverage_rate: ''
      });
      setExcelFile(null);
      setShowForm(false);
    } catch (error) {
      toast.error('Kampanya oluşturulamadı: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) {
      try {
        await Campaign.delete(id);
        toast.success('Kampanya silindi');
      } catch (error) {
        toast.error('Silme işlemi başarısız: ' + error.message);
      }
    }
  };

  const getCategoryLabel = (category) => {
    if (category === 'turkey') return 'Türkiye';
    if (category === 'all_countries') return 'Tüm Ülkeler';
    if (category === 'micro_export') return 'Mikro İhracat';
    return category;
  };

  const getCampaignTypeLabel = (type) => {
    for (const [, types] of Object.entries(campaignTypesByCategory)) {
      const found = types.find(t => t.value === type);
      if (found) return found.label;
    }
    return type;
  };

  const getRegionLabel = (region) => {
    const allOptions = [
      { value: 'turkey', label: 'Türkiye' },
      { value: 'azerbaijan', label: 'Azerbaycan' },
      { value: 'gulf_countries', label: 'Körfez Ülkeleri' },
      { value: 'europe', label: 'Avrupa Ülkeleri' },
      { value: 'all_countries', label: 'Tüm Ülkeler' }
    ];
    const option = allOptions.find(o => o.value === region);
    return option ? option.label : region;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Kampanyalar</h1>
            <p className="text-slate-500 mt-1">Kampanya oluşturun ve yönetin</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Kampanya
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Yeni Kampanya</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Ana Kategori Seçimi */}
                <div className="space-y-2">
                  <Label>Ana Kategori *</Label>
                  <Select value={formData.campaign_category} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="turkey">Türkiye Kampanyaları</SelectItem>
                      <SelectItem value="all_countries">Tüm Ülkeler Kampanyaları</SelectItem>
                      <SelectItem value="micro_export">Mikro İhracat Kampanyaları</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Kampanya Bölgesi */}
                {formData.campaign_category && (
                  <div className="space-y-2">
                    <Label>Kampanya Bölgesi *</Label>
                    <Select value={formData.region} onValueChange={handleRegionChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Bölge seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {getRegionOptionsByCategory(formData.campaign_category).map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Kampanya Türü */}
                {formData.region && (
                  <div className="space-y-2">
                    <Label>Kampanya Türü *</Label>
                    <Select value={formData.campaign_type} onValueChange={handleCampaignTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kampanya türü seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignTypesByCategory[formData.campaign_category]?.map(type => {
                          const isPlusCampaign = type.value.includes('plus');
                          const isAllowed = !isPlusCampaign || getPlusAllowedRegions(formData.region);
                          
                          return isAllowed ? (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Tarih Aralığı */}
                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Tarih Aralığı *</Label>
                    {isPlusCouponCampaign(formData.campaign_type) ? (
                      <div className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium">
                        Süresiz
                      </div>
                    ) : (
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
                            onSelect={(range) => setFormData({...formData, start_date: range?.from, end_date: range?.to})}
                            defaultMonth={new Date()}
                            numberOfMonths={2}
                            locale={tr}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )}

                {/* Sepet Tutarı */}
                {formData.campaign_type && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-2">
                      <Label>Sepet Tutarı (TL) *</Label>
                      <Input 
                        type="number" 
                        placeholder="300"
                        value={formData.cart_amount}
                        onChange={(e) => setFormData({...formData, cart_amount: parseFloat(e.target.value) || ''})}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Koşul *</Label>
                      <Select value={formData.cart_condition} onValueChange={(value) => setFormData({...formData, cart_condition: value})}>
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

                {/* İndirim Tipi ve Tutarı */}
                {formData.campaign_type && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>İndirim Tipi *</Label>
                      <Select value={formData.discount_type} onValueChange={(value) => setFormData({...formData, discount_type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tl">TL İndirimi</SelectItem>
                          <SelectItem value="percent">% İndirimi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>İndirim Tutarı {formData.discount_type === 'percent' ? '(%)' : '(TL)'} *</Label>
                      <Input 
                        type="number" 
                        placeholder="50"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || ''})}
                      />
                    </div>
                  </div>
                )}

                {/* Trendyol Karşılama Oranı */}
                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Trendyol Karşılama Oranı (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="20"
                        value={formData.trendyol_coverage_rate}
                        onChange={(e) => setFormData({...formData, trendyol_coverage_rate: parseFloat(e.target.value) || ''})}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                    </div>
                    <p className="text-xs text-slate-500">Boş bırakılırsa %0 olarak ayarlanır. Örn: %20 → Trendyol %20 karşılar, kalan kısmı satıcı karşılar</p>
                  </div>
                )}

                {/* Excel Yükleme */}
                {formData.campaign_type && (
                  <div className="space-y-2">
                    <Label>Excel Dosyası *</Label>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Oluştur</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{campaign.name}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">{getCategoryLabel(campaign.campaign_category)}</Badge>
                      <Badge className="bg-indigo-100 text-indigo-700">{getCampaignTypeLabel(campaign.campaign_type)}</Badge>
                      <Badge className="bg-amber-100 text-amber-700">{getRegionLabel(campaign.region)}</Badge>
                      {campaign.is_active ? (
                        <Badge className="bg-green-100 text-green-700">Aktif</Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-700">İnaktif</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-3">
                      {format(new Date(campaign.start_date), 'd MMM yyyy', { locale: tr })} - {format(new Date(campaign.end_date), 'd MMM yyyy', { locale: tr })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
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
