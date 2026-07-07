"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AppShell, TabId } from "@/components/app-shell";
import DashboardView from "@/components/views/dashboard-view";
import { PropertiesView, PropertyDetailView } from "@/components/views/properties-view";
import PropertyForm from "@/components/views/property-form";
import InquiriesView from "@/components/views/inquiries-view";

const qc = new QueryClient();

function AppContent() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [editPropertyId, setEditPropertyId] = useState<string | null>(null);

  function handleNavigate(t: string) {
    setSelectedPropertyId(null);
    setEditPropertyId(null);
    setTab(t as TabId);
  }

  function handleSelectProperty(id: string) {
    setSelectedPropertyId(id);
  }

  function handleSaved() {
    setEditPropertyId(null);
    setTab("properties");
  }

  function handleEditProperty(id: string) {
    setEditPropertyId(id);
    setTab("add-property");
  }

  return (
    <AppShell active={tab} onChange={setTab}>
      {tab === "dashboard" && <DashboardView onNavigate={handleNavigate} />}
      {tab === "properties" && !selectedPropertyId && (
        <PropertiesView
          onSelectProperty={handleSelectProperty}
          onEdit={handleEditProperty}
        />
      )}
      {tab === "properties" && selectedPropertyId && (
        <PropertyDetailView
          propertyId={selectedPropertyId}
          onBack={() => setSelectedPropertyId(null)}
        />
      )}
      {tab === "add-property" && (
        <PropertyForm
          editId={editPropertyId}
          onSaved={handleSaved}
          onCancel={() => { setEditPropertyId(null); setTab("properties"); }}
        />
      )}
      {tab === "inquiries" && <InquiriesView />}
    </AppShell>
  );
}

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={qc}>
        <AppContent />
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  );
}