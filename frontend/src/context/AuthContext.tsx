import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, ApiError } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  switchRole: (roleKey: 'ADMIN' | 'HOLDER1' | 'HOLDER2' | 'AUDITOR') => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const DEMO_CREDENTIALS: Record<string, { email: string; pass: string }> = {
  ADMIN: { email: 'admin@ledgerline.internal', pass: 'Admin123!' },
  HOLDER1: { email: 'holder1@ledgerline.internal', pass: 'Holder123!' },
  HOLDER2: { email: 'holder2@ledgerline.internal', pass: 'Holder222!' },
  AUDITOR: { email: 'auditor@ledgerline.internal', pass: 'Auditor123!' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ledgerline_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage or auto-login as HOLDER1 for instant demo access
  useEffect(() => {
    const savedUser = localStorage.getItem('ledgerline_user');
    const savedToken = localStorage.getItem('ledgerline_token');

    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        setIsLoading(false);
        return;
      } catch {
        localStorage.removeItem('ledgerline_user');
        localStorage.removeItem('ledgerline_token');
      }
    }

    // Default auto-login as HOLDER1 for smooth reviewer demo experience
    switchRole('HOLDER1').finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.login(email, password);
      const newUser: User = {
        id: response.userId,
        email: response.email,
        role: response.role,
      };

      setUser(newUser);
      setToken(response.token);
      localStorage.setItem('ledgerline_token', response.token);
      localStorage.setItem('ledgerline_user', JSON.stringify(newUser));
    } catch (err: any) {
      const msg = err instanceof ApiError ? (err.detail || err.message) : err.message;
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (roleKey: 'ADMIN' | 'HOLDER1' | 'HOLDER2' | 'AUDITOR') => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (!creds) return;
    await login(creds.email, creds.pass);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('ledgerline_token');
    localStorage.removeItem('ledgerline_user');
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        switchRole,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
