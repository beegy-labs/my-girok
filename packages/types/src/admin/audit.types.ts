// packages/types/src/admin/audit.types.ts

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
  | 'SESSION';

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
 * Audit log entry
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
 * Query parameters for audit logs
 */
export interface AuditLogListQuery {
  action?: string;
  resource?: string;
  adminId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated response
 */
export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Filter options for UI dropdowns
 */
export interface AuditLogFilterOptions {
  actions: string[];
  resources: string[];
  admins: AuditLogAdmin[];
}
