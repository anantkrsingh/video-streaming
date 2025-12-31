import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { login as loginService, register as registerService, getCurrentUser, googleLogin as googleLoginService } from '../services/authService';
import type { User } from '../services/authService';
/**
 * Authentication Context
 * Provides authentication state and methods throughout the application
 */

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Manages authentication state and provides auth methods to children
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Initialize authentication state from localStorage
   * Verify token validity on app load
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get stored token and user from localStorage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          // Verify token is still valid
          try {
            const response = await getCurrentUser();
            setUser(response.data.user);
            setToken(storedToken);
          } catch (error) {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login user
   * @param email - User email
   * @param password - User password
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await loginService({ email, password });
      
      // Store token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Update state
      setToken(response.data.token);
      setUser(response.data.user);
    } catch (error: any) {
      throw error;
    }
  };

  /**
   * Register new user (defaults to viewer role)
   * @param name - User name
   * @param email - User email
   * @param password - User password
   */
  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    try {
      const response = await registerService({
        name,
        email,
        password,
      });
      
      // Store token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Update state
      setToken(response.data.token);
      setUser(response.data.user);
    } catch (error: any) {
      throw error;
    }
  };

  /**
   * Login with Google OAuth
   * @param token - Google OAuth access token
   */
  const loginWithGoogle = async (token: string): Promise<void> => {
    try {
      const response = await googleLoginService(token);
      
      // Store token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Update state
      setToken(response.data.token);
      setUser(response.data.user);
    } catch (error: any) {
      throw error;
    }
  };

  /**
   * Logout user
   * Clear authentication state and localStorage
   */
  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use authentication context
 * @returns AuthContextType
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

