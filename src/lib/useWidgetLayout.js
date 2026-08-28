import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { BOS_DUZEN, hesaplaWidgetDuzeni, spanDuzelt } from '@/lib/widgetDuzeni';

export { hesaplaWidgetDuzeni, spanDuzelt };

/**
 * useWidgetLayout — Dashboard gibi kutu (widget) yerlesimleri icin tercih yonetimi.
 *
 * Tablo sutun tercihleriyle AYNI tabloyu kullanir (user_view_preferences),
 * yalnizca page_key farklidir. RLS ile kullaniciya ozeldir:
 * created_by = auth.email().
 */
export function useWidgetLayout(pageKey, tanimlar) {
  const qc = useQueryClient();
  const aktif = !!pageKey;

  const { data: kayit, isLoading } = useQuery({
    queryKey: ['userViewPreferences', pageKey],
    queryFn: async () => {
      const list = await db.entities.UserViewPreference.filter({ page_key: pageKey }, '-created_at', 1);
      return list?.[0] ?? null;
    },
    enabled: aktif,
    staleTime: 60_000,
  });

  const prefs = useMemo(() => ({ ...BOS_DUZEN, ...(kayit?.prefs || {}) }), [kayit]);

  const kaydet = useMutation({
    mutationFn: async (yeniPrefs) => {
      if (kayit?.id) {
        return db.entities.UserViewPreference.update(kayit.id, {
          prefs: yeniPrefs,
          updated_date: new Date().toISOString(),
        });
      }
      return db.entities.UserViewPreference.create({ page_key: pageKey, prefs: yeniPrefs });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['userViewPreferences', pageKey] }),
  });

  const yaz = useCallback((degistir) => {
    if (!aktif) return;
    kaydet.mutate(degistir(prefs));
  }, [aktif, kaydet, prefs]);

  const { gorunenWidgetlar, yonetilebilir, gizliSayisi } = useMemo(
    () => hesaplaWidgetDuzeni(tanimlar, aktif ? prefs : {}),
    [tanimlar, prefs, aktif]
  );

  const gizleAc = useCallback((id) => yaz(p => ({
    ...p,
    hidden: p.hidden.includes(id) ? p.hidden.filter(k => k !== id) : [...p.hidden, id],
  })), [yaz]);

  const boyutAyarla = useCallback((id, span) => yaz(p => ({
    ...p,
    spans: { ...p.spans, [id]: spanDuzelt(span) },
  })), [yaz]);

  const siraAyarla = useCallback((yeniSira) => yaz(p => ({ ...p, order: yeniSira })), [yaz]);

  const sifirla = useCallback(() => yaz(() => ({ ...BOS_DUZEN })), [yaz]);

  return {
    prefs,
    gorunenWidgetlar,
    yonetilebilir,
    gizliSayisi,
    isLoading: aktif ? isLoading : false,
    kaydediliyor: kaydet.isPending,
    gizleAc,
    boyutAyarla,
    siraAyarla,
    sifirla,
  };
}
