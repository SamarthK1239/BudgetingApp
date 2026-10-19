/**
 * Authentication context
 * Tracks the signed-in user and exposes login/logout helpers to the app.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient, { AuthUser } from '../api/client';

export type AuthStatus = 'loading' | 'needs-bootstrap' | 'unauthenticated' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  bootstrap: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  user: null,
  error: null,
  login: async () => {},
  bootstrap: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export const useAuth = (): AuthContextValue => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const bootstrapStatus = await apiClient.getBootstrapStatus();
      if (bootstrapStatus.needs_bootstrap) {
        setUser(null);
        setStatus('needs-bootstrap');
        setError(null);
        return;
      }

      try {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
        setStatus('authenticated');
      } catch {
        // No valid session; the login screen takes over from here.
        setUser(null);
        setStatus('unauthenticated');
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to reach the server');
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    // A 401 on any request means our session died server-side.
    apiClient.setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return () => apiClient.setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const result = await apiClient.login(username, password);
    setUser(result.user);
    setStatus('authenticated');
    setError(null);
  }, []);

  const bootstrap = useCallback(
    async (username: string, password: string, displayName?: string): Promise<void> => {
      const result = await apiClient.bootstrapAdmin({
        username,
        password,
        display_name: displayName || undefined,
      });
      setUser(result.user);
      setStatus('authenticated');
      setError(null);
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, error, login, bootstrap, logout, refresh }),
    [status, user, error, login, bootstrap, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
