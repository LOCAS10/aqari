"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Building2, PhoneCall, Moon, Sun, Users, Bell, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TabId = "dashboard" | "properties" | "add-property" | "inquiries" | "agents" | "notifications";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "properties", label: "العقارات", icon: Building2 },
  { id: "inquiries", label: "الاستفسارات", icon: PhoneCall },
  { id: "agents" as TabId, label: "الوكلاء", icon: Users },
  { id: "notifications" as TabId, label: "التنبيهات", icon: Bell },
];

interface AppShellProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  children: React.ReactNode;
}

export function AppShell({ active, onChange, children }: AppShellProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-close mobile menu when tab changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [active]);

  useState(() => {
    setMounted(true);
  });

  function handleTabClick(tab: TabId) {
    onChange(tab);
    setMobileMenuOpen(false);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">عقاري</h1>
            <p className="text-[10px] text-muted-foreground">إدارة العقارات</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="p-3 border-t">
        {mounted && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm">{theme === "dark" ? "وضع نهاري" : "وضع ليلي"}</span>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-row-reverse bg-background text-foreground">
      {/* Desktop Sidebar - Right Side */}
      <aside className="hidden md:flex w-56 border-l bg-card flex-col shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-[60] h-full w-56 bg-card border-l shadow-xl md:hidden",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-background border-b px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold">عقاري</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t bg-background py-3">
          <div className="text-center text-xs text-muted-foreground">
            نظام عقاري &copy; {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  );
}