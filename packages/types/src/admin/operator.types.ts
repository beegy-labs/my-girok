/**
 * Operator Types
 * Operator system created by Admin
 */

export enum InvitationType {
  EMAIL = 'EMAIL',
  DIRECT = 'DIRECT',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Operator row type (from database query)
 * Used in operator.service.ts for raw SQL results
 */
export interface OperatorRow {
  id: string;
  email: string;
  name: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  countryCode: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/**
 * Permission row type (from database query)
 */
export interface PermissionRow {
  operatorId: string;
  id: string;
  resource: string;
  action: string;
  displayName: string;
}

export interface Operator {
  id: string;
  email: string;
  name: string;
  adminId: string;
  serviceId: string;
  countryCode: string;
  isActive: boolean;
  invitationId?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatorInvitation {
  id: string;
  adminId: string;
  serviceId: string;
  countryCode: string;
  email: string;
  name: string;
  type: InvitationType;
  status: InvitationStatus;
  token?: string;
  permissions: string[];
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface OperatorPermission {
  id: string;
  operatorId: string;
  permissionId: string;
  grantedBy: string;
  grantedAt: Date;
}

export interface OperatorSession {
  id: string;
  operatorId: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateOperatorInvitationDto {
  serviceId: string;
  countryCode: string;
  email: string;
  name: string;
  type: InvitationType;
  permissions: string[];
}

export interface AcceptInvitationDto {
  token: string;
  password: string;
}

export interface CreateOperatorDirectDto {
  serviceId: string;
  countryCode: string;
  email: string;
  name: string;
  password: string;
  permissions: string[];
}

export interface UpdateOperatorDto {
  name?: string;
  isActive?: boolean;
}

export interface GrantPermissionDto {
  operatorId: string;
  permissionIds: string[];
}

export interface RevokePermissionDto {
  operatorId: string;
  permissionIds: string[];
}
