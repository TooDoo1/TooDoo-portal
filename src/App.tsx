import { Suspense, lazy, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyMonochrome } from "@/lib/monochrome";
import { useMonochrome } from "@/hooks/useMonochrome";
import { CookieConsentProvider } from "@/components/CookieConsent";
import LandingPage from "./pages/Landingpage";

const AdminLayout = lazy(() =>
  import("./components/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const ProtectedRoute = lazy(() =>
  import("./components/ProtectedRoute").then((m) => ({ default: m.ProtectedRoute })),
);

const Index = lazy(() => import("./pages/Index"));
const Companies = lazy(() => import("./pages/Companies"));
const AdminCompanyNew = lazy(() => import("./pages/AdminCompanyNew"));
const AdminCompanyEdit = lazy(() => import("./pages/AdminCompanyEdit"));
const Pending = lazy(() => import("./pages/Pending"));
const AdminClaimRequests = lazy(() => import("./pages/AdminClaimRequests"));
const AdminImportedBusinesses = lazy(() => import("./pages/AdminImportedBusinesses"));
const AdminLogs = lazy(() => import("./pages/AdminLogs"));
const AdminInvoices = lazy(() => import("./pages/AdminInvoices"));
const AdminQualityControl = lazy(() => import("./pages/AdminQualityControl"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const LoggIn = lazy(() => import("./pages/LoggIn"));
const Registration = lazy(() => import("./pages/Registration"));
const ManagerRegistration = lazy(() => import("./pages/ManagerRegistration"));
const CompanyDashboard = lazy(() => import("./pages/CompanyDashboard"));
const CompanyOffers = lazy(() => import("./pages/CompanyOffers"));
const CompanyNewOffer = lazy(() => import("./pages/CompanyNewOffer"));
const CompanyEvents = lazy(() => import("./pages/CompanyEvents"));
const CompanyNewEvent = lazy(() => import("./pages/CompanyNewEvent"));
const CompanyVerification = lazy(() => import("./pages/CompanyVerification"));
const CompanyInvoices = lazy(() => import("./pages/CompanyInvoices"));
const CompanyAccount = lazy(() => import("./pages/CompanyAccount"));
const CompanyImageRequest = lazy(() => import("./pages/CompanyImageRequest"));
const CompanySupport = lazy(() => import("./pages/CompanySupport"));
const WorkerCreation = lazy(() => import("./pages/WorkerCreation"));
const WorkerOnboard = lazy(() => import("./pages/WorkerOnboard"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PrivateLayout() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

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

function AppearanceController() {
  const location = useLocation();
  const monochrome = useMonochrome();
  const pathname = location.pathname;
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/registration" ||
    pathname === "/reset-password" ||
    pathname === "/manager-registration" ||
    pathname === "/manager/onboard" ||
    pathname === "/invite/manager" ||
    pathname === "/worker/onboard" ||
    pathname === "/invite/worker";

  useEffect(() => {
    applyMonochrome(isPublicRoute ? false : monochrome);
  }, [isPublicRoute, monochrome]);

  return null;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CookieConsentProvider>
          <AppearanceController />
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoggIn />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/registration" element={<Registration />} />
              <Route path="/manager-registration" element={<ManagerRegistration />} />
              <Route path="/manager/onboard" element={<ManagerRegistration />} />
              <Route path="/invite/manager" element={<ManagerRegistration />} />
              <Route path="/worker/onboard" element={<WorkerOnboard />} />
              <Route path="/invite/worker" element={<WorkerOnboard />} />

              <Route element={<PrivateLayout />}>
                <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                  <Route path="/admin" element={<Index />} />
                  <Route path="/admin/logs" element={<AdminLogs />} />
                  <Route path="/admin/invoices" element={<AdminInvoices />} />
                  <Route path="/admin/quality-control" element={<AdminQualityControl />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/companies/new" element={<AdminCompanyNew />} />
                  <Route path="/companies/:businessId/edit" element={<AdminCompanyEdit />} />
                  <Route path="/companies/:businessId/offers/new" element={<CompanyNewOffer />} />
                  <Route path="/companies/:businessId/events/new" element={<CompanyNewEvent />} />
                  <Route path="/pending" element={<Pending />} />
                  <Route path="/admin/imported" element={<AdminImportedBusinesses />} />
                  <Route path="/admin/claim-requests" element={<AdminClaimRequests />} />
                  <Route path="/category/:name" element={<CategoryPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={["MANAGER"]} />}>
                  <Route path="/company" element={<CompanyDashboard />} />
                  <Route path="/company/offers" element={<CompanyOffers />} />
                  <Route path="/company/offers/new" element={<CompanyNewOffer />} />
                  <Route path="/company/events" element={<CompanyEvents />} />
                  <Route path="/company/events/new" element={<CompanyNewEvent />} />
                  <Route path="/company/verification" element={<CompanyVerification />} />
                  <Route path="/company/invoices" element={<CompanyInvoices />} />
                  <Route path="/company/account" element={<CompanyAccount />} />
                  <Route path="/company/image-request" element={<CompanyImageRequest />} />
                  <Route path="/company/support" element={<CompanySupport />} />
                  <Route path="/company/workers/new" element={<WorkerCreation />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </CookieConsentProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
