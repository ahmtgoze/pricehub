import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';

/**
 * useTableColumns — sayfa bazli tablo sutun tercihleri.
 *
 * Kullanici hangi sutunlari gizledi, hangi sirada istiyor, genislikleri ne,
 * hangilerini sola sabitledi — hepsi `user_view_preferences` tablosunda
 * kullaniciya ozel (RLS: created_by = auth.email()) saklanir.
 *
 * prefs sekli:
 *   { hidden: [key], order: [key], widths: { key: px }, pinned: [key] }
 *
 * Sutun kimligi: col.id ?? col.accessor. Ikisi de yoksa sutun "sistem
 * sutunu" sayilir (ornegin secim kutusu): her zaman gorunur, tasinmaz.
 */

export const SABIT_GENISLIK = 160; // sabitlenmis sutun icin varsayilan px
// Asgari genislik: bundan dar yapilamaz. Daralinca metin kirpilmaz,
// alt satira kayar (DataTable'daki whitespace-normal + break-words).
export const ASGARI_GENISLIK = 90;
export const AZAMI_GENISLIK = 600;

/**
 * Sutun kimligi. null donerse sutun "sistem sutunu"dur: gizlenemez,
 * sabitlenemez, panelde listelenmez — ama siradaki yerini korur.
 * Satir secim kutusu (__select) bilerek sistem sutunu sayilir; gizlenmesi
 * toplu islemleri kullanilamaz hale getirirdi.
 */
export const kolonAnahtari = (col) => {
  const k = col?.id ?? col?.accessor ?? null;
  if (k == null) return null;
  return String(k).startsWith('__select') ? null : k;
};

const BOS = { hidden: [], order: [], widths: {}, pinned: [] };

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
  const { gorunenKolonlar, yonetilebilir } = useMemo(() => {
    const anahtarli = columns.map((c, i) => {
      const gercek = kolonAnahtari(c);
      return { col: c, key: gercek ?? `__sys_${i}`, yonetilir: gercek != null };
    });
    const yonetilebilir = anahtarli.filter(x => x.yonetilir).map(x => x.col);
    if (!aktif) return { gorunenKolonlar: columns, yonetilebilir };

    const varsayilanSira = anahtarli.map(x => x.key);
    const sira = prefs.order.length ? prefs.order : varsayilanSira;

    const sirali = [...anahtarli].sort((a, b) => {
      const ia = sira.indexOf(a.key);
      const ib = sira.indexOf(b.key);
      // Kayitli sirada olmayanlar (yeni eklenen sutun) ozgun yerinde kalsin
      if (ia === -1 && ib === -1) return varsayilanSira.indexOf(a.key) - varsayilanSira.indexOf(b.key);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    // Sabitlenenler en sola alinir, kendi aralarinda mevcut sirayla
    const sabitler = sirali.filter(x => x.yonetilir && prefs.pinned.includes(x.key));
    const digerleri = sirali.filter(x => !(x.yonetilir && prefs.pinned.includes(x.key)));

    const gorunur = [...sabitler, ...digerleri]
      .filter(x => !(x.yonetilir && prefs.hidden.includes(x.key)))
      .map(({ col, key, yonetilir }) => {
        const genislik = yonetilir ? prefs.widths[key] : null;
        const sabit = yonetilir && prefs.pinned.includes(key);
        return {
          ...col,
          width: genislik ? `${genislik}px` : (sabit ? `${SABIT_GENISLIK}px` : col.width),
          __pinned: sabit,
          __key: yonetilir ? key : null,
        };
      });

    return { gorunenKolonlar: gorunur, yonetilebilir };
  }, [columns, prefs, aktif]);

  // ── Islemler ──
  const gizleAc = useCallback((key) => yaz(p => ({
    ...p,
    hidden: p.hidden.includes(key) ? p.hidden.filter(k => k !== key) : [...p.hidden, key],
  })), [yaz]);

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
