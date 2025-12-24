import apiClient from './client';

export interface AuditLogAdmin {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
}

export interface AuditLog {
  id: string;
  adminId: string;
  admin: AuditLogAdmin;
  action: string;
  resource: string;
  resourceId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListQuery {
  action?: string;
  resource?: string;
  adminId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogFilterOptions {
  actions: string[];
  resources: string[];
  admins: AuditLogAdmin[];
}

export const auditApi = {
  /**
   * List audit logs with filters and pagination
   */
  listLogs: async (query?: AuditLogListQuery): Promise<AuditLogListResponse> => {
    const params = new URLSearchParams();
    if (query?.action) params.append('action', query.action);
    if (query?.resource) params.append('resource', query.resource);
    if (query?.adminId) params.append('adminId', query.adminId);
    if (query?.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query?.dateTo) params.append('dateTo', query.dateTo);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await apiClient.get<AuditLogListResponse>(`/audit/logs?${params}`);
    return response.data;
  },

  /**
   * Get filter options for UI dropdowns
   */
  getFilterOptions: async (): Promise<AuditLogFilterOptions> => {
    const response = await apiClient.get<AuditLogFilterOptions>('/audit/filters');
    return response.data;
  },

  /**
   * Export audit logs as CSV blob
   */
  exportCsv: async (query?: AuditLogListQuery): Promise<Blob> => {
    const params = new URLSearchParams();
    if (query?.action) params.append('action', query.action);
    if (query?.resource) params.append('resource', query.resource);
    if (query?.adminId) params.append('adminId', query.adminId);
    if (query?.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query?.dateTo) params.append('dateTo', query.dateTo);

    const response = await apiClient.get(`/audit/logs/export?${params}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
