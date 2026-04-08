import { useState } from "react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { state } = useSidebar();
  const sidebarOpen = state === "expanded";
  const [notificationsOn, setNotificationsOn] = useState(true);

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-14 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 sticky top-0 z-10">
        <SidebarTrigger className={`h-7 w-7 ${sidebarOpen ? "bg-accent/30 hover:bg-accent/40" : "bg-accent hover:bg-accent/80"} text-accent-foreground`} />
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            className={`h-7 w-7 ${notificationsOn ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white`}
            onClick={() => setNotificationsOn(!notificationsOn)}
          >
            {notificationsOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">AD</AvatarFallback>
          </Avatar>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </div>
    </SidebarProvider>
  );
}
