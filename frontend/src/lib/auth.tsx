import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGet, apiPost, setAuthToken, setUnauthorizedHandler } from "@/lib/api";
import type { AuthUser, LoginResponse } from "@/types/api";

const STORAGE_KEY = "mailift_planner_token";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setAuthToken(token);
    apiGet<AuthUser>("/auth/me")
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setAuthToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
    // Solo al mount / quando cambia il token da login esterno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login(email: string, password: string): Promise<void> {
    const result = await apiPost<LoginResponse>("/auth/login", { email, password });
    localStorage.setItem(STORAGE_KEY, result.access_token);
    setAuthToken(result.access_token);
    setToken(result.access_token);
    setUser(result.user);
  }

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth va usato dentro <AuthProvider>");
  return ctx;
}
