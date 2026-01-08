export const SESSION_CONFIG = {
  // Session TTL by account type
  TTL: {
    USER: 7 * 24 * 60 * 60 * 1000, // 7 days
    OPERATOR: 12 * 60 * 60 * 1000, // 12 hours
    ADMIN: 8 * 60 * 60 * 1000, // 8 hours
  },

  // Refresh threshold (refresh when less than this time remains)
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
} as const;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export const CSRF_CONFIG = {
  COOKIE_NAME: 'XSRF-TOKEN',
  HEADER_NAME: 'X-XSRF-TOKEN',
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

export const OAUTH_PROVIDERS = ['google', 'kakao', 'naver', 'apple'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const ACCOUNT_TYPES = ['USER', 'OPERATOR', 'ADMIN'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const DEVICE_FINGERPRINT_HEADERS = [
  'user-agent',
  'accept-language',
  'accept-encoding',
] as const;
