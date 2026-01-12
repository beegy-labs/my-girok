/**
 * Permission Cache
 *
 * Multi-level caching for permission checks.
 * L1: In-memory LRU cache (30s TTL)
 * L2: Valkey/Redis cache (5min TTL)
 * Bloom Filter: Fast negative lookup
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LRUCache } from 'lru-cache';
import Redis from 'ioredis';
import { BloomFilter, buildPermissionCacheKey } from './bloom-filter';

/**
 * Cache configuration
 */
export interface CacheConfig {
  l1MaxItems: number;
  l1TtlMs: number;
  l2TtlSec: number;
  bloomExpectedItems: number;
  bloomFalsePositiveRate: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  l1MaxItems: 10000,
  l1TtlMs: 30000, // 30 seconds
  l2TtlSec: 300, // 5 minutes
  bloomExpectedItems: 100000,
  bloomFalsePositiveRate: 0.01,
};

/**
 * Permission cache result
 */
export type CacheResult = {
  hit: boolean;
  value?: boolean;
  source?: 'l1' | 'l2' | 'bloom';
};

@Injectable()
export class PermissionCache implements OnModuleInit {
  private readonly logger = new Logger(PermissionCache.name);

  private l1Cache: LRUCache<string, boolean>;
  private l2Client: Redis | null = null;
  private bloomFilter: BloomFilter;
  private readonly config: CacheConfig;

  // Metrics
  private l1Hits = 0;
  private l1Misses = 0;
  private l2Hits = 0;
  private l2Misses = 0;
  private bloomNegatives = 0;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      l1MaxItems: this.configService.get<number>('cache.l1MaxItems', DEFAULT_CONFIG.l1MaxItems),
      l1TtlMs: this.configService.get<number>('cache.l1TtlMs', DEFAULT_CONFIG.l1TtlMs),
      l2TtlSec: this.configService.get<number>('cache.l2TtlSec', DEFAULT_CONFIG.l2TtlSec),
      bloomExpectedItems: this.configService.get<number>(
        'cache.bloomExpectedItems',
        DEFAULT_CONFIG.bloomExpectedItems,
      ),
      bloomFalsePositiveRate: this.configService.get<number>(
        'cache.bloomFalsePositiveRate',
        DEFAULT_CONFIG.bloomFalsePositiveRate,
      ),
    };

    // Initialize L1 cache
    this.l1Cache = new LRUCache<string, boolean>({
      max: this.config.l1MaxItems,
      ttl: this.config.l1TtlMs,
    });

    // Initialize Bloom filter
    this.bloomFilter = new BloomFilter(
      this.config.bloomExpectedItems,
      this.config.bloomFalsePositiveRate,
    );
  }

  async onModuleInit() {
    // Initialize L2 (Valkey/Redis) connection
    const valkeyUrl = this.configService.get<string>('VALKEY_URL');

    if (valkeyUrl) {
      try {
        this.l2Client = new Redis(valkeyUrl, {
          keyPrefix: 'authz:perm:',
          lazyConnect: true,
          retryStrategy: (times) => Math.min(times * 100, 3000),
        });

        await this.l2Client.connect();
        this.logger.log('Connected to Valkey for L2 cache');
      } catch (error) {
        this.logger.warn(`Failed to connect to Valkey: ${error}. L2 cache disabled.`);
        this.l2Client = null;
      }
    } else {
      this.logger.log('Valkey URL not configured, L2 cache disabled');
    }
  }

  /**
   * Get permission from cache
   */
  async get(user: string, relation: string, object: string): Promise<CacheResult> {
    const key = buildPermissionCacheKey(user, relation, object);

    // Check Bloom filter first (fast negative)
    if (!this.bloomFilter.mightContain(key)) {
      this.bloomNegatives++;
      return { hit: true, value: false, source: 'bloom' };
    }

    // Check L1 cache
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== undefined) {
      this.l1Hits++;
      return { hit: true, value: l1Value, source: 'l1' };
    }
    this.l1Misses++;

    // Check L2 cache
    if (this.l2Client) {
      try {
        const l2Value = await this.l2Client.get(key);
        if (l2Value !== null) {
          this.l2Hits++;
          const value = l2Value === 'true';
          // Promote to L1
          this.l1Cache.set(key, value);
          return { hit: true, value, source: 'l2' };
        }
        this.l2Misses++;
      } catch (error) {
        this.logger.debug(`L2 cache get error: ${error}`);
      }
    }

    return { hit: false };
  }

  /**
   * Set permission in cache
   */
  async set(user: string, relation: string, object: string, allowed: boolean): Promise<void> {
    const key = buildPermissionCacheKey(user, relation, object);

    // Set in L1
    this.l1Cache.set(key, allowed);

    // Add to Bloom filter if allowed
    if (allowed) {
      this.bloomFilter.add(key);
    }

    // Set in L2
    if (this.l2Client) {
      try {
        await this.l2Client.setex(key, this.config.l2TtlSec, allowed ? 'true' : 'false');
      } catch (error) {
        this.logger.debug(`L2 cache set error: ${error}`);
      }
    }
  }

  /**
   * Invalidate a specific permission
   */
  async invalidate(user: string, relation: string, object: string): Promise<void> {
    const key = buildPermissionCacheKey(user, relation, object);

    // Remove from L1
    this.l1Cache.delete(key);

    // Remove from L2
    if (this.l2Client) {
      try {
        await this.l2Client.del(key);
      } catch (error) {
        this.logger.debug(`L2 cache delete error: ${error}`);
      }
    }

    // Note: Cannot remove from Bloom filter (it doesn't support deletion)
  }

  /**
   * Invalidate all permissions for a user
   */
  async invalidateUser(user: string): Promise<void> {
    // L1: Scan and delete matching keys
    for (const key of this.l1Cache.keys()) {
      if (key.startsWith(`${user}|`)) {
        this.l1Cache.delete(key);
      }
    }

    // L2: Use SCAN to find and delete keys
    if (this.l2Client) {
      try {
        const pattern = `authz:perm:${user}|*`;
        let cursor = '0';
        do {
          const [newCursor, keys] = await this.l2Client.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100,
          );
          cursor = newCursor;
          if (keys.length > 0) {
            await this.l2Client.del(...keys);
          }
        } while (cursor !== '0');
      } catch (error) {
        this.logger.debug(`L2 cache invalidateUser error: ${error}`);
      }
    }
  }

  /**
   * Invalidate all permissions for an object
   */
  async invalidateObject(object: string): Promise<void> {
    // L1: Scan and delete matching keys
    for (const key of this.l1Cache.keys()) {
      if (key.endsWith(`|${object}`)) {
        this.l1Cache.delete(key);
      }
    }

    // L2: Use SCAN to find and delete keys
    if (this.l2Client) {
      try {
        const pattern = `authz:perm:*|${object}`;
        let cursor = '0';
        do {
          const [newCursor, keys] = await this.l2Client.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100,
          );
          cursor = newCursor;
          if (keys.length > 0) {
            await this.l2Client.del(...keys);
          }
        } while (cursor !== '0');
      } catch (error) {
        this.logger.debug(`L2 cache invalidateObject error: ${error}`);
      }
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    // Clear L1
    this.l1Cache.clear();

    // Clear Bloom filter
    this.bloomFilter.clear();

    // Clear L2
    if (this.l2Client) {
      try {
        const pattern = 'authz:perm:*';
        let cursor = '0';
        do {
          const [newCursor, keys] = await this.l2Client.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100,
          );
          cursor = newCursor;
          if (keys.length > 0) {
            await this.l2Client.del(...keys);
          }
        } while (cursor !== '0');
      } catch (error) {
        this.logger.debug(`L2 cache clear error: ${error}`);
      }
    }

    // Reset metrics
    this.l1Hits = 0;
    this.l1Misses = 0;
    this.l2Hits = 0;
    this.l2Misses = 0;
    this.bloomNegatives = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    l1: { hits: number; misses: number; size: number; hitRate: number };
    l2: { hits: number; misses: number; hitRate: number; connected: boolean };
    bloom: { negatives: number; fillRatio: number; estimatedFPR: number };
  } {
    const l1Total = this.l1Hits + this.l1Misses;
    const l2Total = this.l2Hits + this.l2Misses;

    return {
      l1: {
        hits: this.l1Hits,
        misses: this.l1Misses,
        size: this.l1Cache.size,
        hitRate: l1Total > 0 ? this.l1Hits / l1Total : 0,
      },
      l2: {
        hits: this.l2Hits,
        misses: this.l2Misses,
        hitRate: l2Total > 0 ? this.l2Hits / l2Total : 0,
        connected: this.l2Client !== null,
      },
      bloom: {
        negatives: this.bloomNegatives,
        fillRatio: this.bloomFilter.getFillRatio(),
        estimatedFPR: this.bloomFilter.estimateFalsePositiveRate(),
      },
    };
  }
}
