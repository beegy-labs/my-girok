/**
 * Role SSOT (Single Source of Truth)
 *
 * Used for:
 * 1. Database seeding
 * 2. Role assignment validation
 * 3. Admin UI role display
 */

export interface RoleDefinition {
  name: string;
  displayName: string;
  description?: string;
  scope: 'SYSTEM' | 'TENANT';
  tenantType?: string; // NULL = all tenant types
  level: number; // Higher = more privileged
  parentName?: string; // For role hierarchy
  permissions: string[]; // Permission keys or wildcards
  isSystem: boolean; // System-defined (cannot be deleted)
}

/**
 * SYSTEM scope roles - Platform administrators
 */
export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    name: 'system_super',
    displayName: 'System Super Admin',
    description: 'Full platform access with all permissions',
    scope: 'SYSTEM',
    level: 100,
    permissions: ['*'], // All permissions
    isSystem: true,
  },
  {
    name: 'system_admin',
    displayName: 'System Admin',
    description: 'Partner management, user management, content moderation',
    scope: 'SYSTEM',
    level: 80,
    parentName: 'system_super',
    permissions: [
      'tenant:read',
      'tenant:approve',
      'tenant:suspend',
      'user:read',
      'user:update',
      'user:suspend',
      'content:read',
      'content:delete',
      'content:hide',
      'legal:read',
      'legal:create',
      'legal:update',
      'analytics:read',
    ],
    isSystem: true,
  },
  {
    name: 'system_moderator',
    displayName: 'System Moderator',
    description: 'Content moderation only',
    scope: 'SYSTEM',
    level: 50,
    parentName: 'system_admin',
    permissions: ['content:read', 'content:delete', 'content:hide', 'user:read'],
    isSystem: true,
  },
];

/**
 * TENANT scope roles - Partner administrators
 */
export const TENANT_ROLES: RoleDefinition[] = [
  {
    name: 'partner_super',
    displayName: 'Partner Super Admin',
    description: 'Full access within partner company',
    scope: 'TENANT',
    level: 100,
    permissions: [
      'partner_admin:read',
      'partner_admin:create',
      'partner_admin:update',
      'partner_admin:delete',
      'legal:read',
      'analytics:read',
    ],
    isSystem: true,
  },
  {
    name: 'partner_admin',
    displayName: 'Partner Admin',
    description: 'Admin management within partner company',
    scope: 'TENANT',
    level: 80,
    parentName: 'partner_super',
    permissions: ['partner_admin:read', 'legal:read', 'analytics:read'],
    isSystem: true,
  },
  {
    name: 'partner_editor',
    displayName: 'Partner Editor',
    description: 'View-only access',
    scope: 'TENANT',
    level: 50,
    parentName: 'partner_admin',
    permissions: ['analytics:read'],
    isSystem: true,
  },
];

// Future: TenantType-specific roles
// export const COMMERCE_ROLES: RoleDefinition[] = [
//   {
//     name: 'commerce_manager',
//     displayName: 'Commerce Manager',
//     scope: 'TENANT',
//     tenantType: 'COMMERCE',
//     level: 70,
//     permissions: ['product:read', 'product:manage', 'order:read', 'order:manage'],
//     isSystem: true,
//   },
// ];

/**
 * Get all roles for seeding
 */
export function getAllRoles(): RoleDefinition[] {
  return [...SYSTEM_ROLES, ...TENANT_ROLES];
}

/**
 * Get role by name and scope
 */
export function getRoleByName(
  name: string,
  scope: 'SYSTEM' | 'TENANT',
): RoleDefinition | undefined {
  const allRoles = getAllRoles();
  return allRoles.find((r) => r.name === name && r.scope === scope);
}

/**
 * Get roles available for a specific scope
 */
export function getRolesByScope(scope: 'SYSTEM' | 'TENANT'): RoleDefinition[] {
  return getAllRoles().filter((r) => r.scope === scope);
}

/**
 * Check if a role can assign another role (based on level)
 */
export function canAssignRole(assignerLevel: number, targetRoleLevel: number): boolean {
  return assignerLevel > targetRoleLevel;
}
