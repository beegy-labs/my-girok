import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { ValkeyHealthIndicator, CacheHealthCheckAdapter } from '../../indicators/valkey.indicator';

describe('ValkeyHealthIndicator', () => {
  let indicator: ValkeyHealthIndicator;
  let mockCache: {
    set: Mock;
    get: Mock;
    del: Mock;
  };

  beforeEach(() => {
    mockCache = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue('ok'),
      del: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('properties', () => {
    it('should have name set to valkey', () => {
      indicator = new ValkeyHealthIndicator(mockCache);
      expect(indicator.name).toBe('valkey');
    });

    it('should default to non-critical', () => {
      indicator = new ValkeyHealthIndicator(mockCache);
      expect(indicator.critical).toBe(false);
    });

    it('should allow setting critical to true', () => {
      indicator = new ValkeyHealthIndicator(mockCache, { critical: true });
      expect(indicator.critical).toBe(true);
    });

    it('should allow setting critical to false explicitly', () => {
      indicator = new ValkeyHealthIndicator(mockCache, { critical: false });
      expect(indicator.critical).toBe(false);
    });
  });

  describe('check', () => {
    beforeEach(() => {
      indicator = new ValkeyHealthIndicator(mockCache);
    });

    it('should return up status when cache is working', async () => {
      const result = await indicator.check();

      expect(result.status).toBe('up');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(mockCache.set).toHaveBeenCalled();
      expect(mockCache.get).toHaveBeenCalled();
      expect(mockCache.del).toHaveBeenCalled();
    });

    it('should return down status when set fails', async () => {
      mockCache.set.mockRejectedValue(new Error('Connection refused'));

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Connection refused');
    });

    it('should return down status when get fails', async () => {
      mockCache.get.mockRejectedValue(new Error('Read timeout'));

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Read timeout');
    });

    it('should return down status when read/write mismatch', async () => {
      mockCache.get.mockResolvedValue('wrong-value');

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Cache read/write mismatch');
    });

    it('should handle null return from get', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Cache read/write mismatch');
    });

    it('should handle non-Error exceptions', async () => {
      mockCache.set.mockRejectedValue('Unknown error');

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Cache connection failed');
    });

    it('should use unique test key with timestamp', async () => {
      await indicator.check();

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringMatching(/^health:check:\d+$/),
        'ok',
        1000,
      );
    });

    it('should clean up test key after check', async () => {
      await indicator.check();

      expect(mockCache.del).toHaveBeenCalled();
    });
  });
});
