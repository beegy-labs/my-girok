/**
 * JWT Token Types for Global Multi-Service Support
 * Issue: #357
 */

// Account mode types
export type AccountMode = 'SERVICE' | 'UNIFIED';

// User service status in JWT
export type UserServiceStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

// Admin scope types
export type AdminScope = 'SYSTEM' | 'TENANT';

// ============================================
// Base JWT Payload
// ============================================

interface BaseJwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

// ============================================
// User JWT Payload
// ============================================

export interface UserServicePayload {
  status: UserServiceStatus;
  countries: string[];
}

export interface UserJwtPayload extends BaseJwtPayload {
  type: 'USER_ACCESS';
  accountMode: AccountMode;
  countryCode: string;
  services: Record<string, UserServicePayload>;
}

// ============================================
// Admin JWT Payload
// ============================================

export interface AdminServicePayload {
  roleId: string;
  roleName: string;
  countries: string[];
  permissions: string[];
}

export interface AdminJwtPayload extends BaseJwtPayload {
  name: string;
  type: 'ADMIN_ACCESS';
  accountMode: AccountMode;
  scope: AdminScope;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantType: string | null;
  roleId: string;
  roleName: string;
  level: number;
  permissions: string[];
  services: Record<string, AdminServicePayload>;
}

// ============================================
// Operator JWT Payload
// ============================================

export interface OperatorJwtPayload extends BaseJwtPayload {
  name: string;
  type: 'OPERATOR_ACCESS';
  adminId: string;
  serviceId: string;
  serviceSlug: string;
  countryCode: string;
  permissions: string[];
}

// ============================================
// Legacy JWT Payload (backward compatibility)
// ============================================

export interface LegacyUserJwtPayload extends BaseJwtPayload {
  role: string;
  type: 'ACCESS' | 'REFRESH' | 'DOMAIN_ACCESS';
  domain?: string;
}

// ============================================
// Union Types
// ============================================

export type JwtPayloadType = 'USER_ACCESS' | 'ADMIN_ACCESS' | 'OPERATOR_ACCESS';

export type JwtPayloadUnion =
  | UserJwtPayload
  | AdminJwtPayload
  | OperatorJwtPayload
  | LegacyUserJwtPayload;

// ============================================
// Authenticated Entity Types (for request.user)
// ============================================

export interface AuthenticatedUser {
  type: 'USER';
  id: string;
  email: string;
  name: string;
  accountMode: AccountMode;
  countryCode: string;
  services: Record<string, UserServicePayload>;
}

export interface AuthenticatedAdmin {
  type: 'ADMIN';
  id: string;
  email: string;
  name: string;
  scope: AdminScope;
  tenantId: string | null;
  roleId: string;
  roleName: string;
  level: number;
  permissions: string[];
  services: Record<string, AdminServicePayload>;
}

export interface AuthenticatedOperator {
  type: 'OPERATOR';
  id: string;
  email: string;
  name: string;
  adminId: string;
  serviceId: string;
  serviceSlug: string;
  countryCode: string;
  permissions: string[];
}

export type AuthenticatedEntity = AuthenticatedUser | AuthenticatedAdmin | AuthenticatedOperator;

// ============================================
// Type Guards
// ============================================

export function isUserPayload(payload: JwtPayloadUnion): payload is UserJwtPayload {
  return (payload as UserJwtPayload).type === 'USER_ACCESS';
}

export function isAdminPayload(payload: JwtPayloadUnion): payload is AdminJwtPayload {
  return (payload as AdminJwtPayload).type === 'ADMIN_ACCESS';
}

export function isOperatorPayload(payload: JwtPayloadUnion): payload is OperatorJwtPayload {
  return (payload as OperatorJwtPayload).type === 'OPERATOR_ACCESS';
}

export function isLegacyPayload(payload: JwtPayloadUnion): payload is LegacyUserJwtPayload {
  const legacyTypes = ['ACCESS', 'REFRESH', 'DOMAIN_ACCESS'];
  return legacyTypes.includes((payload as LegacyUserJwtPayload).type);
}

// Entity type guards
export function isAuthenticatedUser(entity: AuthenticatedEntity): entity is AuthenticatedUser {
  return entity.type === 'USER';
}

export function isAuthenticatedAdmin(entity: AuthenticatedEntity): entity is AuthenticatedAdmin {
  return entity.type === 'ADMIN';
}

export function isAuthenticatedOperator(
  entity: AuthenticatedEntity,
): entity is AuthenticatedOperator {
  return entity.type === 'OPERATOR';
}

// ============================================
// Permission & Access Helpers
// ============================================

/**
 * Check if authenticated entity has a specific permission
 * @param entity - Authenticated user, admin, or operator
 * @param permission - Permission string (e.g., 'legal:read', 'user:create')
 * @returns boolean - true if entity has the permission
 */
export function hasPermission(entity: AuthenticatedEntity, permission: string): boolean {
  if (entity.type === 'ADMIN') {
    // Wildcard permission check
    if (entity.permissions.includes('*')) return true;
    // Exact match
    if (entity.permissions.includes(permission)) return true;
    // Resource wildcard (e.g., 'legal:*' matches 'legal:read')
    const [resource] = permission.split(':');
    return entity.permissions.includes(`${resource}:*`);
  }

  if (entity.type === 'OPERATOR') {
    return entity.permissions.includes(permission);
  }

  // Users don't have permissions in the same sense
  return false;
}

/**
 * Check if authenticated entity has access to a specific service
 * @param entity - Authenticated user, admin, or operator
 * @param serviceSlug - Service slug (e.g., 'my-girok', 'personal')
 * @returns boolean - true if entity has access to the service
 */
export function hasServiceAccess(entity: AuthenticatedEntity, serviceSlug: string): boolean {
  if (entity.type === 'USER') {
    const service = entity.services[serviceSlug];
    return service?.status === 'ACTIVE';
  }

  if (entity.type === 'ADMIN') {
    // System scope admins have access to all services
    if (entity.scope === 'SYSTEM') return true;
    return !!entity.services[serviceSlug];
  }

  if (entity.type === 'OPERATOR') {
    return entity.serviceSlug === serviceSlug;
  }

  return false;
}

/**
 * Check if authenticated entity has access to a specific country within a service
 * @param entity - Authenticated user, admin, or operator
 * @param serviceSlug - Service slug
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns boolean - true if entity has access
 */
export function hasCountryAccess(
  entity: AuthenticatedEntity,
  serviceSlug: string,
  countryCode: string,
): boolean {
  if (entity.type === 'USER') {
    const service = entity.services[serviceSlug];
    if (!service || service.status !== 'ACTIVE') return false;
    return service.countries.includes(countryCode);
  }

  if (entity.type === 'ADMIN') {
    if (entity.scope === 'SYSTEM') return true;
    const service = entity.services[serviceSlug];
    if (!service) return false;
    return service.countries.includes(countryCode);
  }

  if (entity.type === 'OPERATOR') {
    return entity.serviceSlug === serviceSlug && entity.countryCode === countryCode;
  }

  return false;
}
