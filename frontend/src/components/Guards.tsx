import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Alert from "@mui/material/Alert";
import { useAuth } from "../AuthContext";
import Loading from "./Loading";

/** Renders children only for a logged-in user holding at least one of the given permissions. */
export function RequirePermission({ permission, children }: { permission: string | string[]; children: ReactNode }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  const needed = Array.isArray(permission) ? permission : [permission];
  if (!needed.some((p) => can(p))) {
    return <Alert severity="warning">You do not have access to this page.</Alert>;
  }
  return <>{children}</>;
}
