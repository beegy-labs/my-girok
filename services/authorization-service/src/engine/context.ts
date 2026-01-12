/**
 * Check Context
 *
 * Manages state during permission check evaluation.
 * Handles cycle detection and depth tracking.
 */

import { TupleKey } from '../types';
import { Rewrite } from '../types';

/**
 * Context for permission check evaluation
 */
export class CheckContext {
  readonly user: string;
  readonly object: string;
  readonly maxDepth: number;
  readonly traceEnabled: boolean;
  readonly contextualTuples: TupleKey[];

  private _depth: number = 0;
  private visited: Set<string> = new Set();

  constructor(
    user: string,
    object: string,
    options: {
      maxDepth?: number;
      traceEnabled?: boolean;
      contextualTuples?: TupleKey[];
    } = {},
  ) {
    this.user = user;
    this.object = object;
    this.maxDepth = options.maxDepth ?? 25;
    this.traceEnabled = options.traceEnabled ?? false;
    this.contextualTuples = options.contextualTuples ?? [];
  }

  /**
   * Get current recursion depth
   */
  get depth(): number {
    return this._depth;
  }

  /**
   * Create a child context for recursive evaluation
   */
  child(newUser?: string, newObject?: string): CheckContext {
    const ctx = new CheckContext(newUser ?? this.user, newObject ?? this.object, {
      maxDepth: this.maxDepth,
      traceEnabled: this.traceEnabled,
      contextualTuples: this.contextualTuples,
    });
    ctx._depth = this._depth + 1;
    ctx.visited = new Set(this.visited);
    return ctx;
  }

  /**
   * Build a visit key for cycle detection
   */
  buildVisitKey(relation: string, object: string, rewriteType: string): string {
    return `${this.user}|${relation}|${object}|${rewriteType}`;
  }

  /**
   * Check if a node has been visited (cycle detection)
   */
  hasVisited(relation: string, object: string, rewriteType: string): boolean {
    const key = this.buildVisitKey(relation, object, rewriteType);
    return this.visited.has(key);
  }

  /**
   * Mark a node as visited
   */
  visit(relation: string, object: string, rewriteType: string): void {
    const key = this.buildVisitKey(relation, object, rewriteType);
    this.visited.add(key);
  }

  /**
   * Check if max depth has been exceeded
   */
  isMaxDepthExceeded(): boolean {
    return this._depth >= this.maxDepth;
  }

  /**
   * Find matching contextual tuple
   */
  findContextualTuple(user: string, relation: string, object: string): TupleKey | undefined {
    return this.contextualTuples.find(
      (t) => t.user === user && t.relation === relation && t.object === object,
    );
  }

  /**
   * Get all contextual tuples for a specific object and relation
   */
  getContextualTuplesForObject(object: string, relation?: string): TupleKey[] {
    return this.contextualTuples.filter(
      (t) => t.object === object && (relation === undefined || t.relation === relation),
    );
  }
}
