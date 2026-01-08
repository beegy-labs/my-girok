import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';

/**
 * Configuration options for creating an API client
 */
export interface CreateApiClientOptions {
  /** Base URL for API requests */
  baseURL: string;
  /** Callback to clear auth state when session expires */
  onAuthExpired: () => void;
  /** Login page path for redirect (default: '/login') */
  loginPath?: string;
  /** Whether to preserve current URL for redirect (default: true) */
  preserveReturnUrl?: boolean;
  /** Optional request interceptor */
  requestInterceptor?: (
    config: InternalAxiosRequestConfig,
  ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  /** Optional additional response error handler */
  onResponseError?: (error: AxiosError) => void;
}

/**
 * Creates a configured Axios instance for BFF session-based authentication.
 *
 * Features:
 * - Session-based auth with cookies (withCredentials: true)
 * - Automatic 401 handling with auth state cleanup
 * - Redirect to login on session expiry
 * - Handles cancelled requests gracefully
 *
 * @example
 * ```typescript
 * import { createApiClient } from '@my-girok/auth-utils';
 * import { useAuthStore } from './stores/authStore';
 *
 * const apiClient = createApiClient({
 *   baseURL: import.meta.env.VITE_AUTH_BFF_URL || 'https://auth-bff.girok.dev',
 *   onAuthExpired: () => useAuthStore.getState().clearAuth(),
 * });
 *
 * export { apiClient };
 * ```
 */
export function createApiClient(options: CreateApiClientOptions): AxiosInstance {
  const {
    baseURL,
    onAuthExpired,
    loginPath = '/login',
    preserveReturnUrl = true,
    requestInterceptor,
    onResponseError,
  } = options;

  const apiClient = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    // Enable cookies for session-based auth
    withCredentials: true,
  });

  // Prevent multiple redirects
  let isRedirecting = false;

  const redirectToLogin = () => {
    if (isRedirecting) return;
    isRedirecting = true;

    // Clear auth state
    onAuthExpired();

    // Redirect to login, optionally preserving return URL
    if (preserveReturnUrl && typeof window !== 'undefined') {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${loginPath}?returnUrl=${returnUrl}`;
    } else if (typeof window !== 'undefined') {
      window.location.href = loginPath;
    }
  };

  // Request interceptor (optional)
  if (requestInterceptor) {
    apiClient.interceptors.request.use(requestInterceptor);
  }

  // Response interceptor: handle 401 errors
  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      // Ignore cancelled requests
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }

      // On 401 (session expired/invalid), redirect to login
      if (error.response?.status === 401) {
        redirectToLogin();
      }

      // Call optional error handler
      onResponseError?.(error);

      return Promise.reject(error);
    },
  );

  return apiClient;
}

/**
 * Type helper for API response with standard structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
