import type {
  AdminAccount,
  AdminAccountDetail,
  AdminListResponse,
  AdminListQuery,
  AdminRoleListResponse,
  AdminRoleListQuery,
  CreateAdminRequest,
  UpdateAdminRequest,
  InviteAdminRequest,
  InvitationResponse,
} from '@my-girok/types';
import apiClient from './client';

export const adminAccountsApi = {
  list: async (query?: AdminListQuery): Promise<AdminListResponse> => {
    const response = await apiClient.get<AdminListResponse>('/admins', { params: query });
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

  getRoles: async (query?: AdminRoleListQuery): Promise<AdminRoleListResponse> => {
    const response = await apiClient.get<AdminRoleListResponse>('/admins/roles', { params: query });
    return response.data;
  },
};
