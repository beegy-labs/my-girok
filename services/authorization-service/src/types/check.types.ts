/**
 * Check Types for Permission Evaluation
 *
 * These types are used in the Check Engine for
 * evaluating permissions through graph traversal.
 */

import { TupleKey } from './tuple.types';
import { Rewrite } from './model.types';

/**
 * Request to check if a user has a specific relation to an object
 */
export interface CheckRequest {
  /**
   * The user to check
   * Format: "type:id" or "type:id#relation"
   */
  user: string;

  /**
   * The relation to check
   */
  relation: string;

  /**
   * The object to check against
   * Format: "type:id"
   */
  object: string;

  /**
   * Optional contextual tuples that exist only for this request
   * Used for transient permissions or what-if scenarios
   */
  contextualTuples?: TupleKey[];

  /**
   * Whether to include resolution trace in the response
   */
  trace?: boolean;

  /**
   * Consistency token for read-after-write consistency
   */
  consistencyToken?: string;
}

/**
 * Result of a permission check
 */
export interface CheckResult {
  /**
   * Whether the permission is granted
   */
  allowed: boolean;

  /**
   * Resolution trace for debugging (only if trace=true in request)
   */
  resolution?: ResolutionNode;

  /**
   * Consistency token for subsequent requests
   */
  consistencyToken?: string;
}

/**
 * A node in the resolution tree showing how permission was evaluated
 */
export interface ResolutionNode {
  /**
   * Type of node in the resolution tree
   */
  nodeType: ResolutionNodeType;

  /**
   * Whether this node resulted in a permission grant
   */
  result: boolean;

  /**
   * Child nodes (for union, intersection, etc.)
   */
  children?: ResolutionNode[];

  /**
   * Duration of this check in microseconds
   */
  durationUs?: number;

  /**
   * Additional context about this resolution step
   */
  context?: Record<string, unknown>;
}

export type ResolutionNodeType =
  | 'direct'
  | 'computed'
  | 'tupleToUserset'
  | 'union'
  | 'intersection'
  | 'exclusion'
  | 'cached'
  | 'cycle';

/**
 * Batch check request for multiple permission checks
 */
export interface BatchCheckRequest {
  checks: CheckRequestItem[];
}

export interface CheckRequestItem {
  user: string;
  relation: string;
  object: string;
}

/**
 * Batch check response
 */
export interface BatchCheckResponse {
  results: CheckResponseItem[];
}

export interface CheckResponseItem {
  allowed: boolean;
  error?: string;
}

/**
 * Request to list objects a user can access
 */
export interface ListObjectsRequest {
  /**
   * The user to check
   */
  user: string;

  /**
   * The relation to check
   */
  relation: string;

  /**
   * The type of objects to list
   */
  type: string;

  /**
   * Maximum number of results
   */
  pageSize?: number;

  /**
   * Pagination token
   */
  pageToken?: string;
}

/**
 * Response for listing objects
 */
export interface ListObjectsResponse {
  objects: string[];
  nextPageToken?: string;
}

/**
 * Request to list users with access to an object
 */
export interface ListUsersRequest {
  /**
   * The object to check
   */
  object: string;

  /**
   * The relation to check
   */
  relation: string;

  /**
   * Filter by user types
   */
  userTypes?: string[];

  /**
   * Maximum number of results
   */
  pageSize?: number;

  /**
   * Pagination token
   */
  pageToken?: string;
}

/**
 * Response for listing users
 */
export interface ListUsersResponse {
  users: string[];
  nextPageToken?: string;
}

/**
 * Request to expand a relation on an object
 */
export interface ExpandRequest {
  /**
   * The object to expand
   */
  object: string;

  /**
   * The relation to expand
   */
  relation: string;
}

/**
 * Response for expand showing the userset tree
 */
export interface ExpandResponse {
  tree: UsersetTreeNode;
}

/**
 * A node in the expanded userset tree
 */
export type UsersetTreeNode =
  | LeafNode
  | ComputedNode
  | TupleToUsersetNode
  | UnionNode
  | IntersectionNode
  | ExclusionNode;

export interface LeafNode {
  type: 'leaf';
  users: string[];
}

export interface ComputedNode {
  type: 'computed';
  relation: string;
  children?: UsersetTreeNode[];
}

export interface TupleToUsersetNode {
  type: 'tupleToUserset';
  tuplesetRelation: string;
  computedRelation: string;
  children?: UsersetTreeNode[];
}

export interface UnionNode {
  type: 'union';
  children: UsersetTreeNode[];
}

export interface IntersectionNode {
  type: 'intersection';
  children: UsersetTreeNode[];
}

export interface ExclusionNode {
  type: 'exclusion';
  base: UsersetTreeNode;
  subtract: UsersetTreeNode;
}

/**
 * Context for permission check evaluation
 * Used internally by the Check Engine
 */
export interface CheckContext {
  /**
   * The original request
   */
  request: CheckRequest;

  /**
   * Current recursion depth
   */
  depth: number;

  /**
   * Maximum allowed depth
   */
  maxDepth: number;

  /**
   * Set of visited nodes for cycle detection
   * Key format: "user|relation|object|rewriteType"
   */
  visited: Set<string>;

  /**
   * Contextual tuples for this request
   */
  contextualTuples: TupleKey[];

  /**
   * Whether to build resolution trace
   */
  traceEnabled: boolean;
}

/**
 * Create a new check context
 */
export function createCheckContext(request: CheckRequest, maxDepth: number = 25): CheckContext {
  return {
    request,
    depth: 0,
    maxDepth,
    visited: new Set(),
    contextualTuples: request.contextualTuples ?? [],
    traceEnabled: request.trace ?? false,
  };
}

/**
 * Build a visit key for cycle detection
 */
export function buildVisitKey(user: string, object: string, rewrite: Rewrite): string {
  return `${user}|${object}|${rewrite.type}|${JSON.stringify(rewrite)}`;
}

/**
 * Errors related to permission checking
 */
export class MaxDepthExceededError extends Error {
  constructor(depth: number) {
    super(`Maximum recursion depth exceeded: ${depth}`);
    this.name = 'MaxDepthExceededError';
  }
}

export class CycleDetectedError extends Error {
  constructor(key: string) {
    super(`Cycle detected in permission graph: ${key}`);
    this.name = 'CycleDetectedError';
  }
}

export class TypeNotFoundError extends Error {
  constructor(typeName: string) {
    super(`Type not found in authorization model: ${typeName}`);
    this.name = 'TypeNotFoundError';
  }
}

export class RelationNotFoundError extends Error {
  constructor(typeName: string, relation: string) {
    super(`Relation '${relation}' not found in type '${typeName}'`);
    this.name = 'RelationNotFoundError';
  }
}
