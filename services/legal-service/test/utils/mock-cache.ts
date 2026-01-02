/**
 * Mock Cache Service for legal-service tests
 *
 * Provides a fully mocked CacheService with all domain-specific methods.
 */

export const createMockCacheService = () => ({
  // Core cache methods
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  getOrSet: jest.fn(),
  invalidatePattern: jest.fn().mockResolvedValue(0),

  // Law Registry methods
  getLawById: jest.fn().mockResolvedValue(undefined),
  setLawById: jest.fn().mockResolvedValue(undefined),
  getLawByCode: jest.fn().mockResolvedValue(undefined),
  setLawByCode: jest.fn().mockResolvedValue(undefined),
  invalidateLaw: jest.fn().mockResolvedValue(undefined),

  // Legal Document methods
  getDocumentById: jest.fn().mockResolvedValue(undefined),
  setDocumentById: jest.fn().mockResolvedValue(undefined),
  getLatestDocument: jest.fn().mockResolvedValue(undefined),
  setLatestDocument: jest.fn().mockResolvedValue(undefined),
  invalidateDocument: jest.fn().mockResolvedValue(undefined),

  // Consent methods
  getConsentById: jest.fn().mockResolvedValue(undefined),
  setConsentById: jest.fn().mockResolvedValue(undefined),
  getConsentsByAccount: jest.fn().mockResolvedValue(undefined),
  setConsentsByAccount: jest.fn().mockResolvedValue(undefined),
  getConsentStatus: jest.fn().mockResolvedValue(undefined),
  setConsentStatus: jest.fn().mockResolvedValue(undefined),
  invalidateConsent: jest.fn().mockResolvedValue(undefined),

  // DSR Request methods
  getDsrById: jest.fn().mockResolvedValue(undefined),
  setDsrById: jest.fn().mockResolvedValue(undefined),
  invalidateDsr: jest.fn().mockResolvedValue(undefined),
});

export type MockCacheService = ReturnType<typeof createMockCacheService>;

/**
 * Mock Cache Manager for testing
 * Used for lower-level cache testing
 */
export const createMockCacheManager = () => ({
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  store: {
    keys: jest.fn().mockResolvedValue([]),
  },
});

export type MockCacheManager = ReturnType<typeof createMockCacheManager>;
