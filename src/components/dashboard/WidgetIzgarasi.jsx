import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { LayoutGrid, GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useWidgetLayout } from '@/lib/useWidgetLayout';

/**
 * WidgetIzgarasi — Dashboard kutularini tasinabilir ve boyutlandirilabilir yapar.
 *
 * Kutular 3 sutunluk bir izgaraya oturur. Her kutunun boyutu (Apple widget
 * mantigi): dar = 1 sutun, orta = 2, geniş = 3 (tam satir).
 * Duzen kullaniciya ozel saklanir; "Sıfırla" ilk hale dondurur.
 * Mobilde tek sutun — boyutlar yok sayilir.
 *
 * tanimlar: [{ id, baslik, varsayilanSpan, sabit?, icerik: ReactNode }]
 */

const BOYUTLAR = [
  { span: 1, ad: 'Dar' },
  { span: 2, ad: 'Orta' },
  { span: 3, ad: 'Geniş' },
];

const SPAN_SINIFI = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
};

export default function WidgetIzgarasi({ pageKey, tanimlar }) {
  const {
    gorunenWidgetlar,
    yonetilebilir,
    gizliSayisi,
    prefs,
    gizleAc,
    boyutAyarla,
    siraAyarla,
    sifirla,
    kaydediliyor,
  } = useWidgetLayout(pageKey, tanimlar);

  const [duzenModu, setDuzenModu] = React.useState(false);

  // Tasinabilir olanlar (sabit kutular izgaranin disinda, kendi yerinde durur)
  const tasinabilir = gorunenWidgetlar.filter(w => !w.sabit);
  const sabitler = gorunenWidgetlar.filter(w => w.sabit);

  const suruklemeBitti = (sonuc) => {
    if (!sonuc.destination || sonuc.destination.index === sonuc.source.index) return;
    const idler = tasinabilir.map(w => w.id);
    const [tasinan] = idler.splice(sonuc.source.index, 1);
    idler.splice(sonuc.destination.index, 0, tasinan);
    siraAyarla(idler);
  };

  const kutuIcerik = (w, tutamak) => (
    <div className="relative h-full flex flex-col [&>*]:flex-1">
      {duzenModu && (
        <div className="absolute -top-2 right-2 z-10 flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-1 shadow-sm">
          <span {...(tutamak || {})} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" title="Sürükleyerek taşı">
            <GripVertical className="h-4 w-4" />
          </span>
          {BOYUTLAR.map(b => (
            <button
              key={b.span}
              onClick={() => boyutAyarla(w.id, b.span)}
              className={`px-1.5 h-6 rounded-md text-[11px] font-medium transition-colors ${
                w.span === b.span ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              }`}
              title={`${b.ad} (${b.span} sütun)`}
            >
              {b.ad}
            </button>
          ))}
          <button
            onClick={() => gizleAc(w.id)}
            className="px-1 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            title="Gizle"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {w.icerik}
    </div>
  );

  return (
    <>
      {/* Sabit kutular (ust ozet satiri) — duzenlenmez */}
      {sabitler.map(w => <React.Fragment key={w.id}>{w.icerik}</React.Fragment>)}

      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Düzen
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
            className="w-[320px] p-0 flex flex-col
                       max-h-[var(--radix-popover-content-available-height,80vh)]"
          >
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-[13px] font-semibold text-foreground">Dashboard düzeni</p>
              <button
                onClick={sifirla}
                disabled={kaydediliyor}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="Varsayılana dön"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Sıfırla
              </button>
            </div>

            <label className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border text-[13px] cursor-pointer hover:bg-secondary">
              <input
                type="checkbox"
                checked={duzenModu}
                onChange={(e) => setDuzenModu(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-foreground">Düzenleme modu</span>
              <span className="text-xs text-muted-foreground">— taşı ve boyutlandır</span>
            </label>

            <div className="flex-1 min-h-0 overflow-y-auto py-1">
              {yonetilebilir.map(w => {
                const gizli = prefs.hidden.includes(w.id);
                return (
                  <div key={w.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary">
                    <button
                      onClick={() => gizleAc(w.id)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded"
                      title={gizli ? 'Göster' : 'Gizle'}
                    >
                      {gizli ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <span className={`flex-1 min-w-0 truncate text-[13px] ${gizli ? 'text-muted-foreground/60 line-through' : 'text-foreground'}`}>
                      {w.baslik}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="shrink-0 px-4 py-2.5 border-t border-border text-[11px] leading-relaxed text-muted-foreground">
              Düzenleme modunda kutuları sürükleyerek taşı, Dar/Orta/Geniş ile boyutlandır.
              Düzen yalnızca sana özeldir.
            </p>
          </PopoverContent>
        </Popover>
      </div>

      <DragDropContext onDragEnd={suruklemeBitti}>
        <Droppable droppableId="dashboard-widgetlari" direction="vertical">
          {(alan) => (
            <div
              ref={alan.innerRef}
              {...alan.droppableProps}
              className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            >
              {tasinabilir.map((w, i) => (
                <Draggable key={w.id} draggableId={w.id} index={i} isDragDisabled={!duzenModu}>
                  {(tut, durum) => (
                    <div
                      ref={tut.innerRef}
                      {...tut.draggableProps}
                      className={`${SPAN_SINIFI[w.span] || 'lg:col-span-1'} h-full ${durum.isDragging ? 'opacity-90' : ''}`}
                    >
                      {kutuIcerik(w, tut.dragHandleProps)}
                    </div>
                  )}
                </Draggable>
              ))}
              {alan.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </>
  );
}
