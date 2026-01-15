import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import {
  ClickHouseHealthIndicator,
  ClickHouseHealthCheckAdapter,
} from '../../indicators/clickhouse.indicator';

describe('ClickHouseHealthIndicator', () => {
  let indicator: ClickHouseHealthIndicator;
  let mockClickHouse: {
    query: Mock;
  };

  beforeEach(() => {
    mockClickHouse = {
      query: vi.fn().mockResolvedValue({ rows: [[1]] }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('properties', () => {
    it('should have name set to clickhouse', () => {
      indicator = new ClickHouseHealthIndicator(mockClickHouse);
      expect(indicator.name).toBe('clickhouse');
    });

    it('should default to critical', () => {
      indicator = new ClickHouseHealthIndicator(mockClickHouse);
      expect(indicator.critical).toBe(true);
    });

    it('should allow setting critical to false', () => {
      indicator = new ClickHouseHealthIndicator(mockClickHouse, { critical: false });
      expect(indicator.critical).toBe(false);
    });
  });

  describe('check', () => {
    beforeEach(() => {
      indicator = new ClickHouseHealthIndicator(mockClickHouse);
    });

    it('should return up status when ClickHouse is accessible', async () => {
      const result = await indicator.check();

      expect(result.status).toBe('up');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(mockClickHouse.query).toHaveBeenCalledWith({ query: 'SELECT 1' });
    });

    it('should return down status when ClickHouse is not accessible', async () => {
      mockClickHouse.query.mockRejectedValue(new Error('Connection refused'));

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Connection refused');
    });

    it('should handle non-Error exceptions', async () => {
      mockClickHouse.query.mockRejectedValue('Unknown error');

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('ClickHouse connection failed');
    });

    it('should measure latency correctly', async () => {
      mockClickHouse.query.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ rows: [[1]] }), 50)),
      );

      const result = await indicator.check();

      expect(result.latencyMs).toBeGreaterThanOrEqual(50);
      expect(result.latencyMs).toBeLessThan(100);
    });
  });
});
