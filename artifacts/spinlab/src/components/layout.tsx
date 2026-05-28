import { Link, useLocation } from "wouter";
import { 
  Briefcase, 
  Users, 
  Bell, 
  LayoutDashboard,
  Settings,
  Activity,
  Zap
} from "lucide-react";
import { useListReminders } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: reminders } = useListReminders({ overdueOnly: true });

  const overdueCount = reminders?.length || 0;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/deals", label: "Deals", icon: Briefcase },
    { href: "/brokers", label: "Brokers", icon: Users },
    { href: "/reminders", label: "Reminders", icon: Bell, badge: overdueCount > 0 ? overdueCount : null },
  ];

  return (
    <div className="w-56 border-r bg-sidebar flex flex-col h-full shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="font-semibold tracking-tight text-sm text-foreground">Spinlab</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider ml-1 mt-0.5 border border-border px-1.5 rounded">HQ</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3 mb-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2">Acquisitions</div>
        </div>
        <nav className="px-2 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-[4px] text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {item.label}
                  </div>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0 rounded-[3px] leading-tight">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-sidebar-border">
        <Link href="/settings">
          <div className={`flex items-center gap-2.5 px-3 py-1.5 text-sm rounded-[4px] cursor-pointer transition-colors ${
            location === "/settings" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}>
            <Settings className={`h-4 w-4 ${location === "/settings" ? "text-primary" : "text-muted-foreground"}`} />
            Settings
          </div>
        </Link>
        <div className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-[4px] cursor-pointer transition-colors mt-0.5">
          <div className="w-5 h-5 rounded bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold text-foreground">JD</div>
          <span className="truncate">John Doe</span>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background selection:bg-primary/20">
        {children}
      </main>
    </div>
  );
}
