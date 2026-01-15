import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthCheckResult } from './health-indicator.interface';

/**
 * ClickHouse client interface for health check
 * Compatible with @clickhouse/client
 */
export interface ClickHouseHealthCheckAdapter {
  query(options: { query: string }): Promise<unknown>;
}

/**
 * ClickHouse Health Indicator
 *
 * Checks ClickHouse connectivity via simple query.
 * Critical for analytics and audit services.
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: ClickHouseHealthIndicator,
 *       useFactory: (clickhouse: ClickHouseService) =>
 *         new ClickHouseHealthIndicator(clickhouse),
 *       inject: [ClickHouseService],
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class ClickHouseHealthIndicator implements HealthIndicator {
  private readonly logger = new Logger(ClickHouseHealthIndicator.name);

  readonly name = 'clickhouse';
  readonly critical: boolean;

  constructor(
    private readonly clickhouse: ClickHouseHealthCheckAdapter,
    options: { critical?: boolean } = {},
  ) {
    this.critical = options.critical ?? true; // Default: critical for analytics
  }

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      await this.clickhouse.query({ query: 'SELECT 1' });
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('ClickHouse health check failed', error);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'ClickHouse connection failed',
      };
    }
  }
}
