import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthCheckResult } from './health-indicator.interface';

/**
 * PostgreSQL Health Indicator
 *
 * Checks PostgreSQL connectivity via Prisma.
 * Use this indicator in services that depend on PostgreSQL.
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: PostgresHealthIndicator,
 *       useFactory: (prisma: PrismaService) =>
 *         new PostgresHealthIndicator(prisma),
 *       inject: [PrismaService],
 *     },
 *     {
 *       provide: HEALTH_INDICATORS,
 *       useFactory: (postgres: PostgresHealthIndicator) => [postgres],
 *       inject: [PostgresHealthIndicator],
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class PostgresHealthIndicator implements HealthIndicator {
  private readonly logger = new Logger(PostgresHealthIndicator.name);

  readonly name = 'postgres';
  readonly critical = true; // PostgreSQL is always critical

  constructor(
    private readonly prisma: { $queryRaw: (query: TemplateStringsArray) => Promise<unknown> },
  ) {}

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('PostgreSQL health check failed', error);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }
}
