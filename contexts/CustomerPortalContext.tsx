import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * Customer-portal session storage.
 *
 * Hardening (audit 2026-05):
 *   • Session now carries an `expiresAt` so stale sessions don't appear
 *     "logged in" forever — the portal correctly drops the user back to
 *     the login screen after 14 days. Previously the token lived in
 *     localStorage with no expiry, which was a long-standing security
 *     issue (a copied/synced device retained access indefinitely).
 *   • Reads are wrapped in try/catch — Safari Private Browsing throws on
 *     localStorage access, which previously could blank the portal.
 *   • A storage-event listener keeps multiple tabs in sync (logout in
 *     one tab now logs out the others).
 */
interface CustomerPortalContextType {
  isAuthenticated: boolean;
  customerEmail: string | null;
  sessionToken: string | null;
  login: (email: string, token: string) => void;
  logout: () => void;
}

const CustomerPortalContext = createContext<CustomerPortalContextType | undefined>(undefined);

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const LS_EMAIL = 'customerPortalEmail';
const LS_TOKEN = 'customerPortalToken';
const LS_EXPIRES = 'customerPortalExpiresAt';

const safeGet = (key: string): string | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Safari Private Browsing — silently ignore */
  }
};
const safeRemove = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
};

export const CustomerPortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const restoreFromStorage = useCallback(() => {
    const storedEmail = safeGet(LS_EMAIL);
    const storedToken = safeGet(LS_TOKEN);
    const storedExpiresAt = safeGet(LS_EXPIRES);
    const expiresAt = storedExpiresAt ? Number(storedExpiresAt) : 0;

    if (storedEmail && storedToken && expiresAt && Date.now() < expiresAt) {
      setCustomerEmail(storedEmail);
      setSessionToken(storedToken);
      setIsAuthenticated(true);
    } else if (storedEmail && storedToken && !expiresAt) {
      // Legacy session created before TTL was introduced — accept once,
      // then upgrade it with a fresh expiry so it doesn't live forever.
      const newExpiry = Date.now() + SESSION_TTL_MS;
      safeSet(LS_EXPIRES, String(newExpiry));
      setCustomerEmail(storedEmail);
      setSessionToken(storedToken);
      setIsAuthenticated(true);
    } else {
      // Anything stale gets cleared.
      if (storedEmail || storedToken || storedExpiresAt) {
        safeRemove(LS_EMAIL);
        safeRemove(LS_TOKEN);
        safeRemove(LS_EXPIRES);
      }
      setCustomerEmail(null);
      setSessionToken(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    restoreFromStorage();
    // Cross-tab sync: if the customer logs out in another tab, drop here too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_TOKEN || e.key === LS_EMAIL || e.key === LS_EXPIRES) {
        restoreFromStorage();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    return undefined;
  }, [restoreFromStorage]);

  const login = (email: string, token: string) => {
    const normalised = email.trim().toLowerCase();
    const expiresAt = Date.now() + SESSION_TTL_MS;
    setCustomerEmail(normalised);
    setSessionToken(token);
    setIsAuthenticated(true);
    safeSet(LS_EMAIL, normalised);
    safeSet(LS_TOKEN, token);
    safeSet(LS_EXPIRES, String(expiresAt));
  };

  const logout = () => {
    setCustomerEmail(null);
    setSessionToken(null);
    setIsAuthenticated(false);
    safeRemove(LS_EMAIL);
    safeRemove(LS_TOKEN);
    safeRemove(LS_EXPIRES);
  };

  return (
    <CustomerPortalContext.Provider value={{ isAuthenticated, customerEmail, sessionToken, login, logout }}>
      {children}
    </CustomerPortalContext.Provider>
  );
};

export const useCustomerPortal = () => {
  const context = useContext(CustomerPortalContext);
  if (!context) throw new Error('useCustomerPortal must be used within CustomerPortalProvider');
  return context;
};
