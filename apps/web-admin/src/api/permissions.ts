import apiClient from './client';

// ==========================================
// Types
// ==========================================

export interface PermissionTuple {
  user: string;
  relation: string;
  object: string;
  createdAt?: string;
  inheritedFrom?: string;
}

export interface AdminPermissionsResponse {
  adminId: string;
  directPermissions: PermissionTuple[];
  inheritedPermissions: PermissionTuple[];
}

export interface TeamPermissionsResponse {
  teamId: string;
  permissions: PermissionTuple[];
}

export interface MenuPermissionItem {
  menuId: string;
  allowedUsers: string[];
}

export interface MenuPermissionsResponse {
  menuPermissions: MenuPermissionItem[];
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: Array<{
    relation: string;
    objectType: string;
    objectScope: 'all' | 'scoped';
  }>;
}

export interface GrantPermissionRequest {
  relation: string;
  object: string;
}

export interface GrantMenuAccessRequest {
  type: 'admin' | 'team' | 'department' | 'role';
  id: string;
}

export interface CheckPermissionRequest {
  user: string;
  relation: string;
  object: string;
}

export interface CheckPermissionResponse {
  allowed: boolean;
  user: string;
  relation: string;
  object: string;
}

export interface ApplyTemplateRequest {
  targetUser: string;
  scope?: {
    services?: string[];
    countries?: string[];
  };
}

// ==========================================
// API Client
// ==========================================

export const permissionsApi = {
  // ==========================================
  // Admin Permissions
  // ==========================================

  getAdminPermissions: async (adminId: string): Promise<AdminPermissionsResponse> => {
    const response = await apiClient.get<AdminPermissionsResponse>(
      `/admin/permissions/admin/${adminId}`,
    );
    return response.data;
  },

  grantToAdmin: async (adminId: string, data: GrantPermissionRequest): Promise<void> => {
    await apiClient.post(`/admin/permissions/admin/${adminId}/grant`, data);
  },

  revokeFromAdmin: async (adminId: string, data: GrantPermissionRequest): Promise<void> => {
    await apiClient.delete(`/admin/permissions/admin/${adminId}/revoke`, { data });
  },

  // ==========================================
  // Team Permissions
  // ==========================================

  getTeamPermissions: async (teamId: string): Promise<TeamPermissionsResponse> => {
    const response = await apiClient.get<TeamPermissionsResponse>(
      `/admin/permissions/team/${teamId}`,
    );
    return response.data;
  },

  grantToTeam: async (teamId: string, data: GrantPermissionRequest): Promise<void> => {
    await apiClient.post(`/admin/permissions/team/${teamId}/grant`, data);
  },

  revokeFromTeam: async (teamId: string, data: GrantPermissionRequest): Promise<void> => {
    await apiClient.delete(`/admin/permissions/team/${teamId}/revoke`, { data });
  },

  // ==========================================
  // Department Permissions
  // ==========================================

  grantToDepartment: async (deptId: string, data: GrantPermissionRequest): Promise<void> => {
    await apiClient.post(`/admin/permissions/department/${deptId}/grant`, data);
  },

  revokeFromDepartment: async (deptId: string, data: GrantPermissionRequest): Promise<void> => {
    await apiClient.delete(`/admin/permissions/department/${deptId}/revoke`, { data });
  },

  // ==========================================
  // Menu Permissions
  // ==========================================

  getMenuPermissions: async (): Promise<MenuPermissionsResponse> => {
    const response = await apiClient.get<MenuPermissionsResponse>('/admin/permissions/menu');
    return response.data;
  },

  grantMenuAccess: async (menuId: string, data: GrantMenuAccessRequest): Promise<void> => {
    await apiClient.post(`/admin/permissions/menu/${menuId}/grant`, data);
  },

  // ==========================================
  // Permission Check
  // ==========================================

  checkPermission: async (data: CheckPermissionRequest): Promise<CheckPermissionResponse> => {
    const response = await apiClient.post<CheckPermissionResponse>(
      '/admin/permissions/check',
      data,
    );
    return response.data;
  },

  batchCheckPermissions: async (
    checks: CheckPermissionRequest[],
  ): Promise<Array<CheckPermissionResponse & { allowed: boolean }>> => {
    const response = await apiClient.post<{ results: Array<CheckPermissionResponse> }>(
      '/admin/permissions/check/batch',
      { checks },
    );
    return response.data.results;
  },

  // ==========================================
  // Templates
  // ==========================================

  listTemplates: async (): Promise<PermissionTemplate[]> => {
    const response = await apiClient.get<{ templates: PermissionTemplate[] }>(
      '/admin/permissions/templates',
    );
    return response.data.templates;
  },

  applyTemplate: async (templateId: string, data: ApplyTemplateRequest): Promise<void> => {
    await apiClient.post(`/admin/permissions/templates/${templateId}/apply`, data);
  },
};
