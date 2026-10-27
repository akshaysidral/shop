import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { useAuth } from "../AuthContext";
import Loading from "./Loading";

/** Renders children only for a logged-in user holding at least one of the given permissions. */
export function RequirePermission({ permission, children }: { permission: string | string[]; children: ReactNode }) {
  const { user, loading, can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) return <Loading />;
  if (!user) return <RedirectToLogin pathname={pathname} router={router} />;

  const needed = Array.isArray(permission) ? permission : [permission];
  if (!needed.some((p) => can(p))) {
    return <Alert severity="warning">You do not have access to this page.</Alert>;
  }
  return <>{children}</>;
}

function RedirectToLogin({ pathname, router }: { pathname: string; router: ReturnType<typeof useRouter> }) {
  useEffect(() => {
    router.replace(`/login?from=${encodeURIComponent(pathname)}`);
  }, [pathname, router]);
  return <Loading />;
}
