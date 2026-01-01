import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheTTL } from './cache-ttl.constants';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

/**
 * Global Cache Module with Valkey/Redis support
 * Falls back to in-memory cache if Valkey is not available
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('valkey.host', 'localhost');
        const port = configService.get<number>('valkey.port', 6379);
        const password = configService.get<string>('valkey.password', '');
        const db = configService.get<number>('valkey.db', 0);
        const environment = configService.get<string>('environment', 'development');

        // Use in-memory cache for development/test
        if (environment === 'test') {
          return {
            ttl: CacheTTL.DEFAULT,
            max: 1000,
          };
        }

        try {
          // Build Redis URL
          const authPart = password ? `:${password}@` : '';
          const redisUrl = `redis://${authPart}${host}:${port}/${db}`;

          const keyvRedis = new KeyvRedis(redisUrl);
          const keyv = new Keyv({ store: keyvRedis, namespace: 'identity' });

          return {
            store: keyv,
            ttl: CacheTTL.DEFAULT,
          };
        } catch {
          // Fall back to in-memory if Valkey connection fails
          console.warn('Failed to connect to Valkey, using in-memory cache');
          return {
            ttl: CacheTTL.DEFAULT,
            max: 1000,
          };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheConfigModule {}
