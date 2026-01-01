/**
 * Cache TTL constants (in milliseconds)
 * Centralized TTL management for consistent caching behavior
 */
export const CacheTTL = {
  /** Default TTL: 5 minutes */
  DEFAULT: 5 * 60 * 1000,

  /** Short-lived cache: 30 seconds (for frequently changing data) */
  SHORT: 30 * 1000,

  /** Medium TTL: 5 minutes (for session data) */
  MEDIUM: 5 * 60 * 1000,

  /** Long TTL: 1 hour (for static configuration) */
  LONG: 60 * 60 * 1000,

  /** Very long TTL: 24 hours (for rarely changing data) */
  VERY_LONG: 24 * 60 * 60 * 1000,

  /** Account data: 5 minutes */
  ACCOUNT: 5 * 60 * 1000,

  /** Session data: 1 minute (short for security) */
  SESSION: 1 * 60 * 1000,

  /** Permission data: 10 minutes (moderate frequency) */
  PERMISSION: 10 * 60 * 1000,

  /** Role data: 30 minutes (rarely changes) */
  ROLE: 30 * 60 * 1000,

  /** Legal document: 1 hour (rarely changes) */
  LEGAL_DOC: 60 * 60 * 1000,

  /** Law registry: 24 hours (very stable) */
  LAW_REGISTRY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Cache key prefixes for different domains
 */
export const CachePrefix = {
  /** Account-related cache keys */
  ACCOUNT: 'account',
  ACCOUNT_BY_EMAIL: 'account:email',
  ACCOUNT_BY_USERNAME: 'account:username',
  ACCOUNT_BY_EXTERNAL_ID: 'account:ext',

  /** Session-related cache keys */
  SESSION: 'session',
  SESSION_BY_TOKEN: 'session:token',
  SESSION_BY_ACCOUNT: 'session:account',

  /** Permission-related cache keys */
  PERMISSION: 'permission',
  PERMISSION_BY_OPERATOR: 'permission:operator',

  /** Role-related cache keys */
  ROLE: 'role',
  ROLE_BY_NAME: 'role:name',

  /** Legal-related cache keys */
  LEGAL_DOC: 'legal:doc',
  CONSENT: 'consent',
  LAW_REGISTRY: 'law:registry',
} as const;
