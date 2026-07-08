"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import {
  Building2, LayoutDashboard, Users, UserCheck, MapPinned,
  ShoppingCart, Wallet, Search, FileBarChart, Settings,
  LogOut, Menu, Database, ChevronLeft
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TabId =
  | "dashboard" | "search" | "visitors" | "visits" | "customers"
  | "lots" | "sales" | "payments" | "reports" | "users" | "backup";

interface NavItem {
  id: TabId;
  label: string;
  icon: any;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "search", label: "البحث", icon: Search },
  { id: "visitors", label: "الزوار", icon: Users },
  { id: "visits", label: "سجل الزيارات", icon: UserCheck },
  { id: "customers", label: "الزبناء", icon: UserCheck },
  { id: "lots", label: "البقع العقارية", icon: MapPinned },
  { id: "sales", label: "المبيعات", icon: ShoppingCart },
  { id: "payments", label: "الدفعات", icon: Wallet, roles: ["ADMIN", "ACCOUNTANT"] },
  { id: "reports", label: "التقارير", icon: FileBarChart },
  { id: "users", label: "إدارة المستخدمين", icon: Settings, roles: ["ADMIN"] },
  { id: "backup", label: "النسخ الاحتياطي", icon: Database, roles: ["ADMIN"] },
];

export function AppShell({
  active, onChange, children,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS.filter(i => !i.roles || (user && i.roles.includes(user.role)));

  const initials = (user?.name || "U").split(" ").map(s => s[0]).slice(0, 2).join("");

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* الشعار */}
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-sidebar-foreground text-sm">نظام تتبع المشروع</div>
          <div className="text-xs text-sidebar-foreground/60">إدارة شاملة</div>
        </div>
        <ThemeToggle />
        <NotificationBell />
      </div>

      {/* القائمة */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {items.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onChange(item.id); setMobileOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-right",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-right">{item.label}</span>
                {isActive && <ChevronLeft className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* بطاقة المستخدم */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="w-9 h-9 bg-primary text-primary-foreground">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</div>
            <div className="text-xs text-sidebar-foreground/60">
              {ROLE_LABELS[user?.role || ""] || ""}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-destructive"
            onClick={logout}
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-sidebar">
        {SidebarContent}
      </aside>

      {/* Sidebar - Mobile */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 p-0 bg-sidebar">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-card border-b">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">نظام تتبع المشروع</span>
          </div>
          <ThemeToggle />
          <NotificationBell />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {/* شعار المشروع في الأعلى */}
          <div className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b">
            <div className="px-4 py-2 text-center">
              <span className="text-sm font-semibold tracking-wide bg-gradient-to-l from-primary/10 via-primary/15 to-primary/10 px-4 py-1 rounded-full text-primary">
                Velaya City Bouskoura
              </span>
            </div>
          </div>
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
