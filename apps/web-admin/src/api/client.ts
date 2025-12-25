import axios from 'axios';
import { useAdminAuthStore } from '../stores/adminAuthStore';

// Use environment variable or default to dev API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://my-api-dev.girok.dev/auth';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/v1/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Prevent multiple refresh attempts and redirects
let isRefreshing = false;
let isRedirecting = false;
let refreshPromise: Promise<string> | null = null;

const redirectToLogin = () => {
  if (isRedirecting) return;
  isRedirecting = true;
  useAdminAuthStore.getState().clearAuth();
  window.location.href = '/login';
};

// Request interceptor: add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Block requests if we're redirecting to login
    if (isRedirecting) {
      return Promise.reject(new axios.Cancel('Redirecting to login'));
    }
    const { accessToken } = useAdminAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Ignore cancelled requests
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken } = useAdminAuthStore.getState();

      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      // If already refreshing, wait for the same promise
      if (isRefreshing && refreshPromise) {
        try {
          const token = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        } catch {
          return Promise.reject(error);
        }
      }

      isRefreshing = true;
      refreshPromise = axios
        .post(`${API_BASE_URL}/v1/admin/auth/refresh`, { refreshToken })
        .then((response) => {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          useAdminAuthStore.getState().updateTokens(newAccessToken, newRefreshToken);
          return newAccessToken;
        });

      try {
        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        redirectToLogin();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
