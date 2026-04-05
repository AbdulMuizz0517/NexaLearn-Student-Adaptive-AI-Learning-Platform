import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import axiosClient from "../api/axiosClient";

// Session expires after 24 hours (in milliseconds)
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

interface AuthContextType {
  user: any;
  token: string | null;
  login: (token: string, userData: any) => void;
  logout: () => void;
  isAuthenticated: boolean;
  sessionExpiresAt: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isSessionExpired(): boolean {
  const loginTime = localStorage.getItem("loginTime");
  if (!loginTime) return true;
  return Date.now() - parseInt(loginTime, 10) > SESSION_DURATION_MS;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(() => {
    // If session is expired, clear everything on load
    if (isSessionExpired()) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("lastScreen");
      localStorage.removeItem("userRole");
      return null;
    }
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (isSessionExpired()) return null;
    return localStorage.getItem("token");
  });
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(() => {
    const loginTime = localStorage.getItem("loginTime");
    return loginTime ? parseInt(loginTime, 10) + SESSION_DURATION_MS : null;
  });

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("lastScreen");
    localStorage.removeItem("userRole");
    setToken(null);
    setUser(null);
    setSessionExpiresAt(null);
    delete axiosClient.defaults.headers.common.Authorization;
  }, []);

  useEffect(() => {
    if (token) {
      axiosClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete axiosClient.defaults.headers.common.Authorization;
    }
  }, [token]);

  // Periodic session expiry check (every 60 seconds)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (isSessionExpired()) {
        logout();
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [token, logout]);

  const login = (newToken: string, userData: any) => {
    const now = Date.now();
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("loginTime", now.toString());
    setToken(newToken);
    setUser(userData);
    setSessionExpiresAt(now + SESSION_DURATION_MS);
    axiosClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, sessionExpiresAt }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
