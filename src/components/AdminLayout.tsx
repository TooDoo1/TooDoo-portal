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

const shootingStars = [
  { top: "0%", left: "6%", delay: "-0.2s", duration: "5.1s" },
  { top: "0%", left: "22%", delay: "-1.0s", duration: "5.4s" },
  { top: "0%", left: "42%", delay: "-1.6s", duration: "5.2s" },
  { top: "0%", left: "68%", delay: "-2.1s", duration: "5.6s" },
  { top: "0%", left: "92%", delay: "-2.8s", duration: "5.3s" },
  { top: "1%", left: "12%", delay: "-3.4s", duration: "5.5s" },
  { top: "1%", left: "34%", delay: "-4.0s", duration: "5.7s" },
  { top: "1%", left: "76%", delay: "-4.8s", duration: "5.4s" },
  { top: "2%", left: "58%", delay: "-2.0s", duration: "5.7s" },
  { top: "5%", left: "88%", delay: "-3.5s", duration: "5.3s" },
  { top: "12%", left: "100%", delay: "-0.4s", duration: "5.1s" },
  { top: "28%", left: "100%", delay: "-1.8s", duration: "5.2s" },
  { top: "44%", left: "100%", delay: "-3.1s", duration: "5.8s" },
  { top: "60%", left: "100%", delay: "-4.2s", duration: "6.1s" },
  { top: "76%", left: "100%", delay: "-5.4s", duration: "5.4s" },
  { top: "92%", left: "100%", delay: "-6.6s", duration: "6.3s" },
];

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
    <div className="flex-1 flex h-screen flex-col overflow-hidden">
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm">
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
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const isCompanyRoute = location.pathname.startsWith("/company");
  const isPublicRoute =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/registration" ||
    location.pathname === "/manager-registration" ||
    location.pathname === "/manager/onboard";

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="relative min-h-screen flex w-full overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0">
          {shootingStars.map((star, index) => {
            const isAccent = index % 2 === 0;
            const color = isAccent ? "hsl(var(--accent))" : "hsl(var(--primary))";

            return (
              <span
                key={`${star.top}-${star.left}-${index}`}
                className="absolute h-[2px] w-36 rounded-full opacity-80"
                style={{
                  top: star.top,
                  left: star.left,
                  background: `linear-gradient(90deg, transparent, ${color})`,
                  boxShadow: `0 0 14px ${color}`,
                  animation: `layout-shooting-star ${star.duration} linear ${star.delay} infinite`,
                }}
              />
            );
          })}
        </div>

        <style>{`
          @keyframes layout-shooting-star {
            0% {
              transform: translate3d(0, 0, 0) rotate(145deg);
              opacity: 0;
            }
            8% {
              opacity: 0.9;
            }
            65% {
              opacity: 0.7;
            }
            100% {
              transform: translate3d(-95vw, 120vh, 0) rotate(145deg);
              opacity: 0;
            }
          }
        `}</style>

        {isCompanyRoute ? <CompanySidebar /> : <AdminSidebar />}
        <div className="relative z-10 flex w-full">
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </div>
      </div>
    </SidebarProvider>
  );
}
