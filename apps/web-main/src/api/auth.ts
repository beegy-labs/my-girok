import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Public API client - for unauthenticated requests (login, register, logout)
 * Does NOT have 401 interceptor to avoid unnecessary token refresh attempts
 */
export const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Authenticated API client - for requests that require authentication
 * Has request interceptor for adding Bearer token and response interceptor for 401 handling
 */
export const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous refresh calls
let isRefreshing = false;

// Request interceptor - Add access token and check for proactive refresh
authApi.interceptors.request.use(
  async (config) => {
    const { accessToken, needsProactiveRefresh, refreshToken } = useAuthStore.getState();

    // Add access token to headers
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Proactive refresh: renew refresh token if it has 7 days or less remaining
    if (!isRefreshing && needsProactiveRefresh() && refreshToken) {
      isRefreshing = true;
      try {
        const response = await axios.post(`${API_URL}/v1/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        useAuthStore.getState().updateTokens(newAccessToken, newRefreshToken);

        // Update current request with new token
        config.headers.Authorization = `Bearer ${newAccessToken}`;
      } catch (error) {
        console.warn('Proactive token refresh failed:', error);
        // Don't block the request if proactive refresh fails
      } finally {
        isRefreshing = false;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - Handle token refresh
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        const response = await axios.post(`${API_URL}/v1/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        // Update both tokens (refresh endpoint returns new refresh token)
        if (newRefreshToken) {
          useAuthStore.getState().updateTokens(accessToken, newRefreshToken);
        } else {
          useAuthStore.getState().updateAccessToken(accessToken);
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return authApi(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        // Preserve current URL to redirect back after login
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?returnUrl=${returnUrl}`;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

import type {
  RegisterWithConsentsDto,
  LoginDto as ILoginDto,
  ChangePasswordDto as IChangePasswordDto,
} from '@my-girok/types';

/**
 * Register a new user with consents
 * Uses publicApi - 401 on validation errors should show error message, not trigger token refresh
 */
export const register = async (data: RegisterWithConsentsDto) => {
  const response = await publicApi.post('/v1/auth/register', data);
  return response.data;
};

/**
 * Login with email and password
 * Uses publicApi - 401 on invalid credentials should show error message, not redirect
 */
export const login = async (data: ILoginDto) => {
  const response = await publicApi.post('/v1/auth/login', data);
  return response.data;
};

/**
 * Logout the current user
 * Uses publicApi - if token is invalid (401), just clear local state
 * No need to refresh token just to invalidate it
 */
export const logout = async () => {
  const { refreshToken } = useAuthStore.getState();
  try {
    await publicApi.post('/v1/auth/logout', { refreshToken });
  } finally {
    // Always clear local state, even if API call fails
    useAuthStore.getState().clearAuth();
  }
};

export const getCurrentUser = async () => {
  const response = await authApi.get('/v1/users/me');
  return response.data;
};

export const changePassword = async (data: IChangePasswordDto) => {
  const response = await authApi.post('/v1/users/me/change-password', data);
  return response.data;
};
