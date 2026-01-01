/**
 * Cache TTL Constants
 *
 * Centralized cache time-to-live values for identity-service.
 * All values are in milliseconds.
 */

export const CACHE_TTL = {
  /** Account cache: 5 minutes */
  ACCOUNT: 5 * 60 * 1000,

  /** Session cache: 1 minute (short for security) */
  SESSION: 1 * 60 * 1000,

  /** Permission cache: 5 minutes */
  PERMISSION: 5 * 60 * 1000,

  /** Role cache: 30 minutes (stable data) */
  ROLE: 30 * 60 * 1000,

  /** Revoked token cache: 1 hour (matches typical JWT expiry) */
  REVOKED_TOKEN: 60 * 60 * 1000,

  /** Device cache: 10 minutes */
  DEVICE: 10 * 60 * 1000,

  /** Profile cache: 15 minutes */
  PROFILE: 15 * 60 * 1000,

  /** Short cache: 30 seconds (rate limiting, etc.) */
  SHORT: 30 * 1000,

  /** Long cache: 24 hours (law registry, etc.) */
  VERY_LONG: 24 * 60 * 60 * 1000,
} as const;

/**
 * Cache Key Prefixes and Generators
 */
export const CACHE_KEYS = {
  // Account keys
  ACCOUNT_BY_ID: (id: string) => `account:id:${id}`,
  ACCOUNT_BY_EMAIL: (email: string) => `account:email:${email}`,
  ACCOUNT_BY_USERNAME: (username: string) => `account:username:${username}`,
  ACCOUNT_BY_EXTERNAL_ID: (externalId: string) => `account:external:${externalId}`,

  // Session keys
  SESSION_BY_TOKEN: (tokenHash: string) => `session:token:${tokenHash}`,
  SESSION_BY_ID: (id: string) => `session:id:${id}`,
  SESSIONS_BY_ACCOUNT: (accountId: string) => `sessions:account:${accountId}`,

  // Security keys
  REVOKED_TOKEN: (jti: string) => `revoked:jti:${jti}`,
  FAILED_LOGINS: (identifier: string) => `failed:login:${identifier}`,
  LOCKOUT: (accountId: string) => `lockout:${accountId}`,

  // Permission keys
  PERMISSIONS: (accountId: string) => `permissions:${accountId}`,
  ROLES: (accountId: string) => `roles:${accountId}`,

  // Device keys
  DEVICE_BY_ID: (id: string) => `device:id:${id}`,
  DEVICES_BY_ACCOUNT: (accountId: string) => `devices:account:${accountId}`,

  // Profile keys
  PROFILE_BY_ACCOUNT: (accountId: string) => `profile:account:${accountId}`,

  // Idempotency keys
  IDEMPOTENCY: (key: string) => `idempotency:${key}`,
} as const;
