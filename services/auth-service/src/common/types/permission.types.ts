/**
 * Permission-related types
 * SSOT for permission data structures across services
 */

/**
 * Permission database row representation
 */
export interface PermissionRow {
  id: string;
  resource: string;
  action: string;
  category: string | null;
  description: string | null;
  isSystem: boolean;
}

/**
 * Permission proto message representation
 */
export interface Permission {
  id: string;
  resource: string;
  action: string;
  category: string;
  description: string;
  isSystem: boolean;
}

/**
 * Map a PermissionRow to Permission proto format
 */
export function mapPermissionRowToProto(row: PermissionRow): Permission {
  return {
    id: row.id,
    resource: row.resource,
    action: row.action,
    category: row.category ?? '',
    description: row.description ?? '',
    isSystem: row.isSystem,
  };
}

/**
 * Permission check request
 */
export interface PermissionCheck {
  resource: string;
  action: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  resource: string;
  action: string;
  allowed: boolean;
  reason: string;
}
