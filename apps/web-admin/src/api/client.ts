import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { logger } from '../utils/logger';
import { handleApiError } from '../lib/error-handler';

// BFF API base URL - auth-bff handles all authentication
const API_BASE_URL = import.meta.env.VITE_AUTH_BFF_URL || 'https://auth-dev.girok.dev';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable cookies for session-based auth
  withCredentials: true,
});

// Prevent multiple redirects
let isRedirecting = false;

// Token refresh state - single promise prevents race conditions
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Queue of failed requests waiting for token refresh
interface QueuedRequest {
  resolve: (config: InternalAxiosRequestConfig) => void;
  reject: (error: Error) => void;
  config: InternalAxiosRequestConfig;
}
let failedQueue: QueuedRequest[] = [];

/**
 * Process queued requests after refresh attempt
 */
const processQueue = (success: boolean) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (success) {
      resolve(config);
    } else {
      reject(new Error('Session refresh failed'));
    }
  });
  failedQueue = [];
};

/**
 * Redirect to login page
 */
const redirectToLogin = () => {
  if (isRedirecting) return;
  isRedirecting = true;
  useAdminAuthStore.getState().clearAuth();
  window.location.href = '/login';
};

/**
 * Attempt to refresh the session
 * Returns true if refresh succeeded, false otherwise
 */
const refreshSession = async (): Promise<boolean> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/admin/refresh`,
      {},
      { withCredentials: true },
    );
    return response.data?.success === true;
  } catch (error) {
    logger.warn('Session refresh failed', error);
    return false;
  }
};

// Response interceptor: handle errors with centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Ignore cancelled requests
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle and log all errors
    handleApiError(error, originalRequest.url);

    // Special handling for 401 errors (authentication)
    if (error.response?.status !== 401) {
      // For non-401 errors, just reject with enhanced error info
      return Promise.reject(error);
    }

    // If already redirecting, reject immediately
    if (isRedirecting) {
      return Promise.reject(error);
    }

    // Check if user is authenticated (has stored session)
    const { isAuthenticated } = useAdminAuthStore.getState();

    // If not authenticated, redirect to login immediately
    if (!isAuthenticated) {
      redirectToLogin();
      return Promise.reject(error);
    }

    // Don't retry refresh endpoint itself
    if (originalRequest.url?.includes('/admin/refresh')) {
      redirectToLogin();
      return Promise.reject(error);
    }

    // Don't retry login endpoints
    if (
      originalRequest.url?.includes('/admin/login') ||
      originalRequest.url?.includes('/admin/logout')
    ) {
      return Promise.reject(error);
    }

    // Prevent infinite retry loop
    if (originalRequest._retry) {
      redirectToLogin();
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing && refreshPromise) {
      return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest });
      }).then((config) => apiClient.request(config));
    }

    // Start refresh process
    originalRequest._retry = true;
    isRefreshing = true;

    refreshPromise = refreshSession();

    try {
      const refreshed = await refreshPromise;

      if (refreshed) {
        logger.info('Session refreshed successfully');
        processQueue(true);

        // Retry the original request
        return apiClient.request(originalRequest);
      } else {
        // Refresh failed - redirect to login
        processQueue(false);
        redirectToLogin();
        return Promise.reject(error);
      }
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  },
);

/**
 * Reset redirect flag (called after successful login)
 */
export const resetRedirectFlag = () => {
  isRedirecting = false;
};

export default apiClient;
