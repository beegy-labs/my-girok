import { Module, Global } from '@nestjs/common';
import { HealthController } from './health.controller';
import { GracefulShutdownService } from './graceful-shutdown.service';

/**
 * Health Module
 * Provides health check endpoints and graceful shutdown support for Kubernetes
 *
 * Features:
 * - /health/live - Liveness probe
 * - /health/ready - Readiness probe (respects shutdown state)
 * - /health - General health check
 * - Graceful shutdown service for SIGTERM handling
 *
 * @example
 * ```typescript
 * import { HealthModule } from '@my-girok/nest-common';
 *
 * @Module({
 *   imports: [HealthModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [GracefulShutdownService],
  exports: [GracefulShutdownService],
})
export class HealthModule {}
