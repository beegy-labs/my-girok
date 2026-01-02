import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CACHE_TTL, CACHE_KEYS } from './cache-ttl.constants';

/**
 * Cache Service for legal-service
 *
 * Provides type-safe caching operations with pattern-based invalidation.
 * Uses Valkey/Redis in production, in-memory in development.
 *
 * Features:
 * - Type-safe generic methods
 * - Pattern-based cache invalidation
 * - Domain-specific cache helpers for legal entities
 * - Circuit breaker pattern for cache failures (fail-open)
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly keyPrefix = 'legal:';

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
   * Get or set pattern - cache-aside with factory
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const prefixedPattern = this.keyPrefix + pattern;
      const store = (
        this.cacheManager as unknown as {
          store?: { keys?: (p: string) => Promise<string[]> };
        }
      ).store;

      if (store?.keys && typeof store.keys === 'function') {
        const keys = await store.keys(prefixedPattern);
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

      this.logger.debug(`Pattern invalidation for "${pattern}" - in-memory cache, skipping`);
      return 0;
    } catch (error) {
      this.logger.warn(`Pattern invalidation failed for ${pattern}: ${error}`);
      return 0;
    }
  }

  // ============================================================
  // LAW REGISTRY CACHE METHODS
  // ============================================================

  async getLawById<T>(id: string): Promise<T | undefined> {
    return this.get<T>(CACHE_KEYS.LAW_BY_ID(id));
  }

  async setLawById<T>(id: string, law: T): Promise<void> {
    await this.set(CACHE_KEYS.LAW_BY_ID(id), law, CACHE_TTL.LAW_REGISTRY);
  }

  async getLawByCode<T>(code: string): Promise<T | undefined> {
    return this.get<T>(CACHE_KEYS.LAW_BY_CODE(code));
  }

  async setLawByCode<T>(code: string, law: T): Promise<void> {
    await this.set(CACHE_KEYS.LAW_BY_CODE(code), law, CACHE_TTL.LAW_REGISTRY);
  }

  async invalidateLaw(id: string, code?: string): Promise<void> {
    await this.del(CACHE_KEYS.LAW_BY_ID(id));
    if (code) {
      await this.del(CACHE_KEYS.LAW_BY_CODE(code));
    }
    await this.del(CACHE_KEYS.ACTIVE_LAWS());
  }

  // ============================================================
  // LEGAL DOCUMENT CACHE METHODS
  // ============================================================

  async getDocumentById<T>(id: string): Promise<T | undefined> {
    return this.get<T>(CACHE_KEYS.DOCUMENT_BY_ID(id));
  }

  async setDocumentById<T>(id: string, doc: T): Promise<void> {
    await this.set(CACHE_KEYS.DOCUMENT_BY_ID(id), doc, CACHE_TTL.LEGAL_DOCUMENT);
  }

  async getLatestDocument<T>(type: string, locale: string): Promise<T | undefined> {
    return this.get<T>(CACHE_KEYS.LATEST_DOCUMENT(type, locale));
  }

  async setLatestDocument<T>(type: string, locale: string, doc: T): Promise<void> {
    await this.set(CACHE_KEYS.LATEST_DOCUMENT(type, locale), doc, CACHE_TTL.ACTIVE_DOCUMENTS);
  }

  async invalidateDocument(id: string, type?: string, locale?: string): Promise<void> {
    await this.del(CACHE_KEYS.DOCUMENT_BY_ID(id));
    if (type) {
      await this.del(CACHE_KEYS.DOCUMENTS_BY_TYPE(type));
      if (locale) {
        await this.del(CACHE_KEYS.LATEST_DOCUMENT(type, locale));
        await this.del(CACHE_KEYS.ACTIVE_DOCUMENTS_BY_TYPE(type, locale));
      }
    }
  }

  // ============================================================
  // CONSENT CACHE METHODS
  // ============================================================

  async getConsentById<T>(id: string): Promise<T | undefined> {
    return this.get<T>(CACHE_KEYS.CONSENT_BY_ID(id));
  }

  async setConsentById<T>(id: string, consent: T): Promise<void> {
    await this.set(CACHE_KEYS.CONSENT_BY_ID(id), consent, CACHE_TTL.CONSENT);
  }

  async getConsentsByAccount<T>(accountId: string): Promise<T | undefined> {
    return this.get<T>(CACHE_KEYS.CONSENTS_BY_ACCOUNT(accountId));
  }

  async setConsentsByAccount<T>(accountId: string, consents: T): Promise<void> {
    await this.set(CACHE_KEYS.CONSENTS_BY_ACCOUNT(accountId), consents, CACHE_TTL.CONSENT);
  }

  async getConsentStatus(accountId: string, documentId: string): Promise<string | undefined> {
    return this.get<string>(CACHE_KEYS.CONSENT_STATUS(accountId, documentId));
  }

  async setConsentStatus(accountId: string, documentId: string, status: string): Promise<void> {
    await this.set(CACHE_KEYS.CONSENT_STATUS(accountId, documentId), status, CACHE_TTL.CONSENT);
  }

  async invalidateConsent(id: string, accountId: string, documentId?: string): Promise<void> {
    await this.del(CACHE_KEYS.CONSENT_BY_ID(id));
    await this.del(CACHE_KEYS.CONSENTS_BY_ACCOUNT(accountId));
    if (documentId) {
      await this.del(CACHE_KEYS.CONSENT_STATUS(accountId, documentId));
    }
  }

  // ============================================================
  // DSR REQUEST CACHE METHODS
  // ============================================================

  async getDsrById<T>(id: string): Promise<T | undefined> {
    return this.get<T>(CACHE_KEYS.DSR_BY_ID(id));
  }

  async setDsrById<T>(id: string, dsr: T): Promise<void> {
    await this.set(CACHE_KEYS.DSR_BY_ID(id), dsr, CACHE_TTL.DSR_REQUEST);
  }

  async invalidateDsr(id: string, accountId?: string): Promise<void> {
    await this.del(CACHE_KEYS.DSR_BY_ID(id));
    await this.del(CACHE_KEYS.PENDING_DSR_COUNT());
    await this.del(CACHE_KEYS.OVERDUE_DSR());
    if (accountId) {
      await this.del(CACHE_KEYS.DSR_BY_ACCOUNT(accountId));
    }
  }
}
