/**
 * widgetDuzeni.js — Dashboard widget yerlesiminin SAF cekirdegi.
 *
 * Bilerek hicbir sey import etmiyor (React/veri katmani yok): dogrudan
 * node ile test edilebiliyor. React tarafi useWidgetLayout.js'te.
 *
 * prefs sekli:
 *   { order: [id], hidden: [id], spans: { id: 1|2|3 } }
 *
 * span = widget'in kac sutun kapladigi (Apple widget mantigi):
 *   1 = dar, 2 = orta, 3 = genis (tam satir)
 */

export const EN_DAR = 1;
export const EN_GENIS = 3;

export const BOS_DUZEN = { order: [], hidden: [], spans: {} };

/** span degerini gecerli araliga cekiyor; gecersizse varsayilana donuyor. */
export function spanDuzelt(deger, varsayilan = 1) {
  const n = Number(deger);
  if (!Number.isFinite(n)) return varsayilan;
  return Math.max(EN_DAR, Math.min(EN_GENIS, Math.round(n)));
}

/**
 * Widget tanimlarini kullanici tercihlerine gore duzenler.
 *
 * Kurallar:
 *  - Tercih yoksa cikti girdiyle BIREBIR ayni sirada ve varsayilan span'lerle olur.
 *  - hidden'daki widget'lar cikarilir.
 *  - order uygulanir; order'da olmayan (sonradan eklenen) widget ozgun yerinde kalir.
 *  - spans 1..3 araligina kirpilir.
 *  - sabit: true olan widget gizlenemez ve tasinmaz (ornegin ozet kutulari satiri).
 */
export function hesaplaWidgetDuzeni(tanimlar, prefs) {
  const p = { ...BOS_DUZEN, ...(prefs || {}) };
  const varsayilanSira = tanimlar.map(w => w.id);
  const sira = p.order.length ? p.order : varsayilanSira;

  const sirali = [...tanimlar].sort((a, b) => {
    // Sabit widget'lar her zaman ozgun yerlerinde kalir
    if (a.sabit && b.sabit) return varsayilanSira.indexOf(a.id) - varsayilanSira.indexOf(b.id);
    if (a.sabit) return -1;
    if (b.sabit) return 1;
    const ia = sira.indexOf(a.id);
    const ib = sira.indexOf(b.id);
    if (ia === -1 && ib === -1) return varsayilanSira.indexOf(a.id) - varsayilanSira.indexOf(b.id);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const gorunen = sirali
    .filter(w => w.sabit || !p.hidden.includes(w.id))
    .map(w => ({
      ...w,
      span: w.sabit ? EN_GENIS : spanDuzelt(p.spans[w.id], w.varsayilanSpan ?? 1),
    }));

  return {
    gorunenWidgetlar: gorunen,
    // Panelde listelenecekler: sabit olmayanlar
    yonetilebilir: tanimlar.filter(w => !w.sabit),
    gizliSayisi: tanimlar.filter(w => !w.sabit && p.hidden.includes(w.id)).length,
  };
}
