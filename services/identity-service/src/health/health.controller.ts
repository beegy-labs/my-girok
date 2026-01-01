import { Controller, Get, Inject, Optional } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Public } from '../common/decorators/public.decorator';
import { IdentityPrismaService } from '../database/identity-prisma.service';

/**
 * Service startup status tracking
 */
interface StartupStatus {
  database: boolean;
  cache: boolean;
  ready: boolean;
  startedAt: Date | null;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startupStatus: StartupStatus = {
    database: false,
    cache: false,
    ready: false,
    startedAt: null,
  };

  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly prisma: IdentityPrismaService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {
    // Mark startup time
    this.startupStatus.startedAt = new Date();

    // Initialize startup checks asynchronously
    this.performStartupChecks();
  }

  /**
   * Perform initial startup checks
   */
  private async performStartupChecks(): Promise<void> {
    try {
      // Check database
      await this.prisma.$queryRaw`SELECT 1`;
      this.startupStatus.database = true;

      // Check cache (if available)
      if (this.cacheManager) {
        await this.cacheManager.set('health:startup', 'ok', 1000);
        const value = await this.cacheManager.get('health:startup');
        this.startupStatus.cache = value === 'ok';
      } else {
        this.startupStatus.cache = true; // Skip if no cache configured
      }

      this.startupStatus.ready = this.startupStatus.database && this.startupStatus.cache;
    } catch (error) {
      // Log but don't throw - let probes handle failure detection
      console.error('Startup check failed:', error);
    }
  }

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

  @Get('startup')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Kubernetes startup probe',
    description:
      'Returns 200 once the service has completed initial startup. Used to detect slow-starting containers.',
  })
  @ApiResponse({ status: 200, description: 'Service has completed startup' })
  @ApiResponse({ status: 503, description: 'Service is still starting up' })
  async startup(): Promise<HealthCheckResult> {
    return this.health.check([() => this.checkStartupStatus()]);
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.checkDatabase('identity_db'),
      () => this.checkCache('cache'),
    ]);
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
      // Cache check
      () => this.checkCache('cache'),
      // Memory check
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
      // Disk check (90% threshold)
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * Custom startup status check
   */
  private async checkStartupStatus(): Promise<HealthIndicatorResult> {
    const uptimeMs = this.startupStatus.startedAt
      ? Date.now() - this.startupStatus.startedAt.getTime()
      : 0;

    if (this.startupStatus.ready) {
      return {
        startup: {
          status: 'up',
          database: this.startupStatus.database,
          cache: this.startupStatus.cache,
          uptimeMs,
        },
      };
    }

    // Re-check if not yet ready (might have initialized since last check)
    await this.performStartupChecks();

    if (this.startupStatus.ready) {
      return {
        startup: {
          status: 'up',
          database: this.startupStatus.database,
          cache: this.startupStatus.cache,
          uptimeMs,
        },
      };
    }

    throw new Error(
      `Startup incomplete: database=${this.startupStatus.database}, cache=${this.startupStatus.cache}`,
    );
  }

  /**
   * Custom database health check using Prisma
   */
  private async checkDatabase(name: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTimeMs = Date.now() - startTime;
      return {
        [name]: {
          status: 'up',
          responseTimeMs,
        },
      };
    } catch (error) {
      return {
        [name]: {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Custom cache (Redis/Valkey) health check
   */
  private async checkCache(name: string): Promise<HealthIndicatorResult> {
    if (!this.cacheManager) {
      return {
        [name]: {
          status: 'up',
          message: 'Cache not configured',
        },
      };
    }

    const startTime = Date.now();
    const testKey = `health:${Date.now()}`;
    const testValue = 'ping';

    try {
      // Write test value
      await this.cacheManager.set(testKey, testValue, 5000);

      // Read it back
      const retrieved = await this.cacheManager.get(testKey);

      // Cleanup
      await this.cacheManager.del(testKey);

      const responseTimeMs = Date.now() - startTime;

      if (retrieved === testValue) {
        return {
          [name]: {
            status: 'up',
            responseTimeMs,
          },
        };
      }

      throw new Error('Cache read/write mismatch');
    } catch (error) {
      return {
        [name]: {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
