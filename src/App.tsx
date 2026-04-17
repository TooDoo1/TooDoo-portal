import { Suspense, lazy, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";

const Index = lazy(() => import("./pages/Index"));
const Companies = lazy(() => import("./pages/Companies"));
const Pending = lazy(() => import("./pages/Pending"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const LoggIn = lazy(() => import("./pages/LoggIn"));
const Registration = lazy(() => import("./pages/Registration"));
const ManagerRegistration = lazy(() => import("./pages/ManagerRegistration"));
const CompanyDashboard = lazy(() => import("./pages/CompanyDashboard"));
const CompanyOffers = lazy(() => import("./pages/CompanyOffers"));
const CompanyNewOffer = lazy(() => import("./pages/CompanyNewOffer"));
const CompanyVerification = lazy(() => import("./pages/CompanyVerification"));
const CompanyAccount = lazy(() => import("./pages/CompanyAccount"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function RouteLoadingFallback() {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowLoader(true);
    }, 100);

    return () => window.clearTimeout(timer);
  }, []);

  if (!showLoader) {
    return <div className="min-h-[40vh]" aria-hidden="true" />;
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          role="status"
          aria-label="Laddar"
        />
        <span>Laddar sida...</span>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AdminLayout>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<LoggIn />} />
              <Route path="/admin" element={<Index />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/pending" element={<Pending />} />
              <Route path="/category/:name" element={<CategoryPage />} />
              <Route path="/company" element={<CompanyDashboard />} />
              <Route path="/company/offers" element={<CompanyOffers />} />
              <Route path="/company/offers/new" element={<CompanyNewOffer />} />
              <Route path="/company/verification" element={<CompanyVerification />} />
              <Route path="/company/account" element={<CompanyAccount />} />
              <Route path="/login" element={<LoggIn />} />
              <Route path="/registration" element={<Registration />} />
              <Route path="/manager-registration" element={<ManagerRegistration />} />
              <Route path="/manager/onboard" element={<ManagerRegistration />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AdminLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
