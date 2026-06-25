import React, { useState, useMemo } from 'react';
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
  Calculator,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import BackgroundTaskWidget from '@/components/BackgroundTaskWidget';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { MARKA_ADI } from '@/config/marka';

const TRENDYOL_COLOR = '#F27A1B';
const HB_COLOR = '#7B2D9B';

// Navigation structure
const NAV_GROUPS = [
  {
    type: 'single',
    item: { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  },
  {
    type: 'group',
    id: 'tanimlar',
    label: 'Tanımlar',
    items: [
      { name: 'Platformlar', page: 'Platforms', icon: Store },
      { name: 'Kategoriler', page: 'Categories', icon: FolderTree },
      { name: 'Komisyonlar', page: 'Commissions', icon: Percent },
      { name: 'Ürünler', page: 'Products', icon: Package },
      { name: 'Kargo Tarifeleri', page: 'ShippingRates', icon: Truck },
      { name: 'Paketleme', page: 'PackageManagement', icon: Package },
    ],
  },
  {
    type: 'group',
    id: 'fiyat',
    label: 'Fiyat',
    items: [
      { name: 'Fiyatlar', page: 'Prices', icon: BadgeDollarSign },
      { name: 'Hesaplayıcı', page: 'Calculator', icon: Calculator },
    ],
  },
  {
    type: 'group',
    id: 'raporlar',
    label: 'Raporlar',
    items: [
      { name: 'Güncelleme Raporları', page: 'UpdateReports', icon: FileText },
      { name: 'Pazaryeri Ürünleri', page: 'MarketplaceProducts', icon: Store },
      { name: 'Düzenlenen Fiyatlar', page: 'UpdatedPrices', icon: Tag },
      { name: 'Düzenlenen Maliyetler', page: 'UpdatedCosts', icon: FileText },
    ],
  },
  {
    type: 'promo',
    id: 'promosyonlar',
    label: 'Promosyonlar',
    trendyol: [
      { name: 'Kampanyalar', page: 'Campaigns', icon: BadgePercent },
      { name: 'Komisyon Tarifesi', page: 'TrendyolPriceRange', icon: BadgePercent, trendyolOnly: true },
      { name: 'Plus Tarifesi', page: 'PlusProductCommissionTariff', icon: BadgePercent, trendyolOnly: true },
      { name: 'Avantajlı Ürün Etiketi', page: 'AdvantageProductTag', icon: Sparkles, trendyolOnly: true },
      { name: 'Flaş Ürünler', page: 'FlashProducts', icon: Zap, trendyolOnly: true },
    ],
    hepsiburada: [
      { name: 'Avantajlı Teklifler', page: 'HBAdvantageOffers', icon: Sparkles, hepsiburadaOnly: true },
      { name: 'Sepet Kampanyaları', page: 'HBBasketCampaigns', icon: BadgePercent, hepsiburadaOnly: true },
      { name: 'Kendi Kampanyanı Oluştur', page: 'HBOwnCampaign', icon: BadgePercent, hepsiburadaOnly: true },
    ],
  },
];

const BOTTOM_ITEMS = [
  { name: 'Kullanım Kılavuzu', page: 'Help', icon: HelpCircle },
  { name: 'Genel Ayarlar', page: 'Settings', icon: Settings },
];

function NavLink({ item, isActive, color, onClick }) {
  const colorStyle = color ? { color: isActive ? '#fff' : color } : {};
  const bgStyle = color && !isActive ? {
    backgroundColor: color + '15',
  } : {};

  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
        isActive
          ? "bg-gray-900 text-white shadow-md"
          : color
          ? "hover:opacity-80"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
      style={isActive ? {} : { ...bgStyle, ...colorStyle }}
    >
      <item.icon className="h-4 w-4 shrink-0" style={isActive ? { color: '#fff' } : colorStyle} />
      <span className="flex-1 truncate">{item.name}</span>
    </Link>
  );
}

function GroupHeader({ label, isOpen, onToggle, hasActive }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
        hasActive ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
      )}
    >
      <span>{label}</span>
      {isOpen
        ? <ChevronDown className="h-3.5 w-3.5" />
        : <ChevronRight className="h-3.5 w-3.5" />
      }
    </button>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => db.entities.Platform.list(),
  });

  const hasTrendyol = platforms.some(p => p.platform_type === 'trendyol' && p.is_active !== false);
  const hasHepsiburada = platforms.some(p => p.platform_type === 'hepsiburada' && p.is_active !== false);

  // Determine which group contains the current page (for auto-open)
  const activeGroupId = useMemo(() => {
    for (const g of NAV_GROUPS) {
      if (g.type === 'group') {
        if (g.items.some(i => i.page === currentPageName)) return g.id;
      }
      if (g.type === 'promo') {
        const allItems = [...g.trendyol, ...g.hepsiburada];
        if (allItems.some(i => i.page === currentPageName)) return g.id;
      }
    }
    return null;
  }, [currentPageName]);

  const [openGroups, setOpenGroups] = useState(() => {
    const init = {};
    NAV_GROUPS.forEach(g => {
      if (g.id) init[g.id] = false;
    });
    return init;
  });

  // Auto-open the group containing the active page
  const effectiveOpen = (id) => openGroups[id] || activeGroupId === id;

  const toggleGroup = (id) => {
    setOpenGroups(prev => ({ ...prev, [id]: !effectiveOpen(id) }));
  };

  const closeSidebar = () => setSidebarOpen(false);

  const filterItems = (items) => items
    .filter(i => !i.trendyolOnly || hasTrendyol)
    .filter(i => !i.hepsiburadaOnly || hasHepsiburada);

  return (
    <div className="overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-purple-50 flex flex-col lg:flex-row" style={{ height: '100dvh' }}>
      <Toaster position="top-right" richColors />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-100 shadow-lg transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-50">
            <Link to={createPageUrl('Dashboard')} className="flex-1 flex items-center justify-center">
              <span className="font-bold text-lg text-gray-900">{MARKA_ADI}</span>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={closeSidebar}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">

            {NAV_GROUPS.map((group) => {
              if (group.type === 'single') {
                const item = group.item;
                return (
                  <NavLink
                    key={item.page}
                    item={item}
                    isActive={currentPageName === item.page}
                    onClick={closeSidebar}
                  />
                );
              }

              if (group.type === 'group') {
                const filtered = filterItems(group.items);
                if (!filtered.length) return null;
                const hasActive = filtered.some(i => i.page === currentPageName);
                const isOpen = effectiveOpen(group.id);
                return (
                  <div key={group.id} className="pt-2">
                    <GroupHeader
                      label={group.label}
                      isOpen={isOpen}
                      onToggle={() => toggleGroup(group.id)}
                      hasActive={hasActive}
                    />
                    {isOpen && (
                      <div className="mt-0.5 space-y-0.5">
                        {filtered.map(item => (
                          <NavLink
                            key={item.page}
                            item={item}
                            isActive={currentPageName === item.page}
                            onClick={closeSidebar}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (group.type === 'promo') {
                const trendyolItems = filterItems(group.trendyol);
                const hbItems = filterItems(group.hepsiburada);
                if (!trendyolItems.length && !hbItems.length) return null;

                const allItems = [...trendyolItems, ...hbItems];
                const hasActive = allItems.some(i => i.page === currentPageName);
                const isOpen = effectiveOpen(group.id);

                return (
                  <div key={group.id} className="pt-2">
                    <GroupHeader
                      label={group.label}
                      isOpen={isOpen}
                      onToggle={() => toggleGroup(group.id)}
                      hasActive={hasActive}
                    />
                    {isOpen && (
                      <div className="mt-0.5 space-y-1">
                        {trendyolItems.length > 0 && (
                          <div>
                            <p className="px-3 pt-1 pb-0.5 text-xs font-semibold" style={{ color: TRENDYOL_COLOR }}>
                              Trendyol
                            </p>
                            <div className="space-y-0.5">
                              {trendyolItems.map(item => (
                                <NavLink
                                  key={item.page}
                                  item={item}
                                  isActive={currentPageName === item.page}
                                  color={TRENDYOL_COLOR}
                                  onClick={closeSidebar}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        {hbItems.length > 0 && (
                          <div>
                            <p className="px-3 pt-1 pb-0.5 text-xs font-semibold" style={{ color: HB_COLOR }}>
                              HepsiBurada
                            </p>
                            <div className="space-y-0.5">
                              {hbItems.map(item => (
                                <NavLink
                                  key={item.page}
                                  item={item}
                                  isActive={currentPageName === item.page}
                                  color={HB_COLOR}
                                  onClick={closeSidebar}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}

            {/* Bottom items - always visible */}
            <div className="pt-4 border-t border-gray-100 mt-2 space-y-0.5">
              {BOTTOM_ITEMS.map(item => (
                <NavLink
                  key={item.page}
                  item={item}
                  isActive={currentPageName === item.page}
                  onClick={closeSidebar}
                />
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-gray-50">
            <div className="px-3 py-2 rounded-xl bg-gray-50">
              <p className="text-xs font-semibold text-gray-700">Merkezi Fiyat Yönetimi</p>
              <p className="text-xs text-gray-500 mt-0.5">Trendyol • Hepsiburada • Web</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 overflow-hidden" style={{ height: '100dvh' }}>
        {/* Mobile header */}
        <header className="lg:hidden flex-shrink-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-4 justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-semibold text-gray-800 flex-1 ml-3">{MARKA_ADI}</span>
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

        {/* Page content */}
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
