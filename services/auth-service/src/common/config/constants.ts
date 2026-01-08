/**
 * Security and authentication constants
 * SSOT for all configurable security parameters
 */

/**
 * TOTP (Time-based One-Time Password) configuration
 */
export const TOTP_CONFIG = {
  /** Issuer name shown in authenticator apps */
  ISSUER: 'MyGirok Admin',
  /** HMAC algorithm (SHA1 for compatibility with most apps) */
  ALGORITHM: 'SHA1' as const,
  /** Number of digits in TOTP code */
  DIGITS: 6,
  /** Time period in seconds */
  PERIOD: 30,
  /** Allow 1 period before/after for time drift */
  WINDOW: 1,
  /** Secret key size in bytes (160 bits = 20 bytes) */
  SECRET_BYTES: 20,
} as const;

/**
 * Backup code configuration
 */
export const BACKUP_CODE_CONFIG = {
  /** Number of backup codes to generate */
  COUNT: 10,
  /** Length of each code (excluding dash) */
  LENGTH: 8,
  /** Character set excluding confusing chars: 0, O, 1, I */
  CHARSET: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
} as const;

/**
 * Cryptographic salts and prefixes
 * These should be consistent across all environments
 */
export const CRYPTO_SALTS = {
  /** Salt for backup code hashing */
  BACKUP_CODE: 'my-girok:backup-code:v1:',
  /** Salt for session token hashing */
  SESSION_TOKEN: 'my-girok:session:v1:',
} as const;

/**
 * MFA challenge configuration
 */
export const MFA_CHALLENGE_CONFIG = {
  /** Challenge TTL in seconds (5 minutes) */
  TTL_SECONDS: 300,
  /** Maximum verification attempts per challenge */
  MAX_ATTEMPTS: 3,
  /** Cache key prefix */
  CACHE_PREFIX: 'admin:mfa:challenge:',
} as const;

/**
 * Session configuration
 */
export const SESSION_CONFIG = {
  /** Session expiry in hours */
  EXPIRY_HOURS: 24,
  /** Refresh token expiry in days */
  REFRESH_TOKEN_DAYS: 7,
  /** Maximum concurrent sessions per admin */
  MAX_CONCURRENT: 5,
} as const;

/**
 * Password policy configuration
 */
export const PASSWORD_CONFIG = {
  /** Minimum password length */
  MIN_LENGTH: 12,
  /** Number of password history entries to check */
  HISTORY_COUNT: 5,
  /** Password expiry in days */
  EXPIRY_DAYS: 90,
  /** bcrypt rounds for hashing */
  BCRYPT_ROUNDS: 12,
} as const;

/**
 * Account lockout configuration
 */
export const LOCKOUT_CONFIG = {
  /** Number of failed attempts before lockout */
  MAX_FAILED_ATTEMPTS: 5,
  /** Lockout duration in minutes */
  LOCKOUT_MINUTES: 15,
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
  /** Login attempts per IP per window */
  LOGIN_ATTEMPTS_PER_IP: 5,
  /** Rate limit window in minutes */
  WINDOW_MINUTES: 15,
  /** Cache key prefix for rate limiting */
  CACHE_PREFIX: 'rate:login:',
} as const;
