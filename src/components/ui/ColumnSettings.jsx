import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Columns3, ChevronUp, ChevronDown, Eye, EyeOff, Pin, PinOff, RotateCcw } from 'lucide-react';
import { kolonAnahtari } from '@/lib/useTableColumns';

/**
 * Tablo sutun ayarlari paneli.
 * Gizle/goster, sirala, sola sabitle, genislik — tumu kullaniciya ozel
 * kaydedilir (useTableColumns).
 */
export default function ColumnSettings({
  yonetilebilir,
  prefs,
  gizleAc,
  sabitle,
  tasi,
  genislikAyarla,
  sifirla,
  kaydediliyor,
}) {
  // Panelde sutunlar kayitli sirayla listelenir
  const sirali = React.useMemo(() => {
    if (!prefs.order.length) return yonetilebilir;
    return [...yonetilebilir].sort((a, b) => {
      const ia = prefs.order.indexOf(kolonAnahtari(a));
      const ib = prefs.order.indexOf(kolonAnahtari(b));
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [yonetilebilir, prefs.order]);

  const basligiYaz = (col) => {
    const h = typeof col.header === 'function' ? col.header() : col.header;
    return typeof h === 'string' ? h : (kolonAnahtari(col) || '—');
  };

  const gizliSayisi = prefs.hidden.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Sütunlar
          {gizliSayisi > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {gizliSayisi} gizli
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-[13px] font-semibold text-foreground">Sütun ayarları</p>
          <button
            onClick={sifirla}
            disabled={kaydediliyor}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Varsayılana dön"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Sıfırla
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto py-1">
          {sirali.map((col, i) => {
            const k = kolonAnahtari(col);
            const gizli = prefs.hidden.includes(k);
            const sabit = prefs.pinned.includes(k);
            return (
              <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-secondary">
                <button
                  onClick={() => gizleAc(k)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded"
                  title={gizli ? 'Göster' : 'Gizle'}
                >
                  {gizli ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>

                <span className={`flex-1 min-w-0 truncate text-[13px] ${gizli ? 'text-muted-foreground/60 line-through' : 'text-foreground'}`}>
                  {basligiYaz(col)}
                </span>

                <Input
                  type="number"
                  value={prefs.widths[k] ?? ''}
                  onChange={(e) => genislikAyarla(k, e.target.value)}
                  placeholder="oto"
                  className="h-7 w-[62px] text-xs px-2"
                  title="Genişlik (piksel)"
                />

                <button
                  onClick={() => sabitle(k)}
                  className={`p-1 rounded ${sabit ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title={sabit ? 'Sabitlemeyi kaldır' : 'Sola sabitle'}
                >
                  {sabit ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                </button>

                <div className="flex flex-col">
                  <button
                    onClick={() => tasi(k, 'yukari')}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Yukarı taşı"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => tasi(k, 'asagi')}
                    disabled={i === sirali.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Aşağı taşı"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="px-4 py-2.5 border-t border-border text-[11px] leading-relaxed text-muted-foreground">
          Ayarlar yalnızca sana özeldir ve otomatik kaydedilir.
        </p>
      </PopoverContent>
    </Popover>
  );
}
