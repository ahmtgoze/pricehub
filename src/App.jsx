import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { BackgroundTaskProvider } from '@/lib/BackgroundTaskContext';
const Login = lazy(() => import('./pages/Login'));
const Landing = lazy(() => import('./pages/Landing'));
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
const Campaigns = lazy(() => import('./pages/Campaigns'));
const PlusProductCommissionTariff = lazy(() => import('./pages/PlusProductCommissionTariff'));

/** Sayfa parcasi indirilirken gosterilir; auth beklerken kullanilanla ayni. */
const SayfaYukleniyor = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;
const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Giris ekraninin kendisi herkese acik olmali; aksi halde /login
      // surekli kendine yonlenip sonsuz donguye girer.
      const path = window.location.pathname.toLowerCase();
      if (path !== '/login' && path !== '/landing') {
        navigateToLogin();
        return null;
      }
    }
  }
  return (
    <Suspense fallback={<SayfaYukleniyor />}>
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/campaigns" element={
        <LayoutWrapper currentPageName="Campaigns">
          <Campaigns />
        </LayoutWrapper>
      } />
      <Route path="/PlusProductCommissionTariff" element={
        <LayoutWrapper currentPageName="PlusProductCommissionTariff">
          <PlusProductCommissionTariff />
        </LayoutWrapper>
      } />
      <Route path="/plus-product-commission-tariff" element={
        <LayoutWrapper currentPageName="PlusProductCommissionTariff">
          <PlusProductCommissionTariff />
        </LayoutWrapper>
      } />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};
function App() {
  return (
    <AuthProvider>
      <BackgroundTaskProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </BackgroundTaskProvider>
    </AuthProvider>
  )
}
export default App
