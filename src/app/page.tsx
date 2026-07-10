"use client";

import { useState, useMemo } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AppShell, TabId } from "@/components/app-shell";
import DashboardView from "@/components/views/dashboard-view";
import { PropertiesView, PropertyDetailView } from "@/components/views/properties-view";
import PropertyForm from "@/components/views/property-form";
import InquiriesView from "@/components/views/inquiries-view";
import AgentsView from "@/components/views/agents-view";
import NotificationsView from "@/components/views/notifications-view";
import { PinLoginScreen } from "@/components/pin-login-screen";
import { useCurrentAgent } from "@/hooks/useCurrentAgent";
import { AgentContext } from "@/contexts/agent-context";

// Context to share current agent across components
function AppContent() {
  const { agent, loading, logout } = useCurrentAgent();
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

  // Show loading or PIN login
  if (loading) {
    return null;
  }

  if (!agent) {
    return <PinLoginScreen onLogin={() => {}} />;
  }

  const agentContextValue = {
    agentId: agent.id,
    agentName: agent.name,
  };

  return (
    <AgentContext.Provider value={agentContextValue}>
      <AppShell active={tab} onChange={setTab} agentName={agent.name} onLogout={logout}>
        {tab === "dashboard" && <DashboardView onNavigate={handleNavigate} />}
        {tab === "properties" && !selectedPropertyId && (
          <PropertiesView
            onSelectProperty={handleSelectProperty}
            onEdit={handleEditProperty}
            onAddProperty={() => setTab("add-property")}
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
        {tab === "requests" && <InquiriesView filterType="REQUEST" />}
        {tab === "offers" && <InquiriesView filterType="OFFER" />}
        {tab === "agents" && <AgentsView />}
        {tab === "notifications" && <NotificationsView />}
      </AppShell>
    </AgentContext.Provider>
  );
}

export default function Home() {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30000,
        refetchOnWindowFocus: false,
      },
    },
  }), []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  );
}