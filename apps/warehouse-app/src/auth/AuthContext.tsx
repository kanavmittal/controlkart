import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiFetch, clearToken, getToken, login as apiLogin, logout as apiLogout, setOnUnauthorized, type Staff } from "../api/client";

type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthState {
  staff: Staff | null;
  status: AuthStatus;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ staff: null, status: "loading" });

  // Hydrate from a stored token on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (!token) {
        if (!cancelled) {
          setState({ staff: null, status: "signedOut" });
        }
        return;
      }

      try {
        const { staff } = await apiFetch<{ staff: Staff }>("/wms/me");
        if (!cancelled) {
          setState({ staff, status: "signedIn" });
        }
      } catch {
        // Expired/invalid token, or account disabled — either way we can't
        // consider this session valid on hydrate.
        await clearToken();
        if (!cancelled) {
          setState({ staff: null, status: "signedOut" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from the API client (expired/revoked token mid-session) flips
  // us to signed-out.
  useEffect(() => {
    setOnUnauthorized(() => {
      setState({ staff: null, status: "signedOut" });
    });
    return () => setOnUnauthorized(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: async (email: string, password: string) => {
        const staff = await apiLogin(email, password);
        setState({ staff, status: "signedIn" });
      },
      signOut: async () => {
        await apiLogout();
        setState({ staff: null, status: "signedOut" });
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
