import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { CompanySidebar } from "@/components/CompanySidebar";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "react-router-dom";
import { getAuthEmail } from "@/lib/api";
import { useMonochrome } from "@/hooks/useMonochrome";

interface AdminLayoutProps {
  children: React.ReactNode;
}

 

function getInitials(email: string | null | undefined, fallback: string) {
  if (!email) return fallback;
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (local.slice(0, 2) || fallback).toUpperCase();
}

function formatPageTitle(pathname: string, isCompanyRoute: boolean) {
  if (pathname === "/admin") return "Dashboard";
  if (pathname === "/companies") return "Företag";
  if (pathname === "/pending") return "Väntande företag";
  if (pathname === "/admin/claim-requests") return "Ägarskapsansökningar";
  if (pathname === "/admin/logs") return "Loggar";
  if (pathname === "/admin/invoices") return "Fakturor";
  if (pathname.startsWith("/category/")) return "Kategori";
  if (pathname === "/company") return "Dashboard";
  if (pathname === "/company/offers") return "Erbjudanden";
  if (pathname === "/company/offers/new") return "Nytt erbjudande";
  if (pathname === "/company/verification") return "Verifiering";
  if (pathname === "/company/invoices") return "Fakturor";
  if (pathname === "/company/workers/new") return "Kollegor";
  if (pathname === "/company/account") return "Mitt företag";
  if (pathname === "/company/image-request") return "Bildförfrågan";
  if (pathname === "/company/support") return "Kundsupport";
  if (pathname === "/company/events") return "Event";
  return isCompanyRoute ? "Företag" : "Admin";
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { state } = useSidebar();
  const sidebarOpen = state === "expanded";
  const location = useLocation();
  const isCompanyRoute = location.pathname.startsWith("/company");
  const monochrome = useMonochrome();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(getAuthEmail());
  }, []);

  const managerDigestEnabled = isCompanyRoute || notificationsOn;
  const notificationHelpText = isCompanyRoute
    ? "Daglig sammanfattning skickas via mail på kvällen med dagens erbjudanden, claims och inlösta kuponger."
    : "När aktiv skickar mail varje 60 min på vilka och hur många företag som väntar";

  const pageTitle = formatPageTitle(location.pathname, isCompanyRoute);
  const scopeLabel = isCompanyRoute ? "Företagspanel" : "Administrationspanel";
  const accentColor = "text-primary";
  const triggerBg = sidebarOpen
    ? "bg-primary/30 hover:bg-primary/40"
    : "bg-primary hover:bg-primary/90";
  const triggerFg = "text-primary-foreground";

  return (
    <div className="flex-1 flex h-screen flex-col overflow-hidden">
      <header
        className={`sticky top-0 z-30 h-14 flex items-center justify-between border-b border-border px-4 ${
          monochrome ? "bg-card" : "bg-card/80 backdrop-blur-sm"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className={`h-7 w-7 ${triggerBg} ${triggerFg}`} />
          <div className="hidden sm:flex flex-col leading-tight min-w-0">
            <span className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${accentColor}`}>{scopeLabel}</span>
            <span className="truncate text-sm font-semibold text-foreground">{pageTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={`h-7 w-7 ${managerDigestEnabled ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white`}
                  onClick={() => {
                    if (!isCompanyRoute) {
                      setNotificationsOn(!notificationsOn);
                    }
                  }}
                >
                  {managerDigestEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="end" sideOffset={14} className="relative max-w-[280px] overflow-visible data-[side=left]:translate-y-2">
                {notificationHelpText}
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 top-[16%] h-4 w-4 rotate-45 border-r border-t border-border bg-popover"
                />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
              {getInitials(email, isCompanyRoute ? "Co" : "AD")}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const isCompanyRoute = location.pathname.startsWith("/company");
  const monochrome = useMonochrome();
  const isPublicRoute =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/registration" ||
    location.pathname === "/manager-registration" ||
    location.pathname === "/manager/onboard" ||
    location.pathname === "/worker/onboard";

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="relative min-h-screen flex w-full overflow-hidden bg-background">
        {null}

        {isCompanyRoute ? <CompanySidebar /> : <AdminSidebar />}
        <div className="relative z-10 flex w-full">
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </div>
      </div>
    </SidebarProvider>
  );
}
