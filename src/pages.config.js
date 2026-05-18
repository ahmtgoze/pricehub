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
import AdvantageProductTag from './pages/AdvantageProductTag';
import Calculator from './pages/Calculator';
import Categories from './pages/Categories';
import Commissions from './pages/Commissions';
import CostSynchronization from './pages/CostSynchronization';
import Dashboard from './pages/Dashboard';
import FlashProducts from './pages/FlashProducts';
import Help from './pages/Help';
import MarketplaceProducts from './pages/MarketplaceProducts';
import PackageManagement from './pages/PackageManagement';
import Platforms from './pages/Platforms';
import PriceSynchronization from './pages/PriceSynchronization';
import Prices from './pages/Prices';
import Products from './pages/Products';
import ShippingRates from './pages/ShippingRates';
import TrendyolPriceRange from './pages/TrendyolPriceRange';
import UpdateReports from './pages/UpdateReports';
import UpdatedCosts from './pages/UpdatedCosts';
import UpdatedPrices from './pages/UpdatedPrices';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdvantageProductTag": AdvantageProductTag,
    "Calculator": Calculator,
    "Categories": Categories,
    "Commissions": Commissions,
    "CostSynchronization": CostSynchronization,
    "Dashboard": Dashboard,
    "FlashProducts": FlashProducts,
    "Help": Help,
    "MarketplaceProducts": MarketplaceProducts,
    "PackageManagement": PackageManagement,
    "Platforms": Platforms,
    "PriceSynchronization": PriceSynchronization,
    "Prices": Prices,
    "Products": Products,
    "ShippingRates": ShippingRates,
    "TrendyolPriceRange": TrendyolPriceRange,
    "UpdateReports": UpdateReports,
    "UpdatedCosts": UpdatedCosts,
    "UpdatedPrices": UpdatedPrices,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
