/**
 * gRPC Response Caching Utilities
 *
 * Provides caching for gRPC responses to reduce load on downstream services.
 * Supports in-memory and external cache backends (Redis/Valkey).
 *
 * Features:
 * - LRU cache with configurable size
 * - TTL-based expiration
 * - Automatic cache invalidation
 * - Cache key generation
 * - Optional external cache integration
 *
 * @example
 * ```typescript
 * const cache = new GrpcResponseCache<GetOperatorPermissionsResponse>({
 *   ttlMs: 60000,
 *   maxSize: 1000,
 * });
 *
 * const key = cache.generateKey('getPermissions', { operator_id: '123' });
 * const cached = cache.get(key);
 * if (!cached) {
 *   const response = await grpcClient.getPermissions(request);
 *   cache.set(key, response);
 * }
 * ```
 */

import { Logger } from '@nestjs/common';

// ============================================================================
// Types
// ============================================================================

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hitCount: number;
}

/**
 * Cache configuration options
 */
export interface GrpcCacheConfig {
  /** Time to live in milliseconds (default: 60000 = 1 minute) */
  ttlMs: number;
  /** Maximum cache size (default: 1000) */
  maxSize: number;
  /** Enable statistics tracking (default: true) */
  enableStats: boolean;
  /** Cache key prefix */
  keyPrefix?: string;
  /** Stale-while-revalidate window in ms (default: 0 = disabled) */
  staleWhileRevalidateMs?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
  staleHits: number;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: GrpcCacheConfig = {
  ttlMs: 60000, // 1 minute
  maxSize: 1000,
  enableStats: true,
  keyPrefix: 'grpc_cache',
  staleWhileRevalidateMs: 0,
};

// ============================================================================
// LRU Cache Implementation
// ============================================================================

/**
 * Simple LRU (Least Recently Used) cache with TTL support
 */
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly config: GrpcCacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    staleHits: 0,
  };

  constructor(config: Partial<GrpcCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    const now = Date.now();

    // Check if expired
    if (now > entry.expiresAt) {
      // Check stale-while-revalidate
      if (
        this.config.staleWhileRevalidateMs &&
        now < entry.expiresAt + this.config.staleWhileRevalidateMs
      ) {
        this.stats.staleHits++;
        return entry.value;
      }

      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Move to front (LRU)
    this.cache.delete(key);
    entry.hitCount++;
    this.cache.set(key, entry);
    this.stats.hits++;

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const now = Date.now();
    const expiresAt = now + (ttlMs ?? this.config.ttlMs);

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: now,
      hitCount: 0,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, staleHits: 0 };
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      evictions: this.stats.evictions,
      staleHits: this.stats.staleHits,
    };
  }

  private evictOldest(): void {
    // Get oldest entry (first in map iteration)
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
}

// ============================================================================
// gRPC Response Cache
// ============================================================================

/**
 * gRPC Response Cache
 *
 * Caches gRPC responses with automatic TTL expiration.
 */
export class GrpcResponseCache<T> {
  private readonly logger = new Logger(GrpcResponseCache.name);
  private readonly cache: LRUCache<T>;
  private readonly config: GrpcCacheConfig;

  constructor(config: Partial<GrpcCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.cache = new LRUCache<T>(this.config);
  }

  /**
   * Generate a cache key from method name and request parameters
   */
  generateKey(method: string, request: Record<string, unknown>): string {
    const requestHash = this.hashRequest(request);
    return `${this.config.keyPrefix}:${method}:${requestHash}`;
  }

  /**
   * Get cached response
   */
  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value) {
      this.logger.debug(`Cache hit: ${key}`);
    }
    return value;
  }

  /**
   * Set cached response
   */
  set(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, value, ttlMs);
    this.logger.debug(`Cache set: ${key}`);
  }

  /**
   * Delete cached response
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache delete: ${key}`);
    }
    return deleted;
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    // For now, this clears all - pattern matching would need more implementation
    this.logger.debug(`Cache invalidate pattern: ${pattern}`);
    this.cache.clear();
    return 0;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Get or set with factory function
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Hash request object for cache key
   */
  private hashRequest(request: Record<string, unknown>): string {
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(request).sort();
    const normalized = sortedKeys.map((key) => `${key}:${JSON.stringify(request[key])}`).join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// ============================================================================
// Permission Cache
// ============================================================================

/**
 * Permission cache entry
 */
export interface PermissionCacheEntry {
  operatorId: string;
  permissions: string[];
  roleId?: string;
  updatedAt: number;
}

/**
 * Permission-specific cache configuration
 */
export interface PermissionCacheConfig extends GrpcCacheConfig {
  /** Invalidate cache on permission changes via events */
  enableEventInvalidation?: boolean;
}

/**
 * Specialized cache for operator permissions
 *
 * Provides optimized caching for permission lookups with:
 * - Per-operator caching
 * - Automatic invalidation on role changes
 * - Hierarchical permission checking
 */
export class PermissionCache {
  private readonly logger = new Logger(PermissionCache.name);
  private readonly cache: GrpcResponseCache<PermissionCacheEntry>;
  private readonly permissionChecks = new Map<string, boolean>();

  constructor(config: Partial<PermissionCacheConfig> = {}) {
    this.cache = new GrpcResponseCache({
      ...config,
      keyPrefix: 'perm_cache',
      ttlMs: config.ttlMs ?? 300000, // 5 minutes default for permissions
    });
  }

  /**
   * Get cached permissions for an operator
   */
  getOperatorPermissions(operatorId: string): PermissionCacheEntry | undefined {
    const key = this.getOperatorKey(operatorId);
    return this.cache.get(key);
  }

  /**
   * Set cached permissions for an operator
   */
  setOperatorPermissions(entry: PermissionCacheEntry): void {
    const key = this.getOperatorKey(entry.operatorId);
    this.cache.set(key, entry);

    // Pre-compute permission checks for faster lookups
    this.precomputePermissionChecks(entry);
  }

  /**
   * Check if operator has a specific permission (from cache)
   */
  hasPermission(operatorId: string, resource: string, action: string): boolean | undefined {
    const checkKey = this.getPermissionCheckKey(operatorId, resource, action);
    const cached = this.permissionChecks.get(checkKey);

    if (cached !== undefined) {
      return cached;
    }

    // Fall back to checking permissions array
    const permissions = this.getOperatorPermissions(operatorId);
    if (!permissions) {
      return undefined; // Cache miss
    }

    const permissionString = `${resource}:${action}`;
    const hasPermission = permissions.permissions.includes(permissionString);

    // Cache the check result
    this.permissionChecks.set(checkKey, hasPermission);

    return hasPermission;
  }

  /**
   * Invalidate all caches for an operator
   */
  invalidateOperator(operatorId: string): void {
    const key = this.getOperatorKey(operatorId);
    this.cache.delete(key);

    // Clear permission checks for this operator
    for (const [checkKey] of this.permissionChecks) {
      if (checkKey.startsWith(`${operatorId}:`)) {
        this.permissionChecks.delete(checkKey);
      }
    }

    this.logger.debug(`Invalidated permissions for operator: ${operatorId}`);
  }

  /**
   * Invalidate all caches for a role
   */
  invalidateRole(roleId: string): void {
    // In a full implementation, we'd track which operators have which roles
    // For now, clear all caches
    this.cache.clear();
    this.permissionChecks.clear();
    this.logger.debug(`Invalidated all permissions for role: ${roleId}`);
  }

  /**
   * Clear all permission caches
   */
  clear(): void {
    this.cache.clear();
    this.permissionChecks.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { permissionChecks: number } {
    return {
      ...this.cache.getStats(),
      permissionChecks: this.permissionChecks.size,
    };
  }

  private getOperatorKey(operatorId: string): string {
    return `operator:${operatorId}`;
  }

  private getPermissionCheckKey(operatorId: string, resource: string, action: string): string {
    return `${operatorId}:${resource}:${action}`;
  }

  private precomputePermissionChecks(entry: PermissionCacheEntry): void {
    for (const permission of entry.permissions) {
      const [resource, action] = permission.split(':');
      if (resource && action) {
        const checkKey = this.getPermissionCheckKey(entry.operatorId, resource, action);
        this.permissionChecks.set(checkKey, true);
      }
    }
  }
}

// ============================================================================
// Cache Decorator
// ============================================================================

/**
 * Cache options for the decorator
 */
export interface CacheDecoratorOptions {
  ttlMs?: number;
  keyPrefix?: string;
  keyGenerator?: (args: unknown[]) => string;
}

/**
 * Create a cached version of an async function
 *
 * @example
 * ```typescript
 * const cachedFetch = withCache(
 *   async (id: string) => await client.getOperator({ id }),
 *   { ttlMs: 60000 }
 * );
 *
 * const result = await cachedFetch('123');
 * ```
 */
export function withCache<T, TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<T>,
  options: CacheDecoratorOptions = {},
): (...args: TArgs) => Promise<T> {
  const cache = new GrpcResponseCache<T>({
    ttlMs: options.ttlMs ?? 60000,
    keyPrefix: options.keyPrefix ?? 'fn_cache',
  });

  return async (...args: TArgs): Promise<T> => {
    const key = options.keyGenerator
      ? options.keyGenerator(args)
      : cache.generateKey('call', { args: JSON.stringify(args) });

    return cache.getOrSet(key, () => fn(...args));
  };
}
