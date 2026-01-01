import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CacheService } from '../cache';

describe('HealthController', () => {
  let controller: HealthController;
  let mockPrismaService: {
    $queryRaw: jest.Mock;
  };
  let mockCacheService: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    mockCacheService = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('1.0.0'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: IdentityPrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should return ok status when all components are healthy', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('ok');
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await controller.getHealth();

      expect(result.status).toBe('ok');
      expect(result.version).toBe('1.0.0');
      expect(result.checks.database.status).toBe('ok');
      expect(result.checks.cache.status).toBe('ok');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy status when database fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB connection failed'));
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('ok');
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await controller.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('error');
      expect(result.checks.database.message).toBe('DB connection failed');
      expect(result.checks.cache.status).toBe('ok');
    });

    it('should return unhealthy status when cache fails', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockCacheService.set.mockRejectedValue(new Error('Cache connection failed'));

      const result = await controller.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('ok');
      expect(result.checks.cache.status).toBe('error');
      expect(result.checks.cache.message).toBe('Cache connection failed');
    });

    it('should return unhealthy when cache read/write mismatch', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('wrong-value');
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await controller.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.cache.status).toBe('error');
      expect(result.checks.cache.message).toBe('Cache read/write mismatch');
    });

    it('should include latency measurements', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('ok');
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await controller.getHealth();

      expect(result.checks.database.latencyMs).toBeDefined();
      expect(result.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.checks.cache.latencyMs).toBeDefined();
      expect(result.checks.cache.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getReady', () => {
    it('should return ready when all components are healthy', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('ok');
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await controller.getReady();

      expect(result).toEqual({ ready: true });
    });

    it('should throw ServiceUnavailableException when database fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB connection failed'));
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('ok');
      mockCacheService.del.mockResolvedValue(undefined);

      await expect(controller.getReady()).rejects.toThrow('Service not ready');
    });

    it('should throw ServiceUnavailableException when cache fails', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockCacheService.set.mockRejectedValue(new Error('Cache connection failed'));

      await expect(controller.getReady()).rejects.toThrow('Service not ready');
    });
  });

  describe('getLive', () => {
    it('should always return alive true', async () => {
      const result = await controller.getLive();

      expect(result).toEqual({ alive: true });
    });

    it('should return quickly without dependency checks', async () => {
      const start = Date.now();
      await controller.getLive();
      const duration = Date.now() - start;

      // Should complete in under 10ms since no async operations
      expect(duration).toBeLessThan(10);
      expect(mockPrismaService.$queryRaw).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });
});
