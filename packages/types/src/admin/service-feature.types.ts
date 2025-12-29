// packages/types/src/admin/service-feature.types.ts

/**
 * Permission target types for feature access control
 */
export type PermissionTargetType = 'ALL_USERS' | 'USER' | 'TIER' | 'COUNTRY' | 'ROLE';

/**
 * Feature actions for granular permissions
 */
export type FeatureAction = 'USE' | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ADMIN';

/**
 * Service feature definition (hierarchical)
 */
export interface ServiceFeature {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  parentId: string | null;
  path: string;
  depth: number;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  children?: ServiceFeature[];
}

/**
 * Feature permission with conditions and validity
 */
export interface FeaturePermission {
  id: string;
  featureId: string;
  serviceId: string;
  targetType: PermissionTargetType;
  targetId: string | null;
  action: FeatureAction;
  isAllowed: boolean;
  conditions: Record<string, unknown> | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  createdBy: string;
}

/**
 * List response for service features
 */
export interface ServiceFeatureListResponse {
  data: ServiceFeature[];
  meta: {
    total: number;
    serviceId: string;
    category?: string;
  };
}

/**
 * DTO for creating a service feature
 */
export interface CreateServiceFeatureDto {
  code: string;
  name: string;
  description?: string;
  category: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
  icon?: string;
  color?: string;
}

/**
 * DTO for updating a service feature
 */
export interface UpdateServiceFeatureDto {
  name?: string;
  description?: string;
  category?: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
  icon?: string;
  color?: string;
}

/**
 * Bulk operation types
 */
export type BulkFeatureOperation = 'create' | 'update' | 'delete' | 'reorder';

/**
 * Bulk feature item
 */
export interface BulkFeatureItem {
  id?: string;
  code?: string;
  name?: string;
  displayOrder?: number;
}

/**
 * DTO for bulk feature operations
 */
export interface BulkFeatureOperationDto {
  operation: BulkFeatureOperation;
  items: BulkFeatureItem[];
}

/**
 * DTO for creating feature permission
 */
export interface CreateFeaturePermissionDto {
  targetType: PermissionTargetType;
  targetId?: string;
  action: FeatureAction;
  isAllowed?: boolean;
  conditions?: Record<string, unknown>;
  validFrom?: string;
  validUntil?: string;
}

/**
 * Query params for listing features
 */
export interface ListFeaturesQuery {
  category?: string;
  includeInactive?: boolean;
  includeChildren?: boolean;
}
