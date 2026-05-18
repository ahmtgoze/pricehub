import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Package, FolderTree, Store, Truck, Percent,
  Calculator, FileText, BadgeDollarSign, Tag, BadgePercent,
  Sparkles, Zap, HelpCircle, ChevronDown, ChevronRight,
  ExternalLink, CheckCircle2, ArrowRight, AlertCircle, Info
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

const PAGES = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    page: 'Dashboard',
    icon: LayoutDashboard,
    color: 'bg-gray-100 text-gray-700',
    border: 'border-gray-200',
    short: 'Sistemin genel durumunu tek ekranda görüntüleyin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Dashboard, sisteminizin anlık özetini gösterir. Ürün sayısı, platform dağılımı ve fiyat metrikleri burada toplanır.
          Başka sayfalarda yaptığınız değişiklikler otomatik yansır; herhangi bir işlem yapmanıza gerek yoktur.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Göreceğiniz metrikler:</p>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• <strong>Toplam ürün sayısı</strong> — sistemde kayıtlı ürün adedi</li>
            <li>• <strong>Platform dağılımı</strong> — her platformdaki fiyatlandırılmış ürün sayısı</li>
            <li>• <strong>Kategori bazlı özet</strong> — hangi kategoride kaç ürün var</li>
            <li>• <strong>Ortalama kar marjı</strong> — platforma göre ortalama karlılık</li>
          </ul>
        </div>
        <NoteBox color="blue" icon={Info}>
          Dashboard salt görüntüleme amaçlıdır. Veri değişikliği yapamazsınız. Detaylar için ilgili sayfalara gidin.
        </NoteBox>
      </div>
    ),
    faq: []
  },

  {
    id: 'kategoriler',
    title: 'Kategoriler',
    page: 'Categories',
    icon: FolderTree,
    color: 'bg-yellow-100 text-yellow-700',
    border: 'border-yellow-200',
    short: 'Ürün kategorilerinizi tanımlayın. Komisyon hesaplamalarında temel referans noktasıdır.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Kategoriler, sistemin en temel verisidir. Komisyon oranları <strong>platform + kategori kombinasyonuna</strong> göre tanımlandığından,
          önce tüm ürün kategorilerinizi buraya girmeniz gerekmektedir.
        </p>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Kategori alanları:</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <Field name="Kategori Adı" required>Ürün grubunun adı. Örneğin: "Ev Tekstili", "Elektronik", "Kozmetik".</Field>
            <Field name="Varsayılan KDV Oranı">Bu kategorideki ürünler için standart KDV oranı (%). Örn: %20 veya %10.</Field>
            <Field name="Aktif / Pasif">Pasif kategoriler ürün ekleme formunda görünmez.</Field>
          </div>
        </div>
        <NoteBox color="yellow" icon={AlertCircle} title="Önemli">
          Kategori adını değiştirirseniz komisyon kayıtlarını manuel kontrol edin.
        </NoteBox>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Nasıl eklersiniz?</p>
          <StepList steps={['"+ Yeni Kategori" butonuna tıklayın.', 'Kategori adını ve KDV oranını girin.', '"Kaydet" butonuna basın.']} />
        </div>
        <FAQ items={[
          { q: 'Kaç kategori ekleyebilirim?', a: 'Sınırsız.' },
          { q: 'KDV oranını yanlış girdim, değiştirsem ne olur?', a: 'Mevcut ürünlerin KDV oranı otomatik güncellenmez. Ürün düzenleme ekranından tek tek değiştirmeniz gerekir.' },
        ]} />
      </div>
    )
  },

  {
    id: 'platformlar',
    title: 'Platformlar',
    page: 'Platforms',
    icon: Store,
    color: 'bg-indigo-100 text-indigo-700',
    border: 'border-indigo-200',
    short: 'Trendyol, Hepsiburada ve Web Sitesi platformlarını aktif/pasif yapın ve kargo ayarlarını yönetin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Sistem üç sabit platform içerir: <strong>Trendyol</strong>, <strong>Hepsiburada</strong> ve <strong>Web Sitesi</strong>.
          İlk girişte otomatik oluşturulurlar.
        </p>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Her platformda yapabileceğiniz ayarlar:</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <Field name="Aktif / Pasif">Platform aktifse fiyat hesaplama yapılır.</Field>
            <Field name="Kargo Firması">Platform için kullanılacak kargo firması.</Field>
            <Field name="Barem Sistemi">Aktifse ürün satış fiyatına göre kargo ücreti barema göre belirlenir.</Field>
            <Field name="Bugün Kargoda">Her iki tarafta da açıksa indirimli hizmet bedeli uygulanır.</Field>
            <Field name="Stopaj Oranı">Platform stopaj yüzdesi. Trendyol ve Hepsiburada için admin belirler.</Field>
            <Field name="Hizmet Bedeli">Platform'un sipariş başına aldığı ücret.</Field>
          </div>
        </div>
        <NoteBox color="yellow" icon={AlertCircle} title="Pazaryeri özel notu">
          Trendyol ve Hepsiburada için barem, stopaj ve hizmet bedelleri <strong>admin</strong> tarafından belirlenir.
        </NoteBox>
        <FAQ items={[
          { q: 'Web Sitesi platformunu nasıl yapılandırırım?', a: '"Tüm Ayarlar" butonuna tıklayın. Admin kısıtlaması yoktur.' },
          { q: '"Bugün Kargoda" nasıl çalışır?', a: 'Hem platform hem ürün bazında açık olmalıdır.' },
        ]} />
      </div>
    )
  },

  {
    id: 'paketleme',
    title: 'Paketleme',
    page: 'PackageManagement',
    icon: Package,
    color: 'bg-cyan-100 text-cyan-700',
    border: 'border-cyan-200',
    short: 'Kargo poşeti, kutu, etiket gibi paketleme malzemelerinin maliyetini sisteme girin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Paketleme maliyeti satış fiyatından düşülen giderler arasındadır. Paket grupları oluşturun, malzeme kalemleri ekleyin.
        </p>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">1. Paket Grubu Oluşturma</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <Field name="Paket Adı" required>Örn: "Küçük Poşet", "Karton Kutu M".</Field>
            <Field name="Min / Max Desi">Bu aralıktaki ürünlere otomatik paket atanır.</Field>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">2. Paket Kalemi Ekleme</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <Field name="Kalem Tipi" required>Poşet, kutu, etiket, bant veya ek gider.</Field>
            <Field name="Maliyet (KDV dahil)" required>Birim maliyet. Tüm kalemlerin toplamı paketin maliyetidir.</Field>
          </div>
        </div>
        <FAQ items={[
          { q: 'Paket maliyeti KDV dahil mi girilmeli?', a: 'Evet, tüm maliyet alanları KDV dahil girilmelidir.' },
        ]} />
      </div>
    )
  },

  {
    id: 'kargo',
    title: 'Kargo Tarifeleri',
    page: 'ShippingRates',
    icon: Truck,
    color: 'bg-orange-100 text-orange-700',
    border: 'border-orange-200',
    short: 'Platform ve kargo firması bazlı kargo ücretlerini tanımlayın.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Kargo tarifeleri satış fiyatı hesaplanırken gönderim maliyetini belirler. Barem veya desi bazlı tarife seçilebilir.
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Platform" required>Hangi platforma ait olduğu.</Field>
          <Field name="Tarife Tipi" required>barem1, barem2 veya desi.</Field>
          <Field name="Ücret" required>KDV dahil TL olarak.</Field>
        </div>
        <FAQ items={[
          { q: 'Barem ve desi tarifesini aynı anda tanımlamalı mıyım?', a: 'Evet. Desi barem limitini aşarsa sistem otomatik desi bazlı tarifeye geçer.' },
        ]} />
      </div>
    )
  },

  {
    id: 'komisyonlar',
    title: 'Komisyonlar',
    page: 'Commissions',
    icon: Percent,
    color: 'bg-red-100 text-red-700',
    border: 'border-red-200',
    short: 'Platform + kategori kombinasyonuna göre komisyon oranlarını ve hedef kar marjlarını tanımlayın.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Komisyon, platformun satış fiyatından aldığı yüzdedir. Her ürün için <strong>kategori + platform</strong> kombinasyonuna göre belirlenir.
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Platform" required>Açılır menüden seçin.</Field>
          <Field name="Kategori" required>Açılır menüden seçin.</Field>
          <Field name="Komisyon Oranı (%)" required>Örn: %18.</Field>
          <Field name="Hedef Kâr Oranı (%)">Sistem bu orana göre optimal fiyatı hesaplar.</Field>
        </div>
        <FAQ items={[
          { q: 'Komisyon değişirse fiyatlar otomatik güncellenir mi?', a: 'Hayır. Komisyonu güncelledikten sonra ürünü kaydedin veya yeniden hesaplayın.' },
        ]} />
      </div>
    )
  },

  {
    id: 'urunler',
    title: 'Ürünler',
    page: 'Products',
    icon: Package,
    color: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    short: 'Ana ürün kataloğunuzu yönetin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Ürünler sayfası sistemin merkezidir. Buraya girilen her ürün tüm aktif platformlarda otomatik fiyatlandırılır.
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="SKU" required>Benzersiz stok kodu.</Field>
          <Field name="Maliyet (KDV dahil)" required>Tedarik maliyeti.</Field>
          <Field name="Kategori" required>Komisyon hesabında kullanılır.</Field>
          <Field name="Desi">Kargo hesaplamasında kullanılır.</Field>
        </div>
        <FAQ items={[
          { q: "Aynı SKU'yu tekrar yüklersem ne olur?", a: 'Mevcut kayıt güncellenir; çift kayıt oluşmaz.' },
        ]} />
      </div>
    )
  },

  {
    id: 'fiyatlar',
    title: 'Fiyatlar',
    page: 'Prices',
    icon: BadgeDollarSign,
    color: 'bg-green-100 text-green-700',
    border: 'border-green-200',
    short: 'Ürünlerinizin platform bazlı hesaplanmış satış fiyatlarını görüntüleyin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Fiyatlar sayfası sistemin çıktısıdır. Salt görüntüleme amaçlıdır; fiyatlar otomatik hesaplanır.
        </p>
        <NoteBox color="yellow" icon={AlertCircle} title="Fiyat güncel değilse">
          İlgili ürünü Ürünler sayfasından açıp tekrar kaydedin.
        </NoteBox>
        <FAQ items={[
          { q: 'Satış fiyatını manuel değiştirebilir miyim?', a: 'Hayır. Fiyatlar tamamen otomatik hesaplanır.' },
        ]} />
      </div>
    )
  },

  {
    id: 'hesaplayici',
    title: 'Hesaplayıcı',
    page: 'Calculator',
    icon: Calculator,
    color: 'bg-teal-100 text-teal-700',
    border: 'border-teal-200',
    short: 'Belirli bir ürün ve platform için farklı satış fiyatlarında kâr durumunu anlık görün.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Hesaplayıcı, "Bu ürünü bu fiyata satsam ne kadar kazanırım?" sorusunu anlık yanıtlar.
        </p>
        <StepList steps={['Ürünü seçin.', 'Platformu seçin.', 'Satış fiyatını girin.', 'Sistem kâr detayını gösterir.']} />
        <NoteBox color="green" icon={Info}>
          Bu sayfada yaptığınız denemeler sisteme kaydedilmez.
        </NoteBox>
      </div>
    )
  },

  {
    id: 'pazaryeri',
    title: 'Pazaryeri Ürünleri',
    page: 'MarketplaceProducts',
    icon: Store,
    color: 'bg-sky-100 text-sky-700',
    border: 'border-sky-200',
    short: 'Trendyol veya Hepsiburada\'dan indirdiğiniz Excel dosyalarını yükleyin ve sistem ürünleriyle eşleştirin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Bu sayfanın amacı, platforma yüklediğiniz ürünlerin mevcut durumunu sisteme aktarmaktır.
          Eşleştirildikten sonra "Düzenlenen Fiyatlar" sayfasından güncel fiyatları indirip platforma yükleyebilirsiniz.
        </p>

        {/* HepsiBurada Adımları */}
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-bold text-orange-800 mb-3">📦 HepsiBurada — Ürün Listesi Nasıl Yüklenir?</p>
          <StepList steps={[
            'HepsiBurada paneline girin.',
            'Üst menüden <strong>"Ürünler"</strong> butonuna tıklayın.',
            '<strong>"Envanter"</strong> seçeneğine girin.',
            '"Tümü" veya "Satışta" olarak ürünleri listeleyin.',
            '<strong>"İndir"</strong> butonuna basın.',
            'Açılan pencerede <strong>"Satış Bilgisi Listeleri" → "Satıştaki Ürünler"</strong> butonuna tıklayın.',
            'Excel oluşturulduktan sonra <strong>"İndirme Geçmişi"</strong> butonuna tıklayın.',
            'En üstteki oluşturulan Excel için <strong>"İndir"</strong> butonuna basın.',
            'İndirilen Excel\'i bu sayfada <strong>HepsiBurada platformunu seçip</strong> "Excel Yükle" butonuyla yükleyin.',
            'Ürünler yüklendikten sonra sistemizdeki master ürünlerle eşleştirin.',
          ]} />
          <NoteBox color="yellow" icon={AlertCircle}>
            <strong>⚠️ Otomatik eşleştirme yaparsanız mutlaka kontrol edin!</strong> Hatalı eşleştirme yanlış fiyat güncellemesine yol açabilir.
          </NoteBox>
        </div>

        {/* Trendyol Adımları */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800 mb-3">🛒 Trendyol — Ürün Listesi Nasıl Yüklenir?</p>
          <StepList steps={[
            'Trendyol Satıcı Paneline girin.',
            'Üst menüden <strong>"Ürün"</strong> butonuna tıklayın.',
            'Açılan dropdown\'dan <strong>"Ürün Listesi"</strong> seçeneğine tıklayın.',
            '"Tüm Ürünler" veya "Aktif Ürünler" seçeneğini seçin.',
            'Sağ tarafta bulunan <strong>"Excel ile İndir"</strong> butonuna tıklayın.',
            '<strong>"İndirme Geçmişim"</strong> bölümünde oluşturulan son Excel\'i indirin.',
            'İndirilen Excel\'i bu sayfada <strong>Trendyol platformunu seçip</strong> "Excel Yükle" butonuyla yükleyin.',
            'Ürünler yüklendikten sonra sistemizdeki master ürünlerle eşleştirin.',
          ]} />
          <NoteBox color="yellow" icon={AlertCircle}>
            <strong>⚠️ Otomatik eşleştirme yaparsanız mutlaka kontrol edin!</strong> Hatalı eşleştirme yanlış fiyat güncellemesine yol açabilir.
          </NoteBox>
        </div>

        <FAQ items={[
          { q: "Aynı Excel'i iki kez yüklersem ne olur?", a: 'Sistem mevcut kayıtları günceller. Çift kayıt oluşmaz.' },
          { q: 'Yükleme sonrası bazı ürünler neden "Eşleşmemiş" görünüyor?', a: 'Barkod veya model kodu, sistem ürünlerindeki SKU ile örtüşmüyordur. Manuel eşleştirme yapın.' },
          { q: 'Otomatik eşleştirme ne kadar doğru?', a: 'Ürün adına göre çalışır. Hatalı eşleştirme olabilir; mutlaka kontrol edin ve yanlış olanları düzeltin.' },
        ]} />
      </div>
    )
  },

  {
    id: 'duzenlenen-fiyatlar',
    title: 'Düzenlenen Fiyatlar',
    page: 'UpdatedPrices',
    icon: Tag,
    color: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    short: 'Sistem tarafından hesaplanan güncel satış fiyatlarını görüntüleyin ve platforma yüklemek için indirin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Pazaryeri Ürünleri sayfasında yüklenen ve eşleştirilen ürünlerin yeni satış fiyatları bu sayfada listelenir.
          Platform bazlı Excel dosyası olarak indirilip doğrudan platforma yüklenebilir.
        </p>

        {/* HepsiBurada Fiyat Güncelleme */}
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-bold text-orange-800 mb-3">📦 HepsiBurada — Fiyat Güncelleme Nasıl Yapılır?</p>
          <StepList steps={[
            'Sağ üstteki <strong>"Sırala"</strong> butonuna tıklayarak <strong>"Değişim Oranı (Yüksekten Düşüğe)"</strong> veya <strong>"Değişim Tutarı (Yüksekten Düşüğe)"</strong> seçin.',
            'Değişim oranı çok yüksek olan ürünler varsa <strong>Pazaryeri Ürünleri</strong> sayfasında eşleştirme hatasını düzeltin.',
            'Hata düzeltildikten sonra bu sayfaya dönüp <strong>"Güncelle"</strong> butonuna tıklayın.',
            'Sıralamayı tekrar kontrol edin. Her şey doğruysa <strong>"Excel\'e Aktar"</strong> butonuna tıklayın.',
            'İndirdiğiniz Excel\'i HepsiBurada panelinde yüklemek için: <strong>"Ürünler" → "Envanter" → "Toplu Güncelleme"</strong> sayfasına gidin.',
            '<strong>"Hazırladığınız Excel dosyasını sisteme yükleyin"</strong> bölümüne Excel dosyanızı yükleyin.',
            '<strong>"Yükleme Tipi"</strong> olarak <strong>"Fiyat Güncelleme"</strong> tipini seçin.',
            'En alttaki <strong>"Yükle"</strong> butonuna tıklayın.',
          ]} />
        </div>

        {/* Trendyol Fiyat Güncelleme */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800 mb-3">🛒 Trendyol — Fiyat Güncelleme Nasıl Yapılır?</p>
          <StepList steps={[
            'Sağ üstteki <strong>"Sırala"</strong> butonuna tıklayarak <strong>"Değişim Oranı (Yüksekten Düşüğe)"</strong> veya <strong>"Değişim Tutarı (Yüksekten Düşüğe)"</strong> seçin.',
            'Değişim oranı çok yüksek olan ürünler varsa <strong>Pazaryeri Ürünleri</strong> sayfasında eşleştirme hatasını düzeltin.',
            'Hata düzeltildikten sonra bu sayfaya dönüp <strong>"Güncelle"</strong> butonuna tıklayın.',
            'Sıralamayı tekrar kontrol edin. Her şey doğruysa <strong>"Excel\'e Aktar"</strong> butonuna tıklayın.',
            'İndirdiğiniz Excel\'i Trendyol panelinde yüklemek için: <strong>"Ürün" → "Toplu Ürün İşlemleri"</strong> sayfasına gidin.',
            '<strong>"Şablon Yükle"</strong> butonuna tıklayın.',
            '<strong>"Şablon Tipi"</strong> olarak <strong>"Stok & Fiyat Güncelleme"</strong> tipini seçin.',
            'Hazırladığınız Excel dosyasını sisteme yükleyin ve <strong>"Yükle"</strong> butonuna tıklayın.',
          ]} />
        </div>

        <NoteBox color="blue" icon={Info} title="Platform bazlı formatlar">
          Trendyol ve Hepsiburada için platforma özgü Excel sütun düzeni oluşturulur. Ek düzenleme gerekmez.
        </NoteBox>

        <FAQ items={[
          { q: 'Tabloda ürün görünmüyorsa ne yapmalıyım?', a: 'Pazaryeri Ürünleri sayfasında ürünü eşleştirmiş olduğunuzu ve doğru platformu seçtiğinizi kontrol edin.' },
          { q: "İndirdiğim Excel'i doğrudan platforma yükleyebilir miyim?", a: 'Evet. Dosya platform tarafından beklenen sütun formatında oluşturulur.' },
          { q: 'Değişim oranı neden bu kadar yüksek?', a: 'Büyük ihtimalle Pazaryeri Ürünleri sayfasında hatalı eşleştirme yapılmıştır. O sayfaya gidip eşleştirmeyi kontrol edin.' },
        ]} />
      </div>
    )
  },

  {
    id: 'duzenlenen-maliyetler',
    title: 'Düzenlenen Maliyetler',
    page: 'UpdatedCosts',
    icon: FileText,
    color: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    short: 'Güncel maliyet bilgilerini platforma yüklemek üzere indirin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Eşleştirilmiş ürünlerin güncel maliyetlerini platform formatında çıktı olarak verir.
        </p>
        <StepList steps={['Platformu seçin.', '"Excel\'e Aktar" butonuna tıklayın.', 'İndirilen dosyayı ilgili platforma yükleyin.']} />
      </div>
    )
  },

  {
    id: 'komisyon-tarifesi',
    title: 'Ürün Komisyon Tarifesi',
    page: 'TrendyolPriceRange',
    icon: BadgePercent,
    color: 'bg-orange-100 text-orange-700',
    border: 'border-orange-200',
    short: 'Trendyol\'un dönemsel fiyat aralığı kampanyalarını analiz edin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Trendyol belirli dönemlerde fiyat aralığı kampanyaları sunar. Bu sayfa her ürün için 4 aralıkta kâr hesaplar.
        </p>
        <StepList steps={[
          'Trendyol panelinden komisyon tarifesi Excel\'ini indirin.',
          '"Excel Yükle" butonuyla sisteme aktarın.',
          'Her ürün için en karlı aralığı seçin.',
          '"Excel İndir" ile dışa aktarın.',
        ]} />
      </div>
    )
  },

  {
    id: 'avantajli-urun',
    title: 'Avantajlı Ürün Etiketi',
    page: 'AdvantageProductTag',
    icon: Sparkles,
    color: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
    short: 'Trendyol\'un Avantaj kampanyalarını analiz edin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Avantaj, Çok Avantaj, Süper Avantaj — 3 seviyeden hangisinin daha karlı olduğunu hesaplar.
        </p>
        <StepList steps={[
          'Trendyol panelinden Avantajlı Ürün Etiketi Excel\'ini indirin.',
          '"Excel Yükle" butonuyla sisteme aktarın.',
          'Her ürün için en karlı seviyeyi seçin.',
          '"Excel İndir" ile dışa aktarın.',
        ]} />
      </div>
    )
  },

  {
    id: 'flash-urunler',
    title: 'Flaş Ürünler',
    page: 'FlashProducts',
    icon: Zap,
    color: 'bg-yellow-100 text-yellow-700',
    border: 'border-yellow-200',
    short: '24 Saat ve 3 Saat Flaş kampanyalarında karlılığınızı kontrol edin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Trendyol Flaş Satış kampanyasına katılmadan önce kâr/zarar durumunu analiz edin.
        </p>
        <StepList steps={[
          'Trendyol panelinden Flaş Satış Excel\'ini indirin.',
          '"Excel Yükle" butonuyla sisteme aktarın.',
          'Her ürün için 24 Saat veya 3 Saat flaş fiyatını seçin.',
          'Kâr oranını kontrol edin.',
          '"Excel İndir" ile dışa aktarın.',
        ]} />
        <NoteBox color="red" icon={AlertCircle}>
          Flaş fiyat kârı negatif görünüyorsa o ürünle kampanyaya katılmayın.
        </NoteBox>
      </div>
    )
  },

  {
    id: 'mesajlar-duyurular',
    title: 'Mesajlar ve Duyurular',
    page: 'Dashboard',
    icon: HelpCircle,
    color: 'bg-violet-100 text-violet-700',
    border: 'border-violet-200',
    short: 'Sistem duyurularını takip edin ve yönetici ile mesajlaşın.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Ekranın sağ üst köşesindeki <strong>🔔 çan ikonu</strong> (Duyurular) ve <strong>💬 mesaj ikonu</strong> ile erişilir.
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Duyurular">Admin'in tüm kullanıcılara ilettiği bildirimler. Okunmamışlar kırmızı sayıyla gösterilir.</Field>
          <Field name="Mesajlar">Yönetici ile birebir mesajlaşma. Mesajlar anında iletilir.</Field>
        </div>
        <FAQ items={[
          { q: 'Mesaj gönderince yönetici ne zaman görür?', a: 'Mesajınız anında yönetici paneline düşer.' },
        ]} />
      </div>
    )
  },

  {
    id: 'raporlar',
    title: 'Raporlar',
    page: 'UpdateReports',
    icon: FileText,
    color: 'bg-purple-100 text-purple-700',
    border: 'border-purple-200',
    short: 'Fiyat değişiklik geçmişini takip edin.',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          Sistem her otomatik fiyat güncellemesini kayıt altına alır. Hangi ürünün fiyatının ne zaman değiştiğini görebilirsiniz.
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <Field name="Ürün / SKU">Hangi ürünün fiyatının değiştiği.</Field>
          <Field name="Eski / Yeni Fiyat">Değişiklik öncesi ve sonrası satış fiyatı.</Field>
          <Field name="Değişiklik Nedeni">Maliyet, kargo veya komisyon güncellemesi.</Field>
        </div>
      </div>
    )
  },
];

const QUICK_START = [
  { step: 1, label: 'Kategorileri Tanımlayın', page: 'Categories', desc: 'Ürün gruplarınızı ve KDV oranlarını girin.' },
  { step: 2, label: 'Platformları Yapılandırın', page: 'Platforms', desc: 'Kargo firması ve "Bugün Kargoda" ayarlarını yapın.' },
  { step: 3, label: 'Kargo Tarifelerini Girin', page: 'ShippingRates', desc: 'Barem1, Barem2 ve desi bazlı kargo ücretlerini tanımlayın.' },
  { step: 4, label: 'Komisyonları Girin', page: 'Commissions', desc: 'Her platform × kategori için komisyon oranı ve hedef kâr belirleyin.' },
  { step: 5, label: 'Paketleme Maliyetlerini Girin', page: 'PackageManagement', desc: 'Paket grupları oluşturun, her malzemeyi ekleyin.' },
  { step: 6, label: 'Ürünlerinizi Ekleyin', page: 'Products', desc: 'Tekil veya toplu Excel yükleme ile ürün kataloğunuzu oluşturun.' },
  { step: 7, label: 'Pazaryeri Verilerini Yükleyin', page: 'MarketplaceProducts', desc: 'Platform Excel dosyalarını yükleyin ve ürünleri eşleştirin.' },
  { step: 8, label: 'Fiyatları İndirin', page: 'UpdatedPrices', desc: 'Hesaplanan fiyatları platform formatında indirip pazaryerine yükleyin.' },
];

export default function Help() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <HelpCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kullanım Kılavuzu</h1>
            <p className="text-gray-500 mt-0.5">Her sayfanın ne işe yaradığını, nasıl doldurulacağını ve neyi etkilediğini öğrenin.</p>
          </div>
        </div>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-blue-900 mb-2">PriceHub Nedir?</h2>
            <p className="text-blue-800 leading-relaxed text-sm mb-4">
              PriceHub, e-ticaret satıcılarının <strong>Trendyol</strong>, <strong>Hepsiburada</strong> ve <strong>Web Sitesi</strong> gibi
              farklı satış kanallarındaki ürün fiyatlarını tek bir merkezden yönetmesini sağlayan kapsamlı bir fiyatlandırma sistemidir.
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRight className="w-5 h-5 text-green-600" />
              İlk Kez Kullananlar İçin — Hızlı Başlangıç
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {QUICK_START.map((item) => (
                <div key={item.step} className="flex items-start gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold shrink-0">{item.step}</div>
                  <div className="flex-1 min-w-0">
                    <Link to={createPageUrl(item.page)} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1 group-hover:text-blue-600">
                      {item.label}
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Detaylı Sayfa Rehberi</h2>
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
                      {p.faq && p.faq.length > 0 && <FAQ items={p.faq} />}
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
        </div>

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
                'Flaş satış veya kampanyalara katılmadan önce kâr hesaplarını mutlaka kontrol edin.',
                '"Hesaplayıcı" sayfası ile farklı fiyat senaryolarını risksiz deneyebilirsiniz.',
                'Düzenlenen Fiyatlar sayfasında değişim oranı çok yüksek ürünler varsa eşleştirme hatasını kontrol edin.',
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
    </div>
  );
}
