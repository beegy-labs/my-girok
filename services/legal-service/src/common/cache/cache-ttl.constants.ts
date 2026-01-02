/**
 * Cache TTL Constants
 *
 * Centralized cache time-to-live values for legal-service.
 * All values are in milliseconds.
 */

export const CACHE_TTL = {
  /** Law registry cache: 24 hours (stable reference data) */
  LAW_REGISTRY: 24 * 60 * 60 * 1000,

  /** Legal document cache: 1 hour */
  LEGAL_DOCUMENT: 60 * 60 * 1000,

  /** Active documents list cache: 15 minutes */
  ACTIVE_DOCUMENTS: 15 * 60 * 1000,

  /** Consent cache: 5 minutes */
  CONSENT: 5 * 60 * 1000,

  /** DSR request cache: 2 minutes (frequently updated) */
  DSR_REQUEST: 2 * 60 * 1000,

  /** Short cache: 30 seconds */
  SHORT: 30 * 1000,

  /** Very long cache: 7 days (law codes, etc.) */
  VERY_LONG: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Cache Key Prefixes and Generators
 */
export const CACHE_KEYS = {
  // Law Registry keys
  LAW_BY_ID: (id: string) => `law:id:${id}`,
  LAW_BY_CODE: (code: string) => `law:code:${code.toUpperCase()}`,
  LAWS_BY_COUNTRY: (countryCode: string) => `laws:country:${countryCode.toUpperCase()}`,
  ACTIVE_LAWS: () => 'laws:active',

  // Legal Document keys
  DOCUMENT_BY_ID: (id: string) => `doc:id:${id}`,
  DOCUMENTS_BY_TYPE: (type: string) => `docs:type:${type}`,
  ACTIVE_DOCUMENTS_BY_TYPE: (type: string, locale: string) => `docs:active:${type}:${locale}`,
  LATEST_DOCUMENT: (type: string, locale: string) => `doc:latest:${type}:${locale}`,

  // Consent keys
  CONSENT_BY_ID: (id: string) => `consent:id:${id}`,
  CONSENTS_BY_ACCOUNT: (accountId: string) => `consents:account:${accountId}`,
  CONSENT_STATUS: (accountId: string, documentId: string) =>
    `consent:status:${accountId}:${documentId}`,

  // DSR Request keys
  DSR_BY_ID: (id: string) => `dsr:id:${id}`,
  DSR_BY_ACCOUNT: (accountId: string) => `dsr:account:${accountId}`,
  PENDING_DSR_COUNT: () => 'dsr:pending:count',
  OVERDUE_DSR: () => 'dsr:overdue',
} as const;
