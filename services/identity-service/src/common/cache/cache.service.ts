import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { CacheTTL, CachePrefix } from './cache-ttl.constants';

/**
 * Cache Service
 * Provides type-safe caching operations with automatic key prefixing
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.warn(`Cache get failed for key: ${key}`, error);
      return undefined;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl ?? CacheTTL.DEFAULT);
    } catch (error) {
      this.logger.warn(`Cache set failed for key: ${key}`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete failed for key: ${key}`, error);
    }
  }

  /**
   * Get or set a value in cache
   * Executes factory function if cache miss
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate all keys matching a pattern
   * Note: This is a no-op for in-memory cache, requires Redis SCAN for production
   */
  async invalidatePattern(pattern: string): Promise<void> {
    this.logger.debug(`Invalidating cache pattern: ${pattern}`);
    // For production, implement with Redis SCAN command
    // This is a simplified version that clears specific known keys
  }

  // ========== Account Cache Methods ==========

  /**
   * Get account by ID from cache
   */
  async getAccount<T>(id: string): Promise<T | undefined> {
    return this.get<T>(`${CachePrefix.ACCOUNT}:${id}`);
  }

  /**
   * Set account in cache
   */
  async setAccount<T>(id: string, account: T): Promise<void> {
    await this.set(`${CachePrefix.ACCOUNT}:${id}`, account, CacheTTL.ACCOUNT);
  }

  /**
   * Get account by email from cache
   */
  async getAccountByEmail<T>(email: string): Promise<T | undefined> {
    const normalizedEmail = email.toLowerCase();
    return this.get<T>(`${CachePrefix.ACCOUNT_BY_EMAIL}:${normalizedEmail}`);
  }

  /**
   * Set account by email in cache
   */
  async setAccountByEmail<T>(email: string, account: T): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    await this.set(`${CachePrefix.ACCOUNT_BY_EMAIL}:${normalizedEmail}`, account, CacheTTL.ACCOUNT);
  }

  /**
   * Invalidate all account cache entries
   */
  async invalidateAccount(id: string, email?: string, username?: string): Promise<void> {
    await this.del(`${CachePrefix.ACCOUNT}:${id}`);
    if (email) {
      await this.del(`${CachePrefix.ACCOUNT_BY_EMAIL}:${email.toLowerCase()}`);
    }
    if (username) {
      await this.del(`${CachePrefix.ACCOUNT_BY_USERNAME}:${username.toLowerCase()}`);
    }
  }

  // ========== Session Cache Methods ==========

  /**
   * Get session from cache
   */
  async getSession<T>(id: string): Promise<T | undefined> {
    return this.get<T>(`${CachePrefix.SESSION}:${id}`);
  }

  /**
   * Set session in cache
   */
  async setSession<T>(id: string, session: T): Promise<void> {
    await this.set(`${CachePrefix.SESSION}:${id}`, session, CacheTTL.SESSION);
  }

  /**
   * Invalidate session cache
   */
  async invalidateSession(id: string): Promise<void> {
    await this.del(`${CachePrefix.SESSION}:${id}`);
  }

  /**
   * Invalidate all sessions for an account
   */
  async invalidateAccountSessions(accountId: string): Promise<void> {
    await this.del(`${CachePrefix.SESSION_BY_ACCOUNT}:${accountId}`);
  }

  // ========== Permission Cache Methods ==========

  /**
   * Get operator permissions from cache
   */
  async getOperatorPermissions<T>(operatorId: string): Promise<T | undefined> {
    return this.get<T>(`${CachePrefix.PERMISSION_BY_OPERATOR}:${operatorId}`);
  }

  /**
   * Set operator permissions in cache
   */
  async setOperatorPermissions<T>(operatorId: string, permissions: T): Promise<void> {
    await this.set(
      `${CachePrefix.PERMISSION_BY_OPERATOR}:${operatorId}`,
      permissions,
      CacheTTL.PERMISSION,
    );
  }

  /**
   * Invalidate operator permissions cache
   */
  async invalidateOperatorPermissions(operatorId: string): Promise<void> {
    await this.del(`${CachePrefix.PERMISSION_BY_OPERATOR}:${operatorId}`);
  }

  // ========== Role Cache Methods ==========

  /**
   * Get role from cache
   */
  async getRole<T>(id: string): Promise<T | undefined> {
    return this.get<T>(`${CachePrefix.ROLE}:${id}`);
  }

  /**
   * Set role in cache
   */
  async setRole<T>(id: string, role: T): Promise<void> {
    await this.set(`${CachePrefix.ROLE}:${id}`, role, CacheTTL.ROLE);
  }

  /**
   * Invalidate role cache
   */
  async invalidateRole(id: string): Promise<void> {
    await this.del(`${CachePrefix.ROLE}:${id}`);
  }
}
