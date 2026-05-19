import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { 
  LayoutDashboard, 
  Package, 
  FolderTree, 
  Store, 
  Truck, 
  Percent,
  FileText,
  Menu,
  X,
  BadgeDollarSign,
  Tag,
  BadgePercent,
  Sparkles,
  Zap,
  HelpCircle,
  LogOut,
  Calculator
} from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import BackgroundTaskWidget from '@/components/BackgroundTaskWidget';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const baseNavigation = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Fiyatlar', page: 'Prices', icon: BadgeDollarSign },
  { name: 'Platformlar', page: 'Platforms', icon: Store },
  { name: 'Kategoriler', page: 'Categories', icon: FolderTree },
  { name: 'Komisyonlar', page: 'Commissions', icon: Percent },
  { name: 'Ürünler', page: 'Products', icon: Package },
  { name: 'Kargo Tarifeleri', page: 'ShippingRates', icon: Truck },
  { name: 'Paketleme', page: 'PackageManagement', icon: Package },
  { name: 'Hesaplayıcı', page: 'Calculator', icon: Calculator },
  { name: 'Raporlar', page: 'UpdateReports', icon: FileText },
  { name: 'Pazaryeri Ürünleri', page: 'MarketplaceProducts', icon: Store },
  { name: 'Düzenlenen Fiyatlar', page: 'UpdatedPrices', icon: Tag },
  { name: 'Düzenlenen Maliyetler', page: 'UpdatedCosts', icon: FileText },
  { name: 'Kampanyalar', page: 'Campaigns', icon: BadgePercent },
  { name: 'Ürün Komisyon Tarifesi', page: 'TrendyolPriceRange', icon: BadgePercent, trendyolOnly: true },
  { name: 'Plus Ürün Komisyon Tarifesi', page: 'PlusProductCommissionTariff', icon: BadgePercent, trendyolOnly: true },
  { name: 'Avantajlı Ürün Etiketi', page: 'AdvantageProductTag', icon: Sparkles, trendyolOnly: true },
  { name: 'Flaş Ürünler', page: 'FlashProducts', icon: Zap, trendyolOnly: true },
  { name: 'Kullanım Kılavuzu', page: 'Help', icon: HelpCircle },
];


export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => db.entities.Platform.list(),
  });

  const hasTrendyol = platforms.some(p => p.platform_type === 'trendyol' && p.is_active !== false);
  const navigation = baseNavigation.filter(item => !item.trendyolOnly || hasTrendyol);

  return (
    <div className="overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-purple-50 flex flex-col lg:flex-row" style={{ height: '100dvh' }}>

      <Toaster position="top-right" richColors />
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-100 shadow-lg transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-4 border-b border-gray-50">
            <Link to={createPageUrl('Dashboard')} className="flex-1 flex items-center justify-center">
              <span className="font-bold text-lg text-gray-900">PriceHub</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden shrink-0"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = currentPageName === item.page;
              const isBlueGroup = ['MarketplaceProducts', 'UpdatedPrices', 'UpdatedCosts'].includes(item.page);
              const isOrangeGroup = ['TrendyolPriceRange', 'AdvantageProductTag', 'FlashProducts', 'PlusProductCommissionTariff'].includes(item.page);
              const isPurpleGroup = ['Campaigns'].includes(item.page);
              
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive 
                      ? "bg-gray-900 text-white shadow-md" 
                      : isBlueGroup
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : isOrangeGroup
                      ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      : isPurpleGroup
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive 
                      ? "text-white" 
                      : isBlueGroup
                      ? "text-blue-600"
                      : isOrangeGroup
                      ? "text-orange-600"
                      : isPurpleGroup
                      ? "text-purple-600"
                      : "text-gray-400"
                  )} />
                  <span className="flex-1">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Footer */}
          <div className="p-4">
            <div className="px-4 py-3 rounded-xl bg-gray-50">
              <p className="text-xs font-semibold text-gray-700">Merkezi Fiyat Yönetimi</p>
              <p className="text-xs text-gray-500 mt-1">Trendyol • Hepsiburada • Web</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 overflow-hidden" style={{ height: '100dvh' }}>
        {/* Mobile header - fixed */}
        <header className="lg:hidden flex-shrink-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-4 justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-semibold text-gray-800 flex-1 ml-3">PriceHub</span>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button 
              variant="ghost" 
              size="icon"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={async () => { await db.auth.logout(); window.location.href = '/login'; }}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Desktop notification bar */}
        <div className="hidden lg:flex items-center justify-end gap-2 px-6 py-2 border-b border-gray-100 bg-white/60 backdrop-blur-sm flex-shrink-0">
          <NotificationCenter />
          <button
            onClick={async () => { await db.auth.logout(); window.location.href = '/login'; }}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
            title="Çıkış Yap"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto pt-4">
          <div className="pb-24 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      <BackgroundTaskWidget />
    </div>
  );
}
