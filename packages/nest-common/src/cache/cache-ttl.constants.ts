/**
 * Common Cache TTL Constants (in milliseconds)
 *
 * Standardized TTL values for consistent caching across all services.
 * Uses milliseconds as required by cache-manager v5+.
 *
 * @example
 * ```typescript
 * import { CacheTTL } from '@my-girok/nest-common';
 *
 * await this.cache.set(key, data, CacheTTL.STATIC_CONFIG);
 * ```
 */
export const CacheTTL = {
  /**
   * Static configuration data (services, oauth providers, law registry)
   * Changes rarely, safe to cache for extended periods
   */
  STATIC_CONFIG: 24 * 60 * 60 * 1000, // 24 hours

  /**
   * Semi-static data (role permissions, legal documents)
   * May change occasionally, moderate caching
   */
  SEMI_STATIC: 15 * 60 * 1000, // 15 minutes

  /**
   * User-specific data (preferences, resume metadata)
   * Changes more frequently, shorter cache
   */
  USER_DATA: 5 * 60 * 1000, // 5 minutes

  /**
   * Session-related data (admin sessions, operator sessions)
   * Security-sensitive, moderate duration
   */
  SESSION: 30 * 60 * 1000, // 30 minutes

  /**
   * Short-lived data (rate limiting, temporary tokens)
   * Expires quickly for security
   */
  SHORT_LIVED: 60 * 1000, // 1 minute

  /**
   * Ephemeral data (real-time metrics, active user counts)
   * Very short duration for near-real-time accuracy
   */
  EPHEMERAL: 10 * 1000, // 10 seconds

  /**
   * Username to userId lookup cache
   * Users rarely change usernames
   */
  USERNAME_LOOKUP: 2 * 60 * 60 * 1000, // 2 hours

  /**
   * Export job status cache
   * Valid until download or expiry
   */
  EXPORT_STATUS: 24 * 60 * 60 * 1000, // 24 hours

  /**
   * Behavior summary / analytics cache
   * Refreshes periodically with MV updates
   */
  ANALYTICS: 5 * 60 * 1000, // 5 minutes

  /**
   * Funnel data cache
   * Updated less frequently than raw analytics
   */
  FUNNEL: 15 * 60 * 1000, // 15 minutes
} as const;

export type CacheTTLKey = keyof typeof CacheTTL;
