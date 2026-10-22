"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, setToken } from "@/lib/api";
import type { AuthPayload, CurrentUser } from "@/lib/types";

interface AuthContextValue {
  user: CurrentUser | null;
  ready: boolean;
  canManage: boolean;
  establish: (payload: AuthPayload) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const result = await api.me();
    setUser(result.data);
  }, []);

  useEffect(() => {
    let active = true;

    api
      .me()
      .then((result) => {
        if (active) setUser(result.data);
      })
      .catch(() => {
        if (active) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const establish = useCallback(async (payload: AuthPayload) => {
    setToken(payload.token);
    const result = await api.me();
    setUser(result.data);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      canManage: user?.role === "OWNER" || user?.role === "ADMIN",
      establish,
      logout,
      refresh,
    }),
    [user, ready, establish, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
