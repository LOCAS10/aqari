"use client";

import { useState } from "react";
import {
  LayoutDashboard, Building2, Plus, PhoneCall, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type TabId = "dashboard" | "properties" | "add-property" | "inquiries";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "properties", label: "العقارات", icon: Building2 },
  { id: "add-property", label: "إضافة عقار", icon: Plus },
  { id: "inquiries", label: "الاستفسارات", icon: PhoneCall },
];

interface AppShellProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  children: React.ReactNode;
}

export function AppShell({ active, onChange, children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">عقاري</h1>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground hidden sm:block ml-2">نظام إدارة العقارات</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto pb-0 -mb-px scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onChange(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                    ${isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          نظام عقاري &copy; {new Date().getFullYear()} — إدارة كراء وبيع العقارات
        </div>
      </footer>
    </div>
  );
}