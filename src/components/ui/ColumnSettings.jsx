import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Columns3, ChevronUp, ChevronDown, Eye, EyeOff, Pin, PinOff, RotateCcw, GripVertical } from 'lucide-react';
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
  siraAyarla,
  genislikAyarla,
  sifirla,
  kaydediliyor,
}) {
  // Panelde sutunlar kayitli sirayla listelenir
  const sirali = React.useMemo(() => {
    const temel = yonetilebilir.filter(c => !c.optional);
    if (!prefs.order.length) return temel;
    return [...temel].sort((a, b) => {
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
  // Ek sutunlar ayri bolumde listelenir: varsayilanda kapali, acilabilir.
  const ekSutunlar = yonetilebilir.filter(c => c.optional);

  // Surukle-birak bitince yeni sirayi kaydet
  const suruklemeBitti = (sonuc) => {
    if (!sonuc.destination || sonuc.destination.index === sonuc.source.index) return;
    const anahtarlar = sirali.map(kolonAnahtari);
    const [tasinan] = anahtarlar.splice(sonuc.source.index, 1);
    anahtarlar.splice(sonuc.destination.index, 0, tasinan);
    siraAyarla?.(anahtarlar);
  };

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
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[340px] p-0 flex flex-col
                   max-h-[var(--radix-popover-content-available-height,80vh)]"
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
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

        <DragDropContext onDragEnd={suruklemeBitti}>
        <Droppable droppableId="sutunlar">
        {(alan) => (
        <div
          ref={alan.innerRef}
          {...alan.droppableProps}
          className="flex-1 min-h-0 overflow-y-auto py-1"
        >
          {sirali.map((col, i) => {
            const k = kolonAnahtari(col);
            const gizli = prefs.hidden.includes(k);
            const sabit = prefs.pinned.includes(k);
            return (
            <Draggable key={k} draggableId={String(k)} index={i}>
            {(tut, durum) => (
              <div
                ref={tut.innerRef}
                {...tut.draggableProps}
                className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-secondary ${durum.isDragging ? 'bg-secondary rounded-lg shadow-md' : ''}`}
              >
                <span
                  {...tut.dragHandleProps}
                  title="Sürükleyerek sırala"
                  className="text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
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

                <button
                  onClick={() => genislikAyarla(k, null)}
                  disabled={!prefs.widths[k]}
                  title={prefs.widths[k] ? 'Genişliği otomatiğe döndür' : 'Genişlik otomatik'}
                  className="h-7 w-[58px] shrink-0 rounded-lg border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary disabled:hover:bg-transparent disabled:cursor-default transition-colors"
                >
                  {prefs.widths[k] ? `${prefs.widths[k]}px` : 'oto'}
                </button>

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
            )}
            </Draggable>
            );
          })}
          {alan.placeholder}
        </div>
        )}
        </Droppable>
        </DragDropContext>

        {ekSutunlar.length > 0 && (
          <div className="shrink-0 border-t border-border max-h-[190px] overflow-y-auto">
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Eklenebilir sütunlar
            </p>
            <div className="pb-1">
              {ekSutunlar.map(col => {
                const k = kolonAnahtari(col);
                const acik = prefs.shown.includes(k);
                return (
                  <label key={k} className="flex items-center gap-2 px-3 py-1.5 text-[13px] cursor-pointer hover:bg-secondary">
                    <input
                      type="checkbox"
                      checked={acik}
                      onChange={() => gizleAc(k, true)}
                      className="rounded border-input"
                    />
                    <span className={acik ? 'text-foreground' : 'text-muted-foreground'}>{basligiYaz(col)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <p className="shrink-0 px-4 py-2.5 border-t border-border text-[11px] leading-relaxed text-muted-foreground">
          Sırayı soldaki tutamaktan sürükleyerek, genişliği tablo başlığının sağ
          kenarından sürükleyerek ayarla.
          Ayarlar yalnızca sana özeldir ve otomatik kaydedilir.
        </p>
      </PopoverContent>
    </Popover>
  );
}
