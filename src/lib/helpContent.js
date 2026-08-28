/**
 * helpContent.js — sayfa basina yardim icerigi (tek dogru kaynak).
 *
 * Hem "Kullanim Kilavuzu" sayfasi (pages/Help.jsx) hem de sayfa ici
 * "Nasil kullanilir?" paneli (components/HelpPanel.jsx) bu listeden okur.
 * Yeni sayfa eklenince buraya bir kayit eklemek yeterlidir.
 *
 * Alanlar:
 *   id     - kilavuz sayfasindaki bolum anahtari
 *   title  - basligi
 *   page   - pages.config.js'teki sayfa anahtari (panel bununla eslesir)
 *   icon   - lucide ikonu
 *   short  - tek cumlelik ozet
 *   detail - detayli anlatim (\n\n ile paragraf)
 *   faq    - [{ q, a }] sikca sorulanlar
 */
import {
  LayoutDashboard, Package, FolderTree, Store, Truck, Percent,
  Calculator, FileText, BadgeDollarSign, Tag,
  BadgePercent, Sparkles, Zap, Settings, Layers, Columns3
} from 'lucide-react';

export const PAGES = [
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
    id: 'gorunum', title: 'Görünümü Özelleştir', page: 'ViewCustomize', icon: Columns3,
    short: 'Tablolardaki sütunları gizle, sırala, genişliğini ayarla ve sola sabitle.',
    detail: 'Her tablonun sağ üstündeki "Sütunlar" düğmesi o tablonun sütun ayarlarını açar. Bir sütunu gizleyebilir, yukarı/aşağı taşıyarak sırasını değiştirebilir, piksel cinsinden genişlik verebilir veya sola sabitleyerek yatay kaydırmada sabit kalmasını sağlayabilirsin.\n\nAyarlar yalnızca senin hesabına kaydedilir; diğer kullanıcılar kendi düzenlerini görür. Bu sayfa hangi tabloları özelleştirdiğini listeler ve istediğini varsayılana döndürmeni sağlar.',
    faq: [
      { q: 'Ayarlarım başka kullanıcıyı etkiler mi?', a: 'Hayır. Her kullanıcının sütun düzeni yalnızca kendisine özeldir.' },
      { q: 'Varsayılana nasıl dönerim?', a: 'Tablodaki "Sütunlar" panelinde Sıfırla\'ya basabilir veya bu sayfadan ilgili tablonun Sıfırla düğmesini kullanabilirsin.' },
    ],
  },
  {
    id: 'ayarlar', title: 'Genel Ayarlar', page: 'Settings', icon: Settings,
    short: 'Hesap bilgileri, şifre değiştirme, marka adı ve kullanıcı yönetimini içerir.',
    detail: '4 sekme vardır: Hesap (ad, soyad, e-posta), Güvenlik (şifre değiştirme), Marka Ayarları (admin — uygulamada görünen marka adı), Kullanıcılar (admin — tüm kullanıcıları listeler ve rol atar). Marka Ayarları ve Kullanıcılar sekmeleri yalnızca admin rolündeki kullanıcılara görünür.',
    faq: [],
  },
];

export const getHelpForPage = (pageName) =>
  PAGES.find(p => p.page === pageName) || null;
