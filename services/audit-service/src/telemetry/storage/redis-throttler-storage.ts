import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ThrottlerStorage } from '@nestjs/throttler';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-backed throttler storage using Valkey (Redis-compatible)
 * Provides distributed rate limiting across multiple service instances
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const throttlerKey = `throttler:${throttlerName}:${key}`;
    const blockKey = `throttler:block:${throttlerName}:${key}`;

    // Check if currently blocked
    const blockExpiry = await this.cacheManager.get<number>(blockKey);
    if (blockExpiry && Date.now() < blockExpiry) {
      return {
        totalHits: limit + 1,
        timeToExpire: ttl,
        isBlocked: true,
        timeToBlockExpire: blockExpiry - Date.now(),
      };
    }

    // Get current hit count
    const currentHits = (await this.cacheManager.get<number>(throttlerKey)) || 0;
    const newHits = currentHits + 1;

    // Store incremented count
    await this.cacheManager.set(throttlerKey, newHits, ttl);

    // Check if limit exceeded
    if (newHits > limit && blockDuration > 0) {
      const blockExpiry = Date.now() + blockDuration;
      await this.cacheManager.set(blockKey, blockExpiry, blockDuration);

      return {
        totalHits: newHits,
        timeToExpire: ttl,
        isBlocked: true,
        timeToBlockExpire: blockDuration,
      };
    }

    return {
      totalHits: newHits,
      timeToExpire: ttl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
