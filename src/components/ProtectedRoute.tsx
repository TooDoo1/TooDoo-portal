import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  clearAuthStorage,
  ensureValidAuthSession,
  getAuthEmail,
  getAuthRole,
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

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const needsRoleCheck = Boolean(allowedRoles && allowedRoles.length > 0);

  const [sessionReady, setSessionReady] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [checkedRole, setCheckedRole] = useState<string | null>(() =>
    needsRoleCheck ? getAuthRole() : null,
  );
  // Stay in loading until role is confirmed — avoids a one-frame flash to /login
  // after login when session becomes ready before the role effect runs.
  const [verifyingRole, setVerifyingRole] = useState(() => needsRoleCheck);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const valid = await ensureValidAuthSession();
      if (cancelled) return;
      setSessionValid(valid);
      setSessionReady(true);
      if (!valid || !needsRoleCheck) {
        setVerifyingRole(false);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [needsRoleCheck]);

  useEffect(() => {
    if (!sessionReady || !sessionValid || !needsRoleCheck) {
      return;
    }

    let cancelled = false;
    setVerifyingRole(true);

    const resolveRole = async () => {
      const storedRole = getAuthRole();
      if (storedRole) {
        if (!cancelled) {
          setCheckedRole(storedRole);
          setVerifyingRole(false);
        }
        return;
      }

      const token = getAuthToken();
      const fromJwt = token ? decodeJwtRole(token) : null;
      if (fromJwt) {
        if (cancelled) return;
        setAuthRole(fromJwt);
        setCheckedRole(fromJwt);
        setVerifyingRole(false);
        return;
      }

      const email = getAuthEmail();
      if (!email) {
        if (cancelled) return;
        setCheckedRole(null);
        setVerifyingRole(false);
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
        if (!cancelled) setVerifyingRole(false);
      }
    };

    void resolveRole();

    return () => {
      cancelled = true;
    };
  }, [sessionReady, sessionValid, needsRoleCheck]);

  if (!sessionReady || verifyingRole) {
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

  if (!sessionValid) {
    clearAuthStorage();
    return <Navigate to="/login" state={{ from: location }} replace />;
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
