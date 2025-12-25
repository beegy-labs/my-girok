// packages/types/src/admin/tenant.types.ts

/**
 * Tenant status enum
 */
export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

/**
 * Tenant type enum
 */
export type TenantType = 'INTERNAL' | 'COMMERCE' | 'ADBID' | 'POSTBACK' | 'AGENCY';

/**
 * Tenant entity
 */
export interface Tenant {
  id: string;
  name: string;
  type: TenantType;
  slug: string;
  status: TenantStatus;
  settings: Record<string, unknown> | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  adminCount: number;
}

/**
 * List query parameters
 */
export interface TenantListQuery {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
}

/**
 * Paginated list response
 */
export interface TenantListResponse {
  items: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create tenant DTO
 */
export interface CreateTenantDto {
  name: string;
  type?: TenantType;
  slug: string;
  settings?: Record<string, unknown>;
}

/**
 * Update tenant DTO
 */
export interface UpdateTenantDto {
  name?: string;
  settings?: Record<string, unknown>;
}

/**
 * Update status DTO
 */
export interface UpdateTenantStatusDto {
  status: TenantStatus;
  reason?: string;
}
