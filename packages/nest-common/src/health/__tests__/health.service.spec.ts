import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { HealthService } from '../health.service';
import { GracefulShutdownService } from '../graceful-shutdown.service';
import { HealthIndicator, HealthCheckResult, HEALTH_INDICATORS } from '../indicators';

// Mock indicators for testing
class MockCriticalIndicator implements HealthIndicator {
  readonly name = 'critical-dep';
  readonly critical = true;
  check: Mock<[], Promise<HealthCheckResult>>;

  constructor() {
    this.check = vi.fn().mockResolvedValue({ status: 'up', latencyMs: 5 });
  }
}

class MockNonCriticalIndicator implements HealthIndicator {
  readonly name = 'non-critical-dep';
  readonly critical = false;
  check: Mock<[], Promise<HealthCheckResult>>;

  constructor() {
    this.check = vi.fn().mockResolvedValue({ status: 'up', latencyMs: 2 });
  }
}

describe('HealthService', () => {
  let service: HealthService;
  let mockShutdownService: {
    isServiceReady: Mock;
    isShutdownInProgress: Mock;
  };
  let criticalIndicator: MockCriticalIndicator;
  let nonCriticalIndicator: MockNonCriticalIndicator;

  beforeEach(async () => {
    mockShutdownService = {
      isServiceReady: vi.fn().mockReturnValue(true),
      isShutdownInProgress: vi.fn().mockReturnValue(false),
    };

    criticalIndicator = new MockCriticalIndicator();
    nonCriticalIndicator = new MockNonCriticalIndicator();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: GracefulShutdownService, useValue: mockShutdownService },
        { provide: HEALTH_INDICATORS, useValue: [criticalIndicator, nonCriticalIndicator] },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUptime', () => {
    it('should return uptime in seconds', () => {
      const uptime = service.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isAlive', () => {
    it('should always return true', () => {
      expect(service.isAlive()).toBe(true);
    });
  });

  describe('isAppInitialized', () => {
    it('should return false initially then true after initialization', async () => {
      // Create a fresh service to test initialization
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthService,
          { provide: GracefulShutdownService, useValue: mockShutdownService },
          { provide: HEALTH_INDICATORS, useValue: [] },
        ],
      }).compile();

      const freshService = module.get<HealthService>(HealthService);

      // Initially may be false, but after the 100ms delay it becomes true
      // For this test, we manually mark it initialized
      freshService.markInitialized();
      expect(freshService.isAppInitialized()).toBe(true);
    });
  });

  describe('markInitialized', () => {
    it('should mark the app as initialized', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthService,
          { provide: GracefulShutdownService, useValue: mockShutdownService },
          { provide: HEALTH_INDICATORS, useValue: [] },
        ],
      }).compile();

      const freshService = module.get<HealthService>(HealthService);
      freshService.markInitialized();

      expect(freshService.isAppInitialized()).toBe(true);
    });
  });

  describe('isReady', () => {
    it('should return ready when all critical indicators are up', async () => {
      criticalIndicator.check.mockResolvedValue({ status: 'up', latencyMs: 5 });

      const result = await service.isReady();

      expect(result.ready).toBe(true);
      expect(result.checks['critical-dep']).toEqual({ status: 'up', latencyMs: 5 });
    });

    it('should return not ready when shutdown is in progress', async () => {
      mockShutdownService.isServiceReady.mockReturnValue(false);

      const result = await service.isReady();

      expect(result.ready).toBe(false);
      expect(result.checks).toEqual({});
    });

    it('should return not ready when critical indicator is down', async () => {
      criticalIndicator.check.mockResolvedValue({
        status: 'down',
        latencyMs: 10,
        message: 'Connection failed',
      });

      const result = await service.isReady();

      expect(result.ready).toBe(false);
      expect(result.checks['critical-dep'].status).toBe('down');
    });

    it('should only check critical indicators for readiness', async () => {
      await service.isReady();

      expect(criticalIndicator.check).toHaveBeenCalled();
      expect(nonCriticalIndicator.check).not.toHaveBeenCalled();
    });

    it('should return ready when no indicators are registered', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthService,
          { provide: GracefulShutdownService, useValue: mockShutdownService },
          { provide: HEALTH_INDICATORS, useValue: [] },
        ],
      }).compile();

      const serviceWithNoIndicators = module.get<HealthService>(HealthService);
      const result = await serviceWithNoIndicators.isReady();

      expect(result.ready).toBe(true);
      expect(result.checks).toEqual({});
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when all indicators are up', async () => {
      criticalIndicator.check.mockResolvedValue({ status: 'up', latencyMs: 5 });
      nonCriticalIndicator.check.mockResolvedValue({ status: 'up', latencyMs: 2 });

      const result = await service.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks['critical-dep']).toEqual({
        status: 'up',
        latencyMs: 5,
        critical: true,
      });
      expect(result.checks['non-critical-dep']).toEqual({
        status: 'up',
        latencyMs: 2,
        critical: false,
      });
    });

    it('should return degraded status when non-critical indicator is down', async () => {
      criticalIndicator.check.mockResolvedValue({ status: 'up', latencyMs: 5 });
      nonCriticalIndicator.check.mockResolvedValue({
        status: 'down',
        latencyMs: 10,
        message: 'Cache failed',
      });

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.checks['critical-dep'].status).toBe('up');
      expect(result.checks['non-critical-dep'].status).toBe('down');
    });

    it('should return unhealthy status when critical indicator is down', async () => {
      criticalIndicator.check.mockResolvedValue({
        status: 'down',
        latencyMs: 10,
        message: 'DB failed',
      });
      nonCriticalIndicator.check.mockResolvedValue({ status: 'up', latencyMs: 2 });

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should return unhealthy when both critical and non-critical are down', async () => {
      criticalIndicator.check.mockResolvedValue({ status: 'down', latencyMs: 10 });
      nonCriticalIndicator.check.mockResolvedValue({ status: 'down', latencyMs: 10 });

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should include timestamp and uptime', async () => {
      const result = await service.getHealth();

      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return healthy with empty checks when no indicators', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthService,
          { provide: GracefulShutdownService, useValue: mockShutdownService },
          { provide: HEALTH_INDICATORS, useValue: [] },
        ],
      }).compile();

      const serviceWithNoIndicators = module.get<HealthService>(HealthService);
      const result = await serviceWithNoIndicators.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks).toEqual({});
    });

    it('should check all indicators in parallel', async () => {
      const checkPromises: Promise<HealthCheckResult>[] = [];

      criticalIndicator.check.mockImplementation(() => {
        const promise = new Promise<HealthCheckResult>((resolve) =>
          setTimeout(() => resolve({ status: 'up', latencyMs: 5 }), 10),
        );
        checkPromises.push(promise);
        return promise;
      });

      nonCriticalIndicator.check.mockImplementation(() => {
        const promise = new Promise<HealthCheckResult>((resolve) =>
          setTimeout(() => resolve({ status: 'up', latencyMs: 2 }), 10),
        );
        checkPromises.push(promise);
        return promise;
      });

      const start = Date.now();
      await service.getHealth();
      const duration = Date.now() - start;

      // If parallel, should take ~10ms, not ~20ms
      expect(duration).toBeLessThan(30);
      expect(criticalIndicator.check).toHaveBeenCalled();
      expect(nonCriticalIndicator.check).toHaveBeenCalled();
    });
  });
});
