import apiClient from './client';
import type {
  Tenant,
  TenantListQuery,
  TenantListResponse,
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantStatusDto,
} from '@my-girok/types';

export const tenantApi = {
  list: async (query?: TenantListQuery): Promise<TenantListResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.type) params.append('type', query.type);
    if (query?.status) params.append('status', query.status);
    if (query?.search) params.append('search', query.search);

    const response = await apiClient.get<TenantListResponse>(`/tenants?${params}`);
    return response.data;
  },

  get: async (id: string): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>(`/tenants/${id}`);
    return response.data;
  },

  create: async (data: CreateTenantDto): Promise<Tenant> => {
    const response = await apiClient.post<Tenant>('/tenants', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTenantDto): Promise<Tenant> => {
    const response = await apiClient.put<Tenant>(`/tenants/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, data: UpdateTenantStatusDto): Promise<Tenant> => {
    const response = await apiClient.patch<Tenant>(`/tenants/${id}/status`, data);
    return response.data;
  },

  getMyTenant: async (): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>('/tenants/me');
    return response.data;
  },
};

// Re-export types for convenience
export type {
  Tenant,
  TenantListQuery,
  TenantListResponse,
  CreateTenantDto as CreateTenantRequest,
  UpdateTenantDto as UpdateTenantRequest,
  UpdateTenantStatusDto as UpdateStatusRequest,
} from '@my-girok/types';
