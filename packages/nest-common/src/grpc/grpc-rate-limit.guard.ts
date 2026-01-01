/**
 * gRPC Rate Limiting Guard
 *
 * Provides rate limiting for gRPC endpoints using a sliding window algorithm.
 * Supports per-method and global rate limits with configurable time windows.
 *
 * Features:
 * - Sliding window rate limiting
 * - Per-IP or per-user rate limiting
 * - Method-specific limits
 * - Configurable time windows
 * - Optional Redis/Valkey backend support
 *
 * @example
 * ```typescript
 * @Controller()
 * @UseGuards(GrpcRateLimitGuard)
 * export class IdentityGrpcController {
 *   @GrpcMethod('IdentityService', 'CreateAccount')
 *   @GrpcRateLimit({ maxRequests: 10, windowMs: 60000 })
 *   async createAccount(request: CreateAccountRequest) {
 *     // Rate limited to 10 requests per minute
 *   }
 * }
 * ```
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  SetMetadata,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

// ============================================================================
// Types and Configuration
// ============================================================================

/**
 * Rate limit configuration options
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key prefix for rate limit tracking */
  keyPrefix?: string;
  /** Custom key generator function */
  keyGenerator?: (context: ExecutionContext) => string;
  /** Skip rate limiting for certain conditions */
  skip?: (context: ExecutionContext) => boolean;
  /** Message to return when rate limited */
  message?: string;
}

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  keyPrefix: 'grpc_rate_limit',
  message: 'Too many requests, please try again later',
};

/**
 * Rate limit entry for tracking
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  timestamps: number[];
}

/**
 * Rate limit store interface
 * Can be implemented with Redis/Valkey for distributed systems
 */
export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void>;
  increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }>;
}

/**
 * Injection token for rate limit store
 */
export const RATE_LIMIT_STORE = 'RATE_LIMIT_STORE';

/**
 * Metadata key for rate limit configuration
 */
export const GRPC_RATE_LIMIT_KEY = 'grpc_rate_limit';

// ============================================================================
// Decorator
// ============================================================================

/**
 * Decorator to set rate limit configuration for a method
 *
 * @example
 * ```typescript
 * @GrpcRateLimit({ maxRequests: 5, windowMs: 10000 })
 * async sensitiveOperation() { }
 *
 * // Or with minimal config
 * @GrpcRateLimit({ maxRequests: 100 })
 * async regularOperation() { }
 * ```
 */
export const GrpcRateLimit = (config: Partial<RateLimitConfig>) =>
  SetMetadata(GRPC_RATE_LIMIT_KEY, config);

// ============================================================================
// In-Memory Store Implementation
// ============================================================================

/**
 * In-memory rate limit store
 * Use for single-instance deployments or testing
 * For production with multiple instances, use Redis/Valkey
 */
@Injectable()
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly cleanupIntervalMs = 60000; // 1 minute
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // New or expired entry
      entry = {
        count: 1,
        resetTime: now + windowMs,
        timestamps: [now],
      };
    } else {
      // Filter out old timestamps (sliding window)
      entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
      entry.timestamps.push(now);
      entry.count = entry.timestamps.length;
    }

    this.store.set(key, entry);
    return { count: entry.count, resetTime: entry.resetTime };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }
}

// ============================================================================
// Rate Limit Guard
// ============================================================================

/**
 * gRPC Rate Limit Guard
 *
 * Implements sliding window rate limiting for gRPC endpoints.
 * Can be used globally or per-controller/method.
 */
@Injectable()
export class GrpcRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(GrpcRateLimitGuard.name);
  private readonly defaultConfig: RateLimitConfig;
  private readonly inMemoryStore: InMemoryRateLimitStore;

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(RATE_LIMIT_STORE)
    private readonly store?: RateLimitStore,
    @Optional()
    @Inject('RATE_LIMIT_CONFIG')
    config?: Partial<RateLimitConfig>,
  ) {
    this.defaultConfig = { ...DEFAULT_RATE_LIMIT, ...config };
    this.inMemoryStore = new InMemoryRateLimitStore();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const contextType = context.getType();

    // Only apply to RPC/gRPC requests
    if (contextType !== 'rpc') {
      return true;
    }

    // Get method-specific config or use default
    const methodConfig = this.reflector.get<Partial<RateLimitConfig>>(
      GRPC_RATE_LIMIT_KEY,
      context.getHandler(),
    );

    const config: RateLimitConfig = {
      ...this.defaultConfig,
      ...methodConfig,
    };

    // Check if rate limiting should be skipped
    if (config.skip?.(context)) {
      return true;
    }

    // Generate rate limit key
    const key = this.generateKey(context, config);

    // Get the store to use
    const rateLimitStore = this.store ?? this.inMemoryStore;

    // Increment and check
    const { count, resetTime } = await rateLimitStore.increment(key, config.windowMs);

    // Log rate limit status
    this.logger.debug(`Rate limit check: ${key}, count: ${count}/${config.maxRequests}`);

    if (count > config.maxRequests) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      this.logger.warn(`Rate limit exceeded for ${key}. Retry after ${retryAfter}s`);

      throw new RpcException({
        code: GrpcStatus.RESOURCE_EXHAUSTED,
        message: config.message,
        details: JSON.stringify({
          retryAfterSeconds: retryAfter,
          limit: config.maxRequests,
          windowMs: config.windowMs,
        }),
      });
    }

    return true;
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(context: ExecutionContext, config: RateLimitConfig): string {
    // Use custom key generator if provided
    if (config.keyGenerator) {
      return `${config.keyPrefix}:${config.keyGenerator(context)}`;
    }

    // Default: use handler class and method name with IP/user identifier
    const handler = context.getHandler();
    const classRef = context.getClass();
    const methodName = handler.name;
    const className = classRef.name;

    // Try to extract identifier from gRPC metadata
    const rpcContext = context.switchToRpc();
    const data = rpcContext.getData();
    const metadata = rpcContext.getContext();

    // Get identifier: account_id, operator_id, or IP
    let identifier = 'unknown';

    // Check for account_id or operator_id in request data
    if (data && typeof data === 'object') {
      identifier =
        (data as { account_id?: string; operator_id?: string; id?: string }).account_id ??
        (data as { account_id?: string; operator_id?: string; id?: string }).operator_id ??
        (data as { account_id?: string; operator_id?: string; id?: string }).id ??
        'unknown';
    }

    // Try to get IP from metadata
    if (identifier === 'unknown' && metadata) {
      try {
        const peerInfo = metadata.get?.('peer');
        if (peerInfo && peerInfo[0]) {
          identifier = String(peerInfo[0]).split(':')[0] || 'unknown';
        }
      } catch {
        // Ignore metadata extraction errors
      }
    }

    return `${config.keyPrefix}:${className}:${methodName}:${identifier}`;
  }
}

// ============================================================================
// Module Configuration
// ============================================================================

/**
 * Rate limiting module options
 */
export interface RateLimitModuleOptions {
  /** Global rate limit configuration */
  global?: Partial<RateLimitConfig>;
  /** Use Redis/Valkey store (provide connection options) */
  useRedis?: boolean;
  /** Custom store implementation */
  store?: RateLimitStore;
}

/**
 * Create rate limit providers for a module
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [
 *     ...createRateLimitProviders({
 *       global: { maxRequests: 100, windowMs: 60000 },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export function createRateLimitProviders(options: RateLimitModuleOptions = {}) {
  const providers = [
    GrpcRateLimitGuard,
    {
      provide: 'RATE_LIMIT_CONFIG',
      useValue: options.global ?? DEFAULT_RATE_LIMIT,
    },
  ];

  if (options.store) {
    providers.push({
      provide: RATE_LIMIT_STORE,
      useValue: options.store,
    } as never);
  } else {
    providers.push({
      provide: RATE_LIMIT_STORE,
      useClass: InMemoryRateLimitStore,
    } as never);
  }

  return providers;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMIT_PRESETS = {
  /** Strict: 10 requests per minute */
  STRICT: { maxRequests: 10, windowMs: 60000 },

  /** Standard: 100 requests per minute */
  STANDARD: { maxRequests: 100, windowMs: 60000 },

  /** Relaxed: 1000 requests per minute */
  RELAXED: { maxRequests: 1000, windowMs: 60000 },

  /** Auth: 5 attempts per minute (for login/signup) */
  AUTH: { maxRequests: 5, windowMs: 60000 },

  /** API: 500 requests per minute */
  API: { maxRequests: 500, windowMs: 60000 },

  /** Burst: 50 requests per second */
  BURST: { maxRequests: 50, windowMs: 1000 },
} as const;
