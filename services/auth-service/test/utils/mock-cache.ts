/**
 * Mock Cache Manager for unit tests
 * Provides a fully mocked cache service compatible with @nestjs/cache-manager
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface MockCacheManager {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  reset: jest.Mock;
  mget: jest.Mock;
  mset: jest.Mock;
  mdel: jest.Mock;
  ttl: jest.Mock;
  wrap: jest.Mock;
  disconnect: jest.Mock;
  store: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    keys: jest.Mock;
    mget: jest.Mock;
    mset: jest.Mock;
    mdel: jest.Mock;
    ttl: jest.Mock;
  };
}

/**
 * Create a mock Cache Manager for unit tests
 */
export function createMockCacheManager(): MockCacheManager {
  const cache: MockCacheManager = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    mget: jest.fn().mockResolvedValue([]),
    mset: jest.fn().mockResolvedValue(undefined),
    mdel: jest.fn().mockResolvedValue(undefined),
    ttl: jest.fn().mockResolvedValue(-1),
    wrap: jest.fn().mockImplementation(async (_key: string, fn: () => Promise<unknown>) => fn()),
    disconnect: jest.fn().mockResolvedValue(undefined),
    store: {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      keys: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
      mset: jest.fn().mockResolvedValue(undefined),
      mdel: jest.fn().mockResolvedValue(undefined),
      ttl: jest.fn().mockResolvedValue(-1),
    },
  };

  return cache;
}

/**
 * Get the Cache Manager provider for NestJS testing module
 */
export function getMockCacheProvider() {
  const mockCache = createMockCacheManager();
  return {
    provide: CACHE_MANAGER,
    useValue: mockCache,
  };
}

/**
 * Reset all mocks on a MockCacheManager
 */
export function resetMockCache(mockCache: MockCacheManager): void {
  mockCache.get.mockReset().mockResolvedValue(undefined);
  mockCache.set.mockReset().mockResolvedValue(undefined);
  mockCache.del.mockReset().mockResolvedValue(undefined);
  mockCache.reset.mockReset().mockResolvedValue(undefined);
  mockCache.store.get.mockReset().mockResolvedValue(undefined);
  mockCache.store.set.mockReset().mockResolvedValue(undefined);
  mockCache.store.del.mockReset().mockResolvedValue(undefined);
  mockCache.store.keys.mockReset().mockResolvedValue([]);
}

/**
 * Setup cache with predefined values for testing
 */
export function setupCacheWith(mockCache: MockCacheManager, values: Record<string, unknown>): void {
  mockCache.get.mockImplementation(async (key: string) => {
    return values[key] ?? undefined;
  });
}
