/**
 * Admin Account Management Enums
 * Centralized permission strings to prevent typos and ensure consistency
 */

/**
 * System Admin permissions for admin account management
 * These strings must match the permission definitions in the database
 */
export enum SystemAdminPermission {
  Read = 'system_admin:read',
  Create = 'system_admin:create',
  Update = 'system_admin:update',
  Delete = 'system_admin:delete',
}

// Re-export existing enums to avoid duplication
export { InvitationType, InvitationStatus } from './operator.types.js';
