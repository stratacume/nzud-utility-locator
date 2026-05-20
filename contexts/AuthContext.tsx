import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (token && token.length >= 6) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'login', password }
      });
      // Defensive: even if `error` is set (e.g. a future non-2xx response
      // path), supabase-js may still populate `data` with our structured
      // body. Prefer the structured body's message over the opaque
      // "Edge Function returned a non-2xx status code" surface so the
      // admin sees a useful reason.
      if (data?.success && data?.token) {
        sessionStorage.setItem('admin_token', data.token);
        setIsAuthenticated(true);
        return { success: true };
      }
      const fallback = data?.error
        || (error?.message && !/non-2xx/i.test(error.message) ? error.message : null)
        || 'Login failed. Please check your password and try again.';
      return { success: false, error: fallback };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed' };
    }
  };


  const logout = async () => {
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}