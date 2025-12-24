import apiClient from './client';

export interface Tenant {
  id: string;
  name: string;
  type: 'INTERNAL' | 'COMMERCE' | 'ADBID' | 'POSTBACK' | 'AGENCY';
  slug: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  settings: Record<string, unknown> | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  adminCount: number;
}

export interface TenantListQuery {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
}

export interface TenantListResponse {
  items: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateTenantRequest {
  name: string;
  type?: Tenant['type'];
  slug: string;
  settings?: Record<string, unknown>;
}

export interface UpdateTenantRequest {
  name?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateStatusRequest {
  status: Tenant['status'];
  reason?: string;
}

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

  create: async (data: CreateTenantRequest): Promise<Tenant> => {
    const response = await apiClient.post<Tenant>('/tenants', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTenantRequest): Promise<Tenant> => {
    const response = await apiClient.put<Tenant>(`/tenants/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, data: UpdateStatusRequest): Promise<Tenant> => {
    const response = await apiClient.patch<Tenant>(`/tenants/${id}/status`, data);
    return response.data;
  },

  getMyTenant: async (): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>('/tenants/me');
    return response.data;
  },
};
