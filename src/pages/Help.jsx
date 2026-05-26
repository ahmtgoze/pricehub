import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Package, FolderTree, Store, Truck, Percent,
  Calculator, FileText, BadgeDollarSign, Tag, BadgePercent,
  Sparkles, Zap, HelpCircle, ChevronDown, ChevronRight,
  ExternalLink, CheckCircle2, ArrowRight, AlertCircle, Info,
  BookOpen, Map, CheckCheck, Circle
} from 'lucide-react';

function Field({ name, required, children }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <div className="min-w-[180px]">
        <span className="font-medium text-gray-800 text-sm">{name}</span>
        {required && <span className="ml-1 text-red-500 text-xs">*</span>}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

function StepList({ steps }) {
  return (
    <ol className="space-y-2 mt-2">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
          <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: step }} />
        </li>
      ))}
    </ol>
  );
}

function NoteBox({ color = 'blue', icon: Icon = Info, title, children }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    yellow: 'bg-amber-50 border-amber-200 text-amber-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <div className={`rounded-xl border p-3 mt-3 ${colors[color]}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          {title && <p className="font-semibold text-sm mb-1">{title}</p>}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FAQ({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sık Sorulan Sorular</p>
      {items.map((item, i) => (
        <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-medium text-gray-800">❓ {item.q}</span>
            {open === i ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {open === i && (
            <div className="px-4 py-3 text-sm text-gray-700 bg-white leading-relaxed">{item.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Kurulum Sihirbazı ───────────────────────────────────────────────────────

const WIZARD_STEPS = [
  {
    id: 1,
    title: 'Kategorileri Ekle',
    page: 'Categories',
    icon: '🗂️',
    color: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    desc: 'Ürün gruplarını ve KDV oranlarını tanımla. Komisyon hesaplamasının temel taşı.',
    items: [
      '"Kategoriler" sayfasına git',
      '"+ Yeni Kategori" butonuna tıkla',
      'Kategori adını gir (örn: Kargo Poşeti, Etiket)',
      'KDV oranını seç (%1, %10 veya %20)',
      'Tüm ürün grupların için tekrarla',
    ],
    tip: 'Kategorileri doğru tanımlamazsan komisyon hesaplamaları çalışmaz. İlk adım olarak tüm ürün gruplarını buraya ekle.',
  },
  {
    id: 2,
    title: 'Platformları Yapılandır',
    page: 'Platforms',
    icon: '🏪',
    color: 'bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-700',
    desc: 'Trendyol, Hepsiburada ve Web Sitesi için kargo firması ve ayarları yap.',
    items: [
      '"Platformlar" sayfasına git',
      'Her platform için "Tüm Ayarlar" butonuna tıkla',
      'Kargo firması adını gir',
      '"Bugün Kargoda" ayarını gerekiyorsa aç',
      'Aktif platformları işaretle',
    ],
    tip: 'Trendyol ve Hepsiburada için stopaj, hizmet bedeli ve barem bilgileri admin tarafından belirlenir — bunları değiştirmene gerek yok.',
  },
  {
    id: 3,
    title: 'Kargo Tarifelerini Gir',
    page: 'ShippingRates',
    icon: '🚚',
    color: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    desc: 'Her platform için barem ve desi bazlı kargo ücretlerini tanımla.',
    items: [
      '"Kargo Tarifeleri" sayfasına git',
      'Platform seç',
      'Barem1 tarifesini gir (örn: 0-149.99 TL arası satışlar)',
      'Barem2 tarifesini gir (örn: 150-299.99 TL arası satışlar)',
      'Desi bazlı tarifeleri gir (farklı desi aralıkları için)',
    ],
    tip: 'Barem ve desi tarifeleri birlikte tanımlanmalı. Ürün barem limitini aşarsa sistem otomatik desi tarifesine geçer.',
  },
  {
    id: 4,
    title: 'Komisyonları Gir',
    page: 'Commissions',
    icon: '💹',
    color: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    desc: 'Her platform × kategori için komisyon oranı ve hedef kâr marjı belirle.',
    items: [
      '"Komisyonlar" sayfasına git',
      '"+ Yeni Komisyon" butonuna tıkla',
      'Platform seç',
      'Kategori seç (1. adımda eklediğin kategoriler)',
      'Komisyon oranını gir (örn: %18)',
      'Hedef kâr oranını gir (örn: %80)',
      'Tüm platform × kategori kombinasyonları için tekrarla',
    ],
    tip: 'Her platform için her kategori ayrı komisyon satırı gerektirir. Trendyol\'da "Kargo Poşeti" kategorisi varsa Trendyol + Kargo Poşeti için ayrı bir satır oluştur.',
  },
  {
    id: 5,
    title: 'Paketleme Maliyetlerini Gir',
    page: 'PackageManagement',
    icon: '📦',
    color: 'bg-cyan-50 border-cyan-200',
    badge: 'bg-cyan-100 text-cyan-700',
    desc: 'Kargo poşeti, kutu, etiket gibi paketleme malzemelerinin maliyetini ekle.',
    items: [
      '"Paketleme" sayfasına git',
      '"+ Yeni Paket" ile paket grubu oluştur (örn: Küçük Poşet)',
      'Min ve Max desi aralığını gir',
      'Paket grubunun içine malzeme ekle (Poşet, Etiket, Bant...)',
      'Her malzemenin KDV dahil maliyetini gir',
    ],
    tip: 'Opsiyonel ama önerilen. Paketleme maliyeti girilmezse fiyat hesaplamada bu gider sıfır alınır.',
  },
  {
    id: 6,
    title: 'Ürünleri Ekle',
    page: 'Products',
    icon: '🛍️',
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    desc: 'Ürün kataloğunu tek tek veya Excel ile toplu yükle.',
    items: [
      '"Ürünler" sayfasına git',
      'Tekil ekleme: "+ Yeni Ürün" butonuyla SKU, maliyet, desi ve kategori gir',
      'Toplu ekleme: "Excel İşlemleri → Şablon İndir" ile şablonu doldur, sonra "Yükle"',
      'Ürün Zinciri (opsiyonel): Aynı ürünün farklı adetli varyantlarını birbirine bağla',
      'Referans Ürün (opsiyonel): Büyük paketi küçük paketin referansı olarak ayarla',
    ],
    tip: 'Excel ile toplu yükleme yapabilirsin. Mevcut SKU\'lar güncellenir, yeni SKU\'lar eklenir.',
  },
  {
    id: 7,
    title: 'Fiyatları Hesapla',
    page: 'Prices',
    icon: '💰',
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    desc: '"Fiyatları Hesapla" butonuna bas — tüm ürünler için platform bazlı fiyatlar otomatik çıkar.',
    items: [
      '"Fiyatlar" sayfasına git',
      '"Fiyatları Hesapla" butonuna tıkla',
      'İşlem tamamlanana kadar bekle',
      'Her ürün için Trendyol, Hepsiburada ve Web Sitesi fiyatlarını gör',
      'Detay butonu ile her platformdaki kâr dökümünü incele',
    ],
    tip: 'Bu adım her maliyet güncellemesinden sonra tekrarlanmalıdır. Fiyatlar otomatik güncellenmez, hesaplama manuel başlatılır.',
  },
  {
    id: 8,
    title: 'Pazaryeri Verilerini Yükle',
    page: 'MarketplaceProducts',
    icon: '🔗',
    color: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-100 text-sky-700',
    desc: 'Trendyol/Hepsiburada panelinden indirdiğin ürün listesini yükle ve eşleştir.',
    items: [
      'Trendyol/Hepsiburada panelinden ürün listesi Excel\'ini indir',
      '"Pazaryeri Ürünleri" sayfasına git',
      'Platformu seç ve Excel\'i yükle',
      'Ürünleri sistemizdeki master ürünlerle eşleştir',
      'Otomatik eşleştirme sonrası mutlaka kontrol et',
    ],
    tip: 'Hatalı eşleştirme yanlış fiyat güncellemesine yol açabilir. Otomatik eşleştirmeyi mutlaka gözden geçir.',
  },
  {
    id: 9,
    title: 'Fiyatları İndir ve Platforma Yükle',
    page: 'UpdatedPrices',
    icon: '📤',
    color: 'bg-violet-50 border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
    desc: 'Hesaplanan güncel fiyatları platform formatında indir, pazaryerine yükle.',
    items: [
      '"Düzenlenen Fiyatlar" sayfasına git',
      'Platformu seç',
      'Değişim oranı yüksek ürünleri kontrol et',
      '"Excel\'e Aktar" ile dosyayı indir',
      'Trendyol: Ürün → Toplu Ürün İşlemleri → Şablon Yükle → Stok & Fiyat',
      'Hepsiburada: Ürünler → Envanter → Toplu Güncelleme → Fiyat Güncelleme',
    ],
    tip: 'İndirilen Excel doğrudan platforma yüklenebilir — ek düzenleme gerekmez.',
  },
];

function WizardStep({ step, done, onToggle, isActive, onActivate }) {
  return (
    <div
      className={`rounded-2xl border-2 transition-all cursor-pointer ${
        done
          ? 'border-green-200 bg-green-50'
          : isActive
          ? step.color + ' shadow-md'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className="flex items-center gap-4 p-4" onClick={onActivate}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white hover:border-green-400'
          }`}
        >
          {done ? <CheckCheck className="w-4 h-4" /> : <span className="text-xs font-bold text-gray-500">{step.id}</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{step.icon}</span>
            <span className={`font-semibold text-sm ${done ? 'text-green-700 line-through' : 'text-gray-800'}`}>{step.title}</span>
            {done && <Badge className="bg-green-100 text-green-700 text-xs">Tamamlandı</Badge>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isActive ? 'rotate-90' : ''}`} />
      </div>

      {isActive && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <ol className="space-y-2 my-4">
            {step.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-amber-700"><strong>💡 İpucu:</strong> {step.tip}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={createPageUrl(step.page)}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors"
            >
              {step.title} sayfasına git
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            {!done && (
              <button
                onClick={onToggle}
                className="flex items-center gap-2 border border-green-300 text-green-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-50 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Tamamlandı olarak işaretle
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sayfa Dokümantasyonu ────────────────────────────────────────────────────

const PAGES = [
  {
    id: 'dashboard', title: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard,
    color: 'bg-gray-100 text-gray-700', border: 'border-gray-200',
    short: 'Sistemin genel durumunu tek ekranda görüntüleyin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Dashboard anlık özet gösterir. Başka sayfalarda yaptığın değişiklikler otomatik yansır.</p>
        <NoteBox color="blue" icon={Info}>Dashboard salt görüntüleme amaçlıdır. Detaylar için ilgili sayfalara gidin.</NoteBox>
      </div>
    ),
  },
  {
    id: 'kategoriler', title: 'Kategoriler', page: 'Categories', icon: FolderTree,
    color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200',
    short: 'Ürün kategorilerinizi tanımlayın. Komisyon hesaplamalarında temel referans noktasıdır.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Komisyon oranları <strong>platform + kategori</strong> kombinasyonuna göre tanımlanır. Önce tüm kategorileri ekleyin.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Kategori Adı" required>Ürün grubunun adı. Örn: "Kargo Poşeti", "Etiket".</Field>
          <Field name="KDV Oranı">Standart KDV oranı (%). Örn: %20.</Field>
        </div>
        <NoteBox color="yellow" icon={AlertCircle} title="Önemli">Kategori adını değiştirirseniz komisyon kayıtlarını kontrol edin.</NoteBox>
        <FAQ items={[{ q: 'KDV oranını yanlış girdim?', a: 'Ürün düzenleme ekranından tek tek değiştirmeniz gerekir.' }]} />
      </div>
    ),
  },
  {
    id: 'platformlar', title: 'Platformlar', page: 'Platforms', icon: Store,
    color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200',
    short: 'Trendyol, Hepsiburada ve Web Sitesi platformlarını aktif/pasif yapın.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Sistem üç sabit platform içerir. İlk girişte otomatik oluşturulurlar.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Aktif / Pasif">Platform aktifse fiyat hesaplama yapılır.</Field>
          <Field name="Kargo Firması">Platform için kullanılacak kargo firması.</Field>
          <Field name="Barem Sistemi">Satış fiyatına göre kargo ücreti barema göre belirlenir.</Field>
        </div>
        <NoteBox color="yellow" icon={AlertCircle} title="Pazaryeri notu">Trendyol ve Hepsiburada için barem, stopaj ve hizmet bedelleri admin tarafından belirlenir.</NoteBox>
      </div>
    ),
  },
  {
    id: 'paketleme', title: 'Paketleme', page: 'PackageManagement', icon: Package,
    color: 'bg-cyan-100 text-cyan-700', border: 'border-cyan-200',
    short: 'Kargo poşeti, kutu, etiket gibi paketleme malzemelerinin maliyetini girin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Paketleme maliyeti satış fiyatından düşülen giderler arasındadır. Paket grupları oluşturun, malzeme kalemleri ekleyin.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Paket Adı" required>Örn: "Küçük Poşet", "Karton Kutu M".</Field>
          <Field name="Min / Max Desi">Bu aralıktaki ürünlere otomatik paket atanır.</Field>
          <Field name="Maliyet (KDV dahil)" required>Birim maliyet. Tüm kalemlerin toplamı paketin maliyetidir.</Field>
        </div>
      </div>
    ),
  },
  {
    id: 'kargo', title: 'Kargo Tarifeleri', page: 'ShippingRates', icon: Truck,
    color: 'bg-orange-100 text-orange-700', border: 'border-orange-200',
    short: 'Platform ve kargo firması bazlı kargo ücretlerini tanımlayın.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Barem veya desi bazlı tarife seçilebilir.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Platform" required>Hangi platforma ait olduğu.</Field>
          <Field name="Tarife Tipi" required>barem1, barem2 veya desi.</Field>
          <Field name="Ücret" required>KDV dahil TL olarak.</Field>
        </div>
        <FAQ items={[{ q: 'Barem ve desi tarifesini aynı anda tanımlamalı mıyım?', a: 'Evet. Desi barem limitini aşarsa sistem otomatik desi bazlı tarifeye geçer.' }]} />
      </div>
    ),
  },
  {
    id: 'komisyonlar', title: 'Komisyonlar', page: 'Commissions', icon: Percent,
    color: 'bg-red-100 text-red-700', border: 'border-red-200',
    short: 'Platform + kategori kombinasyonuna göre komisyon oranlarını ve hedef kar marjlarını tanımlayın.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Komisyon, platformun satış fiyatından aldığı yüzdedir. Her ürün için <strong>kategori + platform</strong> kombinasyonuna göre belirlenir.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Platform" required>Açılır menüden seçin.</Field>
          <Field name="Kategori" required>Açılır menüden seçin.</Field>
          <Field name="Komisyon Oranı (%)" required>Örn: %18.</Field>
          <Field name="Hedef Kâr Oranı (%)">Sistem bu orana göre optimal fiyatı hesaplar.</Field>
        </div>
      </div>
    ),
  },
  {
    id: 'urunler', title: 'Ürünler', page: 'Products', icon: Package,
    color: 'bg-blue-100 text-blue-700', border: 'border-blue-200',
    short: 'Ana ürün kataloğunuzu yönetin. Tekil veya Excel ile toplu ekleme yapabilirsiniz.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Ürünler sayfası sistemin merkezidir. Buraya girilen her ürün tüm aktif platformlarda otomatik fiyatlandırılır.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="SKU" required>Benzersiz stok kodu.</Field>
          <Field name="Maliyet (KDV dahil)" required>Tedarik maliyeti.</Field>
          <Field name="Baskı Maliyeti">Varsa baskı gideri.</Field>
          <Field name="Ek Maliyet">Diğer ek giderler.</Field>
          <Field name="Desi" required>Kargo hesaplamasında kullanılır.</Field>
          <Field name="Kategori" required>Komisyon hesabında kullanılır.</Field>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-blue-800">🆕 Yeni Özellikler</p>

          <div>
            <p className="text-sm font-semibold text-blue-700 mb-1">📎 Referans Ürün</p>
            <p className="text-sm text-blue-800">Büyük/pahalı bir ürünün maliyetini küçük/ucuz ürüne referans olarak bağlayabilirsin. Örn: 500 Adet paketin maliyetinden 100 Adet paketin baz maliyeti otomatik hesaplanır.</p>
            <ul className="mt-1 text-xs text-blue-700 space-y-0.5 list-disc list-inside">
              <li>Toplam ₺, Toplam % veya Birim ₺/adet şeklinde maliyet eki belirle</li>
              <li>Baz maliyet otomatik hesaplanır ve normal maliyetten yüksekse fiyat baz maliyete göre hesaplanır</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-blue-700 mb-1">🔗 Adet Bazlı Ürün Zinciri</p>
            <p className="text-sm text-blue-800">Aynı ürünün farklı adetli varyantlarını (50 adet, 100 adet, 500 adet) birbirine bağla. Birinin maliyeti değişince tüm zincir orantılı güncellenir.</p>
            <ul className="mt-1 text-xs text-blue-700 space-y-0.5 list-disc list-inside">
              <li>"Bu ürünün adeti" alanını doldurursan birim maliyet tutarsızlığı otomatik raporlanır</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-blue-700 mb-1">🔀 Ürün Eşleştirme</p>
            <p className="text-sm text-blue-800">Aynı maliyete sahip olması gereken ürünleri eşleştir. Birinin maliyeti değişince diğerleri de otomatik güncellenir.</p>
          </div>
        </div>

        <FAQ items={[
          { q: "Aynı SKU'yu tekrar yüklersem ne olur?", a: 'Mevcut kayıt güncellenir; çift kayıt oluşmaz.' },
          { q: 'Zincirdeki ürünlerden birinin maliyetini değiştirirsem ne olur?', a: 'Sistemin o ürünü kaydetmesiyle zincirdeki diğer ürünlerin maliyetleri orantılı olarak güncellenir.' },
          { q: 'Referans ürün silinirse ne olur?', a: 'Referans bağlantısı otomatik temizlenir, ürün normal maliyet üzerinden çalışmaya devam eder.' },
        ]} />
      </div>
    ),
  },
  {
    id: 'fiyatlar', title: 'Fiyatlar', page: 'Prices', icon: BadgeDollarSign,
    color: 'bg-green-100 text-green-700', border: 'border-green-200',
    short: 'Ürünlerinizin platform bazlı hesaplanmış satış fiyatlarını görüntüleyin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Fiyatlar sayfası sistemin çıktısıdır. "Fiyatları Hesapla" butonuna basarak tüm ürünler için fiyatlar yeniden hesaplanır.</p>
        <NoteBox color="yellow" icon={AlertCircle} title="Fiyat güncel değilse">Fiyatları Hesapla butonuna basın. Referans ürünü olan ürünler en sona hesaplanır.</NoteBox>
        <FAQ items={[{ q: 'Satış fiyatını manuel değiştirebilir miyim?', a: 'Hayır. Fiyatlar tamamen otomatik hesaplanır.' }]} />
      </div>
    ),
  },
  {
    id: 'hesaplayici', title: 'Hesaplayıcı', page: 'Calculator', icon: Calculator,
    color: 'bg-teal-100 text-teal-700', border: 'border-teal-200',
    short: 'Belirli bir ürün ve platform için farklı satış fiyatlarında kâr durumunu anlık görün.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">"Bu ürünü bu fiyata satsam ne kadar kazanırım?" sorusunu anlık yanıtlar.</p>
        <NoteBox color="green" icon={Info}>Bu sayfada yaptığın denemeler sisteme kaydedilmez.</NoteBox>
      </div>
    ),
  },
  {
    id: 'pazaryeri', title: 'Pazaryeri Ürünleri', page: 'MarketplaceProducts', icon: Store,
    color: 'bg-sky-100 text-sky-700', border: 'border-sky-200',
    short: 'Trendyol veya Hepsiburada\'dan indirdiğiniz Excel dosyalarını yükleyin ve eşleştirin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Platform Excel dosyasını yükle, sistem ürünleriyle eşleştir. Eşleştirme sonrası "Düzenlenen Fiyatlar" sayfasından fiyatları indir.</p>
        <NoteBox color="yellow" icon={AlertCircle} title="Uyarı">Otomatik eşleştirme yaparsanız mutlaka kontrol edin! Hatalı eşleştirme yanlış fiyat güncellemesine yol açabilir.</NoteBox>
        <FAQ items={[
          { q: "Aynı Excel'i iki kez yüklersem ne olur?", a: 'Sistem mevcut kayıtları günceller. Çift kayıt oluşmaz.' },
          { q: 'Bazı ürünler neden eşleşmemiş görünüyor?', a: 'Barkod veya SKU örtüşmüyordur. Manuel eşleştirme yapın.' },
        ]} />
      </div>
    ),
  },
  {
    id: 'duzenlenen-fiyatlar', title: 'Düzenlenen Fiyatlar', page: 'UpdatedPrices', icon: Tag,
    color: 'bg-blue-100 text-blue-700', border: 'border-blue-200',
    short: 'Hesaplanan güncel satış fiyatlarını görüntüleyin ve platforma yüklemek için indirin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Eşleştirilen ürünlerin yeni satış fiyatları burada listelenir. Platform formatında Excel olarak indirilip yüklenebilir.</p>
        <NoteBox color="blue" icon={Info} title="Platform bazlı formatlar">Trendyol ve Hepsiburada için platforma özgü Excel sütun düzeni oluşturulur. Ek düzenleme gerekmez.</NoteBox>
      </div>
    ),
  },
  {
    id: 'raporlar', title: 'Güncelleme Raporları', page: 'UpdateReports', icon: FileText,
    color: 'bg-purple-100 text-purple-700', border: 'border-purple-200',
    short: 'Fiyat değişiklik geçmişini takip edin. Toplu seçim ve silme yapabilirsiniz.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">Her fiyat hesaplama sonrası değişen fiyatlar otomatik kaydedilir. Hangi ürünün ne zaman değiştiğini görebilirsin.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Toplu Seçim">Sayfadaki onay kutusuyla 20 rapor seçilir. Üstteki "Tüm X raporu seç" linkiyle tümü seçilir.</Field>
          <Field name="Arşivle">Önemli raporları arşive taşı, Arşiv sekmesinden erişebilirsin.</Field>
          <Field name="Sil">Seçili raporları kalıcı olarak sil.</Field>
        </div>
      </div>
    ),
  },
];

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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Başlık */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <HelpCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PriceHub Kılavuzu</h1>
            <p className="text-gray-500 mt-0.5">Adım adım kurulum rehberi ve tüm sayfa detayları.</p>
          </div>
        </div>

        {/* Tab geçişi */}
        <div className="flex gap-2 bg-white rounded-2xl border border-gray-200 p-1.5 w-fit">
          <button
            onClick={() => setTab('wizard')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'wizard' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Map className="w-4 h-4" /> Kurulum Rehberi
          </button>
          <button
            onClick={() => setTab('docs')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'docs' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Sayfa Kılavuzu
          </button>
        </div>

        {/* ── Kurulum Rehberi ── */}
        {tab === 'wizard' && (
          <div className="space-y-4">
            {/* İlerleme */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">Kurulum İlerlemesi</p>
                  <p className="text-sm text-gray-500">{completedCount} / {totalSteps} adım tamamlandı</p>
                </div>
                <span className="text-3xl font-bold text-indigo-600">%{progress}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {completedCount === totalSteps && (
                <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
                  <CheckCheck className="w-5 h-5" />
                  <span className="font-semibold text-sm">Tüm kurulum adımları tamamlandı! 🎉</span>
                </div>
              )}
            </div>

            {/* Nasıl kullanılır */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
              <strong>Nasıl kullanılır?</strong> Her adımı genişletmek için tıkla. Adımı tamamlayınca yeşil tik butonuna veya "Tamamlandı olarak işaretle" butonuna bas. İlerleme otomatik güncellenir.
            </div>

            {/* Adımlar */}
            <div className="space-y-3">
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

        {/* ── Sayfa Kılavuzu ── */}
        {tab === 'docs' && (
          <div className="space-y-4">
            {/* PriceHub nedir */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold text-blue-900 mb-2">PriceHub Nedir?</h2>
                <p className="text-blue-800 leading-relaxed text-sm mb-4">
                  PriceHub, e-ticaret satıcılarının <strong>Trendyol</strong>, <strong>Hepsiburada</strong> ve <strong>Web Sitesi</strong> gibi farklı satış kanallarındaki ürün fiyatlarını tek merkezden yönetmesini sağlayan kapsamlı bir fiyatlandırma sistemidir.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: '💰', title: 'Otomatik Fiyatlama', desc: 'Maliyet, kargo, komisyon, paketleme ve KDV dahil tüm giderleri hesaba katarak optimal satış fiyatını otomatik bulur.' },
                    { icon: '📊', title: 'Kampanya Analizi', desc: 'Flaş satış, avantajlı ürün etiketi ve komisyon tarifesi kampanyalarında kâr/zarar durumunu anlık gösterir.' },
                    { icon: '📥', title: 'Hazır Çıktılar', desc: 'Platform formatında Excel/CSV oluşturarak doğrudan yüklenebilir dosyalar üretir.' },
                  ].map((item) => (
                    <div key={item.title} className="bg-white rounded-xl p-4 border border-blue-100">
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <div className="font-semibold text-gray-800 text-sm">{item.title}</div>
                      <div className="text-gray-500 text-xs mt-1 leading-relaxed">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sayfa listesi */}
            <div className="space-y-2">
              {PAGES.map((p) => {
                const Icon = p.icon;
                const isOpen = openId === p.id;
                return (
                  <div key={p.id} className={`bg-white rounded-2xl border ${p.border} overflow-hidden shadow-sm`}>
                    <button
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setOpenId(isOpen ? null : p.id)}
                    >
                      <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            to={createPageUrl(p.page)}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1"
                          >
                            {p.title}
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          </Link>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{p.short}</p>
                      </div>
                      <div className="shrink-0 text-gray-400">
                        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-5 border-t border-gray-100 bg-gray-50/50 pt-4">
                        {p.content}
                        <Link to={createPageUrl(p.page)} className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                          {p.title} sayfasını aç
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Genel ipuçları */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-800 text-lg">💡 Genel İpuçları</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    'Sisteme ilk girişte sıralamayı takip edin: Kategori → Platform → Kargo → Komisyon → Paket → Ürün.',
                    'Tüm maliyet alanlarını KDV dahil girin.',
                    'Maliyet değiştirdiğinizde ürünü kaydetmek yeterlidir; tüm platformlar için fiyat otomatik yeniden hesaplanır.',
                    'Ürün Zinciri ile aynı ürünün farklı adetli varyantlarını bağlayın; birinin maliyeti değişince tümü güncellenir.',
                    'Referans Ürün ile büyük paketin maliyetinden küçük paketin baz maliyetini otomatik hesaplayın.',
                    'Flaş satış veya kampanyalara katılmadan önce kâr hesaplarını mutlaka kontrol edin.',
                    '"Hesaplayıcı" sayfası ile farklı fiyat senaryolarını risksiz deneyebilirsiniz.',
                    'Raporlar sayfasında "Tüm raporları seç" linki ile binlerce raporu tek seferde silebilirsiniz.',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}