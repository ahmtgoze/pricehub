import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Columns3, Eye, Pin, ArrowRight, RotateCcw } from 'lucide-react';

// pageKey -> gorunen ad + gidilecek sayfa. DataTable'a verilen anahtarlarla ayni.
const SAYFALAR = [
  { key: 'urunler', ad: 'Ürünler', page: 'Products' },
  { key: 'kategoriler', ad: 'Kategoriler', page: 'Categories' },
  { key: 'komisyonlar', ad: 'Komisyonlar', page: 'Commissions' },
  { key: 'kargo-tarifeleri', ad: 'Kargo Tarifeleri', page: 'ShippingRates' },
  { key: 'paketleme', ad: 'Paketleme', page: 'PackageManagement' },
  { key: 'guncelleme-raporlari', ad: 'Güncelleme Raporları', page: 'UpdateReports' },
];

export default function ViewCustomize() {
  const qc = useQueryClient();

  const { data: kayitlar = [], isLoading } = useQuery({
    queryKey: ['userViewPreferences', 'tumu'],
    queryFn: () => db.entities.UserViewPreference.list('-created_at', 200),
  });

  const sifirla = useMutation({
    mutationFn: (id) => db.entities.UserViewPreference.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userViewPreferences'] });
      toast.success('Görünüm varsayılana döndürüldü');
    },
    onError: (e) => toast.error(e?.message || 'Sıfırlanamadı'),
  });

  const kayitBul = (key) => kayitlar.find(k => k.page_key === key) || null;

  return (
    <div className="ph-page mx-auto">
      <div className="ph-head">
        <div>
          <h1 className="ph-title">Görünümü Özelleştir</h1>
          <p className="ph-subtitle">Tablolardaki sütun düzenini yönet</p>
        </div>
      </div>

      <div className="ph-card">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          Her tablonun sağ üstündeki <strong className="text-foreground">Sütunlar</strong> düğmesiyle
          o tablodaki sütunları gizleyebilir, sıralayabilir, genişliğini değiştirebilir ve
          sola sabitleyebilirsin. Ayarlar <strong className="text-foreground">yalnızca sana özeldir</strong> ve
          otomatik kaydedilir. Bu sayfada hangi tabloları özelleştirdiğini görür,
          istediğini varsayılana döndürebilirsin.
        </p>
      </div>

      <div className="ph-panel">
        <div className="ph-panel-head">
          <p className="text-[13.5px] font-semibold text-foreground">Tablolar</p>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {SAYFALAR.map(s => {
              const kayit = kayitBul(s.key);
              const prefs = kayit?.prefs || {};
              const gizli = prefs.hidden?.length || 0;
              const sabit = prefs.pinned?.length || 0;
              const siralanmis = (prefs.order?.length || 0) > 0;
              const genislik = Object.keys(prefs.widths || {}).length;
              const ozellestirilmis = gizli || sabit || siralanmis || genislik;

              return (
                <div key={s.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-[13px]">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-foreground">{s.ad}</p>
                    {ozellestirilmis ? (
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {gizli > 0 && <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{gizli} sütun gizli</span>}
                        {sabit > 0 && <span className="inline-flex items-center gap-1"><Pin className="h-3.5 w-3.5" />{sabit} sabit</span>}
                        {siralanmis && <span className="inline-flex items-center gap-1"><Columns3 className="h-3.5 w-3.5" />sıra değişti</span>}
                        {genislik > 0 && <span>{genislik} genişlik ayarı</span>}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Varsayılan görünüm</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {kayit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => sifirla.mutate(kayit.id)}
                        disabled={sifirla.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Sıfırla
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="sm" className="gap-2">
                      <Link to={createPageUrl(s.page)}>
                        Sayfaya git <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
