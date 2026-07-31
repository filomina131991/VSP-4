import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { apiClient, getAccessToken, setAccessToken, refreshAccessToken } from '../lib/apiClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Guard against React StrictMode double-invoke (dev mode fires effects twice).
    // Without this, the first call rotates the refresh token, and the second call
    // immediately gets a 401 because the old token is already invalidated.
    let cancelled = false;

    const checkAuth = async () => {
      const existingToken = getAccessToken();
      if (existingToken) {
        setToken(existingToken);
        try {
          const res = await apiClient.get('/auth/me');
          if (!cancelled) setUser(res.data);
        } catch (error) {
          if (!cancelled) {
            setUser(null);
            setToken(null);
            setAccessToken(null);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        // No in-memory token — try to refresh from httpOnly cookie using deduplicated refreshAccessToken
        try {
          const newToken = await refreshAccessToken();
          if (cancelled) return; // StrictMode second run — discard result
          setToken(newToken);
          const meRes = await apiClient.get('/auth/me');
          if (!cancelled) setUser(meRes.data);
        } catch (error: any) {
          if (!cancelled) {
            // 401 = no valid session, not an unexpected error — stay silent
            setUser(null);
            setToken(null);
            setAccessToken(null);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Cleanup: mark as cancelled so the StrictMode second mount's async
    // callbacks don't update state after the first unmount.
    return () => { cancelled = true; };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiClient.post('/auth/login', { username, password });
    const { token: newToken, user: userData } = res.data;
    setAccessToken(newToken);
    setToken(newToken);
    setUser(userData);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed on server', error);
    }
    setToken(null);
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
