import apiClient from './client';
import type {
  AuditLogListQuery,
  AuditLogListResponse,
  AuditLogFilterOptions,
  AuditStatsQuery,
  AuditStatsResponse,
} from '@my-girok/types';

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
