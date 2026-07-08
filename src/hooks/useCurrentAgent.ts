"use client";

import { useState, useEffect, useCallback } from "react";

interface CurrentAgent {
  id: string;
  name: string;
  phone: string | null;
}

const STORAGE_KEY = "aqari_current_agent";

export function useCurrentAgent() {
  const [agent, setAgent] = useState<CurrentAgent | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAgent(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "فشل في تسجيل الدخول" };
      }

      const agentData: CurrentAgent = {
        id: data.agent.id,
        name: data.agent.name,
        phone: data.agent.phone,
      };

      setAgent(agentData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agentData));
      return { success: true };
    } catch {
      return { success: false, error: "خطأ في الشبكة" };
    }
  }, []);

  const logout = useCallback(() => {
    setAgent(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { agent, loading, login, logout };
}