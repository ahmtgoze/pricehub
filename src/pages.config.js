/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

/**
 * SAYFALAR TEMBEL YUKLENIR.
 *
 * Onceden 23 sayfa da statik import ediliyordu; hepsi TEK pakete giriyor ve
 * kullanici hangi sayfayi acarsa acsin tamamini indiriyordu (2,89 MB /
 * gzip 878 KB). Excel kutuphanesi gibi agir bagimliliklar da bu pakete
 * dahildi.
 *
 * lazy() ile her sayfa kendi parcasina ayrilir; yalnizca acilan sayfa
 * indirilir. Yukleme sirasinda App.jsx'teki <Suspense> devreye girer.
 */



const AdvantageProductTag = lazy(() => import('./pages/AdvantageProductTag'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Categories = lazy(() => import('./pages/Categories'));
const Commissions = lazy(() => import('./pages/Commissions'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FlashProducts = lazy(() => import('./pages/FlashProducts'));
const HBAdvantageOffers = lazy(() => import('./pages/HBAdvantageOffers'));
const HBBasketCampaigns = lazy(() => import('./pages/HBBasketCampaigns'));
const HBOwnCampaign = lazy(() => import('./pages/HBOwnCampaign'));
const Help = lazy(() => import('./pages/Help'));
const MarketplaceProducts = lazy(() => import('./pages/MarketplaceProducts'));
const PackageManagement = lazy(() => import('./pages/PackageManagement'));
const Platforms = lazy(() => import('./pages/Platforms'));
const Prices = lazy(() => import('./pages/Prices'));
const Products = lazy(() => import('./pages/Products'));
const ShippingRates = lazy(() => import('./pages/ShippingRates'));
const TrendyolPriceRange = lazy(() => import('./pages/TrendyolPriceRange'));
const UpdateReports = lazy(() => import('./pages/UpdateReports'));
const UpdatedCosts = lazy(() => import('./pages/UpdatedCosts'));
const UpdatedPrices = lazy(() => import('./pages/UpdatedPrices'));
const Settings = lazy(() => import('./pages/Settings'));
const ViewCustomize = lazy(() => import('./pages/ViewCustomize'));

export const PAGES = {
    "AdvantageProductTag": AdvantageProductTag,
    "Calculator": Calculator,
    "Categories": Categories,
    "Commissions": Commissions,
    "Dashboard": Dashboard,
    "FlashProducts": FlashProducts,
    "HBAdvantageOffers": HBAdvantageOffers,
    "HBBasketCampaigns": HBBasketCampaigns,
    "HBOwnCampaign": HBOwnCampaign,
    "Help": Help,
    "MarketplaceProducts": MarketplaceProducts,
    "PackageManagement": PackageManagement,
    "Platforms": Platforms,
    "Prices": Prices,
    "Products": Products,
    "ShippingRates": ShippingRates,
    "TrendyolPriceRange": TrendyolPriceRange,
    "UpdateReports": UpdateReports,
    "UpdatedCosts": UpdatedCosts,
    "UpdatedPrices": UpdatedPrices,
    "Settings": Settings,
    "ViewCustomize": ViewCustomize,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
