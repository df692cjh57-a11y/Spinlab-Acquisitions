import { Link, useLocation } from "wouter";
import { 
  Briefcase, 
  Users, 
  Bell, 
  LayoutDashboard,
  Settings
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
    <div className="w-64 border-r bg-sidebar flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-sidebar-primary flex items-center gap-2">
          <div className="w-6 h-6 bg-sidebar-primary rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 bg-sidebar-primary-foreground rounded-sm"></div>
          </div>
          Spinlab
        </h1>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Deal Desk</p>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-1 mt-4">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer border-l-4 ${
                  isActive
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                  {item.label}
                </div>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-md cursor-pointer transition-colors">
          <Settings className="h-4 w-4" />
          Settings
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/30">
        {children}
      </main>
    </div>
  );
}
