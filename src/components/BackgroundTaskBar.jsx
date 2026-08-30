import React from 'react';
import { Loader2 } from 'lucide-react';
import { useBackgroundTask } from '@/lib/BackgroundTaskContext';

/**
 * Ust bardaki islem seridi.
 *
 * Kullanici ilerleme penceresini kapatinca islem gorunmez olmasin diye
 * var: hangi sayfaya giderse gitsin ustte "... %68" seklinde durur.
 * Pencere acikken gizlenir — ayni bilgiyi iki yerde tekrar etmemek icin.
 *
 * Salt bilgi verir; tiklanabilir bir sey degildir. Isi bitince
 * finishTask() ile kendiliginden kaybolur.
 */
export default function BackgroundTaskBar() {
  const { task, yuzde, panelAcik } = useBackgroundTask() || {};

  if (!task || panelAcik) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 h-8 pl-2.5 pr-3 rounded-full
                 border border-border bg-secondary
                 text-[12.5px] font-medium text-foreground
                 max-w-[min(60vw,340px)]"
    >
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      <span className="truncate">{task.name}</span>
      {yuzde !== null && (
        <span className="shrink-0 tabular-nums font-semibold">%{yuzde}</span>
      )}
    </div>
  );
}
