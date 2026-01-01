import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

/**
 * Cache Module
 *
 * Provides centralized caching using NestJS cache-manager.
 * Uses in-memory cache by default, can be configured for Redis/Valkey.
 *
 * To use Redis/Valkey, install @keyv/redis and configure:
 * - VALKEY_HOST
 * - VALKEY_PORT
 * - VALKEY_PASSWORD (optional)
 */
@Global()
@Module({
  imports: [
    NestCacheModule.register({
      // Use in-memory cache with default settings
      // Redis/Valkey can be configured via environment variables in production
      ttl: 300000, // 5 minutes default TTL
      max: 10000, // Max items in cache
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {
  private readonly logger = new Logger(CacheModule.name);

  constructor() {
    this.logger.log('Cache module initialized with in-memory store');
  }
}
