/**
 * Admin Account Management Types
 * SSOT for admin account management across frontend and backend
 */

// Re-export existing types to avoid duplication
export type { AdminRole, AdminPermission } from './admin-auth.types.js';
export type { InvitationType, InvitationStatus } from './operator.types.js';

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  type: string;
}

// Admin Account
export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  scope: 'SYSTEM' | 'TENANT';
  tenantId: string | null;
  role: {
    id: string;
    name: string;
    displayName: string;
    level: number;
  };
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminAccountDetail extends Omit<AdminAccount, 'role'> {
  role: {
    id: string;
    name: string;
    displayName: string;
    level: number;
  };
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
    displayName: string;
    description: string | null;
    category: string;
  }>;
  tenant?: AdminTenant;
}

// Request Types
export interface CreateAdminRequest {
  email: string;
  name: string;
  tempPassword: string;
  roleId: string;
  scope?: 'SYSTEM' | 'TENANT';
  tenantId?: string;
}

export interface UpdateAdminRequest {
  name?: string;
  isActive?: boolean;
}

export interface InviteAdminRequest {
  email: string;
  name: string;
  roleId: string;
  type: 'EMAIL' | 'DIRECT';
  tempPassword?: string;
}

export interface AssignRoleRequest {
  roleId: string;
}

// Response Types
export interface AdminListResponse {
  admins: AdminAccount[];
  total: number;
  page: number;
  limit: number;
}

export interface InvitationResponse {
  id: string;
  email: string;
  name: string;
  type: 'EMAIL' | 'DIRECT';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
}

// Query Types
export interface AdminListQuery {
  scope?: 'SYSTEM' | 'TENANT';
  roleId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// Role Management (simplified for dropdown use)
export interface AdminRoleListResponse {
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
    level: number;
    scope: 'SYSTEM' | 'TENANT';
  }>;
  total: number;
}

export interface AdminRoleListQuery {
  scope?: 'SYSTEM' | 'TENANT';
}
