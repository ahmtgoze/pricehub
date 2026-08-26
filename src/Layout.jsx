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

// Gezinme yapısı — sayfa anahtarları (page) pages.config.js ile birebir aynı.
// NOT: "Düzenlenen Maliyetler" (UpdatedCosts) yeni temada menüden çıkarıldı;
// rota hâlâ çalışır (/UpdatedCosts), istenirse aşağıya geri eklenir.
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
  const bgStyle = color && !isActive ? { backgroundColor: color + '15' } : {};

  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : color
          ? "hover:opacity-80"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11.5px] font-semibold uppercase tracking-[0.07em] transition-colors",
        hasActive ? "text-foreground" : "text-muted-foreground/70 hover:text-muted-foreground"
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
    NAV_GROUPS.forEach(g => { if (g.id) init[g.id] = false; });
    return init;
  });

  const effectiveOpen = (id) => openGroups[id] || activeGroupId === id;
  const toggleGroup = (id) => setOpenGroups(prev => ({ ...prev, [id]: !effectiveOpen(id) }));
  const closeSidebar = () => setSidebarOpen(false);

  const filterItems = (items) => items
    .filter(i => !i.trendyolOnly || hasTrendyol)
    .filter(i => !i.hepsiburadaOnly || hasHepsiburada);

  return (
    <div className="overflow-hidden bg-background flex flex-col lg:flex-row" style={{ height: '100dvh' }}>
      <Toaster position="top-right" richColors />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Yan menü */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-[272px] bg-card border-r border-border transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Marka */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link to={createPageUrl('Dashboard')} className="flex-1 flex items-center justify-center">
              <span className="font-semibold text-[18px] tracking-[-0.4px] text-foreground">{MARKA_ADI}</span>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={closeSidebar}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Gezinme */}
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

            <div className="pt-4 border-t border-border mt-2 space-y-0.5">
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

          {/* Alt bilgi */}
          <div className="p-3 border-t border-border">
            <div className="px-[14px] py-[11px] rounded-[14px] bg-secondary">
              <p className="text-[12.5px] font-semibold text-foreground">Merkezi Fiyat Yönetimi</p>
              <p className="text-xs text-muted-foreground mt-[3px]">Trendyol · Hepsiburada · Web</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Ana içerik */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[272px] overflow-hidden" style={{ height: '100dvh' }}>
        {/* Mobil üst bar */}
        <header className="lg:hidden flex-shrink-0 z-30 h-16 bg-card/85 backdrop-blur-xl backdrop-saturate-150 border-b border-border flex items-center px-4 justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-semibold text-foreground flex-1 ml-3">{MARKA_ADI}</span>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => { await db.auth.logout(); window.location.href = '/login'; }}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Masaüstü üst bar */}
        <div className="hidden lg:flex items-center justify-end gap-2 h-[52px] px-6 border-b border-border bg-card/70 backdrop-blur-xl backdrop-saturate-150 flex-shrink-0">
          <NotificationCenter />
          <button
            onClick={async () => { await db.auth.logout(); window.location.href = '/login'; }}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
            title="Çıkış Yap"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Sayfa içeriği */}
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
