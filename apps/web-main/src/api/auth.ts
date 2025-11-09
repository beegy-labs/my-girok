import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authApi = axios.create({
  baseURL: `${API_URL}/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add access token
authApi.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
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

        const { accessToken } = response.data;
        useAuthStore.getState().updateAccessToken(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return authApi(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

import type { RegisterDto as IRegisterDto, LoginDto as ILoginDto } from '@my-girok/types';

export const register = async (data: IRegisterDto) => {
  const response = await authApi.post('/auth/register', data);
  return response.data;
};

export const login = async (data: ILoginDto) => {
  const response = await authApi.post('/auth/login', data);
  return response.data;
};

export const logout = async () => {
  const { refreshToken } = useAuthStore.getState();
  await authApi.post('/auth/logout', { refreshToken });
  useAuthStore.getState().clearAuth();
};

export const getCurrentUser = async () => {
  const response = await authApi.get('/users/me');
  return response.data;
};
