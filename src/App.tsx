import { Suspense, lazy } from "react";
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
const CompanyDashboard = lazy(() => import("./pages/CompanyDashboard"));
const CompanyOffers = lazy(() => import("./pages/CompanyOffers"));
const CompanyNewOffer = lazy(() => import("./pages/CompanyNewOffer"));
const CompanyVerification = lazy(() => import("./pages/CompanyVerification"));
const CompanyAccount = lazy(() => import("./pages/CompanyAccount"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Laddar sida...
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AdminLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
