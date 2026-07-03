import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Briefcase, CalendarDays, ImagePlus, LayoutDashboard, LifeBuoy, LogOut, ReceiptText, Tags, UserPlus, UserRound } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearAuthStorage,
  getAuthEmail,
  getAuthRole,
  getBusinessById,
  resolveBusinessId,
} from "@/lib/api";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMonochrome } from "@/hooks/useMonochrome";
import { useRealtime } from "@/hooks/useRealtime";

type MenuGroup = {
  label: string;
  items: Array<{ title: string; url: string; icon: typeof LayoutDashboard }>;
};

const menuGroups: MenuGroup[] = [
  {
    label: "Översikt",
    items: [{ title: "Dashboard", url: "/company", icon: LayoutDashboard }],
  },
  {
    label: "Erbjudanden",
    items: [
      { title: "Erbjudanden", url: "/company/offers", icon: Tags },
      { title: "Event", url: "/company/events", icon: CalendarDays },
      { title: "Verifiering", url: "/company/verification", icon: BadgeCheck },
    ],
  },
  {
    label: "Ekonomi",
    items: [{ title: "Fakturor", url: "/company/invoices", icon: ReceiptText }],
  },
  {
    label: "Team",
    items: [{ title: "Bjud in kollegor", url: "/company/workers/new", icon: UserPlus }],
  },
  {
    label: "Konto",
    items: [
      { title: "Mitt företag", url: "/company/account", icon: UserRound },
      { title: "Bildförfrågan", url: "/company/image-request", icon: ImagePlus },
      { title: "Kundsupport", url: "/company/support", icon: LifeBuoy },
    ],
  },
];

function getInitials(email: string | null | undefined) {
  if (!email) return "CO";
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (local.slice(0, 2) || "CO").toUpperCase();
}

export function CompanySidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const monochrome = useMonochrome();

  useEffect(() => {
    setEmail(getAuthEmail());
    setRole(getAuthRole());
  }, []);

  const loadBusinessName = useCallback(async () => {
    try {
      const resolvedId = await resolveBusinessId();
      if (!resolvedId) {
        setBusinessName(null);
        return;
      }
      const business = await getBusinessById(resolvedId);
      setBusinessName(business.name?.trim() || null);
    } catch {
      setBusinessName(null);
    }
  }, []);

  useEffect(() => {
    void loadBusinessName();
  }, [loadBusinessName]);

  useRealtime((event) => {
    if (event.type === "business.updated") {
      void loadBusinessName();
    }
  });

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-border",
        monochrome ? "bg-card" : "bg-card/60 backdrop-blur-sm",
      )}
    >
      <SidebarHeader className="p-2.5 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:p-1.5">
        <div
          className={`flex items-center transition-colors ${
            collapsed
              ? "mx-auto w-fit justify-center gap-0 border-0 bg-transparent p-0 shadow-none"
              : "gap-2.5 rounded-xl border border-border/50 bg-background/40 p-2.5"
          }`}
        >
          <div
            className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg ${
              collapsed
                ? "h-8 w-8 bg-transparent ring-0"
                : "h-9 w-9 ring-1 ring-primary/40"
            }`}
          >
            <img src="/icon-96.webp" alt="TooDoo" width={40} height={40} className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-bold text-foreground tracking-tight"
                title={businessName ?? undefined}
              >
                {businessName ?? "Företag"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3 shrink-0 text-primary" />
                Manager
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="min-h-0 gap-1 px-1.5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-1.5">
            {!collapsed && (
              <SidebarGroupLabel className="!h-auto min-h-0 py-1.5 text-muted-foreground/60 text-[10px] uppercase tracking-[0.14em] font-semibold px-2.5 pt-1.5 leading-none">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="h-9">
                        <NavLink
                          to={item.url}
                          end
                          className={`group relative rounded-lg transition-all duration-200 ${
                            active
                              ? "bg-accent/15 text-accent font-semibold data-[active=true]:!bg-accent/15 data-[active=true]:!text-accent"
                              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                          }`}
                          activeClassName=""
                        >
                          <span
                            className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full transition-all duration-200 ${
                              active ? "w-1 bg-accent" : "w-0 bg-transparent"
                            }`}
                            aria-hidden
                          />
                          <item.icon
                            className={`mr-2.5 h-4 w-4 shrink-0 transition-transform duration-200 ${
                              active ? "text-accent" : "group-hover:scale-110"
                            }`}
                          />
                          {!collapsed && <span className="truncate text-sm">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2.5">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/40 p-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-[11px] font-bold">
                  {getInitials(email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground" title={email ?? undefined}>
                  {email ?? "Okänd användare"}
                </p>
                <p className="truncate text-[10px] uppercase tracking-wider text-primary/75">
                  {role ?? "MANAGER"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                monochrome
                  ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "border-border/60 bg-background/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40",
              )}
            >
              <LogOut className="h-4 w-4" />
              <span>Logga ut</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/20 text-primary text-[11px] font-bold">
                {getInitials(email)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logga ut"
              title="Logga ut"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                monochrome
                  ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "border-border/60 bg-background/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40",
              )}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
