// packages/types/src/admin/audit.types.ts

/**
 * Actor types for audit logs
 */
export type ActorType = 'USER' | 'ADMIN' | 'OPERATOR' | 'SYSTEM';

/**
 * Audit log action types
 */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

/**
 * Audit log resource types
 */
export type AuditResource =
  | 'LEGAL_DOCUMENT'
  | 'TENANT'
  | 'ADMIN'
  | 'ROLE'
  | 'PERMISSION'
  | 'SESSION'
  | 'SERVICE_CONFIG'
  | 'SERVICE_FEATURE'
  | 'TESTER_USER'
  | 'TESTER_ADMIN'
  | 'SANCTION';

/**
 * Audit log admin info
 */
export interface AuditLogAdmin {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
}

/**
 * Audit log entry (legacy format for backward compatibility)
 */
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

/**
 * Audit log response (matches backend AuditLogResponse)
 */
export interface AuditLogResponse {
  id: string;
  timestamp: string;
  actorType: string;
  actorId: string;
  actorEmail: string;
  serviceSlug: string | null;
  resource: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  success: boolean;
  errorMessage: string | null;
  durationMs: number;
}

/**
 * Query parameters for audit logs (matches backend AuditLogQueryDto)
 */
export interface AuditLogListQuery {
  actorType?: ActorType;
  actorId?: string;
  serviceSlug?: string;
  resource?: string;
  action?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated audit log response (matches backend PaginatedAuditLogResponse)
 */
export interface AuditLogListResponse {
  data: AuditLogResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Audit stats query parameters
 */
export interface AuditStatsQuery {
  serviceSlug?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

/**
 * Audit stats response
 */
export interface AuditStatsResponse {
  totalActions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  byActor: Array<{
    actorType: string;
    actorId: string;
    count: number;
  }>;
  byResource: Array<{
    resource: string;
    action: string;
    count: number;
  }>;
  byService: Array<{
    serviceSlug: string;
    count: number;
  }>;
  timeline: Array<{
    date: string;
    count: number;
    successCount: number;
    failureCount: number;
  }>;
}

/**
 * Filter options for UI dropdowns
 */
export interface AuditLogFilterOptions {
  actions: string[];
  resources: string[];
  admins: AuditLogAdmin[];
}
