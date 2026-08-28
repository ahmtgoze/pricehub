import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import {
  SABIT_GENISLIK,
  ASGARI_GENISLIK,
  AZAMI_GENISLIK,
  BOS,
  kolonAnahtari,
  hesaplaGorunenKolonlar,
} from '@/lib/tabloSutunlari';

// Mevcut kullanimlar bozulmasin diye buradan da disa aktariliyor.
export { SABIT_GENISLIK, ASGARI_GENISLIK, AZAMI_GENISLIK, kolonAnahtari, hesaplaGorunenKolonlar };

export function useTableColumns(pageKey, columns) {
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

  const prefs = useMemo(() => ({ ...BOS, ...(kayit?.prefs || {}) }), [kayit]);

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

  // ── Sutun listesini tercihlere gore duzenle ──
  // Onemli: her sutun siralamaya katilir (anahtarsiz "sistem" sutunlari da
  // sentetik anahtar alir), boylece tercih yokken sira ORIJINALIYLE birebir
  // ayni kalir. Sistem sutunlari yalnizca gizlenemez/sabitlenemez.
  const { gorunenKolonlar, yonetilebilir } = useMemo(
    () => hesaplaGorunenKolonlar(columns, prefs, aktif),
    [columns, prefs, aktif]
  );

  // ── Islemler ──
  const gizleAc = useCallback((key, ekSutun = false) => yaz(p => {
    if (ekSutun) {
      return {
        ...p,
        shown: p.shown.includes(key) ? p.shown.filter(k => k !== key) : [...p.shown, key],
      };
    }
    return {
      ...p,
      hidden: p.hidden.includes(key) ? p.hidden.filter(k => k !== key) : [...p.hidden, key],
    };
  }), [yaz]);

  const sabitle = useCallback((key) => yaz(p => ({
    ...p,
    pinned: p.pinned.includes(key) ? p.pinned.filter(k => k !== key) : [...p.pinned, key],
  })), [yaz]);

  const tasi = useCallback((key, yon) => yaz(p => {
    const mevcut = p.order.length
      ? [...p.order]
      : columns.map((c, i) => kolonAnahtari(c) ?? `__sys_${i}`);
    const i = mevcut.indexOf(key);
    if (i === -1) return p;
    const j = yon === 'yukari' ? i - 1 : i + 1;
    if (j < 0 || j >= mevcut.length) return p;
    [mevcut[i], mevcut[j]] = [mevcut[j], mevcut[i]];
    return { ...p, order: mevcut };
  }), [yaz, columns]);

  /**
   * Surukle-birak sonrasi tam sirayi yazar.
   * Panelde yalnizca yonetilebilir sutunlar listelendigi icin, sistem
   * sutunlari (__sys_N) kendi yerlerinde birakilir; yonetilebilir olanlar
   * kalan yuvalara yeni sirasiyla yerlestirilir.
   */
  const siraAyarla = useCallback((yeniYonetilirSira) => yaz(p => {
    const tamSira = p.order.length
      ? [...p.order]
      : columns.map((c, i) => kolonAnahtari(c) ?? `__sys_${i}`);
    let j = 0;
    const sonuc = tamSira.map(k =>
      String(k).startsWith('__sys_') ? k : (yeniYonetilirSira[j++] ?? k)
    );
    return { ...p, order: sonuc };
  }), [yaz, columns]);

  const genislikAyarla = useCallback((key, px) => yaz(p => {
    const widths = { ...p.widths };
    if (!px) delete widths[key];
    else widths[key] = Math.max(ASGARI_GENISLIK, Math.min(AZAMI_GENISLIK, Number(px) || 0));
    return { ...p, widths };
  }), [yaz]);

  const sifirla = useCallback(() => yaz(() => ({ ...BOS })), [yaz]);

  return {
    prefs,
    gorunenKolonlar,
    yonetilebilir,
    isLoading: aktif ? isLoading : false,
    kaydediliyor: kaydet.isPending,
    gizleAc,
    sabitle,
    tasi,
    siraAyarla,
    genislikAyarla,
    sifirla,
  };
}
