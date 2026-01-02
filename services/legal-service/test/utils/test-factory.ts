/**
 * Test Factory for legal-service
 *
 * Provides factory functions to create test data for all legal-service entities.
 * Supports GDPR (EU), CCPA (US), and PIPA (KR) compliance testing scenarios.
 */

// ============================================================================
// CONSENT FACTORIES
// ============================================================================

export interface MockConsent {
  id: string;
  accountId: string;
  documentId: string;
  lawRegistryId: string | null;
  status: 'GRANTED' | 'WITHDRAWN' | 'EXPIRED';
  consentedAt: Date;
  withdrawnAt: Date | null;
  expiresAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  consentMethod: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  document?: MockLegalDocument;
  lawRegistry?: MockLawRegistry | null;
}

export const createMockConsent = (overrides: Partial<MockConsent> = {}): MockConsent => ({
  id: 'consent-123e4567-e89b-12d3-a456-426614174000',
  accountId: 'account-123e4567-e89b-12d3-a456-426614174000',
  documentId: 'doc-123e4567-e89b-12d3-a456-426614174000',
  lawRegistryId: 'law-123e4567-e89b-12d3-a456-426614174000',
  status: 'GRANTED',
  consentedAt: new Date('2025-01-01T00:00:00Z'),
  withdrawnAt: null,
  expiresAt: null,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  consentMethod: 'explicit_button',
  metadata: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

export const createConsentWithDocument = (overrides: Partial<MockConsent> = {}): MockConsent => ({
  ...createMockConsent(overrides),
  document: createMockLegalDocument(),
  lawRegistry: createMockLawRegistry(),
});

// ============================================================================
// DSR REQUEST FACTORIES
// ============================================================================

export type DsrRequestType =
  | 'ACCESS'
  | 'RECTIFICATION'
  | 'ERASURE'
  | 'RESTRICTION'
  | 'PORTABILITY'
  | 'OBJECTION';

export type DsrRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export type DsrEscalationLevel = 'NONE' | 'WARNING' | 'CRITICAL' | 'OVERDUE';

export interface MockDsrRequest {
  id: string;
  accountId: string;
  requestType: DsrRequestType;
  status: DsrRequestStatus;
  escalationLevel: DsrEscalationLevel;
  escalatedAt: Date | null;
  description: string | null;
  requestedAt: Date;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
  dueDate: Date;
  assignedTo: string | null;
  resolution: string | null;
  rejectionReason: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockDsrRequest = (overrides: Partial<MockDsrRequest> = {}): MockDsrRequest => {
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 30); // GDPR: 30 days default

  return {
    id: 'dsr-123e4567-e89b-12d3-a456-426614174000',
    accountId: 'account-123e4567-e89b-12d3-a456-426614174000',
    requestType: 'ACCESS',
    status: 'PENDING',
    escalationLevel: 'NONE',
    escalatedAt: null,
    description: 'Request for personal data access',
    requestedAt: now,
    acknowledgedAt: null,
    completedAt: null,
    dueDate,
    assignedTo: null,
    resolution: null,
    rejectionReason: null,
    ipAddress: '192.168.1.1',
    metadata: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

/**
 * Create a DSR request with GDPR Article 15 (Access) requirements
 */
export const createGdprAccessRequest = (overrides: Partial<MockDsrRequest> = {}): MockDsrRequest =>
  createMockDsrRequest({
    requestType: 'ACCESS',
    description: 'GDPR Article 15 - Right of access by the data subject',
    metadata: { regulation: 'GDPR', article: '15' },
    ...overrides,
  });

/**
 * Create a DSR request with GDPR Article 17 (Erasure) requirements
 */
export const createGdprErasureRequest = (overrides: Partial<MockDsrRequest> = {}): MockDsrRequest =>
  createMockDsrRequest({
    requestType: 'ERASURE',
    description: 'GDPR Article 17 - Right to erasure (right to be forgotten)',
    metadata: { regulation: 'GDPR', article: '17' },
    ...overrides,
  });

/**
 * Create a DSR request with CCPA requirements (45-day deadline)
 */
export const createCcpaRequest = (overrides: Partial<MockDsrRequest> = {}): MockDsrRequest => {
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 45); // CCPA: 45 days

  return createMockDsrRequest({
    requestType: 'ACCESS',
    description: 'CCPA - Consumer right to know',
    dueDate,
    metadata: { regulation: 'CCPA' },
    ...overrides,
  });
};

/**
 * Create an overdue DSR request for escalation testing
 */
export const createOverdueDsrRequest = (daysOverdue: number = 1): MockDsrRequest => {
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() - daysOverdue);

  return createMockDsrRequest({
    status: 'IN_PROGRESS',
    dueDate,
    acknowledgedAt: new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000),
  });
};

/**
 * Create a DSR request approaching deadline for warning tests
 */
export const createApproachingDeadlineRequest = (daysRemaining: number = 5): MockDsrRequest => {
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + daysRemaining);

  return createMockDsrRequest({
    status: 'PENDING',
    dueDate,
    escalationLevel: 'NONE',
  });
};

// ============================================================================
// LEGAL DOCUMENT FACTORIES
// ============================================================================

export type LegalDocumentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'COOKIE_POLICY'
  | 'DATA_PROCESSING_AGREEMENT'
  | 'CONSENT_FORM';

export type LegalDocumentStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface MockLegalDocument {
  id: string;
  type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  contentHash: string;
  countryCode: string;
  locale: string;
  lawRegistryId: string | null;
  status: LegalDocumentStatus;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  lawRegistry?: MockLawRegistry | null;
}

export const createMockLegalDocument = (
  overrides: Partial<MockLegalDocument> = {},
): MockLegalDocument => ({
  id: 'doc-123e4567-e89b-12d3-a456-426614174000',
  type: 'PRIVACY_POLICY',
  version: '1.0.0',
  title: 'Privacy Policy',
  content: 'This is a sample privacy policy content for testing purposes.',
  contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  countryCode: 'KR',
  locale: 'ko-KR',
  lawRegistryId: 'law-123e4567-e89b-12d3-a456-426614174000',
  status: 'DRAFT',
  effectiveFrom: null,
  effectiveTo: null,
  metadata: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

export const createActiveDocument = (
  overrides: Partial<MockLegalDocument> = {},
): MockLegalDocument =>
  createMockLegalDocument({
    status: 'ACTIVE',
    effectiveFrom: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  });

// ============================================================================
// LAW REGISTRY FACTORIES
// ============================================================================

export interface MockLawRegistry {
  id: string;
  code: string;
  name: string;
  description: string | null;
  countryCode: string;
  effectiveDate: Date;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockLawRegistry = (
  overrides: Partial<MockLawRegistry> = {},
): MockLawRegistry => ({
  id: 'law-123e4567-e89b-12d3-a456-426614174000',
  code: 'PIPA',
  name: 'Personal Information Protection Act',
  description: 'South Korean data protection law',
  countryCode: 'KR',
  effectiveDate: new Date('2011-09-30'),
  isActive: true,
  metadata: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

export const createGdprLawRegistry = (overrides: Partial<MockLawRegistry> = {}): MockLawRegistry =>
  createMockLawRegistry({
    id: 'law-gdpr-123e4567-e89b-12d3-a456-426614174000',
    code: 'GDPR',
    name: 'General Data Protection Regulation',
    description: 'EU data protection regulation',
    countryCode: 'EU',
    effectiveDate: new Date('2018-05-25'),
    ...overrides,
  });

export const createCcpaLawRegistry = (overrides: Partial<MockLawRegistry> = {}): MockLawRegistry =>
  createMockLawRegistry({
    id: 'law-ccpa-123e4567-e89b-12d3-a456-426614174000',
    code: 'CCPA',
    name: 'California Consumer Privacy Act',
    description: 'California privacy law',
    countryCode: 'US',
    effectiveDate: new Date('2020-01-01'),
    ...overrides,
  });

export const createPipaLawRegistry = (overrides: Partial<MockLawRegistry> = {}): MockLawRegistry =>
  createMockLawRegistry({
    id: 'law-pipa-123e4567-e89b-12d3-a456-426614174000',
    code: 'PIPA',
    name: 'Personal Information Protection Act',
    description: 'South Korean data protection law - requires consent from age 14+',
    countryCode: 'KR',
    effectiveDate: new Date('2011-09-30'),
    metadata: { minimumConsentAge: 14 },
    ...overrides,
  });

// ============================================================================
// OUTBOX EVENT FACTORIES
// ============================================================================

export interface MockOutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export const createMockOutboxEvent = (
  overrides: Partial<MockOutboxEvent> = {},
): MockOutboxEvent => ({
  id: 'outbox-123e4567-e89b-12d3-a456-426614174000',
  aggregateType: 'Consent',
  aggregateId: 'consent-123e4567-e89b-12d3-a456-426614174000',
  eventType: 'CONSENT_GRANTED',
  payload: { consentId: 'consent-123', accountId: 'account-123' },
  status: 'PENDING',
  retryCount: 0,
  lastError: null,
  processedAt: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

// ============================================================================
// DTO FACTORIES
// ============================================================================

export const createGrantConsentDto = (overrides: Record<string, unknown> = {}) => ({
  accountId: 'account-123e4567-e89b-12d3-a456-426614174000',
  documentId: 'doc-123e4567-e89b-12d3-a456-426614174000',
  lawRegistryId: 'law-123e4567-e89b-12d3-a456-426614174000',
  expiresAt: undefined,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  consentMethod: 'explicit_button',
  metadata: undefined,
  ...overrides,
});

export const createWithdrawConsentDto = (overrides: Record<string, unknown> = {}) => ({
  reason: 'User requested withdrawal',
  ipAddress: '192.168.1.1',
  ...overrides,
});

export const createDsrRequestDto = (overrides: Record<string, unknown> = {}) => ({
  accountId: 'account-123e4567-e89b-12d3-a456-426614174000',
  requestType: 'ACCESS',
  description: 'Request for personal data',
  ipAddress: '192.168.1.1',
  metadata: undefined,
  ...overrides,
});

export const createLegalDocumentDto = (overrides: Record<string, unknown> = {}) => ({
  type: 'PRIVACY_POLICY',
  version: '1.0.0',
  title: 'Privacy Policy',
  content: 'Privacy policy content',
  countryCode: 'KR',
  locale: 'ko-KR',
  lawRegistryId: 'law-123e4567-e89b-12d3-a456-426614174000',
  effectiveFrom: undefined,
  effectiveTo: undefined,
  metadata: undefined,
  ...overrides,
});

export const createLawRegistryDto = (overrides: Record<string, unknown> = {}) => ({
  code: 'PIPA',
  name: 'Personal Information Protection Act',
  description: 'South Korean data protection law',
  countryCode: 'KR',
  effectiveDate: new Date('2011-09-30'),
  isActive: true,
  metadata: undefined,
  ...overrides,
});
