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
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

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

      // If already refreshing, wait for the new token
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/v1/admin/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        useAdminAuthStore.getState().updateTokens(newAccessToken, newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        isRefreshing = false;
        onRefreshed(newAccessToken);

        return apiClient(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
