import { DynamicModule, Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitModuleOptions, createThrottlerConfig, RateLimitTiers } from './rate-limit.config';

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

    return {
      module: RateLimitModule,
      imports: [ThrottlerModule.forRoot(throttlers)],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        {
          provide: 'RATE_LIMIT_OPTIONS',
          useValue: options ?? {},
        },
      ],
      exports: [ThrottlerModule],
    };
  }

  /**
   * Register the module with async configuration from ConfigService.
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

            return [tierConfig];
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
