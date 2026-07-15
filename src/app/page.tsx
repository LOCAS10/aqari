"use client";

import { useState, useMemo } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AppShell, TabId } from "@/components/app-shell";
import InquiriesView from "@/components/views/inquiries-view";
import { PinLoginScreen } from "@/components/pin-login-screen";
import { useCurrentAgent } from "@/hooks/useCurrentAgent";
import { AgentContext } from "@/contexts/agent-context";

function AppContent() {
  const { agent, loading, logout } = useCurrentAgent();
  const [tab, setTab] = useState<TabId>("requests");

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
        {tab === "requests" && <InquiriesView filterType="REQUEST" />}
        {tab === "offers" && <InquiriesView filterType="OFFER" />}
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