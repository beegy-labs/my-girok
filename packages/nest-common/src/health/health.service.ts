import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { HealthIndicator, HealthCheckResult, HEALTH_INDICATORS } from './indicators';
import { GracefulShutdownService } from './graceful-shutdown.service';

/**
 * Aggregated health check result
 */
export interface AggregatedHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheckResult & { critical: boolean }>;
}

/**
 * Health Service
 *
 * Orchestrates health checks across all registered indicators.
 * Follows 2025-2026 Kubernetes best practices:
 *
 * - Liveness: Process alive (no dependency checks)
 * - Startup: App initialized (no dependency checks)
 * - Readiness: Critical dependencies only
 * - Health: All indicators for monitoring
 *
 * @example
 * ```typescript
 * // Services inject their own indicators
 * @Module({
 *   providers: [
 *     PostgresHealthIndicator,
 *     ValkeyHealthIndicator,
 *     {
 *       provide: HEALTH_INDICATORS,
 *       useFactory: (pg, valkey) => [pg, valkey],
 *       inject: [PostgresHealthIndicator, ValkeyHealthIndicator],
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();
  private isInitialized = false;

  constructor(
    private readonly shutdownService: GracefulShutdownService,
    @Optional() @Inject(HEALTH_INDICATORS) private readonly indicators: HealthIndicator[] = [],
  ) {
    // Mark as initialized after a short delay to allow dependencies to connect
    setTimeout(() => {
      this.isInitialized = true;
      this.logger.log('Health service initialized');
    }, 100);
  }

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Check if app is initialized (for startup probe)
   */
  isAppInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if app is alive (for liveness probe)
   * Always returns true if we can respond
   */
  isAlive(): boolean {
    return true;
  }

  /**
   * Check if app is ready to receive traffic (for readiness probe)
   * Checks shutdown state and critical indicators
   */
  async isReady(): Promise<{ ready: boolean; checks: Record<string, HealthCheckResult> }> {
    // First check shutdown state
    if (!this.shutdownService.isServiceReady()) {
      return { ready: false, checks: {} };
    }

    // Check critical indicators only
    const criticalIndicators = this.indicators.filter((i) => i.critical);
    if (criticalIndicators.length === 0) {
      return { ready: true, checks: {} };
    }

    const results = await Promise.all(
      criticalIndicators.map(async (indicator) => ({
        name: indicator.name,
        result: await indicator.check(),
      })),
    );

    const checks: Record<string, HealthCheckResult> = {};
    let allUp = true;

    for (const { name, result } of results) {
      checks[name] = result;
      if (result.status === 'down') {
        allUp = false;
      }
    }

    return { ready: allUp, checks };
  }

  /**
   * Get comprehensive health status (for /health endpoint)
   * Checks all indicators for monitoring purposes
   */
  async getHealth(): Promise<AggregatedHealthResult> {
    const checks: Record<string, HealthCheckResult & { critical: boolean }> = {};

    if (this.indicators.length === 0) {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        checks: {},
      };
    }

    const results = await Promise.all(
      this.indicators.map(async (indicator) => ({
        name: indicator.name,
        critical: indicator.critical,
        result: await indicator.check(),
      })),
    );

    let hasDown = false;
    let hasCriticalDown = false;

    for (const { name, critical, result } of results) {
      checks[name] = { ...result, critical };
      if (result.status === 'down') {
        hasDown = true;
        if (critical) {
          hasCriticalDown = true;
        }
      }
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (hasCriticalDown) {
      status = 'unhealthy';
    } else if (hasDown) {
      status = 'degraded'; // Non-critical failure
    } else {
      status = 'healthy';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      checks,
    };
  }

  /**
   * Mark app as initialized (call after startup tasks complete)
   */
  markInitialized(): void {
    this.isInitialized = true;
    this.logger.log('Application marked as initialized');
  }
}
