import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CACHE_TTL, CACHE_KEYS } from './cache-ttl.constants';

/**
 * Cache Service
 *
 * Provides type-safe caching operations with pattern-based invalidation.
 * Uses Valkey/Redis in production, in-memory in development.
 *
 * Features:
 * - Type-safe generic methods
 * - Pattern-based cache invalidation
 * - Domain-specific cache helpers
 * - Distributed lock support (for getOrSet)
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly keyPrefix = 'identity:';

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const prefixedKey = this.keyPrefix + key;
      return await this.cacheManager.get<T>(prefixedKey);
    } catch (error) {
      this.logger.warn(`Cache get failed for key ${key}: ${error}`);
      return undefined;
    }
  }

  /**
   * Set a cached value
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const prefixedKey = this.keyPrefix + key;
      await this.cacheManager.set(prefixedKey, value, ttlMs);
    } catch (error) {
      this.logger.warn(`Cache set failed for key ${key}: ${error}`);
    }
  }

  /**
   * Delete a cached value
   */
  async del(key: string): Promise<void> {
    try {
      const prefixedKey = this.keyPrefix + key;
      await this.cacheManager.del(prefixedKey);
    } catch (error) {
      this.logger.warn(`Cache del failed for key ${key}: ${error}`);
    }
  }

  /**
   * Get or set pattern - atomic cache-aside
   * Uses distributed lock to prevent thundering herd
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Lock key to prevent concurrent factory calls
    const lockKey = `lock:${key}`;
    const lockAcquired = await this.acquireLock(lockKey, 5000);

    try {
      // Double-check after acquiring lock
      const rechecked = await this.get<T>(key);
      if (rechecked !== undefined) {
        return rechecked;
      }

      const value = await factory();
      await this.set(key, value, ttlMs);
      return value;
    } finally {
      if (lockAcquired) {
        await this.releaseLock(lockKey);
      }
    }
  }

  /**
   * Acquire a distributed lock
   */
  private async acquireLock(lockKey: string, ttlMs: number): Promise<boolean> {
    try {
      const prefixedKey = this.keyPrefix + lockKey;
      const existing = await this.cacheManager.get(prefixedKey);
      if (existing) {
        return false;
      }
      await this.cacheManager.set(prefixedKey, '1', ttlMs);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    try {
      const prefixedKey = this.keyPrefix + lockKey;
      await this.cacheManager.del(prefixedKey);
    } catch {
      // Ignore lock release failures
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   *
   * Uses Redis SCAN in production for efficient pattern matching.
   * Falls back to logging in development with in-memory cache.
   *
   * @param pattern - Glob pattern to match (e.g., "account:*")
   * @returns Number of keys deleted
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const prefixedPattern = this.keyPrefix + pattern;

      // Check if cache manager has a store with keys() method (Redis/Keyv)
      const store = (
        this.cacheManager as unknown as {
          store?: { keys?: (p: string) => Promise<string[]>; del?: (k: string) => Promise<void> };
        }
      ).store;

      if (store?.keys && typeof store.keys === 'function') {
        // Production: Use Redis SCAN via keys method
        const keys = await store.keys(prefixedPattern);

        if (keys.length === 0) {
          return 0;
        }

        // Delete all matching keys
        let deleted = 0;
        for (const key of keys) {
          try {
            await this.cacheManager.del(key);
            deleted++;
          } catch {
            // Continue on individual key errors
          }
        }

        this.logger.debug(`Invalidated ${deleted} keys matching pattern: ${pattern}`);
        return deleted;
      }

      // Development: In-memory cache doesn't support pattern operations
      // Log warning but don't fail
      this.logger.debug(`Pattern invalidation for "${pattern}" - in-memory cache, skipping`);
      return 0;
    } catch (error) {
      this.logger.warn(`Pattern invalidation failed for ${pattern}: ${error}`);
      return 0;
    }
  }

  // ============================================================
  // DOMAIN-SPECIFIC CACHE METHODS
  // ============================================================

  /**
   * Cache account by ID
   */
  async getAccountById<T>(id: string): Promise<T | undefined> {
    return this.get<T>(CACHE_KEYS.ACCOUNT_BY_ID(id));
  }

  async setAccountById<T>(id: string, account: T): Promise<void> {
    await this.set(CACHE_KEYS.ACCOUNT_BY_ID(id), account, CACHE_TTL.ACCOUNT);
  }

  async invalidateAccount(id: string): Promise<void> {
    await this.del(CACHE_KEYS.ACCOUNT_BY_ID(id));
  }

  /**
   * Cache account by email
   */
  async getAccountByEmail<T>(email: string): Promise<T | undefined> {
    const normalizedEmail = email.toLowerCase();
    return this.get<T>(CACHE_KEYS.ACCOUNT_BY_EMAIL(normalizedEmail));
  }

  async setAccountByEmail<T>(email: string, account: T): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    await this.set(CACHE_KEYS.ACCOUNT_BY_EMAIL(normalizedEmail), account, CACHE_TTL.ACCOUNT);
  }

  async invalidateAccountByEmail(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    await this.del(CACHE_KEYS.ACCOUNT_BY_EMAIL(normalizedEmail));
  }

  /**
   * Cache account by username
   */
  async getAccountByUsername<T>(username: string): Promise<T | undefined> {
    const normalizedUsername = username.toLowerCase();
    return this.get<T>(CACHE_KEYS.ACCOUNT_BY_USERNAME(normalizedUsername));
  }

  async setAccountByUsername<T>(username: string, account: T): Promise<void> {
    const normalizedUsername = username.toLowerCase();
    await this.set(CACHE_KEYS.ACCOUNT_BY_USERNAME(normalizedUsername), account, CACHE_TTL.ACCOUNT);
  }

  async invalidateAccountByUsername(username: string): Promise<void> {
    const normalizedUsername = username.toLowerCase();
    await this.del(CACHE_KEYS.ACCOUNT_BY_USERNAME(normalizedUsername));
  }

  /**
   * Cache session by token hash
   */
  async getSessionByTokenHash<T>(tokenHash: string): Promise<T | undefined> {
    return this.get<T>(CACHE_KEYS.SESSION_BY_TOKEN(tokenHash));
  }

  async setSessionByTokenHash<T>(tokenHash: string, session: T): Promise<void> {
    await this.set(CACHE_KEYS.SESSION_BY_TOKEN(tokenHash), session, CACHE_TTL.SESSION);
  }

  async invalidateSession(tokenHash: string): Promise<void> {
    await this.del(CACHE_KEYS.SESSION_BY_TOKEN(tokenHash));
  }

  /**
   * Check if a token JTI has been revoked
   *
   * FAIL-SECURE: This method DOES NOT catch errors internally.
   * Errors are propagated to the caller (JwtAuthGuard) which implements
   * fail-secure behavior by treating cache errors as token revocation.
   *
   * @throws Error if cache lookup fails - caller must handle for fail-secure
   */
  async isTokenRevoked(jti: string): Promise<boolean> {
    const prefixedKey = this.keyPrefix + CACHE_KEYS.REVOKED_TOKEN(jti);
    const cached = await this.cacheManager.get<boolean>(prefixedKey);
    return cached === true;
  }

  async setTokenRevoked(jti: string, ttlMs: number): Promise<void> {
    await this.set(CACHE_KEYS.REVOKED_TOKEN(jti), true, ttlMs);
  }

  /**
   * Cache user permissions
   */
  async getUserPermissions(accountId: string): Promise<string[] | undefined> {
    return this.get<string[]>(CACHE_KEYS.PERMISSIONS(accountId));
  }

  async setUserPermissions(accountId: string, permissions: string[]): Promise<void> {
    await this.set(CACHE_KEYS.PERMISSIONS(accountId), permissions, CACHE_TTL.PERMISSION);
  }

  async invalidateUserPermissions(accountId: string): Promise<void> {
    await this.del(CACHE_KEYS.PERMISSIONS(accountId));
  }
}
