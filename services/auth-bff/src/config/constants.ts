/**
 * Auth BFF Constants
 *
 * This module re-exports shared types from @my-girok/types and defines
 * BFF-specific session configuration.
 */
import {
  AccountType,
  ACCOUNT_TYPES,
  OAuthProvider,
  OAUTH_PROVIDERS,
  AuthProvider,
  COOKIE_NAMES,
  HEADER_NAMES,
  COOKIE_DEFAULTS,
} from '@my-girok/types';

// Re-export shared types for convenience
export {
  AccountType,
  ACCOUNT_TYPES,
  OAuthProvider,
  OAUTH_PROVIDERS,
  AuthProvider,
  COOKIE_NAMES,
  HEADER_NAMES,
  COOKIE_DEFAULTS,
};

/**
 * Session Configuration
 *
 * Session Expiration Policy:
 * - Sliding Session: Sessions are automatically extended on user activity
 * - When a request comes in and session has less than SLIDING_WINDOW remaining,
 *   the session TTL is extended by SLIDING_EXTENSION (not full TTL)
 * - This prevents indefinite session extension while keeping active users logged in
 *
 * Example (USER):
 * - Initial TTL: 7 days
 * - Sliding window: 1 day (check if < 1 day remaining)
 * - Sliding extension: 1 day (extend by 1 day, not full 7 days)
 * - Max session age: 30 days (absolute limit regardless of activity)
 */
export const SESSION_CONFIG = {
  // Session TTL by account type (initial session duration)
  TTL: {
    USER: 7 * 24 * 60 * 60 * 1000, // 7 days
    OPERATOR: 12 * 60 * 60 * 1000, // 12 hours
    ADMIN: 8 * 60 * 60 * 1000, // 8 hours
  },

  // Sliding session: extend when remaining time is less than this threshold
  SLIDING_WINDOW: {
    USER: 24 * 60 * 60 * 1000, // 1 day - extend if < 1 day remaining
    OPERATOR: 2 * 60 * 60 * 1000, // 2 hours - extend if < 2 hours remaining
    ADMIN: 1 * 60 * 60 * 1000, // 1 hour - extend if < 1 hour remaining
  },

  // Amount to extend session by when sliding (not full TTL for security)
  SLIDING_EXTENSION: {
    USER: 24 * 60 * 60 * 1000, // Extend by 1 day
    OPERATOR: 4 * 60 * 60 * 1000, // Extend by 4 hours
    ADMIN: 2 * 60 * 60 * 1000, // Extend by 2 hours
  },

  // Maximum absolute session age (hard limit regardless of activity)
  MAX_AGE: {
    USER: 30 * 24 * 60 * 60 * 1000, // 30 days max
    OPERATOR: 7 * 24 * 60 * 60 * 1000, // 7 days max
    ADMIN: 24 * 60 * 60 * 1000, // 24 hours max (security requirement)
  },

  // Token refresh threshold (refresh backend tokens when less than this time remains)
  REFRESH_THRESHOLD: {
    USER: 24 * 60 * 60 * 1000, // 1 day
    OPERATOR: 2 * 60 * 60 * 1000, // 2 hours
    ADMIN: 1 * 60 * 60 * 1000, // 1 hour
  },

  // Cookie paths by account type
  COOKIE_PATH: {
    USER: '/',
    OPERATOR: '/',
    ADMIN: '/admin',
  },

  // Enable/disable sliding sessions per account type
  SLIDING_ENABLED: {
    USER: true, // Users benefit from sliding sessions
    OPERATOR: true, // Operators need extended work sessions
    ADMIN: false, // Admins require re-authentication for security
  },
} as const;

/**
 * Cookie options for BFF session management
 * Uses shared defaults from @my-girok/types
 */
export const COOKIE_OPTIONS = {
  httpOnly: COOKIE_DEFAULTS.HTTP_ONLY,
  secure: process.env.NODE_ENV === 'production',
  sameSite: COOKIE_DEFAULTS.SAME_SITE,
  path: COOKIE_DEFAULTS.PATH,
};

/**
 * CSRF configuration
 * Uses shared cookie/header names from @my-girok/types
 */
export const CSRF_CONFIG = {
  COOKIE_NAME: COOKIE_NAMES.CSRF_TOKEN,
  HEADER_NAME: HEADER_NAMES.CSRF_TOKEN,
} as const;

export const RATE_LIMIT_CONFIG = {
  // Default rate limits
  DEFAULT: {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },

  // Auth-specific rate limits
  LOGIN: {
    ttl: 60000,
    limit: 5,
  },

  MFA: {
    ttl: 60000,
    limit: 5,
  },

  REGISTER: {
    ttl: 60000,
    limit: 3,
  },
} as const;

// Device fingerprint headers for session binding
// Note: accept-encoding excluded - varies between requests (Cloudflare/browser modifications)
export const DEVICE_FINGERPRINT_HEADERS = ['user-agent', 'accept-language'] as const;
