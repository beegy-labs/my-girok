import apiClient from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: string;
    email: string;
    name: string;
    scope: 'SYSTEM' | 'TENANT';
    tenantId: string | null;
    tenantSlug: string | null;
    roleName: string;
    permissions: string[];
  };
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  scope: 'SYSTEM' | 'TENANT';
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  role: {
    id: string;
    name: string;
    displayName: string;
    level: number;
  };
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  getProfile: async (): Promise<AdminProfile> => {
    const response = await apiClient.get<AdminProfile>('/auth/me');
    return response.data;
  },
};
