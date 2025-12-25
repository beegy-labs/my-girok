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
