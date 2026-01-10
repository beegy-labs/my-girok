import axios from 'axios';
import { useAdminAuthStore } from '../stores/adminAuthStore';

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

const redirectToLogin = () => {
  if (isRedirecting) return;
  isRedirecting = true;
  useAdminAuthStore.getState().clearAuth();
  window.location.href = '/login';
};

// Response interceptor: handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Ignore cancelled requests
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // On 401 (session expired/invalid), redirect to login
    if (error.response?.status === 401) {
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

export default apiClient;
