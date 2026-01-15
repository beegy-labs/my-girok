import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';
import { GracefulShutdownService } from '../graceful-shutdown.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthService: {
    getUptime: Mock;
    isAppInitialized: Mock;
    isReady: Mock;
    getHealth: Mock;
  };
  let mockShutdownService: {
    isShutdownInProgress: Mock;
  };
  let mockResponse: {
    status: Mock;
    json: Mock;
  };

  beforeEach(async () => {
    mockHealthService = {
      getUptime: vi.fn().mockReturnValue(100),
      isAppInitialized: vi.fn().mockReturnValue(true),
      isReady: vi.fn().mockResolvedValue({ ready: true, checks: {} }),
      getHealth: vi.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: '2026-01-15T10:00:00Z',
        uptime: 100,
        checks: {},
      }),
    };

    mockShutdownService = {
      isShutdownInProgress: vi.fn().mockReturnValue(false),
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: mockHealthService },
        { provide: GracefulShutdownService, useValue: mockShutdownService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('live', () => {
    it('should return ok status with timestamp and uptime', () => {
      const result = controller.live();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBe(100);
    });

    it('should not call any dependency checks', () => {
      controller.live();

      expect(mockHealthService.isReady).not.toHaveBeenCalled();
      expect(mockHealthService.getHealth).not.toHaveBeenCalled();
    });
  });

  describe('startup', () => {
    it('should return 200 with ok status when initialized', () => {
      mockHealthService.isAppInitialized.mockReturnValue(true);

      controller.startup(mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should return 503 with starting status when not initialized', () => {
      mockHealthService.isAppInitialized.mockReturnValue(false);

      controller.startup(mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'starting',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('ready', () => {
    it('should return 200 with ready status when all critical deps are up', async () => {
      mockHealthService.isReady.mockResolvedValue({
        ready: true,
        checks: { postgres: { status: 'up', latencyMs: 5 } },
      });

      await controller.ready(mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          shutdownInProgress: false,
          checks: { postgres: { status: 'up', latencyMs: 5 } },
        }),
      );
    });

    it('should return 503 with not_ready status when critical dep is down', async () => {
      mockHealthService.isReady.mockResolvedValue({
        ready: false,
        checks: { postgres: { status: 'down', latencyMs: 10, message: 'Connection failed' } },
      });

      await controller.ready(mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
        }),
      );
    });

    it('should return 503 when shutdown is in progress', async () => {
      mockHealthService.isReady.mockResolvedValue({ ready: false, checks: {} });
      mockShutdownService.isShutdownInProgress.mockReturnValue(true);

      await controller.ready(mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          shutdownInProgress: true,
        }),
      );
    });

    it('should not include checks in response when empty', async () => {
      mockHealthService.isReady.mockResolvedValue({ ready: true, checks: {} });

      await controller.ready(mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: undefined,
        }),
      );
    });
  });

  describe('health', () => {
    it('should return comprehensive health status', async () => {
      mockHealthService.getHealth.mockResolvedValue({
        status: 'healthy',
        timestamp: '2026-01-15T10:00:00Z',
        uptime: 100,
        checks: {
          postgres: { status: 'up', latencyMs: 5, critical: true },
          valkey: { status: 'up', latencyMs: 2, critical: false },
        },
      });

      const result = await controller.health();

      expect(result.status).toBe('healthy');
      expect(result.checks.postgres.critical).toBe(true);
      expect(result.checks.valkey.critical).toBe(false);
    });

    it('should return degraded status when non-critical indicator is down', async () => {
      mockHealthService.getHealth.mockResolvedValue({
        status: 'degraded',
        timestamp: '2026-01-15T10:00:00Z',
        uptime: 100,
        checks: {
          postgres: { status: 'up', latencyMs: 5, critical: true },
          valkey: { status: 'down', latencyMs: 10, critical: false, message: 'Connection failed' },
        },
      });

      const result = await controller.health();

      expect(result.status).toBe('degraded');
    });

    it('should return unhealthy status when critical indicator is down', async () => {
      mockHealthService.getHealth.mockResolvedValue({
        status: 'unhealthy',
        timestamp: '2026-01-15T10:00:00Z',
        uptime: 100,
        checks: {
          postgres: { status: 'down', latencyMs: 10, critical: true, message: 'Connection failed' },
        },
      });

      const result = await controller.health();

      expect(result.status).toBe('unhealthy');
    });
  });
});
