import apiClient from './client';
import type {
  AuditLogListQuery,
  AuditLogListResponse,
  AuditLogFilterOptions,
  AuditStatsQuery,
  AuditStatsResponse,
} from '@my-girok/types';

// Login History types (from auth-bff)
export interface LoginHistoryQuery {
  accountId?: string;
  accountType?: 'USER' | 'OPERATOR' | 'ADMIN';
  eventType?: string;
  result?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface LoginHistoryEvent {
  id: string;
  eventType: string;
  accountType: string;
  accountId: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  countryCode?: string;
  result: string;
  failureReason?: string;
  metadata?: Record<string, string>;
  timestamp: string;
}

export interface LoginHistoryResponse {
  data: LoginHistoryEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditApi = {
  /**
   * List audit logs with filters and pagination
   * Uses backend parameter names: actorId, startDate, endDate
   */
  listLogs: async (query?: AuditLogListQuery): Promise<AuditLogListResponse> => {
    const params = new URLSearchParams();
    if (query?.actorType) params.append('actorType', query.actorType);
    if (query?.actorId) params.append('actorId', query.actorId);
    if (query?.serviceSlug) params.append('serviceSlug', query.serviceSlug);
    if (query?.resource) params.append('resource', query.resource);
    if (query?.action) params.append('action', query.action);
    if (query?.targetId) params.append('targetId', query.targetId);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await apiClient.get<AuditLogListResponse>(`/audit/logs?${params}`);
    return response.data;
  },

  /**
   * Get audit statistics
   */
  getStats: async (query?: AuditStatsQuery): Promise<AuditStatsResponse> => {
    const params = new URLSearchParams();
    if (query?.serviceSlug) params.append('serviceSlug', query.serviceSlug);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.groupBy) params.append('groupBy', query.groupBy);

    const response = await apiClient.get<AuditStatsResponse>(`/audit/logs/stats?${params}`);
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
    if (query?.actorType) params.append('actorType', query.actorType);
    if (query?.actorId) params.append('actorId', query.actorId);
    if (query?.serviceSlug) params.append('serviceSlug', query.serviceSlug);
    if (query?.resource) params.append('resource', query.resource);
    if (query?.action) params.append('action', query.action);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);

    const response = await apiClient.get(`/audit/logs/export?${params}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get login history from audit-service via auth-bff gRPC
   */
  getLoginHistory: async (query?: LoginHistoryQuery): Promise<LoginHistoryResponse> => {
    const params = new URLSearchParams();
    if (query?.accountId) params.append('accountId', query.accountId);
    if (query?.accountType) params.append('accountType', query.accountType);
    if (query?.eventType) params.append('eventType', query.eventType);
    if (query?.result) params.append('result', query.result);
    if (query?.ipAddress) params.append('ipAddress', query.ipAddress);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await apiClient.get<LoginHistoryResponse>(`/admin/login-history?${params}`);
    return response.data;
  },
};

// Re-export types for convenience
export type {
  ActorType,
  AuditLog,
  AuditLogAdmin,
  AuditLogResponse,
  AuditLogListQuery,
  AuditLogListResponse,
  AuditLogFilterOptions,
  AuditStatsQuery,
  AuditStatsResponse,
} from '@my-girok/types';
