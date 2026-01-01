import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../guards/api-key.guard';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CacheService } from '../cache';

/**
 * Health status response
 */
interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    cache: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'ok' | 'error';
  latencyMs?: number;
  message?: string;
}

/**
 * Health Controller
 *
 * Provides Kubernetes-compatible health check endpoints:
 * - /health: Overall health status with component details
 * - /health/ready: Readiness probe (ready to accept traffic)
 * - /health/live: Liveness probe (process is alive)
 *
 * 2026 Best Practices:
 * - Detailed component health checks
 * - Latency measurements
 * - Graceful degradation support
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();
  private readonly version: string;

  constructor(
    private readonly prisma: IdentityPrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.version = this.configService.get<string>('version', '1.0.0');
  }

  /**
   * Comprehensive health check
   * Returns detailed status of all components
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comprehensive health status' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async getHealth(): Promise<HealthStatus> {
    const [dbHealth, cacheHealth] = await Promise.all([this.checkDatabase(), this.checkCache()]);

    const allOk = dbHealth.status === 'ok' && cacheHealth.status === 'ok';
    const anyError = dbHealth.status === 'error' || cacheHealth.status === 'error';

    const status: HealthStatus = {
      status: allOk ? 'ok' : anyError ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: this.version,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {
        database: dbHealth,
        cache: cacheHealth,
      },
    };

    if (status.status === 'unhealthy') {
      this.logger.error('Health check failed', { checks: status.checks });
    }

    return status;
  }

  /**
   * Readiness probe
   * Used by Kubernetes to determine if the pod is ready to receive traffic
   * Returns 200 only if all critical dependencies are available
   */
  @Get('ready')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async getReady(): Promise<{ ready: boolean }> {
    const [dbHealth, cacheHealth] = await Promise.all([this.checkDatabase(), this.checkCache()]);

    const ready = dbHealth.status === 'ok' && cacheHealth.status === 'ok';

    if (!ready) {
      this.logger.warn('Readiness check failed', { dbHealth, cacheHealth });
      // Return 503 for not ready
      throw new ServiceUnavailableException('Service not ready');
    }

    return { ready: true };
  }

  /**
   * Liveness probe
   * Used by Kubernetes to determine if the pod needs to be restarted
   * Returns 200 if the process is alive (no dependency checks)
   */
  @Get('live')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async getLive(): Promise<{ alive: boolean }> {
    // Simple liveness check - if we can respond, we're alive
    return { alive: true };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Check cache connectivity
   */
  private async checkCache(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      const testKey = 'health:check';
      await this.cacheService.set(testKey, 'ok', 1000);
      const result = await this.cacheService.get<string>(testKey);
      await this.cacheService.del(testKey);

      if (result !== 'ok') {
        return {
          status: 'error',
          latencyMs: Date.now() - start,
          message: 'Cache read/write mismatch',
        };
      }

      return {
        status: 'ok',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Cache connection failed',
      };
    }
  }
}

/**
 * Custom exception for service unavailable
 */
import { HttpException } from '@nestjs/common';

class ServiceUnavailableException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
