import { Logger } from '@nestjs/common';

/**
 * Logger for rate limit configuration.
 * Uses NestJS Logger for structured logging during module initialization.
 */
const configLogger = new Logger('RateLimitConfig');

/**
 * Throttler configuration item (ttl + limit)
 */
export interface ThrottlerConfig {
  /** Name of the throttler configuration */
  name: string;
  /** Time-to-live in milliseconds for the rate limit window */
  ttl: number;
  /** Maximum number of requests allowed in the window */
  limit: number;
}

/**
 * Parse environment variable as integer with fallback and validation.
 *
 * Uses NestJS Logger for structured logging of invalid values.
 * This is called during module initialization to configure rate limit tiers.
 *
 * @param key - Environment variable name
 * @param fallback - Default value if environment variable is not set or invalid
 * @param minValue - Minimum acceptable value (default: 1)
 * @returns Parsed integer or fallback value
 */
function parseEnvInt(key: string, fallback: number, minValue = 1): number {
  const value = process.env[key];
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < minValue) {
    configLogger.warn(
      `Invalid value for ${key}: "${value}". ` +
        `Expected integer >= ${minValue}, using fallback: ${fallback}`,
    );
    return fallback;
  }
  return parsed;
}

/**
 * Default TTL for rate limiting (configurable via RATE_LIMIT_TTL env var).
 * @default 60000 (1 minute)
 */
const DEFAULT_TTL = parseEnvInt('RATE_LIMIT_TTL', 60000);

/**
 * Rate limit tiers for different endpoint types.
 * These are recommended defaults that can be overridden via environment variables:
 * - RATE_LIMIT_TTL: Default TTL in milliseconds (default: 60000)
 * - RATE_LIMIT_STANDARD: Limit for standard endpoints (default: 100)
 * - RATE_LIMIT_AUTH: Limit for auth endpoints (default: 10)
 * - RATE_LIMIT_HIGH_FREQUENCY: Limit for high-frequency endpoints (default: 1000)
 * - RATE_LIMIT_WRITE_HEAVY: Limit for write-heavy endpoints (default: 30)
 * - RATE_LIMIT_ADMIN: Limit for admin endpoints (default: 200)
 * - RATE_LIMIT_PUBLIC: Limit for public endpoints (default: 50)
 */
/**
 * Immutable rate limit tier configurations.
 * Frozen to prevent accidental mutation by consumers.
 */
export const RateLimitTiers: Readonly<Record<string, Readonly<ThrottlerConfig>>> = Object.freeze({
  /**
   * Standard API endpoints (default)
   * 100 requests per minute
   */
  STANDARD: Object.freeze({
    name: 'standard',
    ttl: DEFAULT_TTL,
    limit: parseEnvInt('RATE_LIMIT_STANDARD', 100),
  }),

  /**
   * Authentication endpoints (login, register, password reset)
   * Lower limit to prevent brute force attacks
   */
  AUTH: Object.freeze({
    name: 'auth',
    ttl: DEFAULT_TTL,
    limit: parseEnvInt('RATE_LIMIT_AUTH', 10),
  }),

  /**
   * High-frequency endpoints (health checks, metrics)
   * Higher limit for monitoring systems
   */
  HIGH_FREQUENCY: Object.freeze({
    name: 'high-frequency',
    ttl: DEFAULT_TTL,
    limit: parseEnvInt('RATE_LIMIT_HIGH_FREQUENCY', 1000),
  }),

  /**
   * Write-heavy endpoints (file uploads, bulk operations)
   * Lower limit to prevent abuse
   */
  WRITE_HEAVY: Object.freeze({
    name: 'write-heavy',
    ttl: DEFAULT_TTL,
    limit: parseEnvInt('RATE_LIMIT_WRITE_HEAVY', 30),
  }),

  /**
   * Admin endpoints
   * Moderate limit for admin operations
   */
  ADMIN: Object.freeze({
    name: 'admin',
    ttl: DEFAULT_TTL,
    limit: parseEnvInt('RATE_LIMIT_ADMIN', 200),
  }),

  /**
   * Public endpoints (no auth required)
   * Stricter limit to prevent abuse
   */
  PUBLIC: Object.freeze({
    name: 'public',
    ttl: DEFAULT_TTL,
    limit: parseEnvInt('RATE_LIMIT_PUBLIC', 50),
  }),
});

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
   * Connection timeout in milliseconds for Redis
   * @default 5000
   */
  connectTimeout?: number;

  /**
   * Command timeout in milliseconds for Redis operations
   * @default 3000
   */
  commandTimeout?: number;

  /**
   * Enable TLS for Redis connection
   * @default false
   */
  tls?: boolean;

  /**
   * Enable fallback to allow requests when Redis is unavailable
   * @default true (fail-open for availability)
   */
  enableFallback?: boolean;

  /**
   * Number of consecutive failures before opening circuit breaker
   * @default 5
   */
  circuitBreakerThreshold?: number;

  /**
   * Time in milliseconds to keep circuit breaker open before attempting reset
   * @default 30000 (30 seconds)
   */
  circuitBreakerResetTime?: number;

  /**
   * Skip rate limiting for certain IPs (e.g., internal services)
   */
  skipIps?: string[];

  /**
   * Custom error message when rate limit is exceeded
   */
  errorMessage?: string;

  /**
   * Trusted proxy IP addresses or CIDR ranges for IP spoofing protection.
   * Only X-Forwarded-For headers from these proxies will be trusted.
   * @example ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
   */
  trustedProxies?: string[];

  /**
   * Maximum number of hops to trust in X-Forwarded-For chain.
   * @default 1
   */
  maxProxyHops?: number;

  /**
   * Whether to trust X-Real-IP header for client IP detection.
   * @default false
   */
  trustXRealIp?: boolean;
}

/**
 * Create throttler configuration for a service.
 *
 * Combines the default tier with any custom throttlers provided.
 * Uses a Map to prevent duplicate throttler names (custom throttlers
 * override the default if they share the same name).
 *
 * @param options - Rate limit module options
 * @returns Throttler configurations array
 *
 * @example
 * ```typescript
 * // Use default STANDARD tier
 * const config = createThrottlerConfig();
 *
 * // Use AUTH tier with custom throttler
 * const config = createThrottlerConfig({
 *   defaultTier: 'AUTH',
 *   customThrottlers: [{ name: 'api', ttl: 60000, limit: 50 }],
 * });
 * ```
 */
export function createThrottlerConfig(options?: RateLimitModuleOptions): ThrottlerConfig[] {
  const defaultTier = options?.defaultTier ?? 'STANDARD';
  const defaultConfig = RateLimitTiers[defaultTier];

  // Validate tier exists
  if (!defaultConfig) {
    configLogger.warn(`Unknown tier: ${defaultTier}. Using STANDARD.`);
    return [RateLimitTiers.STANDARD, ...(options?.customThrottlers ?? [])];
  }

  // Use Map to prevent duplicate throttler names
  const throttlerMap = new Map<string, ThrottlerConfig>();
  throttlerMap.set(defaultConfig.name, defaultConfig);

  // Add custom throttlers (override if same name)
  if (options?.customThrottlers) {
    for (const custom of options.customThrottlers) {
      throttlerMap.set(custom.name, custom);
    }
  }

  return Array.from(throttlerMap.values());
}

/**
 * Default error message for rate limit exceeded
 */
export const DEFAULT_RATE_LIMIT_MESSAGE = 'Too many requests. Please try again later.';

/**
 * HTTP headers for rate limit info per IETF RateLimit Fields draft standard.
 * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 */
export const RateLimitHeaders = {
  LIMIT: 'RateLimit-Limit',
  REMAINING: 'RateLimit-Remaining',
  RESET: 'RateLimit-Reset',
  POLICY: 'RateLimit-Policy',
  RETRY_AFTER: 'Retry-After',
} as const;

/**
 * Metadata keys for rate limit info set by the throttler guard.
 * Use these keys to set rate limit info on the request object.
 */
export const RATE_LIMIT_METADATA = {
  /** Maximum number of requests allowed in the rate limit window */
  LIMIT: 'THROTTLER_LIMIT',
  /** Configured TTL for the rate limit window (in milliseconds) */
  TTL: 'THROTTLER_TTL',
  /** Current number of hits in the rate limit window */
  HITS: 'THROTTLER_HITS',
  /**
   * Actual time to expire from Redis (in milliseconds).
   * This is the real TTL from the rate limit counter in Redis,
   * which may differ from the configured TTL when the window is partially elapsed.
   */
  TIME_TO_EXPIRE: 'THROTTLER_TIME_TO_EXPIRE',
} as const;
