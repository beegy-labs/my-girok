/**
 * Throttler configuration item (ttl + limit)
 */
export interface ThrottlerConfig {
  name: string;
  ttl: number;
  limit: number;
}

/**
 * Rate limit tiers for different endpoint types.
 * These are recommended defaults that can be overridden per-service.
 */
export const RateLimitTiers: Record<string, ThrottlerConfig> = {
  /**
   * Standard API endpoints (default)
   * 100 requests per minute
   */
  STANDARD: {
    name: 'standard',
    ttl: 60000, // 1 minute
    limit: 100,
  },

  /**
   * Authentication endpoints (login, register, password reset)
   * Lower limit to prevent brute force attacks
   */
  AUTH: {
    name: 'auth',
    ttl: 60000, // 1 minute
    limit: 10,
  },

  /**
   * High-frequency endpoints (health checks, metrics)
   * Higher limit for monitoring systems
   */
  HIGH_FREQUENCY: {
    name: 'high-frequency',
    ttl: 60000, // 1 minute
    limit: 1000,
  },

  /**
   * Write-heavy endpoints (file uploads, bulk operations)
   * Lower limit to prevent abuse
   */
  WRITE_HEAVY: {
    name: 'write-heavy',
    ttl: 60000, // 1 minute
    limit: 30,
  },

  /**
   * Admin endpoints
   * Moderate limit for admin operations
   */
  ADMIN: {
    name: 'admin',
    ttl: 60000, // 1 minute
    limit: 200,
  },

  /**
   * Public endpoints (no auth required)
   * Stricter limit to prevent abuse
   */
  PUBLIC: {
    name: 'public',
    ttl: 60000, // 1 minute
    limit: 50,
  },
} as const;

export type RateLimitTier = keyof typeof RateLimitTiers;

/**
 * Configuration options for RateLimitModule
 */
export interface RateLimitModuleOptions {
  /**
   * Default rate limit tier to apply
   * @default 'STANDARD'
   */
  defaultTier?: RateLimitTier;

  /**
   * Additional custom throttler configurations
   */
  customThrottlers?: ThrottlerConfig[];

  /**
   * Redis/Valkey connection URL for distributed rate limiting
   * If not provided, uses in-memory storage (not recommended for production)
   */
  redisUrl?: string;

  /**
   * Key prefix for Redis storage
   * @default 'throttle:'
   */
  keyPrefix?: string;

  /**
   * Skip rate limiting for certain IPs (e.g., internal services)
   */
  skipIps?: string[];

  /**
   * Custom error message when rate limit is exceeded
   */
  errorMessage?: string;
}

/**
 * Create throttler configuration for a service.
 *
 * @param options - Rate limit module options
 * @returns Throttler configurations array
 */
export function createThrottlerConfig(options?: RateLimitModuleOptions): ThrottlerConfig[] {
  const defaultTier = options?.defaultTier ?? 'STANDARD';
  const defaultConfig = RateLimitTiers[defaultTier];

  const throttlers: ThrottlerConfig[] = [defaultConfig];

  // Add custom throttlers if provided
  if (options?.customThrottlers) {
    throttlers.push(...options.customThrottlers);
  }

  return throttlers;
}

/**
 * Default error message for rate limit exceeded
 */
export const DEFAULT_RATE_LIMIT_MESSAGE = 'Too many requests. Please try again later.';

/**
 * HTTP headers for rate limit info
 */
export const RateLimitHeaders = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
} as const;
