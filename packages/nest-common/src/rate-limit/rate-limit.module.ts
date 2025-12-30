import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitModuleOptions, createThrottlerConfig, RateLimitTiers } from './rate-limit.config';
import { RedisThrottlerStorage, RedisThrottlerStorageOptions } from './redis-throttler-storage';
import {
  RateLimitGuard,
  IP_SPOOFING_PROTECTION_OPTIONS,
  IpSpoofingProtectionOptions,
} from './rate-limit.guard';

/**
 * Helper function to create RedisThrottlerStorage with all options.
 * Centralizes storage creation logic to avoid duplication.
 */
function createRedisThrottlerStorage(
  url: string,
  options?: Partial<Omit<RedisThrottlerStorageOptions, 'url'>>,
): RedisThrottlerStorage {
  return new RedisThrottlerStorage({
    url,
    keyPrefix: options?.keyPrefix ?? 'throttle:',
    connectTimeout: options?.connectTimeout,
    commandTimeout: options?.commandTimeout,
    tls: options?.tls,
    enableFallback: options?.enableFallback,
    circuitBreakerThreshold: options?.circuitBreakerThreshold,
    circuitBreakerResetTime: options?.circuitBreakerResetTime,
  });
}

/**
 * Token for Redis throttler storage provider
 */
export const REDIS_THROTTLER_STORAGE = 'REDIS_THROTTLER_STORAGE';

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
   * Uses factory provider pattern for proper DI and lifecycle management.
   */
  static forRoot(options?: RateLimitModuleOptions): DynamicModule {
    const throttlers = createThrottlerConfig(options);

    const providers: Provider[] = [
      {
        provide: APP_GUARD,
        useClass: RateLimitGuard,
      },
      {
        provide: 'RATE_LIMIT_OPTIONS',
        useValue: options ?? {},
      },
      // Provide IP spoofing protection options if configured
      {
        provide: IP_SPOOFING_PROTECTION_OPTIONS,
        useValue: options?.trustedProxies
          ? ({
              trustedProxies: options.trustedProxies,
              maxProxyHops: options.maxProxyHops,
              trustXRealIp: options.trustXRealIp,
            } as IpSpoofingProtectionOptions)
          : undefined,
      },
    ];

    // Use factory provider for Redis storage to ensure proper DI and lifecycle management
    if (options?.redisUrl) {
      providers.push({
        provide: REDIS_THROTTLER_STORAGE,
        useFactory: () => {
          return createRedisThrottlerStorage(options.redisUrl!, {
            keyPrefix: options.keyPrefix,
            connectTimeout: options.connectTimeout,
            commandTimeout: options.commandTimeout,
            tls: options.tls,
            enableFallback: options.enableFallback,
            circuitBreakerThreshold: options.circuitBreakerThreshold,
            circuitBreakerResetTime: options.circuitBreakerResetTime,
          });
        },
      });

      // Also register as ThrottlerStorage for ThrottlerModule injection
      providers.push({
        provide: ThrottlerStorage,
        useExisting: REDIS_THROTTLER_STORAGE,
      });

      return {
        module: RateLimitModule,
        imports: [
          ThrottlerModule.forRootAsync({
            useFactory: (storage: RedisThrottlerStorage) => ({
              throttlers,
              storage,
            }),
            inject: [REDIS_THROTTLER_STORAGE],
          }),
        ],
        providers,
        exports: [ThrottlerModule, REDIS_THROTTLER_STORAGE, ThrottlerStorage],
      };
    }

    // No Redis URL - use in-memory storage
    return {
      module: RateLimitModule,
      imports: [
        ThrottlerModule.forRoot({
          throttlers,
        }),
      ],
      providers,
      exports: [ThrottlerModule],
    };
  }

  /**
   * Register the module with async configuration from ConfigService.
   * Automatically uses Redis storage if VALKEY_URL or REDIS_URL is configured.
   * Uses factory provider pattern for proper DI and lifecycle management.
   */
  static forRootAsync(): DynamicModule {
    return {
      module: RateLimitModule,
      imports: [
        ConfigModule,
        ThrottlerModule.forRootAsync({
          imports: [ConfigModule, RateLimitModule.createStorageModule()],
          inject: [ConfigService, { token: REDIS_THROTTLER_STORAGE, optional: true }],
          useFactory: (configService: ConfigService, storage?: RedisThrottlerStorage) => {
            const tier = configService.get<string>('RATE_LIMIT_TIER', 'STANDARD');
            const tierConfig =
              RateLimitTiers[tier as keyof typeof RateLimitTiers] ?? RateLimitTiers.STANDARD;

            return {
              throttlers: [tierConfig],
              storage,
            };
          },
        }),
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: RateLimitGuard,
        },
        // Provide IP spoofing protection options from config
        {
          provide: IP_SPOOFING_PROTECTION_OPTIONS,
          useFactory: (configService: ConfigService): IpSpoofingProtectionOptions | undefined => {
            const trustedProxies = configService.get<string>('RATE_LIMIT_TRUSTED_PROXIES');
            if (!trustedProxies) {
              return undefined;
            }
            return {
              trustedProxies: trustedProxies.split(',').map((p) => p.trim()),
              maxProxyHops: configService.get<number>('RATE_LIMIT_MAX_PROXY_HOPS', 1),
              trustXRealIp: configService.get<boolean>('RATE_LIMIT_TRUST_X_REAL_IP', false),
            };
          },
          inject: [ConfigService],
        },
      ],
      exports: [ThrottlerModule],
    };
  }

  /**
   * Creates a dynamic module that provides RedisThrottlerStorage as a factory provider.
   * This ensures proper DI lifecycle management (onModuleDestroy is called).
   */
  private static createStorageModule(): DynamicModule {
    return {
      module: RateLimitModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: REDIS_THROTTLER_STORAGE,
          useFactory: (configService: ConfigService): RedisThrottlerStorage | undefined => {
            const redisUrl =
              configService.get<string>('VALKEY_URL') ||
              configService.get<string>('REDIS_URL') ||
              buildRedisUrl(configService);

            if (!redisUrl) {
              return undefined;
            }

            return createRedisThrottlerStorage(redisUrl, {
              keyPrefix: configService.get<string>('RATE_LIMIT_KEY_PREFIX', 'throttle:'),
              connectTimeout: configService.get<number>('RATE_LIMIT_CONNECT_TIMEOUT'),
              commandTimeout: configService.get<number>('RATE_LIMIT_COMMAND_TIMEOUT'),
              tls: configService.get<boolean>('RATE_LIMIT_TLS'),
              enableFallback: configService.get<boolean>('RATE_LIMIT_ENABLE_FALLBACK'),
              circuitBreakerThreshold: configService.get<number>(
                'RATE_LIMIT_CIRCUIT_BREAKER_THRESHOLD',
              ),
              circuitBreakerResetTime: configService.get<number>(
                'RATE_LIMIT_CIRCUIT_BREAKER_RESET_TIME',
              ),
            });
          },
          inject: [ConfigService],
        },
        {
          provide: ThrottlerStorage,
          useExisting: REDIS_THROTTLER_STORAGE,
        },
      ],
      exports: [REDIS_THROTTLER_STORAGE, ThrottlerStorage],
    };
  }
}

/**
 * Build Redis URL from individual config values (valkey.host, valkey.port, etc.)
 * Properly URL-encodes password to handle special characters.
 */
function buildRedisUrl(configService: ConfigService): string | undefined {
  const host = configService.get<string>('valkey.host');
  const port = configService.get<number>('valkey.port');

  if (!host || !port) {
    return undefined;
  }

  const password = configService.get<string>('valkey.password');
  const db = configService.get<number>('valkey.db', 0);

  // URL-encode password to handle special characters like :, @, /
  const authPart = password ? `:${encodeURIComponent(password)}@` : '';
  return `redis://${authPart}${host}:${port}/${db}`;
}
