/**
 * Mock Cache Manager for unit tests
 * Provides a fully mocked cache service compatible with @nestjs/cache-manager
 */

import { vi, Mock } from 'vitest';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface MockCacheManager {
  get: Mock;
  set: Mock;
  del: Mock;
  reset: Mock;
  mget: Mock;
  mset: Mock;
  mdel: Mock;
  ttl: Mock;
  wrap: Mock;
  disconnect: Mock;
  store: {
    get: Mock;
    set: Mock;
    del: Mock;
    keys: Mock;
    mget: Mock;
    mset: Mock;
    mdel: Mock;
    ttl: Mock;
  };
}

/**
 * Create a mock Cache Manager for unit tests
 */
export function createMockCacheManager(): MockCacheManager {
  const cache: MockCacheManager = {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
    mget: vi.fn().mockResolvedValue([]),
    mset: vi.fn().mockResolvedValue(undefined),
    mdel: vi.fn().mockResolvedValue(undefined),
    ttl: vi.fn().mockResolvedValue(-1),
    wrap: vi.fn().mockImplementation(async (_key: string, fn: () => Promise<unknown>) => fn()),
    disconnect: vi.fn().mockResolvedValue(undefined),
    store: {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockResolvedValue([]),
      mget: vi.fn().mockResolvedValue([]),
      mset: vi.fn().mockResolvedValue(undefined),
      mdel: vi.fn().mockResolvedValue(undefined),
      ttl: vi.fn().mockResolvedValue(-1),
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
