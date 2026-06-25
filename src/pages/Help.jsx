import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  LayoutDashboard, Package, FolderTree, Store, Truck, Percent,
  Calculator, FileText, BadgeDollarSign, Tag, HelpCircle,
  ChevronDown, ChevronRight, ExternalLink, ArrowRight,
  BookOpen, Map, CheckCheck, BadgePercent, Sparkles, Zap,
  Settings, Layers
} from 'lucide-react';

// ─── Küçük bileşenler ────────────────────────────────────────────────────────

function StepBadge({ n }) {
  return (
    <span className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
      {n}
    </span>
  );
}

function InfoNote({ children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 leading-relaxed mt-3">
      {children}
    </div>
  );
}

function FAQ({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="mt-3 space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-medium text-gray-800">{item.q}</span>
            {open === i
              ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
          </button>
          {open === i && (
            <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t border-gray-100 leading-relaxed">
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
      'Kargo firması adını gir.',
      '"Barem Sistemi" aktifse aç.',
      'Satmadığın platformları pasif yap.',
    ],
    tip: 'Stopaj, hizmet bedeli ve komisyon oranları admin tarafından platformlara bağlı olarak ayrıca tanımlanır.',
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
    desc: 'Barem sistemi kullanılıyorsa admin tarafından tanımlanır. Manuel kargo ücreti kullanılıyorsa bu adım gerekli değildir.',
    items: [
      'Barem sistemi kullanıyorsan "Kargo Tarifeleri" sayfasına git.',
      'Platform seç.',
      'Barem1 tarifesini gir (örn: 0–149,99 TL arası satışlar için kargo ücreti).',
      'Barem2 tarifesini gir (örn: 150–299,99 TL arası).',
      'Desi bazlı tarifeleri gir (her desi aralığı için ayrı ücret).',
    ],
    tip: 'Barem tanımlı değilse veya kullanılmıyorsa sistem Platformlar sayfasındaki manuel kargo ücretini kullanır; bu durumda barem hesaplaması yapılmaz. Bu adım genellikle admin tarafından yapılır.',
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
      'Komisyon oranını KDV dahil gir. Örn: Trendyol komisyonu %18 + KDV ise %21,6 olarak gir. HepsiBurada için de aynı şekilde %20 KDV ekleyerek gir.',
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
      'Min ve Max desi aralığını gir — bu aralıktaki ürünlere otomatik atanır.',
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
      'Referans Ürün (opsiyonel): Büyük paketin maliyetinden küçük paketin baz maliyetini otomatik hesaplat.',
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
      'Bir ürüne tıklayarak detaylı kâr dökümünü incele (maliyet, komisyon, KDV, stopaj, hizmet bedeli, kargo, paketleme).',
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
    <div className={`bg-white rounded-2xl border transition-all ${done ? 'border-gray-200' : isActive ? 'border-gray-900' : 'border-gray-200'}`}>
      <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={onActivate}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            done ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-300 bg-white hover:border-gray-500'
          }`}
        >
          {done ? <CheckCheck className="w-4 h-4" /> : <span className="text-xs font-bold text-gray-500">{step.id}</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-gray-400 shrink-0" />
            <span className={`font-semibold text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{step.title}</span>
            {done && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Tamamlandı</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 ml-6">{step.desc}</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isActive ? 'rotate-90' : ''}`} />
      </div>

      {isActive && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <ol className="space-y-2.5">
            {step.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <StepBadge n={i + 1} />
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <strong className="text-gray-800">İpucu:</strong> {step.tip}
          </div>
          <div className="flex items-center gap-3 mt-4">
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
                className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
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

const PAGES = [
  {
    id: 'dashboard', title: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard,
    short: 'Sistemin genel durumunu tek ekranda görüntüler: ürün sayısı, platform özeti, kâr dağılımı.',
    detail: 'Dashboard salt görüntüleme amaçlıdır. Başka sayfalarda yapılan değişiklikler burada otomatik yansır. Herhangi bir düzenleme yapılamaz.',
    faq: [],
  },
  {
    id: 'platformlar', title: 'Platformlar', page: 'Platforms', icon: Store,
    short: 'Trendyol, Hepsiburada ve Web Sitesi platformlarını aktif/pasif yapın ve kargo ayarlarını düzenleyin.',
    detail: 'Her platform için kargo firması adı ve barem sistemi girilir. Aktif platformlar fiyat hesaplamaya dahil olur. Pasif platformlar için fiyat hesaplanmaz ve sidebar\'da görünmez. "Tüm Ayarlar" butonu her platforma özel stopaj, hizmet bedeli ve komisyon düzenleme ekranını açar.',
    faq: [
      { q: 'Bir platformu pasife alırsam mevcut veriler silinir mi?', a: 'Hayır. Sadece fiyat hesaplamadan ve sidebar\'dan çıkar. Veriler korunur.' },
    ],
  },
  {
    id: 'kategoriler', title: 'Kategoriler', page: 'Categories', icon: FolderTree,
    short: 'Ürün gruplarını ve KDV oranlarını tanımlar. Komisyon kayıtlarının temel referansıdır.',
    detail: 'Kategori adı ve KDV oranı girilir. Komisyon ekranında platform × kategori kombinasyonu seçilirken bu liste kullanılır. Kategori silinirse bağlı komisyon kayıtları da etkilenir.',
    faq: [
      { q: 'KDV oranını yanlış girdim, nasıl düzeltilir?', a: 'Kategoriyi düzenle butonuyla KDV oranı değiştirilebilir. Bağlı ürünlere etkisi bir sonraki fiyat hesaplamasında yansır.' },
    ],
  },
  {
    id: 'komisyonlar', title: 'Komisyonlar', page: 'Commissions', icon: Percent,
    short: 'Platform + kategori kombinasyonuna göre komisyon oranı ve hedef kâr marjı tanımlar.',
    detail: 'Her platform × kategori çifti için ayrı satır oluşturulur. Komisyon oranı (%), hedef kâr oranı (%) ve isteğe bağlı olarak kampanya/indirimli hedef kâr oranı girilir. İndirimli hedef kâr; Avantajlı Ürün Etiketi, Flaş Ürünler, Avantajlı Teklifler gibi promosyon sayfalarında "Akıllı Seç" algoritması tarafından kullanılır.',
    faq: [
      { q: 'Komisyon oranını KDV dahil mi girmem gerekiyor?', a: 'Evet. Tüm platformlar için komisyon oranı KDV dahil girilmeli. Örn: %18 komisyon + %20 KDV = %21,6 olarak gir. HepsiBurada için de aynı kural geçerli.' },
      { q: 'İndirimli hedef kâr nedir?', a: 'Kampanya dönemlerinde kabul edebileceğin daha düşük kâr marjıdır. Promosyon sayfalarında akıllı seç bu değeri baz alır.' },
    ],
  },
  {
    id: 'urunler', title: 'Ürünler', page: 'Products', icon: Package,
    short: 'Ana ürün kataloğunu yönetir. Tekil veya Excel ile toplu ekleme/güncelleme yapılabilir.',
    detail: 'Her ürün için SKU (stok kodu), maliyet (KDV dahil), baskı maliyeti, ek maliyet, desi ve kategori girilir. "Excel İşlemleri" menüsünden şablon indirilebilir ve dolu şablon yüklenebilir. Mevcut SKU tekrar yüklenirse güncellenir, çift kayıt oluşmaz.\n\nÜrün Zinciri: Aynı ürünün farklı adet varyantlarını (50 adet, 100 adet, 500 adet) birbirine bağlar. Birinin maliyeti değişince tümü orantılı güncellenir.\n\nReferans Ürün: Büyük paketin maliyetinden küçük paketin baz maliyetini otomatik hesaplar.',
    faq: [
      { q: "Aynı SKU'yu tekrar yüklersem ne olur?", a: 'Mevcut kayıt güncellenir, çift kayıt oluşmaz.' },
      { q: 'Desi nereye girilir?', a: 'Ürün ekleme/düzenleme formunda "Desi" alanına girilir. Kargo tarifeleriyle eşleştirmede kullanılır.' },
    ],
  },
  {
    id: 'kargo', title: 'Kargo Tarifeleri', page: 'ShippingRates', icon: Truck,
    short: 'Platform ve kargo firması bazlı barem ve desi tarifelerini tanımlar.',
    detail: 'Her platform için barem1, barem2 ve desi bazlı tarifeler ayrı ayrı girilir. Barem: satış fiyatına göre sabit kargo ücreti. Desi: ürün ağırlığına/hacmine göre değişken kargo ücreti. Barem etkinse ve ürün fiyatı barem limitini karşılıyorsa barem ücreti uygulanır; aksi hâlde desi tarifesine geçilir.\n\nBarem sistemi kullanılmıyorsa veya tarifelar tanımlı değilse sistem Platformlar sayfasındaki manuel kargo ücretini baz alır; bu durumda barem hesaplaması yapılmaz. Tarifeler genellikle admin tarafından tanımlanır.',
    faq: [
      { q: 'Barem ve desi tarifesini aynı anda mı tanımlamalıyım?', a: 'Evet. İkisi birlikte çalışır; biri eksikse sistem doğru hesaplama yapamaz.' },
    ],
  },
  {
    id: 'paketleme', title: 'Paketleme', page: 'PackageManagement', icon: Package,
    short: 'Kargo poşeti, kutu, etiket gibi paketleme malzemelerinin maliyetini tanımlar.',
    detail: 'Paket grubu (örn: Küçük Poşet) oluşturulur, min/max desi aralığı girilir. Grubun içine malzeme kalemleri eklenir (Poşet, Etiket, Bant…). Her malzemenin KDV dahil birim maliyeti girilir. Kalemlerin toplamı o paketin maliyetini oluşturur. Ürünün desisi paket aralığına denk gelirse maliyet fiyat hesabına eklenir.',
    faq: [],
  },
  {
    id: 'hesaplayici', title: 'Hesaplayıcı', page: 'Calculator', icon: Calculator,
    short: '"Bu ürünü bu fiyata satsam ne kadar kazanırım?" sorusunu anlık yanıtlar.',
    detail: 'Ürün seçilir, platform seçilir, farklı satış fiyatları denenir. Her fiyat için komisyon, kargo, paketleme, stopaj, KDV ve net kâr görüntülenir. Bu sayfada yapılan işlemler sisteme kaydedilmez; yalnızca senaryo simülasyonu içindir.',
    faq: [],
  },
  {
    id: 'fiyatlar', title: 'Fiyatlar', page: 'Prices', icon: BadgeDollarSign,
    short: 'Tüm ürünler için platform bazlı satış fiyatlarını hesaplar ve gösterir.',
    detail: '"Fiyatları Hesapla" butonuna basılınca sistem her ürün × platform için en az maliyetleri karşılayan, hedef kâra ulaşan fiyatı binary search algoritmasıyla bulur. Fiyat tablosunda Trendyol, Hepsiburada ve Web Sitesi sütunları yan yana görünür. Bir ürüne tıklandığında maliyet kalemi dökümü (komisyon, KDV, stopaj, hizmet bedeli, kargo, paketleme, baskı, ek maliyet) açılır.',
    faq: [
      { q: 'Satış fiyatını manuel değiştirebilir miyim?', a: 'Hayır. Fiyatlar tamamen otomatik hesaplanır. Fiyatı etkilemek için maliyet, komisyon veya hedef kâr oranı değiştirilmelidir.' },
      { q: 'Fiyatlar güncel değil görünüyor.', a: '"Fiyatları Hesapla" butonuna tekrar bas. Maliyet veya komisyon değişikliği sonrası bu adım zorunludur.' },
    ],
  },
  {
    id: 'raporlar', title: 'Güncelleme Raporları', page: 'UpdateReports', icon: FileText,
    short: 'Fiyat değişiklik geçmişini listeler. Raporları arşivleyebilir veya toplu silebilirsiniz.',
    detail: 'Her "Fiyatları Hesapla" işlemi sonrası değişen fiyatlar otomatik kaydedilir. Rapor satırına tıklanınca hangi ürünlerin fiyatının ne yönde değiştiği görülür. Toplu seçim yapılabilir, seçilenler arşivlenebilir veya silinebilir. "Tüm X raporu seç" linki sayfada görünmeyen raporları da seçime dahil eder.',
    faq: [],
  },
  {
    id: 'pazaryeri', title: 'Pazaryeri Ürünleri', page: 'MarketplaceProducts', icon: Store,
    short: 'Trendyol veya Hepsiburada panelinden indirilen ürün Excel\'ini yükler ve sistemiyle eşleştirir.',
    detail: 'Platform seçilir, Excel yüklenir. Sistem barkod/SKU eşleştirmesiyle master ürünlerimizle bağlantı kurar. Eşleşmeyen ürünler ayrı listede gösterilir, manuel eşleştirme yapılabilir. Eşleştirme tamamlandıktan sonra "Düzenlenen Fiyatlar" sayfasından güncel fiyatları platform formatında indirebilirsin.',
    faq: [
      { q: 'Bazı ürünler eşleşmemiş görünüyor.', a: 'Barkod veya SKU sistemdeki ürünle örtüşmüyordur. Manuel eşleştirme yap veya Ürünler sayfasında SKU\'yu güncelle.' },
    ],
  },
  {
    id: 'duzfiyatlar', title: 'Düzenlenen Fiyatlar', page: 'UpdatedPrices', icon: Tag,
    short: 'Eşleştirilmiş ürünlerin güncel satış fiyatlarını listeler ve platforma yüklenecek Excel üretir.',
    detail: 'Platform seçilir. Mevcut fiyat ile hesaplanan yeni fiyat yan yana gösterilir. "Excel\'e Aktar" ile platform formatında indirilen dosya doğrudan Trendyol veya Hepsiburada\'ya yüklenebilir. Büyük değişim gösteren ürünler öne çıkarılır.',
    faq: [],
  },
  {
    id: 'duzmaliyetler', title: 'Düzenlenen Maliyetler', page: 'UpdatedCosts', icon: FileText,
    short: 'Ürün maliyetlerini toplu güncelleme için Excel şablonu indirir ve güncelleme dosyası yükler.',
    detail: 'Mevcut maliyetleri Excel\'e aktarır, güncellenmiş dosyayı tekrar yükleyerek toplu maliyet güncellemesi yapılmasını sağlar. Ürünler sayfasında tek tek düzenleme yerine toplu maliyet değişikliği için kullanılır.',
    faq: [],
  },
  {
    id: 'kampanyalar', title: 'Kampanyalar (Trendyol)', page: 'Campaigns', icon: BadgePercent,
    short: 'Trendyol kampanya Excel\'ini yükler, her ürünün kampanya kârını hesaplar ve katılım seçimi yapar.',
    detail: 'Trendyol Satıcı Paneli\'nden indirilen kampanya Excel\'i yüklenir. Sistem ürünlerle SKU/barkod eşleştirmesi yapar. Her ürün için kampanya fiyatı, indirimli komisyon ve hesaplanan kâr gösterilir. "Akıllı Otomatik Seç" hedef kâra ulaşan ürünleri işaretler. Seçimler kaydedilir ve dışa aktarılan Excel Trendyol\'a yüklenir.',
    faq: [],
  },
  {
    id: 'komisyontarife', title: 'Ürün Komisyon Tarifesi (Trendyol)', page: 'TrendyolPriceRange', icon: BadgePercent,
    short: 'Trendyol\'un 4 kademeli indirimli komisyon teklifini analiz eder ve en kârlı kadeyi seçer.',
    detail: 'Trendyol, her ürün için fiyat düştükçe komisyon oranının da düştüğü 4 kademe sunar. Sistem hangi kademede hedef kâra ulaşıldığını hesaplar. "Akıllı Seç" en yüksek indirimli kademeden başlayıp aşağı iner. Seçimler kaydedilir ve Excel dışa aktarılır.',
    faq: [],
  },
  {
    id: 'plustarife', title: 'Plus Ürün Komisyon Tarifesi', page: 'PlusProductCommissionTariff', icon: BadgePercent,
    short: 'Trendyol Plus üyelerine özel tek kademeli komisyon teklifini analiz eder.',
    detail: 'Ürün Komisyon Tarifesi ile aynı yapıda çalışır ancak Plus\'a özel tek kademe komisyon oranı ve fiyat limiti içerir. Teklif fiyatı hedef kârı karşılıyorsa ürün seçilir.',
    faq: [],
  },
  {
    id: 'avantajlietiket', title: 'Avantajlı Ürün Etiketi', page: 'AdvantageProductTag', icon: Sparkles,
    short: 'Trendyol\'un "Avantaj / Çok Avantaj / Süper Avantaj" etiket kampanyasını yönetir.',
    detail: '3 etiket kademesi vardır: Avantaj (az indirim, yüksek komisyon) → Çok Avantaj → Süper Avantaj (fazla indirim, düşük komisyon). "Akıllı Seç" en yüksek indirimli etiketten başlar, indirimli hedef kâra ilk ulaşan etiketi seçer.',
    faq: [],
  },
  {
    id: 'flash', title: 'Flaş Ürünler', page: 'FlashProducts', icon: Zap,
    short: 'Trendyol\'un 3 saat ve 24 saat flaş indirim kampanyalarını yönetir.',
    detail: 'Her ürün için 3 saatlik ve 24 saatlik flaş fiyatı ve buna bağlı komisyon gösterilir. "Akıllı Seç" önce 3 saatliği dener; indirimli hedef kâra ulaşamazsa 24 saatliğe geçer.',
    faq: [],
  },
  {
    id: 'hbavantajli', title: 'HB Avantajlı Teklifler', page: 'HBAdvantageOffers', icon: Sparkles,
    short: 'HepsiBurada\'nın 3 kademeli avantajlı teklif kampanyasını analiz eder.',
    detail: 'HB, her ürün için 3 teklif kademesi sunar. Fiyat düştükçe komisyon da düşer. Sistem her kademede kâr hesaplar. "Akıllı Seç" en düşük indirimli tekliften başlar ve indirimli hedef kâra ulaşan kadeyi seçer. HB komisyon oranları KDV hariç gelir; sistem %20 KDV ekler.',
    faq: [],
  },
  {
    id: 'hbsepet', title: 'HB Sepet Kampanyaları', page: 'HBBasketCampaigns', icon: BadgePercent,
    short: 'HepsiBurada sepet kampanyası teklifini yönetir. Normal komisyon vs kampanya komisyonu karşılaştırılır.',
    detail: 'HepsiBurada\'dan indirilen sepet kampanyası Excel\'i yüklenir. Her ürün için normal komisyon ve kampanya komisyonu karşılaştırılır. Max fiyat sınırı içinde kalmak koşuluyla hedef kâra ulaşan fiyat bulunur. Seçimler dışa aktarılarak HB paneline yüklenir.',
    faq: [],
  },
  {
    id: 'hbkendi', title: 'HB Kendi Kampanyanı Oluştur', page: 'HBOwnCampaign', icon: Layers,
    short: 'HepsiBurada\'nın satıcı tarafından oluşturulan kampanya teklifini yönetir.',
    detail: 'HepsiBurada\'dan indirilen kampanya Excel\'i yüklenir. HB\'nin belirlediği indirim oranıyla kampanya fiyatı otomatik hesaplanır, kampanya komisyonuyla kâr görüntülenir. "Akıllı Seç" hedef kârı karşılayan ürünleri seçer. Dışa aktarılan Excel HB paneline yüklenir.',
    faq: [],
  },
  {
    id: 'ayarlar', title: 'Genel Ayarlar', page: 'Settings', icon: Settings,
    short: 'Hesap bilgileri, şifre değiştirme, marka adı ve kullanıcı yönetimini içerir.',
    detail: '4 sekme vardır: Hesap (ad, soyad, e-posta), Güvenlik (şifre değiştirme), Marka Ayarları (admin — uygulamada görünen marka adı), Kullanıcılar (admin — tüm kullanıcıları listeler ve rol atar). Marka Ayarları ve Kullanıcılar sekmeleri yalnızca admin rolündeki kullanıcılara görünür.',
    faq: [],
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
    <div className="px-4 lg:px-6 pb-10">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Başlık */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanım Kılavuzu</h1>
          <p className="text-gray-500 text-sm mt-1">Adım adım kurulum rehberi ve tüm sayfa açıklamaları.</p>
        </div>

        {/* Tab geçişi */}
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('wizard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'wizard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Map className="w-4 h-4" /> İlk Kurulum Rehberi
          </button>
          <button
            onClick={() => setTab('docs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'docs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Sayfa Rehberi
          </button>
        </div>

        {/* ── Kurulum Rehberi ── */}
        {tab === 'wizard' && (
          <div className="space-y-4">

            {/* İlerleme */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">Kurulum İlerlemesi</p>
                  <p className="text-sm text-gray-500">{completedCount} / {totalSteps} adım tamamlandı</p>
                </div>
                <span className="text-2xl font-bold text-gray-900">%{progress}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gray-900 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {completedCount === totalSteps && (
                <div className="mt-3 flex items-center gap-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
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
                <div key={p.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setOpenId(isOpen ? null : p.id)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={createPageUrl(p.page)}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-sm text-gray-900 hover:text-gray-600 transition-colors flex items-center gap-1"
                        >
                          {p.title}
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </Link>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.short}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{p.detail}</p>
                      {p.faq.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1">Sık Sorulan Sorular</p>
                          <FAQ items={p.faq} />
                        </>
                      )}
                      <Link
                        to={createPageUrl(p.page)}
                        className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
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
