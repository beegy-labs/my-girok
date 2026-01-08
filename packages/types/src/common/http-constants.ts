/**
 * HTTP Constants - Cookie and Header Names
 *
 * Centralized definitions for cookie and header names used across
 * frontend and backend services. These names must be kept in sync
 * to ensure proper authentication and security flows.
 *
 * @module @my-girok/types/common
 */

/**
 * Cookie names used throughout the application
 * Frontend and backend must use these exact names for interoperability
 */
export const COOKIE_NAMES = {
  /** BFF session cookie - contains encrypted session ID */
  SESSION: 'girok_session',

  /** CSRF token cookie - readable by JavaScript for CSRF protection */
  CSRF_TOKEN: 'XSRF-TOKEN',

  /** OAuth state cookie - used during OAuth flow */
  OAUTH_STATE: 'girok_oauth_state',

  /** Remember me preference cookie */
  REMEMBER_ME: 'girok_remember',

  /** User preferences cookie (theme, locale, etc.) */
  PREFERENCES: 'girok_prefs',
} as const;

/**
 * HTTP header names used for security and authentication
 * Frontend must send these headers, backend must read them
 */
export const HEADER_NAMES = {
  /** CSRF token header - must match CSRF_TOKEN cookie value */
  CSRF_TOKEN: 'X-XSRF-TOKEN',

  /** Request ID header for distributed tracing */
  REQUEST_ID: 'X-Request-ID',

  /** Client fingerprint header for session binding */
  DEVICE_FINGERPRINT: 'X-Device-Fingerprint',

  /** App identifier header (for multi-app support) */
  APP_ID: 'X-App-ID',

  /** Service identifier header (for service mesh) */
  SERVICE_ID: 'X-Service-ID',

  /** Forwarded IP header (set by reverse proxy) */
  FORWARDED_FOR: 'X-Forwarded-For',

  /** Real IP header (set by reverse proxy) */
  REAL_IP: 'X-Real-IP',
} as const;

/**
 * Cookie configuration defaults
 * These can be overridden by service-specific configuration
 */
export const COOKIE_DEFAULTS = {
  /** Cookie path - root by default */
  PATH: '/',

  /** SameSite attribute for CSRF protection */
  SAME_SITE: 'strict' as const,

  /** HttpOnly attribute - prevent XSS access */
  HTTP_ONLY: true,

  /** Secure attribute - HTTPS only in production */
  SECURE: true,
} as const;

/**
 * Type for cookie names
 */
export type CookieName = (typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES];

/**
 * Type for header names
 */
export type HeaderName = (typeof HEADER_NAMES)[keyof typeof HEADER_NAMES];
