import { Controller, Get, HttpCode, HttpStatus, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService, AggregatedHealthResult } from './health.service';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { Public } from '../decorators/public.decorator';
import { HealthCheckResult } from './indicators';

/**
 * Health Check Response types
 */
export interface LivenessResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}

export interface StartupResponse {
  status: 'ok' | 'starting';
  timestamp: string;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  uptime: number;
  shutdownInProgress: boolean;
  checks?: Record<string, HealthCheckResult>;
}

/**
 * Health Controller
 *
 * Provides Kubernetes-compatible health check endpoints following 2025-2026 best practices:
 *
 * - GET /health/live - Liveness probe (process alive, NO dependency checks)
 * - GET /health/startup - Startup probe (initialization complete)
 * - GET /health/ready - Readiness probe (critical dependencies only)
 * - GET /health - Comprehensive health (all indicators, for monitoring)
 *
 * Key Principles (from Kubernetes docs):
 * 1. Liveness probe should NEVER check external dependencies
 *    - Restarting won't fix external service issues
 *    - Can cause cascading failures
 *
 * 2. Readiness probe should check critical dependencies only
 *    - Non-critical failures should degrade gracefully
 *    - Prevents traffic to unhealthy pods
 *
 * 3. Startup probe prevents premature liveness checks
 *    - Allows slow-starting apps time to initialize
 */
@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly healthService: HealthService,
    private readonly shutdownService: GracefulShutdownService,
  ) {}

  /**
   * Liveness probe endpoint
   *
   * Returns 200 if the process is running.
   * Does NOT check any dependencies (per K8s best practices).
   *
   * K8s uses this to determine if the container should be restarted.
   * A restart won't help if external services are down.
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe (K8s)',
    description: 'Returns 200 if process is alive. Does NOT check dependencies.',
  })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  live(): LivenessResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: this.healthService.getUptime(),
    };
  }

  /**
   * Startup probe endpoint
   *
   * Returns 200 if app initialization is complete.
   * Liveness/readiness probes are disabled until startup succeeds.
   *
   * Use this for apps with slow startup (cache warming, migrations, etc.)
   */
  @Get('startup')
  @ApiOperation({
    summary: 'Startup probe (K8s)',
    description: 'Returns 200 when app initialization is complete.',
  })
  @ApiResponse({ status: 200, description: 'App is initialized' })
  @ApiResponse({ status: 503, description: 'App is still starting' })
  startup(@Res() res: Response): void {
    const isInitialized = this.healthService.isAppInitialized();
    const statusCode = isInitialized ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    const response: StartupResponse = {
      status: isInitialized ? 'ok' : 'starting',
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Readiness probe endpoint
   *
   * Returns 200 if the service is ready to accept traffic.
   * Checks shutdown state and critical dependencies only.
   *
   * K8s uses this to determine if traffic should be routed to this pod.
   * Failed readiness does NOT restart the pod (unlike liveness).
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe (K8s)',
    description: 'Returns 200 if ready to accept traffic. Checks critical dependencies.',
  })
  @ApiResponse({ status: 200, description: 'Ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Not ready (shutting down or dependency failure)' })
  async ready(@Res() res: Response): Promise<void> {
    const { ready, checks } = await this.healthService.isReady();
    const statusCode = ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    const response: ReadinessResponse = {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      uptime: this.healthService.getUptime(),
      shutdownInProgress: this.shutdownService.isShutdownInProgress(),
      checks: Object.keys(checks).length > 0 ? checks : undefined,
    };

    if (!ready) {
      this.logger.warn('Readiness check failed', {
        checks,
        shutdownInProgress: response.shutdownInProgress,
      });
    }

    res.status(statusCode).json(response);
  }

  /**
   * Comprehensive health check endpoint
   *
   * Returns detailed health status of all components.
   * Use this for monitoring dashboards, not for K8s probes.
   *
   * Status meanings:
   * - healthy: All indicators up
   * - degraded: Non-critical indicators down
   * - unhealthy: Critical indicators down
   */
  @Get()
  @ApiOperation({
    summary: 'Comprehensive health check',
    description: 'Returns detailed status of all components. For monitoring, not K8s probes.',
  })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  async health(): Promise<AggregatedHealthResult> {
    return this.healthService.getHealth();
  }
}
