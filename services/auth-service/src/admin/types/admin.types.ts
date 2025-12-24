/**
 * Admin Types for H-RBAC System
 */

export type AdminScope = 'SYSTEM' | 'TENANT';
export type TenantType = 'INTERNAL' | 'COMMERCE' | 'ADBID' | 'POSTBACK' | 'AGENCY';
export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type AdminLinkType = 'OPERATOR' | 'MODERATOR' | 'SUPPORT' | 'IMPERSONATE';

/**
 * Admin JWT Payload - stored in token and attached to request
 */
export interface AdminPayload {
  sub: string; // Admin ID
  email: string;
  name: string;
  type: 'ADMIN_ACCESS';
  scope: AdminScope;
  tenantId: string | null;
  tenantSlug?: string;
  tenantType?: TenantType;
  roleId: string;
  roleName: string;
  level: number;
  permissions: string[]; // Cached permission keys
}

/**
 * Admin entity (from database)
 */
export interface Admin {
  id: string;
  email: string;
  password: string;
  name: string;
  scope: AdminScope;
  tenantId: string | null;
  parentId: string | null;
  roleId: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant entity (from database)
 */
export interface Tenant {
  id: string;
  name: string;
  type: TenantType;
  slug: string;
  status: TenantStatus;
  settings: Record<string, unknown> | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role entity (from database)
 */
export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  scope: AdminScope;
  tenantType: TenantType | null;
  level: number;
  parentId: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission entity (from database)
 */
export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope: AdminScope | null;
  displayName: string;
  description: string | null;
  category: string;
  tenantType: TenantType | null;
}

/**
 * Admin with relations (for service methods)
 * Includes flat properties from SQL JOIN queries
 */
export interface AdminWithRelations extends Admin {
  // Flattened tenant properties (from SQL JOIN)
  tenantSlug?: string;
  tenantType?: TenantType;
  tenantStatus?: TenantStatus;

  // Flattened role properties (from SQL JOIN)
  roleName?: string;
  roleDisplayName?: string;
  roleLevel?: number;

  // Nested relations (for Prisma queries)
  tenant?: Tenant;
  role?: Role & {
    permissions: Array<{
      permission: Permission;
    }>;
  };
}

/**
 * Request with admin attached
 */
export interface AdminRequest extends Request {
  admin: AdminPayload;
}
