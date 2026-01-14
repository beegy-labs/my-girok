/**
 * Model Types for Authorization DSL
 *
 * These types represent the compiled authorization model
 * that defines how permissions are evaluated.
 *
 * DSL Example:
 * ```
 * model
 *   schema 1.1
 *
 * type service
 *   relations
 *     define owner: [user, admin]
 *     define admin: [user, admin, team#member]
 *     define viewer: [user, admin, team#member]
 *     define can_manage: owner or admin
 *     define can_view: can_manage or viewer
 * ```
 */

/**
 * Rewrite rule types that define how a relation is computed
 */
export type RewriteType =
  | 'direct'
  | 'computed'
  | 'tupleToUserset'
  | 'union'
  | 'intersection'
  | 'exclusion';

/**
 * Base interface for all rewrite rules
 */
export interface BaseRewrite {
  type: RewriteType;
}

/**
 * Direct assignment - relation can be directly assigned to specified user types
 * DSL: `define viewer: [user, admin, team#member]`
 */
export interface DirectRewrite extends BaseRewrite {
  type: 'direct';
  /**
   * Allowed user types that can be directly assigned
   * Format: "type" or "type#relation" for userset
   */
  allowedTypes: string[];
}

/**
 * Computed relation - relation is derived from another relation on the same object
 * DSL: `define can_manage: admin` (shorthand for owner or admin)
 */
export interface ComputedRewrite extends BaseRewrite {
  type: 'computed';
  /**
   * The relation to check on the same object
   */
  relation: string;
}

/**
 * Tuple to userset - follow a relation to find related objects, then check permission on those
 * DSL: `define can_view: parent_service->can_view_recordings`
 *
 * This means:
 * 1. Find all objects related to current object via `tuplesetRelation`
 * 2. Check if user has `computedRelation` on those objects
 */
export interface TupleToUsersetRewrite extends BaseRewrite {
  type: 'tupleToUserset';
  /**
   * The relation on current object that points to related objects
   * Example: "parent_service"
   */
  tuplesetRelation: string;
  /**
   * The relation to check on the related objects
   * Example: "can_view_recordings"
   */
  computedRelation: string;
}

/**
 * Union - any of the child rewrites can grant access (OR logic)
 * DSL: `define can_view: viewer or admin or owner`
 */
export interface UnionRewrite extends BaseRewrite {
  type: 'union';
  children: Rewrite[];
}

/**
 * Intersection - all child rewrites must grant access (AND logic)
 * DSL: `define can_access: member and verified`
 */
export interface IntersectionRewrite extends BaseRewrite {
  type: 'intersection';
  children: Rewrite[];
}

/**
 * Exclusion - base grants access, but subtract removes it (BUT NOT logic)
 * DSL: `define can_view: viewer but not blocked`
 */
export interface ExclusionRewrite extends BaseRewrite {
  type: 'exclusion';
  base: Rewrite;
  subtract: Rewrite;
}

/**
 * Union type of all rewrite rules
 */
export type Rewrite =
  | DirectRewrite
  | ComputedRewrite
  | TupleToUsersetRewrite
  | UnionRewrite
  | IntersectionRewrite
  | ExclusionRewrite;

/**
 * Definition of a single relation within a type
 */
export interface RelationDefinition {
  /**
   * Name of the relation
   */
  name: string;

  /**
   * The rewrite rule that defines how this relation is evaluated
   */
  rewrite: Rewrite;

  /**
   * For direct relations, the types that can be directly assigned
   * This is extracted from DirectRewrite for convenience
   */
  directlyAssignableTypes?: string[];
}

/**
 * Definition of a type in the authorization model
 */
export interface TypeDefinition {
  /**
   * Name of the type (e.g., "service", "team", "session_recording")
   */
  name: string;

  /**
   * Map of relation names to their definitions
   */
  relations: Record<string, RelationDefinition>;
}

/**
 * The complete compiled authorization model
 */
export interface AuthorizationModel {
  /**
   * Unique identifier for this model version
   */
  id: string;

  /**
   * Version ID (ULID format)
   */
  versionId: string;

  /**
   * Schema version (e.g., "1.1")
   */
  schemaVersion: string;

  /**
   * Original DSL source code
   */
  dslSource: string;

  /**
   * Map of type names to their definitions
   */
  types: Record<string, TypeDefinition>;

  /**
   * Whether this model is currently active
   */
  isActive: boolean;

  /**
   * When this model was created
   */
  createdAt: Date;

  /**
   * Optional version notes (for changelog/documentation)
   */
  notes?: string;
}

/**
 * Result of model validation
 */
export interface ModelValidationResult {
  valid: boolean;
  errors: ModelValidationError[];
  warnings: ModelValidationWarning[];
}

export interface ModelValidationError {
  type: string;
  relation?: string;
  message: string;
  line?: number;
  column?: number;
}

export interface ModelValidationWarning {
  type: string;
  relation?: string;
  message: string;
}

/**
 * Helper to create rewrite rules
 */
export const RewriteFactory = {
  direct(allowedTypes: string[]): DirectRewrite {
    return { type: 'direct', allowedTypes };
  },

  computed(relation: string): ComputedRewrite {
    return { type: 'computed', relation };
  },

  tupleToUserset(tuplesetRelation: string, computedRelation: string): TupleToUsersetRewrite {
    return { type: 'tupleToUserset', tuplesetRelation, computedRelation };
  },

  union(...children: Rewrite[]): UnionRewrite {
    return { type: 'union', children };
  },

  intersection(...children: Rewrite[]): IntersectionRewrite {
    return { type: 'intersection', children };
  },

  exclusion(base: Rewrite, subtract: Rewrite): ExclusionRewrite {
    return { type: 'exclusion', base, subtract };
  },
};
