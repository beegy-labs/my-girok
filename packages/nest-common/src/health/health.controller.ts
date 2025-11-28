import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { Public } from '../decorators/public.decorator';

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  shutdownInProgress?: boolean;
}

/**
 * Health Controller
 * Provides liveness and readiness probe endpoints for Kubernetes
 *
 * Endpoints:
 * - GET /health/live - Liveness probe (is the process running?)
 * - GET /health/ready - Readiness probe (is the service ready for traffic?)
 * - GET /health - General health check (backward compatibility)
 */
@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly shutdownService: GracefulShutdownService) {}

  /**
   * Liveness probe endpoint
   * Returns 200 if the process is running
   * K8s uses this to determine if the container should be restarted
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  live(): HealthCheckResponse {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
    };
  }

  /**
   * Readiness probe endpoint
   * Returns 200 if ready, 503 if shutting down or not ready
   * K8s uses this to determine if traffic should be routed to this pod
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready (shutting down)' })
  ready(@Res() res: Response): void {
    const isReady = this.shutdownService.isServiceReady();
    const statusCode = isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    const response: HealthCheckResponse = {
      status: isReady ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      shutdownInProgress: this.shutdownService.isShutdownInProgress(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * General health check endpoint (backward compatibility)
   * Behaves like readiness probe
   */
  @Get()
  @ApiOperation({ summary: 'General health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  health(@Res() res: Response): void {
    this.ready(res);
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}
