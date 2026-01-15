import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthCheckResult } from './health-indicator.interface';

/**
 * Cache interface for health check
 * Compatible with @nestjs/cache-manager and custom cache services
 */
export interface CacheHealthCheckAdapter {
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  del(key: string): Promise<void>;
}

/**
 * Valkey/Redis Health Indicator
 *
 * Checks Valkey/Redis connectivity via set/get/del operations.
 * By default, this is NOT critical (cache miss fallback is expected).
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: ValkeyHealthIndicator,
 *       useFactory: (cache: CacheService) =>
 *         new ValkeyHealthIndicator(cache, { critical: false }),
 *       inject: [CacheService],
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class ValkeyHealthIndicator implements HealthIndicator {
  private readonly logger = new Logger(ValkeyHealthIndicator.name);

  readonly name = 'valkey';
  readonly critical: boolean;

  constructor(
    private readonly cache: CacheHealthCheckAdapter,
    options: { critical?: boolean } = {},
  ) {
    this.critical = options.critical ?? false; // Default: not critical (cache miss fallback)
  }

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    const testKey = `health:check:${Date.now()}`;

    try {
      await this.cache.set(testKey, 'ok', 1000);
      const result = await this.cache.get<string>(testKey);
      await this.cache.del(testKey);

      if (result !== 'ok') {
        return {
          status: 'down',
          latencyMs: Date.now() - start,
          message: 'Cache read/write mismatch',
        };
      }

      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Valkey health check failed', error);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Cache connection failed',
      };
    }
  }
}
