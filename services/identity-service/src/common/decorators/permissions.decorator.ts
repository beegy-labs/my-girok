import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { PermissionGuard, PERMISSIONS_KEY, REQUIRE_ANY_KEY } from '../guards/permission.guard';

/**
 * Permissions Decorator
 * Requires the user to have ALL specified permissions (AND logic)
 *
 * Usage:
 * @Permissions('accounts:read', 'accounts:write')
 * async updateAccount() { ... }
 *
 * Permission format: "resource:action" or "resource:action:scope"
 * Examples:
 * - "accounts:read" - Read accounts
 * - "accounts:write" - Write accounts
 * - "accounts:delete:own" - Delete own account only
 * - "sessions:*" - All session operations
 */
export function Permissions(...permissions: string[]) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(REQUIRE_ANY_KEY, false),
    UseGuards(PermissionGuard),
    ApiForbiddenResponse({ description: 'Insufficient permissions' }),
  );
}

/**
 * RequireAnyPermission Decorator
 * Requires the user to have AT LEAST ONE of the specified permissions (OR logic)
 *
 * Usage:
 * @RequireAnyPermission('admin:access', 'accounts:manage')
 * async adminOrManager() { ... }
 */
export function RequireAnyPermission(...permissions: string[]) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(REQUIRE_ANY_KEY, true),
    UseGuards(PermissionGuard),
    ApiForbiddenResponse({ description: 'Insufficient permissions' }),
  );
}

/**
 * RequireAdmin Decorator
 * Shorthand for requiring admin access
 */
export function RequireAdmin() {
  return Permissions('admin:access');
}

/**
 * RequireSystemAdmin Decorator
 * Shorthand for requiring system-level admin access
 */
export function RequireSystemAdmin() {
  return Permissions('system:admin');
}

/**
 * Resource-specific permission decorators
 */

// Account permissions
export const CanReadAccounts = () => Permissions('accounts:read');
export const CanWriteAccounts = () => Permissions('accounts:write');
export const CanDeleteAccounts = () => Permissions('accounts:delete');
export const CanManageAccounts = () =>
  Permissions('accounts:read', 'accounts:write', 'accounts:delete');

// Session permissions
export const CanReadSessions = () => Permissions('sessions:read');
export const CanRevokeSessions = () => Permissions('sessions:revoke');
export const CanManageSessions = () => Permissions('sessions:read', 'sessions:revoke');

// Device permissions
export const CanReadDevices = () => Permissions('devices:read');
export const CanManageDevices = () =>
  Permissions('devices:read', 'devices:write', 'devices:delete');

// Operator permissions
export const CanReadOperators = () => Permissions('operators:read');
export const CanWriteOperators = () => Permissions('operators:write');
export const CanManageOperators = () =>
  Permissions('operators:read', 'operators:write', 'operators:delete');

// Role permissions
export const CanReadRoles = () => Permissions('roles:read');
export const CanWriteRoles = () => Permissions('roles:write');
export const CanManageRoles = () => Permissions('roles:read', 'roles:write', 'roles:delete');

// Sanction permissions
export const CanReadSanctions = () => Permissions('sanctions:read');
export const CanCreateSanctions = () => Permissions('sanctions:create');
export const CanManageSanctions = () =>
  Permissions('sanctions:read', 'sanctions:create', 'sanctions:revoke');
