import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, MemoryHealthIndicator, HealthCheckResult } from '@nestjs/terminus';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { HealthController } from '../../src/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: {
    check: MockInstance;
  };
  let memoryIndicator: {
    checkHeap: MockInstance;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: vi.fn(),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    memoryIndicator = module.get(MemoryHealthIndicator);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check result when healthy', async () => {
      const healthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {
          memory_heap: { status: 'up' },
        },
      };

      memoryIndicator.checkHeap.mockResolvedValue({ memory_heap: { status: 'up' } });
      healthCheckService.check.mockImplementation(async (indicators) => {
        // Execute the indicators to simulate the health check
        for (const indicator of indicators) {
          await indicator();
        }
        return healthResult;
      });

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should check memory heap with 150MB threshold', async () => {
      const healthResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockImplementation(async (indicators) => {
        for (const indicator of indicators) {
          await indicator();
        }
        return healthResult;
      });

      await controller.check();

      expect(memoryIndicator.checkHeap).toHaveBeenCalledWith('memory_heap', 150 * 1024 * 1024);
    });

    it('should return error status when unhealthy', async () => {
      const healthResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          memory_heap: { status: 'down', message: 'Heap exceeds threshold' },
        },
        details: {
          memory_heap: { status: 'down', message: 'Heap exceeds threshold' },
        },
      };

      memoryIndicator.checkHeap.mockRejectedValue(new Error('Heap exceeds threshold'));
      healthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.check();

      expect(result.status).toBe('error');
    });
  });

  describe('ready', () => {
    it('should return ok status', () => {
      const result = controller.ready();

      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('live', () => {
    it('should return ok status', () => {
      const result = controller.live();

      expect(result).toEqual({ status: 'ok' });
    });
  });
});
