/**
 * Identity Platform - Auth Types
 * Role, Permission types for authorization
 */

// ============================================================================
// Role Types
// ============================================================================

/**
 * Role scope enumeration
 */
export type RoleScope = 'PLATFORM' | 'SERVICE' | 'TENANT';

/**
 * Role status enumeration
 */
export type RoleStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';

/**
 * Role entity
 * Represents a role in the authorization system
 */
export interface RoleEntity {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  scope: RoleScope;
  serviceId: string | null;
  tenantId: string | null;
  status: RoleStatus;
  isSystem: boolean;
  priority: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role summary for listing
 */
export interface RoleSummary {
  id: string;
  name: string;
  displayName: string;
  scope: RoleScope;
  status: RoleStatus;
  isSystem: boolean;
}

/**
 * Create role DTO
 */
export interface CreateRoleDto {
  name: string;
  displayName: string;
  description?: string;
  scope: RoleScope;
  serviceId?: string;
  tenantId?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Update role DTO
 */
export interface UpdateRoleDto {
  displayName?: string;
  description?: string;
  status?: RoleStatus;
  priority?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Permission action enumeration
 */
export type PermissionAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LIST'
  | 'MANAGE'
  | 'EXECUTE'
  | 'APPROVE'
  | 'REJECT';

/**
 * Permission entity
 * Represents a permission in the authorization system
 */
export interface Permission {
  id: string;
  resource: string;
  action: PermissionAction;
  displayName: string;
  description: string | null;
  scope: RoleScope;
  serviceId: string | null;
  isSystem: boolean;
  conditions: PermissionCondition[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission condition for fine-grained access control
 */
export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: unknown;
}

/**
 * Permission summary for listing
 */
export interface PermissionSummary {
  id: string;
  resource: string;
  action: PermissionAction;
  displayName: string;
  scope: RoleScope;
}

/**
 * Create permission DTO
 */
export interface CreatePermissionDto {
  resource: string;
  action: PermissionAction;
  displayName: string;
  description?: string;
  scope: RoleScope;
  serviceId?: string;
  conditions?: PermissionCondition[];
}

/**
 * Update permission DTO
 */
export interface UpdatePermissionDto {
  displayName?: string;
  description?: string;
  conditions?: PermissionCondition[];
}

// ============================================================================
// Role-Permission Assignment Types
// ============================================================================

/**
 * Role permission assignment
 */
export interface RolePermission {
  roleId: string;
  permissionId: string;
  grantedBy: string;
  grantedAt: Date;
}

/**
 * Assign permissions to role DTO
 */
export interface AssignPermissionsDto {
  permissionIds: string[];
}

/**
 * Revoke permissions from role DTO
 */
export interface RevokePermissionsDto {
  permissionIds: string[];
}

// ============================================================================
// Account Role Assignment Types
// ============================================================================

/**
 * Account role assignment
 */
export interface AccountRole {
  accountId: string;
  roleId: string;
  serviceId: string | null;
  tenantId: string | null;
  grantedBy: string;
  grantedAt: Date;
  expiresAt: Date | null;
}

/**
 * Assign role to account DTO
 */
export interface AssignRoleDto {
  roleId: string;
  serviceId?: string;
  tenantId?: string;
  expiresAt?: Date;
}

/**
 * Revoke role from account DTO
 */
export interface RevokeRoleDto {
  roleId: string;
  serviceId?: string;
  tenantId?: string;
}

// ============================================================================
// Permission Check Types
// ============================================================================

/**
 * Permission check request
 */
export interface CheckPermissionDto {
  accountId: string;
  resource: string;
  action: PermissionAction;
  serviceId?: string;
  tenantId?: string;
  context?: Record<string, unknown>;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  matchedRoles: string[];
  matchedPermissions: string[];
  deniedReason?: string;
}

/**
 * Bulk permission check request
 */
export interface BulkCheckPermissionDto {
  accountId: string;
  checks: Array<{
    resource: string;
    action: PermissionAction;
  }>;
  serviceId?: string;
  tenantId?: string;
}

/**
 * Bulk permission check result
 */
export interface BulkPermissionCheckResult {
  results: Array<{
    resource: string;
    action: PermissionAction;
    allowed: boolean;
  }>;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Role query parameters
 */
export interface RoleQueryDto {
  scope?: RoleScope;
  status?: RoleStatus;
  serviceId?: string;
  isSystem?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * Permission query parameters
 */
export interface PermissionQueryDto {
  resource?: string;
  action?: PermissionAction;
  scope?: RoleScope;
  serviceId?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Role list response
 */
export interface RoleListResponse {
  data: RoleSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Permission list response
 */
export interface PermissionListResponse {
  data: PermissionSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Account roles response
 */
export interface AccountRolesResponse {
  accountId: string;
  roles: Array<{
    role: RoleSummary;
    serviceId: string | null;
    tenantId: string | null;
    grantedAt: Date;
    expiresAt: Date | null;
  }>;
}

/**
 * Account permissions response
 */
export interface AccountPermissionsResponse {
  accountId: string;
  permissions: PermissionSummary[];
}
