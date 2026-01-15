import { Module, Global, DynamicModule, Type } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { HealthIndicator, HEALTH_INDICATORS } from './indicators';

/**
 * Health Module Options
 */
export interface HealthModuleOptions {
  /**
   * Health indicators to register
   * These will be checked during readiness probes (if critical)
   * and comprehensive health checks
   */
  indicators?: Type<HealthIndicator>[];
}

/**
 * Health Module
 *
 * Provides Kubernetes-compatible health check endpoints following 2025-2026 best practices.
 *
 * Features:
 * - /health/live - Liveness probe (no dependency checks)
 * - /health/startup - Startup probe (initialization complete)
 * - /health/ready - Readiness probe (critical dependencies only)
 * - /health - Comprehensive health check (all indicators)
 * - Graceful shutdown service for SIGTERM handling
 *
 * @example Basic usage (no custom indicators)
 * ```typescript
 * @Module({
 *   imports: [HealthModule],
 * })
 * export class AppModule {}
 * ```
 *
 * @example With custom indicators
 * ```typescript
 * @Module({
 *   imports: [
 *     HealthModule.forRoot({
 *       indicators: [PostgresHealthIndicator, ValkeyHealthIndicator],
 *     }),
 *   ],
 *   providers: [
 *     {
 *       provide: PostgresHealthIndicator,
 *       useFactory: (prisma) => new PostgresHealthIndicator(prisma),
 *       inject: [PrismaService],
 *     },
 *     {
 *       provide: ValkeyHealthIndicator,
 *       useFactory: (cache) => new ValkeyHealthIndicator(cache, { critical: false }),
 *       inject: [CacheService],
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example Manual indicator registration (recommended for complex setups)
 * ```typescript
 * @Module({
 *   imports: [HealthModule],
 *   providers: [
 *     {
 *       provide: HEALTH_INDICATORS,
 *       useFactory: (prisma, cache) => [
 *         new PostgresHealthIndicator(prisma),
 *         new ValkeyHealthIndicator(cache, { critical: false }),
 *       ],
 *       inject: [PrismaService, CacheService],
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    GracefulShutdownService,
    {
      provide: HEALTH_INDICATORS,
      useValue: [], // Default: no indicators
    },
  ],
  exports: [HealthService, GracefulShutdownService],
})
export class HealthModule {
  /**
   * Configure health module with custom indicators
   */
  static forRoot(options: HealthModuleOptions = {}): DynamicModule {
    const providers: any[] = [HealthService, GracefulShutdownService];

    if (options.indicators && options.indicators.length > 0) {
      providers.push({
        provide: HEALTH_INDICATORS,
        useFactory: (...indicators: HealthIndicator[]) => indicators,
        inject: options.indicators,
      });
    } else {
      providers.push({
        provide: HEALTH_INDICATORS,
        useValue: [],
      });
    }

    return {
      module: HealthModule,
      global: true,
      controllers: [HealthController],
      providers,
      exports: [HealthService, GracefulShutdownService],
    };
  }
}
