"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  Building2, Moon, Sun, Menu, X, HandMetal, ArrowDownUp, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TabId = "requests" | "offers";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "requests", label: "الطلبات", icon: HandMetal },
  { id: "offers", label: "العروض", icon: ArrowDownUp },
];

interface AppShellProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  children: React.ReactNode;
  agentName?: string;
  onLogout?: () => void;
}

export function AppShell({ active, onChange, children, agentName, onLogout }: AppShellProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [active]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">عقاري</h1>
            <p className="text-[10px] text-muted-foreground">الطلبات والعروض</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={closeMobileMenu}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {agentName && (
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {agentName.charAt(0)}
              </div>
              <span className="text-sm font-medium">{agentName}</span>
            </div>
            {onLogout && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onLogout} title="تسجيل الخروج">
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
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
      <aside className="hidden md:flex w-56 border-l bg-card flex-col shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/50" onClick={closeMobileMenu} />
          <aside className="fixed top-0 right-0 z-50 h-full w-64 bg-card border-l shadow-2xl overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-background border-b px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold">عقاري</h1>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        <footer className="border-t bg-background py-3">
          <div className="text-center text-xs text-muted-foreground">
            نظام عقاري &copy; {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  );
}