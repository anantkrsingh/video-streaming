import axios from 'axios';

/**
 * API Service
 * Centralized axios instance for making HTTP requests to the backend
 * Includes request/response interceptors for authentication
 */

// Determine API base URL
// In production (Docker), use relative path since nginx proxies /api to backend
// In development, use the full URL from environment or default to localhost:3000
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production, use relative path (nginx handles proxy)
  if (import.meta.env.PROD) {
    return '/api';
  }
  // In development, use localhost
  return 'http://localhost:3000/api';
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Automatically adds JWT token to all requests if available
 */
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // Add token to Authorization header if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles common error responses and token expiration
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

