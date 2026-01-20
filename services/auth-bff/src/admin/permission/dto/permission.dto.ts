import { z } from 'zod';

// ==========================================
// Grant/Revoke Permission
// ==========================================

export const grantPermissionSchema = z.object({
  relation: z.string().min(1, 'Relation is required'),
  object: z
    .string()
    .min(1, 'Object is required')
    .regex(/^[a-z_]+:[a-z0-9-]+$/i, 'Object must be in format "type:id"'),
});

export type GrantPermissionDto = z.infer<typeof grantPermissionSchema>;

export const revokePermissionSchema = grantPermissionSchema;
export type RevokePermissionDto = z.infer<typeof revokePermissionSchema>;

// ==========================================
// Menu Access
// ==========================================

export const grantMenuAccessSchema = z.object({
  type: z.enum(['admin', 'team', 'department', 'role']),
  id: z.string().uuid('ID must be a valid UUID'),
});

export type GrantMenuAccessDto = z.infer<typeof grantMenuAccessSchema>;

// ==========================================
// Permission Check
// ==========================================

export const checkPermissionSchema = z.object({
  user: z.string().min(1, 'User is required'),
  relation: z.string().min(1, 'Relation is required'),
  object: z.string().min(1, 'Object is required'),
});

export type CheckPermissionDto = z.infer<typeof checkPermissionSchema>;

export const batchCheckPermissionSchema = z.object({
  checks: z
    .array(checkPermissionSchema)
    .min(1, 'At least one check is required')
    .max(100, 'Maximum 100 checks allowed'),
});

export type BatchCheckPermissionDto = z.infer<typeof batchCheckPermissionSchema>;

// ==========================================
// Template Application
// ==========================================

export const applyTemplateSchema = z.object({
  targetUser: z.string().min(1, 'Target user is required'),
  scope: z
    .object({
      services: z.array(z.string().uuid()).optional(),
      countries: z.array(z.string()).optional(),
    })
    .optional(),
});

export type ApplyTemplateDto = z.infer<typeof applyTemplateSchema>;

// ==========================================
// Response Types
// ==========================================

export interface PermissionTuple {
  user: string;
  relation: string;
  object: string;
  createdAt?: string;
  inheritedFrom?: string;
}

export interface GrantPermissionResponse {
  success: boolean;
  user: string;
  relation: string;
  object: string;
  consistencyToken: string;
}

export interface RevokePermissionResponse {
  success: boolean;
  consistencyToken: string;
}

export interface AdminPermissionsResponse {
  adminId: string;
  directPermissions: PermissionTuple[];
  inheritedPermissions: PermissionTuple[];
}

export interface TeamPermissionsResponse {
  teamId: string;
  permissions: PermissionTuple[];
}

export interface MenuPermissionItem {
  menuId: string;
  allowedUsers: string[];
}

export interface MenuPermissionsResponse {
  menuPermissions: MenuPermissionItem[];
}

export interface CheckPermissionResponse {
  allowed: boolean;
  user: string;
  relation: string;
  object: string;
}

export interface BatchCheckResult {
  user: string;
  relation: string;
  object: string;
  allowed: boolean;
}

export interface BatchCheckPermissionResponse {
  results: BatchCheckResult[];
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: Array<{
    relation: string;
    objectType: string;
    objectScope: 'all' | 'scoped';
  }>;
}

export interface PermissionTemplateListResponse {
  templates: PermissionTemplate[];
}

export interface ApplyTemplateResponse {
  success: boolean;
  appliedPermissions: PermissionTuple[];
}
