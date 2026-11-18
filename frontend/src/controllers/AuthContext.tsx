/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import axios from "axios";
import { api } from "../api";
import type { Me } from "../models/api";

export type AuthValue = {
  user: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
};

export const AUTH_SESSION_HINT_KEY = "bazario:session-established";

export const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    localStorage.removeItem("token");
    try {
      const r = await api.get<Me>("/me");
      setUser(r.data);
      localStorage.setItem(AUTH_SESSION_HINT_KEY, "true");
    } catch (error) {
      setUser(null);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem(AUTH_SESSION_HINT_KEY);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem(AUTH_SESSION_HINT_KEY)) {
      void refresh();
    } else {
      setLoading(false);
    }
    const onExpired = () => {
      setUser(null);
      localStorage.removeItem(AUTH_SESSION_HINT_KEY);
    };
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
        console.error("Could not end the server session during logout", error);
      } finally {
        setUser(null);
        localStorage.removeItem(AUTH_SESSION_HINT_KEY);
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
