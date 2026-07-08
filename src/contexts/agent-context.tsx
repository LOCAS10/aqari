"use client";

import { createContext, useContext } from "react";

interface AgentContextValue {
  agentId: string;
  agentName: string;
}

export const AgentContext = createContext<AgentContextValue>({
  agentId: "",
  agentName: "",
});

export function useAgentContext() {
  return useContext(AgentContext);
}