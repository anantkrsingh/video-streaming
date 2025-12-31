import api from './api';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  organizationId: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  organizationId?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Register a new user
 * @param data - User registration data
 * @returns Promise with user data and token
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', data);
  return response.data;
};

/**
 * Login user
 * @param data - User login credentials
 * @returns Promise with user data and token
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', data);
  return response.data;
};

/**
 * Get current authenticated user's profile
 * @returns Promise with user data
 */
export const getCurrentUser = async (): Promise<{ success: boolean; data: { user: User } }> => {
  const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
  return response.data;
};

/**
 * Verify JWT token validity
 * @returns Promise with user data if token is valid
 */
export const verifyToken = async (): Promise<{ success: boolean; data: { user: User } }> => {
  const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/verify');
  return response.data;
};

/**
 * Login with Google OAuth
 * @param token - Google OAuth credential JWT token
 * @returns Promise with user data and token
 */
export const googleLogin = async (token: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/google', { token });
  return response.data;
};

