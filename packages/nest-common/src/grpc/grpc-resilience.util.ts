/**
 * gRPC Resilience Utilities
 *
 * Provides enterprise-grade resilience patterns for gRPC clients:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Retry logic with configurable policies
 *
 * @see https://grpc.io/docs/guides/retry/
 * @see https://martinfowler.com/bliki/CircuitBreaker.html
 */

import { status as GrpcStatus } from '@grpc/grpc-js';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, mergeMap, retryWhen, timeout } from 'rxjs/operators';
import { Logger } from '@nestjs/common';
import { GrpcError, isGrpcError } from './grpc.types';
import { normalizeGrpcError } from './grpc-error.util';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay in milliseconds (default: 100) */
  initialDelayMs: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier: number;
  /** Jitter factor 0-1 (default: 0.2) */
  jitterFactor: number;
  /** gRPC status codes that are retryable */
  retryableStatusCodes: GrpcStatus[];
}

/**
 * Circuit breaker configuration options
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting to close circuit (default: 30000) */
  resetTimeoutMs: number;
  /** Number of successful requests to close circuit (default: 3) */
  successThreshold: number;
  /** Monitor window in ms for failure counting (default: 60000) */
  monitorWindowMs: number;
}

/**
 * Full resilience configuration
 */
export interface ResilienceConfig {
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  /** Request timeout in ms */
  timeoutMs: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default retry configuration
 * Based on Google Cloud best practices for gRPC
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
  retryableStatusCodes: [
    GrpcStatus.UNAVAILABLE,
    GrpcStatus.DEADLINE_EXCEEDED,
    GrpcStatus.RESOURCE_EXHAUSTED,
    GrpcStatus.ABORTED,
    GrpcStatus.INTERNAL,
  ],
};

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  successThreshold: 3,
  monitorWindowMs: 60000,
};

/**
 * Default full resilience configuration
 */
export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  retry: DEFAULT_RETRY_CONFIG,
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  timeoutMs: 5000,
};

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  totalRequests: number;
  failedRequests: number;
}

/**
 * Circuit Breaker implementation for gRPC clients
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failing fast, rejecting requests immediately
 * - HALF_OPEN: Testing if service recovered
 */
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange = Date.now();
  private failureTimestamps: number[] = [];
  private totalRequests = 0;
  private failedRequests = 0;

  constructor(
    private readonly serviceName: string,
    private readonly config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
  ) {}

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
    };
  }

  /**
   * Check if circuit allows request to pass through
   */
  canExecute(): boolean {
    this.totalRequests++;
    this.cleanupOldFailures();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (Date.now() - this.lastStateChange >= this.config.resetTimeoutMs) {
          this.transitionTo(CircuitState.HALF_OPEN);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;
    }
  }

  /**
   * Record a successful request
   */
  onSuccess(): void {
    switch (this.state) {
      case CircuitState.CLOSED:
        this.successes++;
        break;

      case CircuitState.HALF_OPEN:
        this.successes++;
        if (this.successes >= this.config.successThreshold) {
          this.transitionTo(CircuitState.CLOSED);
        }
        break;

      case CircuitState.OPEN:
        // Should not happen, but handle gracefully
        break;
    }
  }

  /**
   * Record a failed request
   */
  onFailure(error: GrpcError): void {
    this.failedRequests++;
    this.failures++;
    this.lastFailureTime = Date.now();
    this.failureTimestamps.push(Date.now());

    switch (this.state) {
      case CircuitState.CLOSED:
        if (this.failures >= this.config.failureThreshold) {
          this.transitionTo(CircuitState.OPEN);
        }
        break;

      case CircuitState.HALF_OPEN:
        this.transitionTo(CircuitState.OPEN);
        break;

      case CircuitState.OPEN:
        // Already open, update timestamp
        break;
    }

    this.logger.warn(
      `Circuit breaker [${this.serviceName}] failure recorded. ` +
        `State: ${this.state}, Failures: ${this.failures}/${this.config.failureThreshold}`,
      { errorCode: error.code, errorMessage: error.message },
    );
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
  }

  /**
   * Force circuit to open state
   */
  forceOpen(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === CircuitState.CLOSED) {
      this.failures = 0;
      this.successes = 0;
      this.failureTimestamps = [];
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
    }

    this.logger.log(
      `Circuit breaker [${this.serviceName}] state transition: ${previousState} -> ${newState}`,
    );
  }

  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.config.monitorWindowMs;
    const validTimestamps = this.failureTimestamps.filter((ts) => ts > cutoff);
    this.failures = validTimestamps.length;
    this.failureTimestamps = validTimestamps;
  }
}

// ============================================================================
// Retry Logic Implementation
// ============================================================================

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(cappedDelay + jitter));
}

/**
 * Check if an error is retryable based on gRPC status code
 */
export function isRetryableError(error: unknown, config: RetryConfig): boolean {
  if (isGrpcError(error)) {
    return config.retryableStatusCodes.includes(error.code);
  }

  // Check for timeout errors
  if (error instanceof Error && error.name === 'TimeoutError') {
    return true;
  }

  // Check for connection errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('econnrefused') ||
      message.includes('unavailable') ||
      message.includes('connection reset')
    );
  }

  return false;
}

/**
 * Create a retry operator for RxJS observables
 */
export function retryWithBackoff<T>(
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  logger?: Logger,
): (source: Observable<T>) => Observable<T> {
  return (source: Observable<T>) =>
    source.pipe(
      retryWhen((errors) =>
        errors.pipe(
          mergeMap((error, attempt) => {
            const normalizedError = normalizeGrpcError(error);

            if (attempt >= config.maxRetries) {
              logger?.warn(`Max retries (${config.maxRetries}) exceeded`, {
                error: normalizedError,
              });
              return throwError(() => normalizedError);
            }

            if (!isRetryableError(error, config)) {
              logger?.debug(`Non-retryable error, not retrying`, {
                errorCode: normalizedError.code,
              });
              return throwError(() => normalizedError);
            }

            const delay = calculateBackoffDelay(attempt, config);
            logger?.debug(
              `Retrying after ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`,
            );

            return timer(delay);
          }),
        ),
      ),
    );
}

// ============================================================================
// Resilient gRPC Call Wrapper
// ============================================================================

/**
 * Options for resilient gRPC calls
 */
export interface ResilientCallOptions {
  /** Override timeout for this specific call */
  timeoutMs?: number;
  /** Skip circuit breaker check */
  skipCircuitBreaker?: boolean;
  /** Skip retry logic */
  skipRetry?: boolean;
}

/**
 * Create a resilient gRPC call wrapper
 *
 * @example
 * ```typescript
 * const resilience = createGrpcResilience('IdentityService');
 *
 * async call<T>(fn: () => Observable<T>): Promise<T> {
 *   return resilience.execute(fn);
 * }
 * ```
 */
export function createGrpcResilience(serviceName: string, config: Partial<ResilienceConfig> = {}) {
  const fullConfig: ResilienceConfig = {
    retry: { ...DEFAULT_RETRY_CONFIG, ...config.retry },
    circuitBreaker: { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config.circuitBreaker },
    timeoutMs: config.timeoutMs ?? DEFAULT_RESILIENCE_CONFIG.timeoutMs,
  };

  const circuitBreaker = new CircuitBreaker(serviceName, fullConfig.circuitBreaker);
  const logger = new Logger(`GrpcResilience:${serviceName}`);

  return {
    /**
     * Execute a gRPC call with resilience patterns applied
     */
    async execute<T>(fn: () => Observable<T>, options: ResilientCallOptions = {}): Promise<T> {
      const timeoutMs = options.timeoutMs ?? fullConfig.timeoutMs;

      // Check circuit breaker
      if (!options.skipCircuitBreaker && !circuitBreaker.canExecute()) {
        const error: GrpcError = {
          code: GrpcStatus.UNAVAILABLE,
          message: `Circuit breaker is open for ${serviceName}`,
          details: 'Service is temporarily unavailable due to repeated failures',
        };
        throw error;
      }

      try {
        let observable = fn().pipe(timeout(timeoutMs));

        // Apply retry logic
        if (!options.skipRetry) {
          observable = observable.pipe(retryWithBackoff(fullConfig.retry, logger));
        }

        // Error handling
        observable = observable.pipe(
          catchError((error) => {
            const normalizedError = normalizeGrpcError(error);
            circuitBreaker.onFailure(normalizedError);
            return throwError(() => normalizedError);
          }),
        );

        const result = await new Promise<T>((resolve, reject) => {
          observable.subscribe({
            next: (value) => resolve(value),
            error: (err) => reject(err),
          });
        });

        circuitBreaker.onSuccess();
        return result;
      } catch (error) {
        // Error already recorded in catchError above
        throw error;
      }
    },

    /**
     * Get circuit breaker instance for monitoring
     */
    getCircuitBreaker(): CircuitBreaker {
      return circuitBreaker;
    },

    /**
     * Get current circuit breaker metrics
     */
    getMetrics(): CircuitBreakerMetrics {
      return circuitBreaker.getMetrics();
    },

    /**
     * Reset circuit breaker
     */
    reset(): void {
      circuitBreaker.reset();
    },

    /**
     * Get configuration
     */
    getConfig(): ResilienceConfig {
      return fullConfig;
    },
  };
}

/**
 * Type for resilience wrapper returned by createGrpcResilience
 */
export type GrpcResilience = ReturnType<typeof createGrpcResilience>;

// ============================================================================
// Health Check Integration
// ============================================================================

/**
 * gRPC service health status
 */
export interface GrpcHealthStatus {
  serviceName: string;
  isHealthy: boolean;
  circuitState: CircuitState;
  metrics: CircuitBreakerMetrics;
  lastChecked: number;
}

/**
 * Aggregate health check for multiple gRPC services
 */
export class GrpcHealthAggregator {
  private readonly services = new Map<string, GrpcResilience>();

  /**
   * Register a resilience instance for health monitoring
   */
  register(serviceName: string, resilience: GrpcResilience): void {
    this.services.set(serviceName, resilience);
  }

  /**
   * Unregister a service
   */
  unregister(serviceName: string): void {
    this.services.delete(serviceName);
  }

  /**
   * Get health status for all registered services
   */
  getHealthStatus(): GrpcHealthStatus[] {
    const now = Date.now();
    return Array.from(this.services.entries()).map(([name, resilience]) => {
      const metrics = resilience.getMetrics();
      return {
        serviceName: name,
        isHealthy: metrics.state === CircuitState.CLOSED,
        circuitState: metrics.state,
        metrics,
        lastChecked: now,
      };
    });
  }

  /**
   * Check if all services are healthy
   */
  isAllHealthy(): boolean {
    return this.getHealthStatus().every((s) => s.isHealthy);
  }

  /**
   * Get names of unhealthy services
   */
  getUnhealthyServices(): string[] {
    return this.getHealthStatus()
      .filter((s) => !s.isHealthy)
      .map((s) => s.serviceName);
  }
}

/** Global health aggregator instance */
export const grpcHealthAggregator = new GrpcHealthAggregator();
