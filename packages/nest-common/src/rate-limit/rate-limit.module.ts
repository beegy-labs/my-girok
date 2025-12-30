import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitModuleOptions, createThrottlerConfig, RateLimitTiers } from './rate-limit.config';
import { RedisThrottlerStorage } from './redis-throttler-storage';

/**
 * Rate Limiting Module for NestJS services.
 *
 * Provides configurable rate limiting using @nestjs/throttler
 * with support for Redis/Valkey storage for distributed deployments.
 *
 * Features:
 * - Pre-configured rate limit tiers (STANDARD, AUTH, ADMIN, etc.)
 * - Redis/Valkey storage for distributed rate limiting
 * - Custom throttler configurations
 * - IP-based skip lists
 * - Customizable error messages
 *
 * @example
 * ```typescript
 * // Basic usage with defaults (100 req/min)
 * @Module({
 *   imports: [RateLimitModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // With custom configuration
 * @Module({
 *   imports: [
 *     RateLimitModule.forRoot({
 *       defaultTier: 'AUTH',
 *       redisUrl: 'redis://localhost:6379',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // In controllers, use @Throttle decorator for specific limits
 * @Throttle({ default: { limit: 5, ttl: 60000 } })
 * @Post('login')
 * async login() {}
 *
 * // Skip throttling for specific endpoints
 * @SkipThrottle()
 * @Get('health')
 * async health() {}
 * ```
 */
@Module({})
export class RateLimitModule {
  /**
   * Register the module with static configuration.
   */
  static forRoot(options?: RateLimitModuleOptions): DynamicModule {
    const throttlers = createThrottlerConfig(options);
    const providers: Provider[] = [
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
      {
        provide: 'RATE_LIMIT_OPTIONS',
        useValue: options ?? {},
      },
    ];

    // Add Redis storage provider if redisUrl is specified
    if (options?.redisUrl) {
      providers.push({
        provide: ThrottlerStorage,
        useFactory: () =>
          new RedisThrottlerStorage({
            url: options.redisUrl!,
            keyPrefix: options.keyPrefix ?? 'throttle:',
          }),
      });
    }

    return {
      module: RateLimitModule,
      imports: [
        ThrottlerModule.forRoot({
          throttlers,
          storage: options?.redisUrl ? undefined : undefined, // Use default in-memory if no Redis
        }),
      ],
      providers,
      exports: [ThrottlerModule],
    };
  }

  /**
   * Register the module with async configuration from ConfigService.
   * Automatically uses Redis storage if VALKEY_URL or REDIS_URL is configured.
   */
  static forRootAsync(): DynamicModule {
    return {
      module: RateLimitModule,
      imports: [
        ConfigModule,
        ThrottlerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const tier = configService.get<string>('RATE_LIMIT_TIER', 'STANDARD');
            const tierConfig =
              RateLimitTiers[tier as keyof typeof RateLimitTiers] ?? RateLimitTiers.STANDARD;

            // Check for Redis/Valkey URL from environment
            const redisUrl =
              configService.get<string>('VALKEY_URL') ||
              configService.get<string>('REDIS_URL') ||
              buildRedisUrl(configService);

            return {
              throttlers: [tierConfig],
              storage: redisUrl
                ? new RedisThrottlerStorage({
                    url: redisUrl,
                    keyPrefix: configService.get<string>('RATE_LIMIT_KEY_PREFIX', 'throttle:'),
                  })
                : undefined,
            };
          },
        }),
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
      exports: [ThrottlerModule],
    };
  }
}

/**
 * Build Redis URL from individual config values (valkey.host, valkey.port, etc.)
 */
function buildRedisUrl(configService: ConfigService): string | undefined {
  const host = configService.get<string>('valkey.host');
  const port = configService.get<number>('valkey.port');

  if (!host || !port) {
    return undefined;
  }

  const password = configService.get<string>('valkey.password');
  const db = configService.get<number>('valkey.db', 0);

  const authPart = password ? `:${password}@` : '';
  return `redis://${authPart}${host}:${port}/${db}`;
}
