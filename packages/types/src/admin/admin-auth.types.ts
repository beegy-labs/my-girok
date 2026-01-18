/**
 * Admin Authentication & Authorization Types
 * Re-exports from auth/jwt.types and tenant.types for convenience
 */

import type { TenantType } from './tenant.types.js';

// Re-export JWT payload types (primary source of truth for JWT structure)
export type {
  AdminJwtPayload,
  AdminServicePayload,
  AdminScope,
  AccountMode,
} from '../auth/jwt.types.js';

// Re-export tenant-related types
export type { Tenant, TenantType, TenantStatus } from './tenant.types.js';

// Alias AdminPayload to AdminJwtPayload for backward compatibility
export type { AdminJwtPayload as AdminPayload } from '../auth/jwt.types.js';

/**
 * Admin link type for account linking
 */
export type AdminLinkType = 'OPERATOR' | 'MODERATOR' | 'SUPPORT' | 'IMPERSONATE';

/**
 * Role entity (RBAC)
 */
export interface AdminRole {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  scope: 'SYSTEM' | 'TENANT';
  tenantType: TenantType | null;
  level: number;
  parentId: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission entity (RBAC)
 */
export interface AdminPermission {
  id: string;
  resource: string;
  action: string;
  scope: 'SYSTEM' | 'TENANT' | null;
  displayName: string;
  description: string | null;
  category: string;
  tenantType: TenantType | null;
}
