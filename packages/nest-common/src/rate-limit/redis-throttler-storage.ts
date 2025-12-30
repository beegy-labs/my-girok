import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

/**
 * Record returned by the throttler storage
 * (matches @nestjs/throttler's ThrottlerStorageRecord)
 */
export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

export interface RedisThrottlerStorageOptions {
  /**
   * Redis connection URL
   * @example 'redis://localhost:6379'
   */
  url: string;

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
}

/**
 * Atomic Lua script for rate limiting with block duration support.
 * Performs increment, expiry check, and block duration extension in single operation.
 *
 * KEYS[1]: Redis key for the rate limit counter
 * ARGV[1]: TTL in milliseconds
 * ARGV[2]: Rate limit value
 * ARGV[3]: Block duration in milliseconds (0 to disable)
 *
 * Returns: [totalHits, timeToExpire, isBlocked (0 or 1)]
 */
const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
local ttlMs = redis.call('PTTL', KEYS[1])

-- Set expiry if key is new (PTTL returns -1 for keys without expiry)
if ttlMs == -1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttlMs = tonumber(ARGV[1])
end

-- Check if blocked and extend expiry if block duration is set
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])
local isBlocked = 0

if current > limit then
  isBlocked = 1
  if blockDuration > 0 then
    redis.call('PEXPIRE', KEYS[1], blockDuration)
    ttlMs = blockDuration
  end
end

return {current, ttlMs, isBlocked}
`;

/**
 * Redis-based throttler storage for distributed rate limiting.
 *
 * Features:
 * - Atomic rate limiting using Lua scripts
 * - Circuit breaker pattern for Redis failures
 * - Fail-open fallback for high availability
 * - Command timeout protection
 *
 * @example
 * ```typescript
 * const storage = new RedisThrottlerStorage({
 *   url: 'redis://localhost:6379',
 *   keyPrefix: 'myapp:throttle:',
 *   enableFallback: true,
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

  // Script SHA for EVALSHA optimization
  private scriptSha: string | null = null;

  constructor(private readonly options: RedisThrottlerStorageOptions) {
    this.keyPrefix = options.keyPrefix ?? 'throttle:';
    this.enableFallback = options.enableFallback ?? true;
    this.commandTimeout = options.commandTimeout ?? 3000;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? 5;
    this.circuitBreakerResetTime = options.circuitBreakerResetTime ?? 30000;

    this.redis = new Redis(options.url, {
      connectTimeout: options.connectTimeout ?? 5000,
      commandTimeout: this.commandTimeout,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
      },
      tls: options.tls ? {} : undefined,
      lazyConnect: true,
      enableReadyCheck: true,
    });

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
      // Pre-load script on connection
      this.loadScript();
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
   * Implements half-open state after reset time.
   */
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitOpen) {
      return false;
    }

    // Check if we should attempt reset (half-open state)
    if (this.circuitOpenedAt) {
      const elapsed = Date.now() - this.circuitOpenedAt;
      if (elapsed >= this.circuitBreakerResetTime) {
        this.logger.log('Circuit breaker entering half-open state - attempting Redis operation');
        return false; // Allow one request through
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
   */
  private resetCircuitBreaker(): void {
    if (this.circuitOpen || this.consecutiveFailures > 0) {
      this.circuitOpen = false;
      this.circuitOpenedAt = null;
      this.consecutiveFailures = 0;
      this.logger.log('Circuit breaker CLOSED - Redis operations resumed');
    }
  }

  /**
   * Record a failure and potentially open circuit breaker.
   */
  private recordFailure(): void {
    this.consecutiveFailures++;
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
   */
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Execute Redis command with timeout protection.
   */
  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = this.commandTimeout,
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Redis operation timeout')), timeoutMs),
      ),
    ]);
  }

  /**
   * Increment the throttle counter and return the current record.
   * Uses atomic Lua script for consistent rate limiting.
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

    try {
      let result: [number, number, number];

      // Try EVALSHA first (faster), fall back to EVAL
      if (this.scriptSha) {
        try {
          result = (await this.withTimeout(() =>
            this.redis.evalsha(this.scriptSha!, 1, redisKey, ttl, limit, blockDuration),
          )) as [number, number, number];
        } catch (error) {
          // Script not found (NOSCRIPT error) - fall back to EVAL
          if (error instanceof Error && error.message.includes('NOSCRIPT')) {
            this.scriptSha = null;
            result = (await this.withTimeout(() =>
              this.redis.eval(RATE_LIMIT_SCRIPT, 1, redisKey, ttl, limit, blockDuration),
            )) as [number, number, number];
            // Reload script for next time
            this.loadScript();
          } else {
            throw error;
          }
        }
      } else {
        result = (await this.withTimeout(() =>
          this.redis.eval(RATE_LIMIT_SCRIPT, 1, redisKey, ttl, limit, blockDuration),
        )) as [number, number, number];
      }

      // Success - reset circuit breaker
      this.resetCircuitBreaker();

      const totalHits = result[0];
      const timeToExpire = result[1];
      const isBlocked = result[2] === 1;

      return {
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire: isBlocked ? blockDuration : 0,
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
    }
  }

  /**
   * Get current throttle record without incrementing.
   * Returns undefined if key doesn't exist.
   */
  async get(key: string, throttlerName: string): Promise<ThrottlerStorageRecord | undefined> {
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

      return {
        totalHits: parseInt(String(count), 10),
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch (error) {
      this.recordFailure();
      this.logger.error(`Rate limit get failed: ${error instanceof Error ? error.message : error}`);
      return undefined;
    }
  }

  /**
   * Check if Redis is connected and healthy.
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
   * Get current circuit breaker status.
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
