import { vi } from 'vitest';

/**
 * Mock Cache Service for legal-service tests
 *
 * Provides a fully mocked CacheService with all domain-specific methods.
 */

export const createMockCacheService = () => ({
  // Core cache methods
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  getOrSet: vi.fn(),
  invalidatePattern: vi.fn().mockResolvedValue(0),

  // Law Registry methods
  getLawById: vi.fn().mockResolvedValue(undefined),
  setLawById: vi.fn().mockResolvedValue(undefined),
  getLawByCode: vi.fn().mockResolvedValue(undefined),
  setLawByCode: vi.fn().mockResolvedValue(undefined),
  invalidateLaw: vi.fn().mockResolvedValue(undefined),

  // Legal Document methods
  getDocumentById: vi.fn().mockResolvedValue(undefined),
  setDocumentById: vi.fn().mockResolvedValue(undefined),
  getLatestDocument: vi.fn().mockResolvedValue(undefined),
  setLatestDocument: vi.fn().mockResolvedValue(undefined),
  invalidateDocument: vi.fn().mockResolvedValue(undefined),

  // Consent methods
  getConsentById: vi.fn().mockResolvedValue(undefined),
  setConsentById: vi.fn().mockResolvedValue(undefined),
  getConsentsByAccount: vi.fn().mockResolvedValue(undefined),
  setConsentsByAccount: vi.fn().mockResolvedValue(undefined),
  getConsentStatus: vi.fn().mockResolvedValue(undefined),
  setConsentStatus: vi.fn().mockResolvedValue(undefined),
  invalidateConsent: vi.fn().mockResolvedValue(undefined),

  // DSR Request methods
  getDsrById: vi.fn().mockResolvedValue(undefined),
  setDsrById: vi.fn().mockResolvedValue(undefined),
  invalidateDsr: vi.fn().mockResolvedValue(undefined),
});

export type MockCacheService = ReturnType<typeof createMockCacheService>;

/**
 * Mock Cache Manager for testing
 * Used for lower-level cache testing
 */
export const createMockCacheManager = () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  store: {
    keys: vi.fn().mockResolvedValue([]),
  },
});

export type MockCacheManager = ReturnType<typeof createMockCacheManager>;
