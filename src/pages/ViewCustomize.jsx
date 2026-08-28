import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  GripVertical, Eye, EyeOff, Pin, PinOff, RotateCcw, ArrowRight,
  Sparkles, LayoutGrid, Store, FileSpreadsheet, Palette, Table2, Trash2,
} from 'lucide-react';
import { TABLO_KAYITLARI, kayitBul } from '@/lib/tabloKayitlari';
import { useTableColumns, ASGARI_GENISLIK, AZAMI_GENISLIK, SABIT_GENISLIK } from '@/lib/useTableColumns';
import { useWidgetLayout } from '@/lib/useWidgetLayout';
import { useTheme } from '@/lib/useTheme';

/**
 * Görünümü Özelleştir — tasarım prototipindeki merkezi panel.
 *
 * Beş sekme: Tablo Sütunları · Dashboard Widget · Platform Kartları ·
 * Excel Şablonları · Görünüm ve Tema.
 *
 * Sütun genişliği burada kaydırıcıyla, tabloda ise başlık kenarından
 * sürükleyerek ayarlanır; ikisi de aynı tercihi (prefs.widths) yazdığı için
 * birbirine bağlıdır — birinde değiştirdiğin diğerinde de görünür.
 */

const SEKMELER = [
  { id: 'sutunlar', ad: 'Tablo Sütunları', icon: Table2 },
  { id: 'widget', ad: 'Dashboard Widget', icon: LayoutGrid },
  { id: 'platform', ad: 'Platform Kartları', icon: Store },
  { id: 'excel', ad: 'Excel Şablonları', icon: FileSpreadsheet },
  { id: 'tema', ad: 'Görünüm ve Tema', icon: Palette },
];

// Dashboard kutulari — Dashboard.jsx'teki widgetTanimlari ile ayni anahtarlar.
const DASHBOARD_KUTULARI = [
  { id: 'kpi-urun', baslik: 'Aktif Ürün', varsayilanSpan: 1 },
  { id: 'kpi-platform', baslik: 'Platform', varsayilanSpan: 1 },
  { id: 'kpi-fiyat', baslik: 'Hesaplanan Fiyat', varsayilanSpan: 1 },
  { id: 'kpi-fiyatlanmamis', baslik: 'Fiyatlanmamış', varsayilanSpan: 1 },
  { id: 'kar-ozeti', baslik: 'Kâr Özeti', varsayilanSpan: 1 },
  { id: 'kar-dagilimi', baslik: 'Kâr Oranı Dağılımı', varsayilanSpan: 2 },
  { id: 'platform-ozeti', baslik: 'Platform Bazlı Kâr Özeti', varsayilanSpan: 4 },
  { id: 'tarihe-gore', baslik: 'Tarihe Göre Eklenen Ürünler', varsayilanSpan: 1 },
  { id: 'listelenmeyen', baslik: 'Platformda Listelenmeyen Ürünler', varsayilanSpan: 1 },
];

export default function ViewCustomize() {
  const [sekme, setSekme] = React.useState('sutunlar');
  const [seciliTablo, setSeciliTablo] = React.useState(TABLO_KAYITLARI[0]?.anahtar);

  return (
    <div className="ph-page mx-auto">
      <div className="ph-head">
        <div>
          <h1 className="ph-title">Görünümü Özelleştir</h1>
          <p className="ph-subtitle">
            Değişiklikler yalnızca kendi hesabınızı etkiler · otomatik kaydedilir
          </p>
        </div>
        <div className="flex items-center gap-2 h-9 px-[15px] rounded-[11px] bg-primary text-primary-foreground text-[13px] font-medium">
          <Sparkles className="h-4 w-4" />
          Özelleştirme açık
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex flex-wrap gap-1 rounded-[12px] bg-secondary p-1 w-fit">
        {SEKMELER.map(s => (
          <button
            key={s.id}
            onClick={() => setSekme(s.id)}
            className={`flex items-center gap-1.5 h-[34px] px-[13px] rounded-[10px] text-[13px] font-medium transition-colors ${
              sekme === s.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.ad}
          </button>
        ))}
      </div>

      {sekme === 'sutunlar' && (
        <SutunSekmesi seciliTablo={seciliTablo} setSeciliTablo={setSeciliTablo} />
      )}
      {sekme === 'widget' && <WidgetSekmesi />}
      {sekme === 'platform' && <PlatformSekmesi />}
      {sekme === 'excel' && <ExcelSekmesi />}
      {sekme === 'tema' && <TemaSekmesi />}
    </div>
  );
}

/* ─────────────────────────── Tablo Sütunları ─────────────────────────── */

function SutunSekmesi({ seciliTablo, setSeciliTablo }) {
  const kayit = kayitBul(seciliTablo);

  return (
    <>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Sayfa</p>
        <div className="flex flex-wrap gap-2">
          {TABLO_KAYITLARI.map(t => (
            <button
              key={t.anahtar}
              onClick={() => setSeciliTablo(t.anahtar)}
              className={`h-8 px-[13px] rounded-[10px] text-[12.5px] font-medium transition-colors ${
                seciliTablo === t.anahtar
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {t.ad}
            </button>
          ))}
        </div>
      </div>

      {kayit ? <TabloDuzenleyici key={kayit.anahtar} kayit={kayit} /> : null}
    </>
  );
}

function TabloDuzenleyici({ kayit }) {
  const {
    prefs, gizleAc, sabitle, siraAyarla, genislikAyarla, sifirla, kaydediliyor,
    gorunenKolonlar,
  } = useTableColumns(kayit.anahtar, kayit.sutunlar);

  // Panelde gosterilecek siralama: kayitli sira, yoksa tanim sirasi
  const sirali = React.useMemo(() => {
    const temel = kayit.sutunlar.filter(c => !c.optional);
    if (!prefs.order.length) return temel;
    return [...temel].sort((a, b) => {
      const ia = prefs.order.indexOf(a.id);
      const ib = prefs.order.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [kayit.sutunlar, prefs.order]);

  const eklenebilir = kayit.sutunlar.filter(c => c.optional);
  const gorunurSayi = gorunenKolonlar.filter(c => c.__key).length;
  const sabitSayi = prefs.pinned.length;

  const suruklemeBitti = (sonuc) => {
    if (!sonuc.destination || sonuc.destination.index === sonuc.source.index) return;
    const idler = sirali.map(c => c.id);
    const [tasinan] = idler.splice(sonuc.source.index, 1);
    idler.splice(sonuc.destination.index, 0, tasinan);
    siraAyarla(idler);
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-foreground">{kayit.ad} tablosu</p>
          <p className="mt-[3px] text-[13px] text-muted-foreground">
            {gorunurSayi} sütun görünür · {sabitSayi} sütun sabit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={sifirla} disabled={kaydediliyor}>
            <RotateCcw className="h-3.5 w-3.5" />
            Görünümü Sıfırla
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to={createPageUrl(kayit.sayfa)}>
              Sayfaya git <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Görünen sütunlar */}
      <div className="ph-panel">
        <div className="ph-panel-head">
          <div>
            <p className="text-[13.5px] font-semibold text-foreground">
              Sütunlar <span className="text-muted-foreground font-normal">{sirali.length}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sürükleyerek sırala · görünürlüğü, genişliği ve sabitlemeyi buradan yönet
            </p>
          </div>
        </div>

        <DragDropContext onDragEnd={suruklemeBitti}>
          <Droppable droppableId={`sutunlar-${kayit.anahtar}`}>
            {(alan) => (
              <div ref={alan.innerRef} {...alan.droppableProps} className="divide-y divide-border">
                {sirali.map((col, i) => (
                  <Draggable key={col.id} draggableId={col.id} index={i}>
                    {(tut, durum) => (
                      <SutunSatiri
                        col={col}
                        tut={tut}
                        suruklenuyor={durum.isDragging}
                        gizli={prefs.hidden.includes(col.id)}
                        sabit={prefs.pinned.includes(col.id)}
                        genislik={prefs.widths[col.id]}
                        gizleAc={gizleAc}
                        sabitle={sabitle}
                        genislikAyarla={genislikAyarla}
                      />
                    )}
                  </Draggable>
                ))}
                {alan.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Bağlanabilir veri sütunları */}
      {eklenebilir.length > 0 && (
        <div className="ph-panel">
          <div className="ph-panel-head">
            <div>
              <p className="text-[13.5px] font-semibold text-foreground">
                Bağlanabilir veri sütunları <span className="text-muted-foreground font-normal">{eklenebilir.length}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Varsayılanda gizli · işaretleyince tabloya eklenir
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {eklenebilir.map(col => {
              const acik = prefs.shown.includes(col.id);
              return (
                <label key={col.id} className="flex items-center gap-3 px-5 py-[11px] cursor-pointer hover:bg-secondary">
                  <input
                    type="checkbox"
                    checked={acik}
                    onChange={() => gizleAc(col.id, true)}
                    className="rounded border-input"
                  />
                  <span className={`flex-1 text-[13.5px] ${acik ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {col.etiket}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70">veri alanı</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function SutunSatiri({ col, tut, suruklenuyor, gizli, sabit, genislik, gizleAc, sabitle, genislikAyarla }) {
  // Kaydiricinin anlik degeri; birakinca kaydedilir (her pikselde yazma olmasin)
  const [anlik, setAnlik] = React.useState(null);
  const gosterilen = anlik ?? genislik ?? '';

  return (
    <div
      ref={tut.innerRef}
      {...tut.draggableProps}
      className={`flex items-center gap-3 px-5 py-[11px] ${suruklenuyor ? 'bg-secondary' : 'hover:bg-secondary'}`}
    >
      <span {...tut.dragHandleProps} className="text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing" title="Sürükleyerek sırala">
        <GripVertical className="h-4 w-4" />
      </span>

      <span className={`flex-1 min-w-0 truncate text-[13.5px] ${gizli ? 'text-muted-foreground/60 line-through' : 'text-foreground'}`}>
        {col.etiket}
      </span>

      {/* Genişlik: kaydırıcı. Tablodaki başlık kenarından sürükleme ile
          aynı tercihi yazar, ikisi birbirine bağlıdır. */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-[52px] text-right text-[11.5px] text-muted-foreground tabular-nums">
          {gosterilen ? `${gosterilen}px` : 'oto'}
        </span>
        <input
          type="range"
          min={ASGARI_GENISLIK}
          max={AZAMI_GENISLIK}
          step={10}
          value={gosterilen || SABIT_GENISLIK}
          onChange={(e) => setAnlik(Number(e.target.value))}
          onMouseUp={() => { if (anlik != null) { genislikAyarla(col.id, anlik); setAnlik(null); } }}
          onTouchEnd={() => { if (anlik != null) { genislikAyarla(col.id, anlik); setAnlik(null); } }}
          className="w-[110px] accent-foreground cursor-pointer"
          title="Genişlik"
        />
        <button
          onClick={() => genislikAyarla(col.id, null)}
          disabled={!genislik}
          className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30"
          title="Otomatiğe döndür"
        >
          oto
        </button>
      </div>

      <button
        onClick={() => sabitle(col.id)}
        className={`p-1 rounded ${sabit ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        title={sabit ? 'Sabitlemeyi kaldır' : 'Sola sabitle'}
      >
        {sabit ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
      </button>

      <button
        onClick={() => gizleAc(col.id)}
        className="p-1 rounded text-muted-foreground hover:text-foreground"
        title={gizli ? 'Göster' : 'Gizle'}
      >
        {gizli ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ─────────────────────────── Dashboard Widget ─────────────────────────── */

const BOYUT_ADLARI = { 1: 'Dar', 2: 'Orta', 3: 'Geniş' };

function WidgetSekmesi() {
  const { prefs, gizleAc, boyutAyarla, siraAyarla, sifirla, kaydediliyor } =
    useWidgetLayout('dashboard', DASHBOARD_KUTULARI);

  const sirali = React.useMemo(() => {
    if (!prefs.order.length) return DASHBOARD_KUTULARI;
    return [...DASHBOARD_KUTULARI].sort((a, b) => {
      const ia = prefs.order.indexOf(a.id);
      const ib = prefs.order.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [prefs.order]);

  const suruklemeBitti = (sonuc) => {
    if (!sonuc.destination || sonuc.destination.index === sonuc.source.index) return;
    const idler = sirali.map(w => w.id);
    const [tasinan] = idler.splice(sonuc.source.index, 1);
    idler.splice(sonuc.destination.index, 0, tasinan);
    siraAyarla(idler);
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-foreground">Dashboard kutuları</p>
          <p className="mt-[3px] text-[13px] text-muted-foreground">
            Sürükleyerek sırala · boyutu Dar / Orta / Geniş olarak ayarla
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={sifirla} disabled={kaydediliyor}>
            <RotateCcw className="h-3.5 w-3.5" /> Düzeni Sıfırla
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to={createPageUrl('Dashboard')}>Dashboard'a git <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </div>

      <div className="ph-panel">
        <DragDropContext onDragEnd={suruklemeBitti}>
          <Droppable droppableId="dashboard-kutulari">
            {(alan) => (
              <div ref={alan.innerRef} {...alan.droppableProps} className="divide-y divide-border">
                {sirali.map((w, i) => {
                  const gizli = prefs.hidden.includes(w.id);
                  const span = prefs.spans[w.id] ?? w.varsayilanSpan;
                  return (
                    <Draggable key={w.id} draggableId={w.id} index={i}>
                      {(tut, durum) => (
                        <div
                          ref={tut.innerRef}
                          {...tut.draggableProps}
                          className={`flex items-center gap-3 px-5 py-[11px] ${durum.isDragging ? 'bg-secondary' : 'hover:bg-secondary'}`}
                        >
                          <span {...tut.dragHandleProps} className="text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <span className={`flex-1 min-w-0 truncate text-[13.5px] ${gizli ? 'text-muted-foreground/60 line-through' : 'text-foreground'}`}>
                            {w.baslik}
                          </span>
                          <div className="flex items-center gap-1 rounded-[9px] bg-secondary p-0.5">
                            {[1, 2, 3].map(b => (
                              <button
                                key={b}
                                onClick={() => boyutAyarla(w.id, b)}
                                className={`px-2 h-6 rounded-[7px] text-[11.5px] font-medium transition-colors ${
                                  span === b ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {BOYUT_ADLARI[b]}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => gizleAc(w.id)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground"
                            title={gizli ? 'Göster' : 'Gizle'}
                          >
                            {gizli ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
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
      </div>
    </>
  );
}

/* ─────────────────────────── Platform Kartları ─────────────────────────── */

function PlatformSekmesi() {
  const { data: platformlar = [], isLoading } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => db.entities.Platform.list(),
  });

  const benzersiz = React.useMemo(() => {
    const gorulen = new Map();
    for (const p of platformlar) if (!gorulen.has(p.platform_type)) gorulen.set(p.platform_type, p);
    return [...gorulen.values()];
  }, [platformlar]);

  const renk = { trendyol: '#F27A1B', hepsiburada: '#7B2D9B', website: '#6e6e73' };

  return (
    <>
      <div>
        <p className="text-[15px] font-semibold text-foreground">Platform kartları</p>
        <p className="mt-[3px] text-[13px] text-muted-foreground">
          Hangi platformların Dashboard ve Fiyatlar sayfasında görüneceği, platformun
          aktif olup olmamasına bağlıdır.
        </p>
      </div>

      <div className="ph-panel">
        {isLoading ? (
          <p className="ph-empty">Yükleniyor…</p>
        ) : benzersiz.length === 0 ? (
          <p className="ph-empty">Platform bulunamadı</p>
        ) : (
          <div className="divide-y divide-border">
            {benzersiz.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-[13px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: renk[p.platform_type] || '#6e6e73' }} />
                <span className="flex-1 text-[13.5px] text-foreground">{p.name}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  p.is_active !== false ? 'bg-secondary text-foreground' : 'bg-secondary text-muted-foreground'
                }`}>
                  {p.is_active !== false ? 'Aktif' : 'Pasif'}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-border p-3">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to={createPageUrl('Platforms')}>
              Platformlar sayfasında düzenle <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── Excel Şablonları ─────────────────────────── */

function ExcelSekmesi() {
  const qc = useQueryClient();
  const { data: sablonlar = [], isLoading } = useQuery({
    queryKey: ['exportTemplates', 'tumu'],
    queryFn: () => db.entities.ExportTemplate.list('-created_at', 200),
  });

  const sil = useMutation({
    mutationFn: (id) => db.entities.ExportTemplate.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exportTemplates'] });
      toast.success('Şablon silindi');
    },
    onError: (e) => toast.error(e?.message || 'Silinemedi'),
  });

  const sayfaAdi = (anahtar) => kayitBul(anahtar)?.ad || anahtar;

  return (
    <>
      <div>
        <p className="text-[15px] font-semibold text-foreground">Excel şablonların</p>
        <p className="mt-[3px] text-[13px] text-muted-foreground">
          Standart şablon her zaman durur ve silinemez. Burada yalnızca kendi
          oluşturduğun şablonlar listelenir; yenisini tablonun "Dışa Aktar"
          menüsünden oluşturursun.
        </p>
      </div>

      <div className="ph-panel">
        {isLoading ? (
          <p className="ph-empty">Yükleniyor…</p>
        ) : sablonlar.length === 0 ? (
          <p className="ph-empty">Henüz kendi şablonun yok — standart şablon kullanılıyor</p>
        ) : (
          <div className="divide-y divide-border">
            {sablonlar.map(sb => (
              <div key={sb.id} className="flex items-center gap-3 px-5 py-[13px]">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-foreground truncate">{sb.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sayfaAdi(sb.page_key)} · {(sb.fields?.length || 0)} sütun · {String(sb.format).toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`"${sb.name}" şablonu silinsin mi? Standart şablon etkilenmez.`)) sil.mutate(sb.id);
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary"
                  title="Şablonu sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────── Görünüm ve Tema ─────────────────────────── */

function TemaSekmesi() {
  const { tema, setTema } = useTheme();
  const qc = useQueryClient();

  const { data: kayitlar = [] } = useQuery({
    queryKey: ['userViewPreferences', 'tumu'],
    queryFn: () => db.entities.UserViewPreference.list('-created_at', 200),
  });

  const hepsiniSifirla = useMutation({
    mutationFn: async () => {
      await Promise.all(kayitlar.map(k => db.entities.UserViewPreference.delete(k.id)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userViewPreferences'] });
      toast.success('Tüm görünüm ayarları varsayılana döndürüldü');
    },
    onError: (e) => toast.error(e?.message || 'Sıfırlanamadı'),
  });

  const secenekler = [
    { id: 'acik', ad: 'Açık' },
    { id: 'koyu', ad: 'Koyu' },
    { id: 'sistem', ad: 'Sistem' },
  ];

  return (
    <>
      <div className="ph-card space-y-3">
        <div>
          <p className="text-[15px] font-semibold text-foreground">Tema</p>
          <p className="mt-[3px] text-[13px] text-muted-foreground">
            Tercih bu tarayıcıda saklanır, veritabanına yazılmaz.
          </p>
        </div>
        <div className="flex gap-1 rounded-[11px] bg-secondary p-1 w-fit">
          {secenekler.map(s => (
            <button
              key={s.id}
              onClick={() => setTema(s.id)}
              className={`h-8 px-4 rounded-[9px] text-[13px] font-medium transition-colors ${
                tema === s.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.ad}
            </button>
          ))}
        </div>
      </div>

      <div className="ph-card space-y-3">
        <div>
          <p className="text-[15px] font-semibold text-foreground">Tüm görünüm ayarlarını sıfırla</p>
          <p className="mt-[3px] text-[13px] text-muted-foreground">
            Bütün tabloların sütun düzeni ve Dashboard kutu yerleşimi ilk hâline döner.
            Şu an <strong className="text-foreground">{kayitlar.length}</strong> kayıtlı görünüm var.
            Verilerine dokunulmaz.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={kayitlar.length === 0 || hepsiniSifirla.isPending}
          onClick={() => {
            if (window.confirm('Tüm görünüm ayarları varsayılana döndürülsün mü?')) hepsiniSifirla.mutate();
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Hepsini Sıfırla
        </Button>
      </div>
    </>
  );
}
