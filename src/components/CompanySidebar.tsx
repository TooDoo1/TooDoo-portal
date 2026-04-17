import { BadgeCheck, LayoutDashboard, LogOut, Tags, UserPlus, UserRound } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { title: "Dashboard", url: "/company", icon: LayoutDashboard },
  { title: "Erbjudanden", url: "/company/offers", icon: Tags },
  { title: "Verifiering", url: "/company/verification", icon: BadgeCheck },
  { title: "Bjud in arbetare", url: "/company/workers/new", icon: UserPlus },
  { title: "Konto", url: "/company/account", icon: UserRound },
];

export function CompanySidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
              <img src="/Icon.jpg" alt="CompanyPanel Logo" className="h-10 w-10 object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground tracking-tight">CompanyPanel</p>
              <p className="text-xs text-muted-foreground">Hantera ditt konto</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
              <img src="/Icon.jpg" alt="CompanyPanel Logo" className="h-10 w-10 object-cover" />
            </div>
          </div>
        )}
      </SidebarHeader>
      <Separator className="bg-border/50" />
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 text-[11px] uppercase tracking-wider font-semibold">
            Meny
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        end
                        className={`rounded-lg transition-all duration-150 ${
                          active
                            ? "bg-primary/15 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                        activeClassName=""
                      >
                        <item.icon className={`mr-2.5 h-4 w-4 ${active ? "text-[#061A47]" : ""}`} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Separator className="bg-border/50 mb-3" />
        <SidebarMenuButton
          className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
          onClick={() => navigate("/")}
        >
          <LogOut className="mr-2.5 h-4 w-4" />
          {!collapsed && <span className="text-sm">Logga ut</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
