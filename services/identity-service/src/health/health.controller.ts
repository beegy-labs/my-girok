import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { IdentityPrismaService } from '../database/identity-prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly prisma: IdentityPrismaService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Memory check - RSS should be under 512MB
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),
    ]);
  }

  @Get('live')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.checkDatabase('identity_db')]);
  }

  @Get('detailed')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Detailed health check with all indicators' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  @ApiResponse({ status: 503, description: 'One or more components are unhealthy' })
  async detailed(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database check
      () => this.checkDatabase('identity_db'),
      // Memory check
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
      // Disk check (100GB threshold)
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * Custom database health check using Prisma
   */
  private async checkDatabase(name: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        [name]: {
          status: 'up',
        },
      };
    } catch {
      return {
        [name]: {
          status: 'down',
        },
      };
    }
  }
}
