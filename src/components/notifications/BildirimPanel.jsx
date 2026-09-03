import React from 'react';
import { db } from '@/api/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlarmClock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const TR = { timeZone: 'Europe/Istanbul' };
const zaman = (iso) => {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.toLocaleDateString('tr-TR', { ...TR, day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('tr-TR', { ...TR, hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Kullaniciya ozel sistem bildirimleri (bildirimler tablosu).
 *
 * Ilk kullanim: tarife penceresi hatirlatmasi. Sunucudaki saatlik is
 * (tarife_pencere_bildirimi_uret) her pencere icin iki bildirim uretir:
 * onceki gun 17:00 ve pencere basladiginda. YALNIZCA kendi tarife dosyasini
 * yuklemis kullanicilara gider (kullanici karari, 4 Eylul 2026).
 */
export default function BildirimPanel({ user, bildirimler = [] }) {
  const qc = useQueryClient();
  const yenile = () => qc.invalidateQueries({ queryKey: ['bildirimler', user?.email] });

  const okunduYap = useMutation({
    mutationFn: (id) => db.entities.Bildirim.update(id, { okundu: true, okunma_tarihi: new Date().toISOString() }),
    onSuccess: yenile,
  });
  const hepsiniOku = useMutation({
    mutationFn: async () => {
      const okunmayan = bildirimler.filter((b) => !b.okundu);
      await Promise.all(okunmayan.map((b) => db.entities.Bildirim.update(b.id, { okundu: true, okunma_tarihi: new Date().toISOString() })));
    },
    onSuccess: yenile,
  });

  if (bildirimler.length === 0) return null;
  const okunmayanSayisi = bildirimler.filter((b) => !b.okundu).length;

  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <AlarmClock className="h-3.5 w-3.5" />Hatırlatmalar
          {okunmayanSayisi > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full normal-case tracking-normal">{okunmayanSayisi}</span>}
        </div>
        {okunmayanSayisi > 0 && (
          <button onClick={() => hepsiniOku.mutate()} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Check className="h-3 w-3" />Tümünü okundu say
          </button>
        )}
      </div>
      <ul className="max-h-64 overflow-y-auto">
        {bildirimler.map((b) => (
          <li key={b.id}>
            <button
              onClick={() => { if (!b.okundu) okunduYap.mutate(b.id); }}
              className={cn(
                'w-full text-left px-4 py-2.5 border-t border-border/60 transition-colors hover:bg-secondary/60',
                b.okundu ? 'opacity-70' : 'bg-primary/5'
              )}
            >
              <div className="flex items-start gap-2">
                {!b.okundu && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground break-words">{b.baslik}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{b.icerik}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{zaman(b.created_at)}</p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
