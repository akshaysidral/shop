/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api, refreshAccessToken } from "../api";
import type { Me } from "../models/api";

export type AuthValue = {
  user: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
};

export const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      try {
        if (!await refreshAccessToken()) {
          setUser(null);
          setLoading(false);
          return;
        }
      } catch {
        setUser(null);
        setLoading(false);
        return;
      }
    }
    try {
      const r = await api.get<Me>("/me");
      setUser(r.data);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onExpired = () => setUser(null);
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [refresh]);

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    refresh,
    logout: async () => {
      try {
        await api.post("/auth/logout");
      } catch (error) {
        console.error("Could not revoke refresh token during logout", error);
      } finally {
        localStorage.removeItem("token");
        setUser(null);
      }
    },
    can: (p) => !!user?.permissions.includes(p),
  }), [user, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
