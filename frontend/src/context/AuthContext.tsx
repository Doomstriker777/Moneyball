import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, ApiError } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'HOLDER' | 'AUDITOR') => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ledgerline_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore authenticated session from localStorage if present
  useEffect(() => {
    const savedUser = localStorage.getItem('ledgerline_user');
    const savedToken = localStorage.getItem('ledgerline_token');

    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem('ledgerline_user');
        localStorage.removeItem('ledgerline_token');
      }
    }
    setIsLoading(false);
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

  const register = async (email: string, password: string, role: 'HOLDER' | 'AUDITOR') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.register(email, password, role);
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
        register,
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
