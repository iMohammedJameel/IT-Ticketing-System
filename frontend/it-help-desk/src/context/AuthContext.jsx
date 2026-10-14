/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Auth context — single source of truth for user & token state.
// Storage strategy: "Remember me" → localStorage (survives browser restarts);
// unchecked → sessionStorage (cleared when the tab closes). Both are checked
// on mount, and logout clears both.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

const TOKEN_KEY = "token";
const REFRESH_KEY = "refreshToken";
const USER_KEY = "user";

// Which store currently holds the session (session-first)
const activeStore = () =>
  sessionStorage.getItem(TOKEN_KEY) ? sessionStorage : localStorage;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from storage on mount (session takes priority when both exist).
  // NOTE: the refresh token intentionally has NO React state — it is owned by
  // the axios interceptor (api.jsx), which reads/writes it in storage directly.
  // Duplicating it in state created a dead value nothing consumed.
  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    const storedUser = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        sessionStorage.clear();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Cross-tab logout detection
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        setUser(null);
        setToken(null);
        window.location.href = "/login";
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // login(token, refreshToken, user, { persistent = true })
  // persistent=false → sessionStorage only ("Remember me" unchecked)
  const login = useCallback((tokenValue, refreshTokenValue, userValue, { persistent = true } = {}) => {
    const store = persistent ? localStorage : sessionStorage;
    // Always clear the OTHER store so sessions never overlap
    (persistent ? sessionStorage : localStorage).removeItem(TOKEN_KEY);
    (persistent ? sessionStorage : localStorage).removeItem(REFRESH_KEY);
    (persistent ? sessionStorage : localStorage).removeItem(USER_KEY);

    store.setItem(TOKEN_KEY, tokenValue);
    if (refreshTokenValue) store.setItem(REFRESH_KEY, refreshTokenValue);
    store.setItem(USER_KEY, JSON.stringify(userValue));
    setToken(tokenValue);
    setUser(userValue);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore — token may already be invalid
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    activeStore().setItem(USER_KEY, JSON.stringify(updatedUser));
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === "admin",
    // Agent = support staff WITHOUT admin powers (works tickets, no user mgmt)
    isAgent: user?.role === "agent",
    // Staff = anyone who works tickets (admin OR agent) — gates ticket controls
    isStaff: user?.role === "admin" || user?.role === "agent",
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
