import { db } from '@/api/db';
import { BarChart3, TrendingUp, ShoppingBag, Globe, ArrowRight, CheckCircle } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Merkezi Fiyat Yönetimi',
    desc: 'Trendyol, Hepsiburada ve web siteniz için fiyatlarınızı tek ekrandan yönetin.',
  },
  {
    icon: TrendingUp,
    title: 'Kâr Analizi',
    desc: 'Her ürün için komisyon, kargo ve KDV hesaplamaları otomatik yapılır.',
  },
  {
    icon: ShoppingBag,
    title: 'Pazaryeri Entegrasyonu',
    desc: 'Pazaryeri ürünlerinizi sisteme yükleyin, eşleştirin ve fiyatlarınızı güncel tutun.',
  },
  {
    icon: Globe,
    title: 'Çoklu Platform',
    desc: 'Trendyol, Hepsiburada ve Web Sitesi platformlarını tek çatı altında yönetin.',
  },
];

const benefits = [
  'Otomatik fiyat hesaplama motoru',
  'Kargo barem & desi hesapları',
  'Komisyon ve stopaj takibi',
  'Excel ile toplu fiyat aktarımı',
  'Gerçek zamanlı kâr analizi',
  'Çoklu platform desteği',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-purple-50 text-gray-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-16 py-5 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <span className="text-2xl font-bold tracking-tight text-gray-900">PriceHub</span>
        <button
          onClick={() => db.auth.redirectToLogin('/')}
          className="flex items-center gap-2 bg-gray-900 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors text-sm"
        >
          Giriş Yap <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20">
        <span className="text-xs font-semibold tracking-widest uppercase text-purple-700 bg-purple-100 border border-purple-200 px-4 py-1.5 rounded-full mb-6">
          E-Ticaret Fiyat Yönetimi
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 max-w-3xl text-gray-900">
          Tüm Platformlarınız İçin{' '}
          <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Merkezi Fiyat Kontrolü
          </span>
        </h1>
        <p className="text-gray-500 text-lg md:text-xl max-w-xl mb-10">
          Kargo, komisyon ve KDV hesaplarını otomatikleştirin. Kârınızı artırın, zamanınızı kazanın.
        </p>
        <button
          onClick={() => db.auth.redirectToLogin('/')}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-md"
        >
          Hemen Başla <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      {/* Features */}
      <section className="px-6 md:px-16 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900">Özellikler</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 md:px-16 py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-10 text-gray-900">Neler Yapabilirsiniz?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <span className="text-gray-700 text-sm">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="bg-white border border-gray-100 rounded-3xl max-w-2xl mx-auto px-8 py-14 shadow-sm">
          <h2 className="text-3xl font-extrabold mb-4 text-gray-900">Hemen Başlayın</h2>
          <p className="text-gray-500 mb-8">Hesabınıza giriş yaparak fiyat yönetiminizi optimize edin.</p>
          <button
            onClick={() => db.auth.redirectToLogin('/')}
            className="bg-gray-900 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-gray-700 transition-colors"
          >
            Giriş Yap
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-gray-400 text-xs bg-white/60">
        © {new Date().getFullYear()} PriceHub. Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
