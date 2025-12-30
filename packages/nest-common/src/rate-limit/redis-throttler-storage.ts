import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

/**
 * Record returned by the throttler storage.
 *
 * This interface is intentionally redefined here rather than imported from
 * @nestjs/throttler because:
 * 1. @nestjs/throttler does not export ThrottlerStorageRecord from its public API
 * 2. The interface is only used internally by the ThrottlerStorage interface
 * 3. Importing from internal paths (e.g., '@nestjs/throttler/dist/...') is fragile
 *    and may break on minor version updates
 *
 * This definition is kept in sync with @nestjs/throttler's ThrottlerStorageRecord.
 * See: https://github.com/nestjs/throttler/blob/master/src/throttler-storage-record.interface.ts
 *
 * @see ThrottlerStorage
 */
export interface ThrottlerStorageRecord {
  /** Total number of hits in the current window */
  totalHits: number;
  /** Time remaining until the rate limit window expires (in milliseconds) */
  timeToExpire: number;
  /** Whether the client is currently blocked */
  isBlocked: boolean;
  /** Time remaining until the block expires (in milliseconds), 0 if not blocked */
  timeToBlockExpire: number;
}

/**
 * Redis Sentinel configuration for high availability.
 */
export interface RedisSentinelConfig {
  /** Sentinel host */
  host: string;
  /** Sentinel port */
  port: number;
}

export interface RedisThrottlerStorageOptions {
  /**
   * Redis connection URL (mutually exclusive with sentinels)
   * @example 'redis://localhost:6379'
   */
  url?: string;

  /**
   * Redis Sentinel configuration for high availability (mutually exclusive with url)
   * @example [{ host: 'sentinel1', port: 26379 }, { host: 'sentinel2', port: 26379 }]
   */
  sentinels?: RedisSentinelConfig[];

  /**
   * Sentinel master name (required when using sentinels)
   * @example 'mymaster'
   */
  sentinelName?: string;

  /**
   * Key prefix for throttle entries
   * @default 'throttle:'
   */
  keyPrefix?: string;

  /**
   * Connection timeout in milliseconds
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
   * Maximum concurrent Redis operations (bulkhead pattern)
   * Limits resource consumption during high load
   * @default 100
   */
  maxConcurrentOperations?: number;
}

/**
 * Atomic Lua script for sliding window rate limiting using sorted sets.
 * This provides more accurate rate limiting than fixed windows by removing
 * requests outside the current time window.
 *
 * KEYS[1]: Redis key for the rate limit sorted set
 * ARGV[1]: Current timestamp in milliseconds
 * ARGV[2]: Window size in milliseconds (TTL)
 * ARGV[3]: Rate limit value
 * ARGV[4]: Block duration in milliseconds (0 to use window)
 *
 * Returns: [totalHits, timeToExpire, isBlocked (0 or 1)]
 *
 * Algorithm (Sliding Window Log):
 * 1. Remove all entries older than (now - window)
 * 2. Count remaining entries
 * 3. If count < limit, add new entry with current timestamp
 * 4. Set key expiry to window size
 * 5. Return count, TTL, and blocked status
 */
const RATE_LIMIT_SCRIPT = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local blockDuration = tonumber(ARGV[4])

-- Validate blockDuration is non-negative (defensive check)
if blockDuration == nil or blockDuration < 0 then
  blockDuration = 0
end

-- Remove entries outside the sliding window
local windowStart = now - window
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, windowStart)

-- Count current requests in window
local count = redis.call('ZCARD', KEYS[1])

-- Check if blocked
local isBlocked = 0
if count >= limit then
  isBlocked = 1
  -- Get TTL for blocked response
  local ttlMs = redis.call('PTTL', KEYS[1])
  if ttlMs < 0 then
    ttlMs = window
  end
  if blockDuration > 0 then
    redis.call('PEXPIRE', KEYS[1], blockDuration)
    ttlMs = blockDuration
  end
  return {count, ttlMs, isBlocked}
end

-- Not blocked - add new request with unique member (timestamp + random suffix)
-- Using timestamp as score and unique member prevents duplicate issues
local member = now .. '-' .. math.random(1000000)
redis.call('ZADD', KEYS[1], now, member)
count = count + 1

-- Set expiry to window size (or blockDuration if exceeded after this request)
local ttlMs = window
if count > limit then
  isBlocked = 1
  if blockDuration > 0 then
    redis.call('PEXPIRE', KEYS[1], blockDuration)
    ttlMs = blockDuration
  else
    redis.call('PEXPIRE', KEYS[1], window)
  end
else
  redis.call('PEXPIRE', KEYS[1], window)
end

return {count, ttlMs, isBlocked}
`;

/**
 * Simple semaphore for bulkhead pattern.
 * Limits concurrent Redis operations to prevent resource exhaustion.
 */
class Semaphore {
  private available: number;
  private readonly waitQueue: Array<() => void> = [];

  constructor(private readonly max: number) {
    this.available = max;
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    const next = this.waitQueue.shift();
    if (next) {
      next();
    } else {
      this.available++;
    }
  }

  get activeCount(): number {
    return this.max - this.available;
  }

  get waitingCount(): number {
    return this.waitQueue.length;
  }
}

/**
 * Redis-based throttler storage for distributed rate limiting.
 *
 * Features:
 * - Sliding window rate limiting using sorted sets
 * - Atomic rate limiting using Lua scripts
 * - Circuit breaker pattern for Redis failures
 * - Bulkhead pattern for limiting concurrent operations
 * - Fail-open fallback for high availability
 * - Command timeout protection
 * - Redis Sentinel support for high availability
 * - Redis Cluster compatible with hash tags
 *
 * @example
 * ```typescript
 * // Standard Redis connection
 * const storage = new RedisThrottlerStorage({
 *   url: 'redis://localhost:6379',
 *   keyPrefix: 'myapp:throttle:',
 *   enableFallback: true,
 * });
 *
 * // Redis Sentinel for HA
 * const storage = new RedisThrottlerStorage({
 *   sentinels: [
 *     { host: 'sentinel1', port: 26379 },
 *     { host: 'sentinel2', port: 26379 },
 *   ],
 *   sentinelName: 'mymaster',
 *   keyPrefix: 'myapp:throttle:',
 * });
 * ```
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private redis: Redis;
  private readonly keyPrefix: string;
  private readonly enableFallback: boolean;
  private readonly commandTimeout: number;

  // Connection state
  private isConnected = false;

  // Circuit breaker state
  private circuitOpen = false;
  private circuitOpenedAt: number | null = null;
  private consecutiveFailures = 0;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerResetTime: number;

  // Bulkhead pattern - limits concurrent Redis operations
  private readonly semaphore: Semaphore;

  /**
   * Flag indicating a half-open test request is in progress.
   * When the circuit breaker is open and the reset time has elapsed,
   * we allow a single request through to test if Redis has recovered.
   * ioredis handles the actual reconnection logic; this just gates
   * application-level requests during the circuit breaker open state.
   */
  private halfOpenTestInProgress = false;

  // Script SHA for EVALSHA optimization
  private scriptSha: string | null = null;

  constructor(private readonly options: RedisThrottlerStorageOptions) {
    // Validate required options - must have either url or sentinels
    if (!options.url && !options.sentinels) {
      throw new Error('RedisThrottlerStorage requires either url or sentinels configuration');
    }

    if (options.sentinels && !options.sentinelName) {
      throw new Error('RedisThrottlerStorage requires sentinelName when using sentinels');
    }

    this.keyPrefix = options.keyPrefix ?? 'throttle:';
    this.enableFallback = options.enableFallback ?? true;
    this.commandTimeout = Math.max(options.commandTimeout ?? 3000, 100);
    this.circuitBreakerThreshold = Math.max(options.circuitBreakerThreshold ?? 5, 1);
    this.circuitBreakerResetTime = Math.max(options.circuitBreakerResetTime ?? 30000, 1000);

    // Initialize bulkhead semaphore
    const maxConcurrent = Math.max(options.maxConcurrentOperations ?? 100, 1);
    this.semaphore = new Semaphore(maxConcurrent);

    // Build Redis configuration
    const redisConfig = {
      connectTimeout: options.connectTimeout ?? 5000,
      commandTimeout: this.commandTimeout,
      maxRetriesPerRequest: 3,
      /**
       * Retry strategy for Redis connection failures.
       *
       * Uses exponential backoff with jitter to prevent thundering herd.
       * Never returns null to allow continuous recovery attempts.
       * The circuit breaker at the application level provides additional
       * protection by failing fast when Redis is unavailable.
       *
       * @param times - Number of retry attempts
       * @returns Delay in milliseconds before next retry
       */
      retryStrategy: (times: number): number => {
        // Exponential backoff: 100ms, 200ms, 400ms, 800ms... capped at 30s
        const baseDelay = Math.min(100 * Math.pow(2, times - 1), 30000);
        // Add jitter (0-10% of base delay) to prevent thundering herd
        const jitter = Math.random() * baseDelay * 0.1;
        const delay = baseDelay + jitter;

        // Log reconnection attempts at reasonable intervals
        if (times === 1 || times % 10 === 0) {
          this.logger.warn(
            `Redis reconnection attempt ${times}, next retry in ${Math.round(delay)}ms`,
          );
        }

        return delay;
      },
      tls: options.tls ? {} : undefined,
      lazyConnect: true,
      enableReadyCheck: true,
    };

    // Create Redis client with either URL or Sentinel config
    if (options.sentinels && options.sentinelName) {
      this.redis = new Redis({
        ...redisConfig,
        sentinels: options.sentinels,
        name: options.sentinelName,
      });
      this.logger.log(`Connecting to Redis via Sentinel (master: ${options.sentinelName})`);
    } else {
      this.redis = new Redis(options.url!, redisConfig);
    }

    this.setupEventHandlers();
    this.connect();
  }

  /**
   * Set up Redis connection event handlers.
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.resetCircuitBreaker();
      this.logger.log('Redis connected for rate limiting');
      // Clear cached script SHA and reload (handles reconnection to different server)
      this.scriptSha = null;
      this.loadScript().catch((err) => {
        this.logger.warn(`Background script load failed: ${err.message}`);
      });
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
      this.resetCircuitBreaker();
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  /**
   * Connect to Redis.
   */
  private connect(): void {
    this.redis.connect().catch((err) => {
      this.logger.error(`Failed to connect to Redis: ${err.message}`);
    });
  }

  /**
   * Pre-load the Lua script for EVALSHA optimization.
   */
  private async loadScript(): Promise<void> {
    try {
      this.scriptSha = (await this.redis.script('LOAD', RATE_LIMIT_SCRIPT)) as string;
      this.logger.debug(`Rate limit script loaded with SHA: ${this.scriptSha}`);
    } catch (error) {
      this.logger.warn(
        `Failed to pre-load rate limit script: ${error instanceof Error ? error.message : error}`,
      );
      this.scriptSha = null;
    }
  }

  /**
   * Check if circuit breaker is currently open.
   *
   * Implements a simplified half-open state after reset time. The half-open state
   * allows a single test request through to check if Redis has recovered.
   *
   * Note: ioredis handles the actual reconnection logic with its retryStrategy.
   * This circuit breaker operates at the application level to fail fast and
   * prevent request queuing when Redis is known to be unavailable.
   *
   * @returns True if the circuit is open and requests should be blocked/fallback
   */
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitOpen) {
      return false;
    }

    // Check if we should attempt reset (half-open state)
    if (this.circuitOpenedAt) {
      const elapsed = Date.now() - this.circuitOpenedAt;

      if (elapsed >= this.circuitBreakerResetTime) {
        // Check if a half-open test is already in progress
        if (this.halfOpenTestInProgress) {
          // Another request is already testing the circuit
          // Keep blocking other requests until the test completes
          return true;
        }

        // Allow this request through to test if Redis has recovered
        this.halfOpenTestInProgress = true;
        this.logger.log('Circuit breaker half-open - allowing test request');
        return false;
      }
    }

    return true;
  }

  /**
   * Open the circuit breaker.
   */
  private openCircuitBreaker(): void {
    if (!this.circuitOpen) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      this.logger.error(
        `Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures. ` +
          `Redis operations suspended for ${this.circuitBreakerResetTime}ms`,
      );
    }
  }

  /**
   * Reset circuit breaker to closed state.
   * Called when Redis connection is restored or operations succeed.
   */
  private resetCircuitBreaker(): void {
    if (this.circuitOpen || this.consecutiveFailures > 0 || this.halfOpenTestInProgress) {
      this.circuitOpen = false;
      this.circuitOpenedAt = null;
      this.consecutiveFailures = 0;
      this.halfOpenTestInProgress = false;
      this.logger.log('Circuit breaker CLOSED - Redis operations resumed');
    }
  }

  /**
   * Record a failure and potentially open circuit breaker.
   * Resets half-open test flag to allow retry after the reset time.
   */
  private recordFailure(): void {
    this.consecutiveFailures++;
    // Reset half-open test flag on failure
    // This allows the next request after reset time to attempt another test
    this.halfOpenTestInProgress = false;
    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    }
  }

  /**
   * Returns a fallback record that allows the request through.
   * Used when Redis is unavailable and enableFallback is true.
   */
  private getFallbackRecord(ttl: number): ThrottlerStorageRecord {
    return {
      totalHits: 1,
      timeToExpire: ttl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  /**
   * Gracefully disconnect from Redis when the module is destroyed.
   * Implements NestJS OnModuleDestroy lifecycle hook.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      this.logger.warn(
        `Error during Redis disconnect: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Build Redis key for a throttle entry.
   * Uses hash tags for Redis Cluster compatibility - all keys for the same
   * identifier will be routed to the same slot.
   *
   * @param key - The throttle key identifier
   * @returns Redis key with hash tag for cluster routing
   */
  private buildKey(key: string): string {
    // Use hash tag {key} for Redis Cluster - ensures all operations for the
    // same key go to the same slot, which is required for Lua script atomicity
    return `${this.keyPrefix}{${key}}`;
  }

  /**
   * Execute Redis command with timeout protection.
   * Properly cleans up timeout to prevent memory leaks.
   *
   * IMPORTANT LIMITATION: The Promise.race pattern returns on timeout but the Redis
   * operation continues executing in the background. This means:
   * - Resources may be consumed after timeout
   * - Operations may complete after we've already returned/failed
   * - There is no way to abort the Redis operation mid-flight
   *
   * This is a known limitation of the ioredis client which does not support
   * AbortController/AbortSignal for command cancellation. The commandTimeout
   * option on the Redis client provides some protection, but individual command
   * cancellation is not possible.
   *
   * For production use, consider:
   * - Setting appropriate commandTimeout on the Redis client
   * - Monitoring for timeouts and circuit breaker activation
   * - Using connection pooling with health checks
   */
  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = this.commandTimeout,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Redis operation timeout')), timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Increment the throttle counter and return the current record.
   *
   * Uses an atomic Lua script with sliding window algorithm for consistent rate limiting.
   * The script uses sorted sets to track requests within a sliding time window,
   * providing more accurate rate limiting than fixed windows.
   *
   * Features:
   * - Sliding window rate limiting using sorted sets
   * - Circuit breaker integration for resilience
   * - Bulkhead pattern to limit concurrent operations
   * - Fallback mode when Redis is unavailable
   * - EVALSHA optimization with automatic fallback to EVAL
   *
   * @param key - The unique identifier for this rate limit (e.g., IP address, user ID)
   * @param ttl - Time-to-live in milliseconds for the rate limit window
   * @param limit - Maximum number of requests allowed in the window
   * @param blockDuration - Duration in milliseconds to block after exceeding limit (0 to use TTL)
   * @param throttlerName - Name of the throttler configuration
   * @returns The current throttler storage record
   * @throws Error if Redis is unavailable and fallback is disabled
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    // Check circuit breaker first
    if (this.isCircuitBreakerOpen()) {
      if (this.enableFallback) {
        this.logger.debug(`Circuit breaker open - using fallback for key ${throttlerName}:${key}`);
        return this.getFallbackRecord(ttl);
      }
      throw new Error('Circuit breaker open - Redis unavailable');
    }

    const redisKey = this.buildKey(`${throttlerName}:${key}`);

    // Bulkhead pattern: acquire semaphore before Redis operation
    await this.semaphore.acquire();

    try {
      let result: [number, number, number];
      // Current timestamp for sliding window
      const now = Date.now();

      // Try EVALSHA first (faster), fall back to EVAL
      // Sliding window script args: now, window(ttl), limit, blockDuration
      if (this.scriptSha) {
        try {
          result = (await this.withTimeout(() =>
            this.redis.evalsha(this.scriptSha!, 1, redisKey, now, ttl, limit, blockDuration),
          )) as [number, number, number];
        } catch (error) {
          // Script not found (NOSCRIPT error) - fall back to EVAL
          if (error instanceof Error && error.message.includes('NOSCRIPT')) {
            this.scriptSha = null;
            result = (await this.withTimeout(() =>
              this.redis.eval(RATE_LIMIT_SCRIPT, 1, redisKey, now, ttl, limit, blockDuration),
            )) as [number, number, number];
            // Reload script for next time (fire and forget, handle errors)
            this.loadScript().catch((err) => {
              this.logger.warn(`Background script reload failed: ${err.message}`);
            });
          } else {
            throw error;
          }
        }
      } else {
        result = (await this.withTimeout(() =>
          this.redis.eval(RATE_LIMIT_SCRIPT, 1, redisKey, now, ttl, limit, blockDuration),
        )) as [number, number, number];
      }

      // Success - reset circuit breaker
      this.resetCircuitBreaker();

      // Runtime validation for Redis response types
      if (!Array.isArray(result) || result.length !== 3) {
        throw new Error(
          `Invalid Redis response format: expected array of 3 elements, got ${JSON.stringify(result)}`,
        );
      }

      const [rawHits, rawTtl, rawBlocked] = result;

      // Validate each field is a number
      if (typeof rawHits !== 'number' || !Number.isFinite(rawHits)) {
        throw new Error(`Invalid totalHits value from Redis: ${rawHits}`);
      }
      if (typeof rawTtl !== 'number' || !Number.isFinite(rawTtl)) {
        throw new Error(`Invalid timeToExpire value from Redis: ${rawTtl}`);
      }
      if (typeof rawBlocked !== 'number' || (rawBlocked !== 0 && rawBlocked !== 1)) {
        throw new Error(`Invalid isBlocked value from Redis: ${rawBlocked}`);
      }

      const totalHits = rawHits;
      const timeToExpire = Math.max(0, rawTtl); // Ensure non-negative
      const isBlocked = rawBlocked === 1;

      return {
        totalHits,
        timeToExpire,
        isBlocked,
        // Use actual TTL from Redis when blocked, not input blockDuration
        timeToBlockExpire: isBlocked ? timeToExpire : 0,
      };
    } catch (error) {
      this.recordFailure();
      this.logger.error(
        `Rate limit increment failed (${this.consecutiveFailures}/${this.circuitBreakerThreshold}): ` +
          `${error instanceof Error ? error.message : error}`,
      );

      // Fallback: allow request through if Redis is unavailable
      if (this.enableFallback) {
        this.logger.warn(`Rate limiting fallback: allowing request for ${throttlerName}:${key}`);
        return this.getFallbackRecord(ttl);
      }

      throw error;
    } finally {
      // Always release the semaphore
      this.semaphore.release();
    }
  }

  /**
   * Get current throttle record without incrementing the counter.
   *
   * Useful for checking the current rate limit status without affecting it,
   * such as for displaying rate limit information to users or monitoring.
   *
   * @param key - The unique identifier for this rate limit (e.g., IP address, user ID)
   * @param throttlerName - Name of the throttler configuration
   * @param limit - Optional limit to check if blocked (for accurate isBlocked status)
   * @returns The current throttler storage record, or undefined if key doesn't exist or Redis is unavailable
   */
  async get(
    key: string,
    throttlerName: string,
    limit?: number,
  ): Promise<ThrottlerStorageRecord | undefined> {
    if (this.isCircuitBreakerOpen()) {
      return undefined;
    }

    const redisKey = this.buildKey(`${throttlerName}:${key}`);

    try {
      const pipeline = this.redis.pipeline();
      pipeline.get(redisKey);
      pipeline.pttl(redisKey);

      const results = await this.withTimeout(() => pipeline.exec());
      if (!results) return undefined;

      const [countResult, ttlResult] = results;

      // Check for errors in pipeline results
      if (countResult?.[0] || ttlResult?.[0]) {
        const error = countResult?.[0] || ttlResult?.[0];
        throw error;
      }

      const count = countResult?.[1];
      const ttl = ttlResult?.[1];

      // Ensure we have valid values
      if (count === null || count === undefined) return undefined;
      if (ttl === null || ttl === undefined || typeof ttl !== 'number' || ttl < 0) {
        return undefined;
      }

      // Reset on successful operation
      this.resetCircuitBreaker();

      const totalHits = parseInt(String(count), 10);
      // Check if blocked based on limit (if provided)
      const isBlocked = limit !== undefined ? totalHits > limit : false;

      return {
        totalHits,
        timeToExpire: ttl,
        isBlocked,
        timeToBlockExpire: isBlocked ? ttl : 0,
      };
    } catch (error) {
      this.recordFailure();
      this.logger.error(`Rate limit get failed: ${error instanceof Error ? error.message : error}`);
      return undefined;
    }
  }

  /**
   * Check if Redis is connected and healthy.
   *
   * Performs a PING command to verify Redis is responsive.
   * Returns false if:
   * - Redis is not connected
   * - Circuit breaker is open
   * - PING command fails or times out
   *
   * Suitable for use in health check endpoints to monitor rate limiting infrastructure.
   *
   * @returns True if Redis is healthy and responsive, false otherwise
   *
   * @example
   * ```typescript
   * @Get('health')
   * async healthCheck(@Inject(REDIS_THROTTLER_STORAGE) storage: RedisThrottlerStorage) {
   *   const isHealthy = await storage.isHealthy();
   *   return { rateLimiting: isHealthy ? 'healthy' : 'degraded' };
   * }
   * ```
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isConnected || this.circuitOpen) {
      return false;
    }

    try {
      const result = await this.withTimeout(() => this.redis.ping(), 1000);
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Get detailed health status for monitoring and diagnostics.
   *
   * Provides comprehensive information about the Redis connection and circuit breaker
   * state, suitable for detailed health check endpoints or debugging.
   *
   * @returns Health status object with connection and circuit breaker details
   *
   * @example
   * ```typescript
   * @Get('health/detailed')
   * async detailedHealthCheck(@Inject(REDIS_THROTTLER_STORAGE) storage: RedisThrottlerStorage) {
   *   return storage.getHealthStatus();
   * }
   * ```
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    connected: boolean;
    circuitBreaker: {
      isOpen: boolean;
      consecutiveFailures: number;
      openedAt: number | null;
      timeUntilReset: number | null;
    };
    latencyMs: number | null;
  }> {
    const circuitBreaker = this.getCircuitBreakerStatus();
    let latencyMs: number | null = null;
    let healthy = false;

    if (this.isConnected && !this.circuitOpen) {
      const start = Date.now();
      try {
        const result = await this.withTimeout(() => this.redis.ping(), 1000);
        latencyMs = Date.now() - start;
        healthy = result === 'PONG';
      } catch {
        healthy = false;
      }
    }

    return {
      healthy,
      connected: this.isConnected,
      circuitBreaker: {
        ...circuitBreaker,
        timeUntilReset:
          circuitBreaker.isOpen && circuitBreaker.openedAt
            ? Math.max(0, this.circuitBreakerResetTime - (Date.now() - circuitBreaker.openedAt))
            : null,
      },
      latencyMs,
    };
  }

  /**
   * Get current circuit breaker status.
   *
   * Provides information about the circuit breaker state for monitoring
   * and debugging purposes.
   *
   * @returns Circuit breaker status object
   */
  getCircuitBreakerStatus(): {
    isOpen: boolean;
    consecutiveFailures: number;
    openedAt: number | null;
  } {
    return {
      isOpen: this.circuitOpen,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.circuitOpenedAt,
    };
  }
}
