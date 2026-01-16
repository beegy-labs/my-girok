/**
 * Resume API Client
 *
 * Axios instance configured for the Personal Service API.
 * Handles session-based authentication and 401 redirects.
 */
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const PERSONAL_API_URL = import.meta.env.VITE_PERSONAL_API_URL || 'http://localhost:4002';

/**
 * Axios instance for Personal Service API
 * Configured with session-based authentication (cookies)
 */
export const personalApi = axios.create({
  baseURL: PERSONAL_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable cookies for session-based authentication
  withCredentials: true,
});

// Response interceptor for handling 401 errors
personalApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip auth redirect for public endpoints
    const isPublicEndpoint =
      originalRequest?.url?.includes('/share/public/') ||
      originalRequest?.url?.includes('/resume/public/');

    if (isPublicEndpoint) {
      return Promise.reject(error);
    }

    // Enhanced error logging for mobile debugging
    if (!error.response) {
      console.error('[API Error] Network or CORS error:', {
        message: error.message,
        url: originalRequest?.url,
        method: originalRequest?.method,
        userAgent: navigator.userAgent,
      });
    }

    // On 401, clear auth and redirect to login
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?returnUrl=${returnUrl}`;
    }

    return Promise.reject(error);
  },
);
