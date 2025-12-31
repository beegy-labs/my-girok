/**
 * Shared constants for identity-service
 *
 * SSOT Strategy:
 * - Pagination, Retry, CacheTTL → Use @my-girok/nest-common
 * - Service-specific constants → Defined here
 */

// Re-export from nest-common for convenience
export { CacheTTL } from '@my-girok/nest-common';

/**
 * Pagination defaults
 * @see @my-girok/nest-common for shared pagination utilities
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

/**
 * Retry configuration defaults
 * @see @my-girok/nest-common for shared retry utilities
 */
export const RETRY = {
  MAX_RETRIES: 3,
  DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Session and token expiry defaults
 * Identity-service specific
 */
export const SESSION = {
  /** Default session expiry in minutes */
  DEFAULT_EXPIRY_MINUTES: 60,
  /** Maximum session expiry in minutes (24 hours) */
  MAX_EXPIRY_MINUTES: 1440,
  /** Refresh token validity in days */
  REFRESH_TOKEN_DAYS: 14,
  /** Token hash algorithm */
  HASH_ALGORITHM: 'sha256',
} as const;

/**
 * Rate limiting defaults
 * Identity-service specific (auth endpoints)
 */
export const RATE_LIMIT = {
  /** Default TTL in milliseconds */
  DEFAULT_TTL_MS: 60000,
  /** Default limit per window */
  DEFAULT_LIMIT: 100,
  /** Login endpoint limit (stricter) */
  LOGIN_LIMIT: 5,
  /** Registration endpoint limit */
  REGISTRATION_LIMIT: 10,
} as const;

/**
 * Outbox processing defaults
 * Transactional outbox pattern configuration
 */
export const OUTBOX = {
  /** Polling interval in milliseconds */
  POLL_INTERVAL_MS: 5000,
  /** Batch size for processing */
  BATCH_SIZE: 100,
  /** Maximum retry attempts before marking as failed */
  MAX_RETRY_ATTEMPTS: 5,
  /** Delay between retries in milliseconds */
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * Sanction defaults
 * Auth module - user sanctions
 */
export const SANCTION = {
  /** Default sanction duration in days */
  DEFAULT_DURATION_DAYS: 7,
  /** Maximum sanction duration in days */
  MAX_DURATION_DAYS: 365,
  /** Appeal window in days */
  APPEAL_WINDOW_DAYS: 30,
} as const;

/**
 * Invitation defaults
 * Auth module - operator invitations
 */
export const INVITATION = {
  /** Default invitation expiry in days */
  DEFAULT_EXPIRY_DAYS: 7,
  /** Maximum invitation expiry in days */
  MAX_EXPIRY_DAYS: 30,
  /** Invitation token length */
  TOKEN_LENGTH: 32,
} as const;

/**
 * DSR (Data Subject Request) defaults
 * Legal module - GDPR compliance
 */
export const DSR = {
  /** Default response deadline in days (GDPR: 30 days) */
  DEFAULT_DEADLINE_DAYS: 30,
  /** Extended deadline in days (with valid reason) */
  EXTENDED_DEADLINE_DAYS: 60,
  /** Verification token expiry in hours */
  VERIFICATION_EXPIRY_HOURS: 24,
} as const;

/**
 * Consent defaults
 * Legal module - consent management
 */
export const CONSENT = {
  /** Audit log retention in days */
  AUDIT_LOG_RETENTION_DAYS: 365 * 7, // 7 years (legal requirement)
} as const;

/**
 * MFA (Multi-Factor Authentication) defaults
 * Identity module - account security
 */
export const MFA = {
  /** TOTP token validity window (in steps, 30s each) */
  TOTP_WINDOW: 1,
  /** Backup codes count */
  BACKUP_CODES_COUNT: 10,
  /** Backup code length */
  BACKUP_CODE_LENGTH: 8,
} as const;

/**
 * Account security defaults
 * Identity module - account protection
 */
export const ACCOUNT_SECURITY = {
  /** Maximum failed login attempts before lockout */
  MAX_FAILED_ATTEMPTS: 5,
  /** Lockout duration in minutes */
  LOCKOUT_DURATION_MINUTES: 30,
  /** Password history count (prevent reuse) */
  PASSWORD_HISTORY_COUNT: 5,
} as const;

/**
 * Role hierarchy constraints
 * Auth module - role management
 */
export const ROLE = {
  /** Maximum depth of role hierarchy */
  MAX_HIERARCHY_DEPTH: 10,
  /** Maximum roles per operator */
  MAX_ROLES_PER_OPERATOR: 5,
} as const;

/**
 * DSR (Data Subject Request) deadline defaults by legal basis
 * Legal module - GDPR/CCPA compliance
 */
export const DSR_DEADLINE_DAYS: Record<string, number> = {
  GDPR: 30,
  CCPA: 45,
  PIPA: 10,
  APPI: 14,
  DEFAULT: 30,
} as const;
