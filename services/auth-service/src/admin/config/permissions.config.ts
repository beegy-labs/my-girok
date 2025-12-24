/**
 * Permission SSOT (Single Source of Truth)
 * Pattern: resource:action
 *
 * Used for:
 * 1. Database seeding
 * 2. Permission guard checks
 * 3. Admin UI permission display
 */

export interface PermissionDefinition {
  displayName: string;
  description?: string;
  category: string;
  tenantType?: string; // NULL = all types
}

/**
 * SYSTEM scope permissions - Platform-level only
 */
export const SYSTEM_PERMISSIONS: Record<string, PermissionDefinition> = {
  // Tenant Management
  'tenant:read': {
    displayName: 'View Partners',
    description: 'View partner company list and details',
    category: 'Partner Management',
  },
  'tenant:create': {
    displayName: 'Create Partner',
    description: 'Create new partner company',
    category: 'Partner Management',
  },
  'tenant:update': {
    displayName: 'Update Partner',
    description: 'Update partner company details',
    category: 'Partner Management',
  },
  'tenant:approve': {
    displayName: 'Approve/Reject Partner',
    description: 'Approve or reject partner applications',
    category: 'Partner Management',
  },
  'tenant:suspend': {
    displayName: 'Suspend Partner',
    description: 'Suspend or terminate partner access',
    category: 'Partner Management',
  },

  // System Admin Management
  'system_admin:read': {
    displayName: 'View System Admins',
    description: 'View system administrator list',
    category: 'Admin Management',
  },
  'system_admin:create': {
    displayName: 'Create System Admin',
    description: 'Create new system administrator',
    category: 'Admin Management',
  },
  'system_admin:update': {
    displayName: 'Update System Admin',
    description: 'Update system administrator details',
    category: 'Admin Management',
  },
  'system_admin:delete': {
    displayName: 'Delete System Admin',
    description: 'Delete system administrator',
    category: 'Admin Management',
  },

  // User Management (Service Users)
  'user:read': {
    displayName: 'View Users',
    description: 'View service user list and details',
    category: 'User Management',
  },
  'user:update': {
    displayName: 'Update User',
    description: 'Update service user details',
    category: 'User Management',
  },
  'user:suspend': {
    displayName: 'Suspend User',
    description: 'Suspend service user account',
    category: 'User Management',
  },
  'user:delete': {
    displayName: 'Delete User',
    description: 'Delete service user account',
    category: 'User Management',
  },
  'user:link': {
    displayName: 'Link User to Admin',
    description: 'Map admin to service user for operator display',
    category: 'User Management',
  },

  // Content Moderation
  'content:read': {
    displayName: 'View Content',
    description: 'View user-generated content',
    category: 'Content Moderation',
  },
  'content:delete': {
    displayName: 'Delete Content',
    description: 'Delete user-generated content',
    category: 'Content Moderation',
  },
  'content:hide': {
    displayName: 'Hide Content',
    description: 'Hide content from public view',
    category: 'Content Moderation',
  },
};

/**
 * SHARED permissions - Available to both SYSTEM and TENANT scope
 */
export const SHARED_PERMISSIONS: Record<string, PermissionDefinition> = {
  // Audit Logs
  'audit:read': {
    displayName: 'View Audit Logs',
    description: 'View admin activity audit logs',
    category: 'Audit',
  },

  // Legal Management
  'legal:read': {
    displayName: 'View Legal Documents',
    description: 'View legal documents and consent records',
    category: 'Legal',
  },
  'legal:create': {
    displayName: 'Create Legal Document',
    description: 'Create new legal document version',
    category: 'Legal',
  },
  'legal:update': {
    displayName: 'Update Legal Document',
    description: 'Update legal document content',
    category: 'Legal',
  },
  'legal:delete': {
    displayName: 'Delete Legal Document',
    description: 'Soft delete legal document',
    category: 'Legal',
  },

  // Analytics
  'analytics:read': {
    displayName: 'View Analytics',
    description: 'View analytics and statistics',
    category: 'Analytics',
  },
};

/**
 * TENANT scope permissions - Partner-level only
 */
export const TENANT_PERMISSIONS: Record<string, PermissionDefinition> = {
  // Partner Admin Management
  'partner_admin:read': {
    displayName: 'View Partner Admins',
    description: 'View partner administrator list',
    category: 'Admin Management',
  },
  'partner_admin:create': {
    displayName: 'Create Partner Admin',
    description: 'Create new partner administrator',
    category: 'Admin Management',
  },
  'partner_admin:update': {
    displayName: 'Update Partner Admin',
    description: 'Update partner administrator details',
    category: 'Admin Management',
  },
  'partner_admin:delete': {
    displayName: 'Delete Partner Admin',
    description: 'Delete partner administrator',
    category: 'Admin Management',
  },

  // Commerce-specific (TenantType: COMMERCE) - Structure only for now
  // 'product:read': { displayName: 'View Products', category: 'Commerce', tenantType: 'COMMERCE' },
  // 'product:manage': { displayName: 'Manage Products', category: 'Commerce', tenantType: 'COMMERCE' },

  // AdBid-specific (TenantType: ADBID) - Structure only for now
  // 'campaign:read': { displayName: 'View Campaigns', category: 'AdBid', tenantType: 'ADBID' },
  // 'campaign:manage': { displayName: 'Manage Campaigns', category: 'AdBid', tenantType: 'ADBID' },
};

/**
 * Get all permissions for seeding
 */
export function getAllPermissions() {
  const permissions: Array<{
    resource: string;
    action: string;
    scope: 'SYSTEM' | 'TENANT' | null;
    displayName: string;
    description?: string;
    category: string;
    tenantType?: string;
  }> = [];

  // SYSTEM scope permissions
  for (const [key, def] of Object.entries(SYSTEM_PERMISSIONS)) {
    const [resource, action] = key.split(':');
    permissions.push({
      resource,
      action,
      scope: 'SYSTEM',
      ...def,
    });
  }

  // SHARED permissions (scope = null)
  for (const [key, def] of Object.entries(SHARED_PERMISSIONS)) {
    const [resource, action] = key.split(':');
    permissions.push({
      resource,
      action,
      scope: null,
      ...def,
    });
  }

  // TENANT scope permissions
  for (const [key, def] of Object.entries(TENANT_PERMISSIONS)) {
    const [resource, action] = key.split(':');
    permissions.push({
      resource,
      action,
      scope: 'TENANT',
      ...def,
    });
  }

  return permissions;
}

/**
 * Check if a permission matches a required permission
 * Supports wildcards: '*' matches all, 'legal:*' matches all legal actions
 */
export function matchesPermission(userPermission: string, requiredPermission: string): boolean {
  if (userPermission === '*') return true;

  const [userResource, userAction] = userPermission.split(':');
  const [reqResource] = requiredPermission.split(':');

  if (userResource === reqResource && userAction === '*') return true;

  return userPermission === requiredPermission;
}
