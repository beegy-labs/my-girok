import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { PostgresHealthIndicator } from '../../indicators/postgres.indicator';

describe('PostgresHealthIndicator', () => {
  let indicator: PostgresHealthIndicator;
  let mockPrisma: {
    $queryRaw: Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(),
    };
    indicator = new PostgresHealthIndicator(mockPrisma);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('properties', () => {
    it('should have name set to postgres', () => {
      expect(indicator.name).toBe('postgres');
    });

    it('should be marked as critical', () => {
      expect(indicator.critical).toBe(true);
    });
  });

  describe('check', () => {
    it('should return up status when database is accessible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const result = await indicator.check();

      expect(result.status).toBe('up');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.message).toBeUndefined();
    });

    it('should return down status when database is not accessible', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.message).toBe('Connection refused');
    });

    it('should handle non-Error exceptions', async () => {
      mockPrisma.$queryRaw.mockRejectedValue('Unknown error');

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Database connection failed');
    });

    it('should measure latency correctly', async () => {
      mockPrisma.$queryRaw.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([{ result: 1 }]), 50)),
      );

      const result = await indicator.check();

      expect(result.latencyMs).toBeGreaterThanOrEqual(50);
      expect(result.latencyMs).toBeLessThan(100);
    });
  });
});
