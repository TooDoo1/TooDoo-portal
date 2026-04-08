import { useState } from "react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { CompanySidebar } from "@/components/CompanySidebar";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "react-router-dom";

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { state } = useSidebar();
  const sidebarOpen = state === "expanded";
  const location = useLocation();
  const isCompanyRoute = location.pathname.startsWith("/company");
  const [notificationsOn, setNotificationsOn] = useState(true);
  const notificationHelpText = isCompanyRoute
    ? "När aktiv skickar mail varje 60 min på hur många som aktiverat ert erbjudande och vilket."
    : "När aktiv skickar mail varje 60 min på vilka och hur många företag som väntar";

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-14 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 sticky top-0 z-10">
        <SidebarTrigger className={`h-7 w-7 ${sidebarOpen ? "bg-accent/30 hover:bg-accent/40" : "bg-accent hover:bg-accent/80"} text-accent-foreground`} />
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={`h-7 w-7 ${notificationsOn ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white`}
                  onClick={() => setNotificationsOn(!notificationsOn)}
                >
                  {notificationsOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
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
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{isCompanyRoute ? "Co" : "AD"}</AvatarFallback>
          </Avatar>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const isCompanyRoute = location.pathname.startsWith("/company");

  if (location.pathname === "/" || location.pathname === "/login" || location.pathname === "/registration") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {isCompanyRoute ? <CompanySidebar /> : <AdminSidebar />}
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </div>
    </SidebarProvider>
  );
}
