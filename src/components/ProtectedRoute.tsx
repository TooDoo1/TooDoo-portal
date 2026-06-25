import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  clearAuthStorage,
  getAuthEmail,
  getAuthToken,
  getUserByEmail,
  setAuthRole,
} from "@/lib/api";

type ProtectedRouteProps = {
  allowedRoles?: Array<"ADMIN" | "MANAGER" | "USER">;
};

function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded)) as { role?: unknown; exp?: unknown };
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof decoded.exp !== "number") return false;
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = getAuthToken();

  const tokenInvalid = useMemo(() => !token || isJwtExpired(token), [token]);
  const needsRoleCheck = Boolean(allowedRoles && allowedRoles.length > 0);

  const [checkedRole, setCheckedRole] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(() => !tokenInvalid && needsRoleCheck);

  useEffect(() => {
    if (tokenInvalid) {
      clearAuthStorage();
      setCheckedRole(null);
      setVerifying(false);
      return;
    }

    if (!needsRoleCheck) {
      setVerifying(false);
      return;
    }

    let cancelled = false;
    setCheckedRole(null);
    setVerifying(true);

    const resolveRole = async () => {
      const fromJwt = token ? decodeJwtRole(token) : null;
      if (fromJwt) {
        if (cancelled) return;
        setAuthRole(fromJwt);
        setCheckedRole(fromJwt);
        setVerifying(false);
        return;
      }

      const email = getAuthEmail();
      if (!email) {
        if (cancelled) return;
        setCheckedRole(null);
        setVerifying(false);
        return;
      }

      try {
        const user = await getUserByEmail(email);
        if (cancelled) return;
        if (typeof user.role === "string") {
          setAuthRole(user.role);
          setCheckedRole(user.role);
        } else {
          setCheckedRole(null);
        }
      } catch {
        if (!cancelled) setCheckedRole(null);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    };

    void resolveRole();

    return () => {
      cancelled = true;
    };
  }, [token, tokenInvalid, needsRoleCheck]);

  if (tokenInvalid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (verifying) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          role="status"
          aria-label="Kontrollerar behörighet"
        />
      </div>
    );
  }

  if (needsRoleCheck) {
    const normalizedRole = (checkedRole ?? "").toUpperCase();
    const allowed = allowedRoles!.some((role) => role.toUpperCase() === normalizedRole);
    if (!allowed) {
      return <Navigate to="/login" state={{ from: location, reason: "forbidden" }} replace />;
    }
  }

  return <Outlet />;
}
