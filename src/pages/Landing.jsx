import React, { useState } from 'react';
import { db } from '@/api/db';
import { ArrowRight, ChevronDown, ShieldCheck, History, LayoutGrid, Check } from 'lucide-react';
import { MARKA_ADI } from '@/config/marka';

/**
 * Tanitim sayfasi — tasarim prototipindeki bolum sirasi ve metinleriyle:
 * Ozellikler -> Uc adimda kurulum -> Ekiple guvenle calisin -> SSS -> CTA.
 *
 * Renkler tema degiskenlerinden geliyor (bg-card, text-muted-foreground ...);
 * onceki surum sabit gray-* siniflari kullandigi icin koyu temada okunmuyordu.
 */

const OZELLIKLER = [
  { t: 'Platform tarifeleri', d: 'Komisyon, hizmet bedeli ve vergiler kanal bazında bir kez tanımlanır.' },
  { t: 'Barem ve desi kargo', d: 'Barem 1 / Barem 2 aralıkları, 10 desi üstünde desi tarifesi.' },
  { t: 'Bugün kargoda', d: 'Aynı gün gönderimde indirimli barem ve indirimli hizmet bedeli.' },
  { t: 'Kategori bazlı hedef kâr', d: 'Tişörtte %28, pantolonda %36 — hedef kategoriye göre.' },
  { t: 'Kampanya kârlılık analizi', d: 'Kademe kademe net kâr, akıllı seçim ve barem önerisi.' },
  { t: 'Excel içe / dışa aktarım', d: 'Kendi şablonunuz, zorunlu alan kontrolü, XLSX / CSV / PDF.' },
  { t: 'Kişisel görünüm', d: 'Sütun düzeni, tema ve vurgu rengi kullanıcıya özel.' },
  { t: 'Raporlar ve arşiv', d: 'Her fiyat değişimi sebebiyle birlikte kayıt altında.' },
];

const ADIMLAR = [
  {
    no: '1',
    baslik: 'Maliyetleri girin',
    govde: 'Ürün maliyeti, paketleme ve ek kalemler tek kartta toplanır. Tek tek ya da Excel ile toplu.',
    maddeler: ['Alış, baskı, paketleme, iade payı', 'Excel şablonuyla toplu yükleme', 'Kategori bazlı hedef kâr oranı'],
  },
  {
    no: '2',
    baslik: 'Tarifeleri tanımlayın',
    govde: 'Komisyon oranı, kargo baremi, hizmet bedeli ve vergiler platform bazında bir kez kurulur.',
    maddeler: ['Barem 1 / Barem 2 ve desi tarifesi', 'Bugün kargoda indirimli ücretler', 'Stopaj, net KDV, kurumlar vergisi'],
  },
  {
    no: '3',
    baslik: 'Fiyatı alın',
    govde: 'Her ürün ve platform için satış fiyatı ve net kâr hesaplanır; değişiklikte kendiliğinden güncellenir.',
    maddeler: ['Kanallar arası kâr karşılaştırması', 'Zarardaki ürünlerin işaretlenmesi', 'Kampanya kârlılık analizi'],
  },
];

const GUVEN = [
  {
    ikon: ShieldCheck,
    baslik: 'Yetki ayrımı',
    govde: 'Barem, stopaj ve hizmet bedellerini admin belirler; kullanıcılar yalnızca görür. Marka ayarları ve kullanıcı yönetimi admindedir.',
  },
  {
    ikon: History,
    baslik: 'Her değişiklik kayıtlı',
    govde: 'Fiyat neden değişti? Maliyet mi, komisyon mu, kampanya mı? Güncelleme Raporları her değişimi sebebi ve kaynağıyla saklar; arşivler, geri alır.',
  },
  {
    ikon: LayoutGrid,
    baslik: 'Görünüm size özel',
    govde: 'Sütun düzeni, tema, vurgu rengi ve Excel şablonları kullanıcı bazında saklanır. Herkes kendi düzeninde çalışır, hesap mantığı ortaktır.',
  },
];

const SSS = [
  { s: 'PriceHub tam olarak neyi hesaplıyor?', c: 'Ürün maliyeti, baskı ve paketleme, platform komisyonu, kargo baremi, hizmet bedeli, stopaj, net KDV ve kurumlar vergisini birlikte hesaplayarak ürünün platform bazında net kârını ve kâr oranını üretir. Hedef kâr oranı girildiğinde gerekli satış fiyatını geriye doğru hesaplar.' },
  { s: 'Hangi platformlarla çalışıyor?', c: 'Trendyol, Hepsiburada ve kendi web siteniz için ayrı tarife ve fiyat tanımı yapılabilir. Yeni platform, komisyon tarifesi ve kargo baremi eklenebilir.' },
  { s: 'Mevcut Excel dosyalarımı kullanabilir miyim?', c: 'Evet. Ürün kataloğu, komisyon tarifesi ve kampanya dosyaları Excel ile toplu yüklenir. Dışa aktarımda hangi sütunların hangi sırayla çıkacağını kendi şablonunuz olarak kaydedebilirsiniz.' },
  { s: 'Kampanya kârlılığını önceden görebiliyor muyum?', c: 'Flaş ürün, avantajlı teklif, sepet kampanyası ve indirim kademeleri için yüklenen dosyadaki her fiyat kademesinin net kârı hesaplanır; kârlı kademeyi toplu olarak seçebilirsiniz.' },
  { s: 'Ekipte birden fazla kişi kullanabilir mi?', c: 'Evet. Kullanıcı bazlı yetki ve görünüm ayarları vardır; sütun düzeni, gizlenen alanlar ve Excel şablonu kişiye özeldir, hesaplama mantığı ortaktır.' },
  { s: 'Maliyet değiştiğinde ne oluyor?', c: 'Maliyet güncellendiğinde etkilenen ürün ve platform fiyatları işaretlenir, yeniden hesaplanır ve değişiklik geçmişi kim tarafından neden yapıldığıyla birlikte kayıt altına alınır.' },
  { s: 'Kurulum ne kadar sürer?', c: 'Kategoriler, komisyonlar ve tarifeler bir kez tanımlanır; ürünler Excel ile toplu yüklenir. Tipik bir katalog aynı gün fiyat üretmeye başlar. İçerideki 9 adımlık kurulum rehberi ilerlemenizi takip eder.' },
  { s: 'Excel dosyalarımdan geçiş zor mu?', c: 'Hayır. Mevcut dosyanızı yüklersiniz; sütunlar başlık adına göre eşleştirilir, sıra önemli değildir. Zorunlu alanı boş satırlar aktarılmaz ve hata listesinde gösterilir — sessizce eksik veri oluşmaz.' },
  { s: 'Verilerim ve fiyat stratejim güvende mi?', c: 'Her kullanıcı kendi hesabıyla girer; tarife ve maliyet yetkileri rol bazlıdır. Görünüm ayarları kişiye özeldir, ortak veriyi bozamaz. Tüm fiyat değişimleri sebep ve kaynakla kayıt altındadır.' },
  { s: 'Kaç kullanıcıyla çalışabilirim?', c: 'Bir admin (hesap sahibi) ve en fazla 3 kullanıcı vardır. Admin tarifeleri ve kullanıcıları yönetir; kullanıcılar ürün, fiyat ve kampanya işlemlerini yürütür.' },
];

function BolumBasligi({ etiket, baslik }) {
  return (
    <div className="text-center mb-12">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{etiket}</span>
      <h2 className="mt-2 text-[28px] md:text-[34px] font-semibold tracking-[-0.9px] text-foreground">{baslik}</h2>
    </div>
  );
}

export default function Landing() {
  const [acikSoru, setAcikSoru] = useState(-1);
  const girisYap = () => db.auth.redirectToLogin('/');

  return (
    <div className="min-h-screen bg-secondary text-foreground">
      <nav className="flex items-center justify-between px-6 md:px-16 py-5 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <span className="text-[22px] font-semibold tracking-[-0.5px]">{MARKA_ADI}</span>
        <button
          onClick={girisYap}
          className="flex items-center gap-2 bg-primary text-primary-foreground font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          Giriş Yap <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground bg-card border border-border px-4 py-1.5 rounded-full mb-6">
          E-Ticaret Fiyat Yönetimi
        </span>
        <h1 className="text-[36px] md:text-[56px] font-semibold leading-[1.05] tracking-[-1.6px] mb-6 max-w-3xl">
          Tüm platformlarınız için merkezi fiyat kontrolü
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mb-10 leading-relaxed">
          Komisyon, kargo baremi, hizmet bedeli ve vergileri birlikte hesaplar; her ürün için
          platform bazında net kârı ve gereken satış fiyatını üretir.
        </p>
        <button
          onClick={girisYap}
          className="flex items-center gap-2 bg-primary text-primary-foreground font-medium px-8 py-4 rounded-2xl text-base hover:opacity-90 transition-opacity"
        >
          Hemen Başla <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      <section className="px-6 md:px-16 py-16 max-w-6xl mx-auto">
        <BolumBasligi etiket="Özellikler" baslik="Sistemde neler var" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {OZELLIKLER.map((o) => (
            <div key={o.t} className="rounded-[18px] border border-border bg-card p-5">
              <h3 className="font-semibold text-[15px] tracking-[-0.2px] mb-2">{o.t}</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">{o.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-16 py-16 max-w-6xl mx-auto">
        <BolumBasligi etiket="Nasıl kullanırım" baslik="Üç adımda kurulum" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ADIMLAR.map((a) => (
            <div key={a.no} className="rounded-[18px] border border-border bg-card p-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-4">
                {a.no}
              </span>
              <h3 className="font-semibold text-[17px] tracking-[-0.3px] mb-2">{a.baslik}</h3>
              <p className="text-muted-foreground text-[13.5px] leading-relaxed mb-4">{a.govde}</p>
              <ul className="space-y-2">
                {a.maddeler.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                    <Check className="w-4 h-4 mt-[1px] shrink-0 text-green-600" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-[13px] text-muted-foreground mt-8 max-w-3xl mx-auto leading-relaxed">
          Sisteme girdikten sonra her sayfanın sağ üstündeki &ldquo;Nasıl kullanılır?&rdquo; düğmesi,
          o ekranın adım adım anlatımını açar; Kullanım Kılavuzu 9 adımlık kurulum rehberiyle
          ilerlemenizi takip eder.
        </p>
      </section>

      <section className="px-6 md:px-16 py-16 max-w-6xl mx-auto">
        <BolumBasligi etiket="Güven" baslik="Ekiple güvenle çalışın" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {GUVEN.map((g) => (
            <div key={g.baslik} className="rounded-[18px] border border-border bg-card p-6">
              <g.ikon className="w-5 h-5 mb-4 text-foreground" />
              <h3 className="font-semibold text-[15px] tracking-[-0.2px] mb-2">{g.baslik}</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">{g.govde}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-16 py-16 max-w-3xl mx-auto">
        <BolumBasligi etiket="SSS" baslik="Sık sorulan sorular" />
        <div className="rounded-[18px] border border-border bg-card divide-y divide-border overflow-hidden">
          {SSS.map((f, i) => {
            const acik = acikSoru === i;
            return (
              <div key={f.s}>
                <button
                  onClick={() => setAcikSoru(acik ? -1 : i)}
                  aria-expanded={acik}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-secondary transition-colors"
                >
                  <span className="text-[14.5px] font-medium">{f.s}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${acik ? 'rotate-180' : ''}`} />
                </button>
                {acik && (
                  <p className="px-5 pb-4 -mt-1 text-[13.5px] text-muted-foreground leading-relaxed">{f.c}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="rounded-[22px] border border-border bg-card max-w-2xl mx-auto px-8 py-14 text-center">
          <h2 className="text-[30px] font-semibold tracking-[-1px] mb-4">Kâr hesabınızı bugün doğru kurun</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Kendi ürün ve tarifelerinizi yükleyip ilk fiyat listenizi aynı gün çıkarın.
          </p>
          <button
            onClick={girisYap}
            className="bg-primary text-primary-foreground font-medium px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Giriş Yap
          </button>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-muted-foreground text-xs">
        © {new Date().getFullYear()} {MARKA_ADI}. Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
