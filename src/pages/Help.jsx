import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { PAGES } from '@/lib/helpContent';
import { Package, FolderTree, Store, Truck, Percent, BadgeDollarSign, Tag,
  ChevronDown, ChevronRight, ExternalLink, ArrowRight,
  BookOpen, Map, CheckCheck
} from 'lucide-react';

// ─── Küçük bileşenler ────────────────────────────────────────────────────────

function StepBadge({ n }) {
  return (
    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
      {n}
    </span>
  );
}

function InfoNote({ children }) {
  return (
    <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground leading-relaxed mt-3">
      {children}
    </div>
  );
}

function FAQ({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="mt-3 space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-card hover:bg-secondary transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-medium text-foreground">{item.q}</span>
            {open === i
              ? <ChevronDown className="w-4 h-4 text-muted-foreground/70 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0" />}
          </button>
          {open === i && (
            <div className="px-4 py-3 text-sm text-muted-foreground bg-secondary border-t border-border leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Kurulum Adımları ────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  {
    id: 1,
    title: 'Platformları Yapılandır',
    page: 'Platforms',
    icon: Store,
    desc: 'Trendyol, Hepsiburada ve Web Sitesi için kargo firması, barem ve aktiflik ayarlarını yap.',
    items: [
      '"Platformlar" sayfasına git.',
      'Her platform için "Tüm Ayarlar" butonuna tıkla.',
      'Kargo firması adını seç',
      '"Kurumlar (Gelir) Vergisi" oranın farklı ise güncelle',
      'Aynı gün kargoya verdiğin ürünler var ise Bugün Kargoda özelliğini aktif et',
      'Satmadığın platformları pasif yap.',
    ],
    tip: 'Stopaj, hizmet bedeli ve barem aralıkları admin tarafından platformlara bağlı olarak ayrıca tanımlanır.',
  },
  {
    id: 2,
    title: 'Kategorileri Ekle',
    page: 'Categories',
    icon: FolderTree,
    desc: 'Ürün gruplarını ve KDV oranlarını tanımla. Komisyon hesaplamasının temel referansıdır.',
    items: [
      '"Kategoriler" sayfasına git.',
      '"+ Yeni Kategori" butonuna tıkla.',
      'Kategori adını gir (örn: Kargo Poşeti, Etiket, Karton Kutu).',
      'KDV oranını seç (%1, %10 veya %20).',
      'Tüm ürün grupların için tekrarla.',
    ],
    tip: 'Kategoriler tanımlanmadan komisyon eklenemez. Bu adımı atlama.',
  },
  {
    id: 3,
    title: 'Kargo Tarifelerini Gir',
    page: 'ShippingRates',
    icon: Truck,
    desc: 'Platformun sunduğu anlaşmalı kargo firmaları ve tarifeleri admin tarafından tanımlanır. Kendi kargo anlaşmanı kullanacaksan, fiyatlarını sisteme manuel veya Excel ile yükleyebilirsin.',
    items: [
      'Kendi anlaşmalı kargo ücretlerini kullanacaksan Kargo Tarifeleri sayfasına git.',
      'Tarife giriş yöntemini seç: Manuel Tarife Ekle ile fiyatlarını tek tek ekle ya da Excel ile Yükle seçeneğiyle toplu yükleme yap.',
      'Excel ile yükleme yapacaksan Dışa Aktar → Boş Şablon İndir adımlarını izleyerek şablonu indir.',
      'Şablonu doldurduktan sonra Excel ile Yükle seçeneğiyle sisteme aktar.',
    ],
    tip: 'Manuel anlaşmalı tarifelerde barem sistemi kullanılmaz. Bu tarifelerin kullanılabilmesi için Platformlar sayfasından ilgili kargo firması seçilmelidir.',
  },
  {
    id: 4,
    title: 'Komisyonları Gir',
    page: 'Commissions',
    icon: Percent,
    desc: 'Her platform × kategori için komisyon oranı ve hedef kâr marjı belirle.',
    items: [
      '"Komisyonlar" sayfasına git.',
      '"+ Yeni Komisyon" butonuna tıkla.',
      'Platform ve kategori seç.',
      'Komisyon oranını KDV dahil gir. Örn: Trendyol komisyonu KDV dahildir. HepsiBurada için %20 KDV ekleyerek gir.',
      'Hedef kâr oranını gir (örn: %80). Sistem bu orana göre satış fiyatı hesaplar.',
      'Tüm platform × kategori kombinasyonları için tekrarla.',
    ],
    tip: 'Her platform için her kategori ayrı bir komisyon satırı gerektirir.',
  },
  {
    id: 5,
    title: 'Paketleme Maliyetlerini Gir',
    page: 'PackageManagement',
    icon: Package,
    desc: 'Kargo poşeti, kutu, etiket gibi malzemelerin maliyetini tanımla.',
    items: [
      '"Paketleme" sayfasına git.',
      '"+ Yeni Paket" ile paket grubu oluştur (örn: Küçük Poşet).',
      'Min ve Max desi aralığını gir — bu aralıktaki ürünlere otomatik atanır. Eğer desi aralığı seçilmez ise manuel olarak ürünlere atama yapabilirsin',
      'Paket içine malzeme ekle (Poşet, Etiket, Bant…).',
      'Her malzemenin KDV dahil birim maliyetini gir.',
    ],
    tip: 'Opsiyonel ama önerilen. Girilmezse paketleme maliyeti sıfır alınır ve fiyat hesabı eksik kalır.',
  },
  {
    id: 6,
    title: 'Ürünleri Ekle',
    page: 'Products',
    icon: Package,
    desc: 'Ürün kataloğunu tek tek veya Excel ile toplu yükle.',
    items: [
      '"Ürünler" sayfasına git.',
      'Tekil ekleme: "+ Yeni Ürün" butonuyla SKU, maliyet, desi ve kategori gir.',
      'Toplu ekleme: "Excel İşlemleri → Şablon İndir" ile şablonu doldur, "Yükle" ile aktar.',
      'Ürün Zinciri (opsiyonel): Aynı ürünün farklı adetli varyantlarını birbirine bağla.',
      'Referans Ürün (opsiyonel): Ucuz ürünün maliyetinden pahalı ürünün baz maliyetini otomatik hesaplat.',
    ],
    tip: 'Excel ile yüklemede mevcut SKU\'lar güncellenir, yeni SKU\'lar eklenir. Çift kayıt oluşmaz.',
  },
  {
    id: 7,
    title: 'Fiyatları Hesapla',
    page: 'Prices',
    icon: BadgeDollarSign,
    desc: '"Fiyatları Hesapla" butonuna bas — tüm ürünler için platform bazlı fiyatlar otomatik çıkar.',
    items: [
      '"Fiyatlar" sayfasına git.',
      '"Fiyatları Hesapla" butonuna tıkla.',
      'İşlem tamamlanana kadar bekle.',
      'Aktif platformlar için fiyatları gör (pasif platformların fiyatı hesaplanmaz).',
      'Bir ürüne tıklayarak detaylı kâr dökümünü incele (maliyet, komisyon, KDV, stopaj, hizmet bedeli, kargo, paketleme, kurumlar(gelir) vergisi).',
    ],
    tip: 'Maliyet değiştirince "Fiyatları Hesapla" tekrar basılmalıdır. Fiyatlar otomatik güncellenmez.',
  },
  {
    id: 8,
    title: 'Pazaryeri Verilerini Yükle',
    page: 'MarketplaceProducts',
    icon: Store,
    desc: 'Trendyol/Hepsiburada panelinden indirdiğin ürün listesini yükle ve sistemiyle eşleştir.',
    items: [
      'Trendyol veya Hepsiburada panelinden ürün listesi Excel\'ini indir.',
      '"Pazaryeri Ürünleri" sayfasına git.',
      'Platformu seç ve Excel\'i yükle.',
      'Ürünleri sistemimizdeki master ürünlerle eşleştir (otomatik veya manuel).',
      'Eşleştirmeyi mutlaka gözden geçir.',
    ],
    tip: 'Hatalı eşleştirme yanlış fiyat güncellemesine yol açabilir. Otomatik eşleştirme sonrası kontrol zorunludur.',
  },
  {
    id: 9,
    title: 'Fiyatları İndir ve Platforma Yükle',
    page: 'UpdatedPrices',
    icon: Tag,
    desc: 'Hesaplanan güncel fiyatları platform formatında indir, pazaryerine yükle.',
    items: [
      '"Düzenlenen Fiyatlar" sayfasına git.',
      'Platformu seç.',
      'Değişim oranı yüksek ürünleri kontrol et.',
      '"Excel\'e Aktar" ile dosyayı indir.',
      'Trendyol: Ürün → Toplu Ürün İşlemleri → Şablon Yükle → Stok & Fiyat.',
      'Hepsiburada: Ürünler → Envanter → Toplu Güncelleme → Fiyat Güncelleme.',
    ],
    tip: 'İndirilen Excel doğrudan platforma yüklenebilir — ek düzenleme gerekmez.',
  },
];

function WizardStep({ step, done, onToggle, isActive, onActivate }) {
  const Icon = step.icon;
  return (
    <div className={`bg-card rounded-2xl border transition-all ${done ? 'border-border' : isActive ? 'border-primary' : 'border-border'}`}>
      <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={onActivate}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            done ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-card hover:border-muted-foreground'
          }`}
        >
          {done ? <CheckCheck className="w-4 h-4" /> : <span className="text-xs font-bold text-muted-foreground">{step.id}</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-muted-foreground/70 shrink-0" />
            <span className={`font-semibold text-sm ${done ? 'text-muted-foreground/70 line-through' : 'text-foreground'}`}>{step.title}</span>
            {done && <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Tamamlandı</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">{step.desc}</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground/70 shrink-0 transition-transform ${isActive ? 'rotate-90' : ''}`} />
      </div>

      {isActive && (
        <div className="px-5 pb-5 border-t border-border pt-4">
          <ol className="space-y-2.5">
            {step.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <StepBadge n={i + 1} />
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
            <strong className="text-foreground">İpucu:</strong> {step.tip}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Link
              to={createPageUrl(step.page)}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:bg-black dark:hover:bg-white/90 transition-colors"
            >
              {step.title} sayfasına git
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            {!done && (
              <button
                onClick={onToggle}
                className="flex items-center gap-2 border border-input text-muted-foreground text-sm font-medium px-4 py-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Tamamlandı işaretle
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sayfa Dokümantasyonu ────────────────────────────────────────────────────


// ─── Ana Component ───────────────────────────────────────────────────────────

export default function Help() {
  const [tab, setTab] = useState('wizard');
  const [openId, setOpenId] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [doneSteps, setDoneSteps] = useState(new Set());

  const toggleDone = (id) => {
    setDoneSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const completedCount = doneSteps.size;
  const totalSteps = WIZARD_STEPS.length;
  const progress = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="px-4 lg:px-6 pb-10">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Başlık */}
        <div>
          <h1 className="ph-title">Kullanım Kılavuzu</h1>
          <p className="ph-subtitle">Adım adım kurulum rehberi ve tüm sayfa açıklamaları.</p>
        </div>

        {/* Tab geçişi */}
        <div className="flex gap-1.5 bg-secondary rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('wizard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'wizard' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <Map className="w-4 h-4" /> İlk Kurulum Rehberi
          </button>
          <button
            onClick={() => setTab('docs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'docs' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Sayfa Rehberi
          </button>
        </div>

        {/* ── Kurulum Rehberi ── */}
        {tab === 'wizard' && (
          <div className="space-y-4">

            {/* İlerleme */}
            <div className="rounded-[18px] border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">Kurulum İlerlemesi</p>
                  <p className="text-sm text-muted-foreground">{completedCount} / {totalSteps} adım tamamlandı</p>
                </div>
                <span className="text-2xl font-bold text-foreground">%{progress}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {completedCount === totalSteps && (
                <div className="mt-3 flex items-center gap-2 text-muted-foreground bg-secondary border border-border rounded-xl p-3 text-sm">
                  <CheckCheck className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Tüm kurulum adımları tamamlandı.</span>
                </div>
              )}
            </div>

            <InfoNote>
              Her adımı genişletmek için tıkla. Tamamlayınca sol çembere veya "Tamamlandı işaretle" butonuna bas.
            </InfoNote>

            <div className="space-y-2">
              {WIZARD_STEPS.map((step) => (
                <WizardStep
                  key={step.id}
                  step={step}
                  done={doneSteps.has(step.id)}
                  onToggle={() => toggleDone(step.id)}
                  isActive={activeStep === step.id}
                  onActivate={() => setActiveStep(activeStep === step.id ? null : step.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Sayfa Rehberi ── */}
        {tab === 'docs' && (
          <div className="space-y-2">
            {PAGES.map((p) => {
              const Icon = p.icon;
              const isOpen = openId === p.id;
              return (
                <div key={p.id} className="rounded-[18px] border border-border bg-card overflow-hidden">
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary transition-colors"
                    onClick={() => setOpenId(isOpen ? null : p.id)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={createPageUrl(p.page)}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-sm text-foreground hover:text-muted-foreground transition-colors flex items-center gap-1"
                        >
                          {p.title}
                          <ExternalLink className="w-3 h-3 text-muted-foreground/70" />
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.short}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground/70 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{p.detail}</p>
                      {p.faq.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mt-4 mb-1">Sık Sorulan Sorular</p>
                          <FAQ items={p.faq} />
                        </>
                      )}
                      <Link
                        to={createPageUrl(p.page)}
                        className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors"
                      >
                        {p.title} sayfasını aç
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
