import apiClient from './client';

// Types for Admin Account Management
export interface AdminRole {
  id: string;
  name: string;
  displayName: string;
  level: number;
}

export interface AdminPermission {
  id: string;
  resource: string;
  action: string;
  displayName: string;
  description: string | null;
  category: string;
}

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  scope: 'SYSTEM' | 'TENANT';
  tenantId: string | null;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminAccountDetail extends AdminAccount {
  permissions: AdminPermission[];
  tenant?: AdminTenant;
}

export interface AdminListResponse {
  admins: AdminAccount[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminListQuery {
  scope?: 'SYSTEM' | 'TENANT';
  roleId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateAdminRequest {
  email: string;
  name: string;
  tempPassword: string;
  roleId: string;
  scope?: 'SYSTEM' | 'TENANT';
  tenantId?: string;
}

export interface UpdateAdminRequest {
  name?: string;
  isActive?: boolean;
}

export interface InviteAdminRequest {
  email: string;
  name: string;
  roleId: string;
  type: 'EMAIL' | 'DIRECT';
  tempPassword?: string;
}

export interface InvitationResponse {
  id: string;
  email: string;
  name: string;
  type: 'EMAIL' | 'DIRECT';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
}

export const adminAccountsApi = {
  list: async (query?: AdminListQuery): Promise<AdminListResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.scope) params.append('scope', query.scope);
    if (query?.roleId) params.append('roleId', query.roleId);
    if (query?.isActive !== undefined) params.append('isActive', query.isActive.toString());
    if (query?.search) params.append('search', query.search);

    const response = await apiClient.get<AdminListResponse>(`/admins?${params}`);
    return response.data;
  },

  getById: async (id: string): Promise<AdminAccountDetail> => {
    const response = await apiClient.get<AdminAccountDetail>(`/admins/${id}`);
    return response.data;
  },

  create: async (data: CreateAdminRequest): Promise<AdminAccount> => {
    const response = await apiClient.post<AdminAccount>('/admins', data);
    return response.data;
  },

  update: async (id: string, data: UpdateAdminRequest): Promise<AdminAccount> => {
    const response = await apiClient.patch<AdminAccount>(`/admins/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/admins/${id}`);
  },

  reactivate: async (id: string): Promise<AdminAccount> => {
    const response = await apiClient.post<AdminAccount>(`/admins/${id}/reactivate`);
    return response.data;
  },

  assignRole: async (id: string, roleId: string): Promise<AdminAccount> => {
    const response = await apiClient.patch<AdminAccount>(`/admins/${id}/role`, { roleId });
    return response.data;
  },

  invite: async (data: InviteAdminRequest): Promise<InvitationResponse> => {
    const response = await apiClient.post<InvitationResponse>('/admins/invite', data);
    return response.data;
  },
};
