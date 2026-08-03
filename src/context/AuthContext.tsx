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
          if (!cancelled) {
            setUser(res.data);
            localStorage.setItem('has_session', 'true');
          }
        } catch (error) {
          if (!cancelled) {
            setUser(null);
            setToken(null);
            setAccessToken(null);
            localStorage.setItem('has_session', 'false');
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        const hasSessionHint = localStorage.getItem('has_session') !== 'false';
        if (!hasSessionHint) {
          if (!cancelled) {
            setUser(null);
            setToken(null);
            setAccessToken(null);
            setIsLoading(false);
          }
          return;
        }

        // Try to refresh from httpOnly cookie using deduplicated refreshAccessToken
        try {
          const newToken = await refreshAccessToken();
          if (cancelled) return; // StrictMode second run — discard result
          setToken(newToken);
          localStorage.setItem('has_session', 'true');
          const meRes = await apiClient.get('/auth/me');
          if (!cancelled) setUser(meRes.data);
        } catch (error: any) {
          if (!cancelled) {
            // 401 = no valid session, set hint to false so subsequent reloads don't retry
            setUser(null);
            setToken(null);
            setAccessToken(null);
            localStorage.setItem('has_session', 'false');
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      }
    };

    checkAuth();

    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
      setAccessToken(null);
      localStorage.setItem('has_session', 'false');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);

    // Cleanup: mark as cancelled so the StrictMode second mount's async
    // callbacks don't update state after the first unmount.
    return () => { 
      cancelled = true; 
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiClient.post('/auth/login', { username: username.trim(), password });
    const { token: newToken, user: userData } = res.data;
    setAccessToken(newToken);
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('has_session', 'true');
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
    localStorage.setItem('has_session', 'false');
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
