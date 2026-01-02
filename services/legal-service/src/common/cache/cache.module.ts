import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheService } from './cache.service';

/**
 * Cache Module for legal-service
 *
 * Provides centralized caching using NestJS cache-manager with Valkey/Redis.
 *
 * Environment variables:
 * - REDIS_HOST: Redis/Valkey host (default: localhost)
 * - REDIS_PORT: Redis/Valkey port (default: 6379)
 * - REDIS_PASSWORD: Redis/Valkey password (optional)
 * - REDIS_DB: Redis/Valkey database number (default: 0)
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const logger = new Logger('CacheModule');
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);
        const password = config.get<string>('REDIS_PASSWORD');
        const db = config.get<number>('REDIS_DB', 0);

        // Use in-memory cache if Redis is not configured
        if (!host || host === 'localhost' || host === '127.0.0.1') {
          logger.log('Using in-memory cache (no REDIS_HOST configured for production)');
          return {
            ttl: 300000, // 5 minutes default TTL
            max: 5000, // Max items in cache
          };
        }

        // Build Redis URL
        const authPart = password ? `:${password}@` : '';
        const redisUrl = `redis://${authPart}${host}:${port}/${db}`;

        logger.log(`Connecting to Redis/Valkey at ${host}:${port}`);

        return {
          stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
          ttl: 300000, // 5 minutes default TTL
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {
  private readonly logger = new Logger(CacheModule.name);

  constructor() {
    this.logger.log('Legal cache module initialized');
  }
}
