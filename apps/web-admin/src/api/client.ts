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

// Request interceptor: add auth token
apiClient.interceptors.request.use(
  (config) => {
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
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken, updateTokens, clearAuth } = useAdminAuthStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/v1/admin/auth/refresh`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

          updateTokens(newAccessToken, newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          return apiClient(originalRequest);
        } catch {
          clearAuth();
          window.location.href = '/login';
        }
      } else {
        clearAuth();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
