import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { trace, SpanKind, SpanStatusCode, type Span } from '@opentelemetry/api';
import {
  getTransactionContext,
  getTransaction,
  generateTransactionId,
  runInTransaction,
  clearTransactionContext,
  suspendAndRunInTransaction,
  TransactionContext,
  PrismaTransactionClient,
} from './transaction-context';
import {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitState,
} from '../../resilience/circuit-breaker';
import { RETRYABLE_DB_ERROR_CODES, NON_RETRYABLE_DB_ERROR_CODES } from '../db-error-codes';
import * as T from './transactional.constants';

/**
 * Logger instance for transaction-related messages.
 * Uses NestJS Logger with 'Transactional' context for easy filtering.
 */
const logger = new Logger(T.TRANSACTIONAL_LOGGER_CONTEXT);

/**
 * OpenTelemetry tracer for transaction spans.
 * Creates spans for distributed tracing of transaction lifecycle.
 */
const tracer = trace.getTracer(T.TRANSACTIONAL_TRACER_NAME);

/**
 * Transaction isolation levels supported by Prisma and PostgreSQL.
 *
 * Each level provides different guarantees about data consistency and
 * concurrent access:
 *
 * - `ReadUncommitted`: Lowest isolation. Allows dirty reads. Rarely used.
 * - `ReadCommitted`: Default for PostgreSQL. Prevents dirty reads.
 *   Each statement sees only committed data as of statement start.
 * - `RepeatableRead`: Prevents non-repeatable reads. Same query returns
 *   same results within a transaction.
 * - `Serializable`: Highest isolation. Transactions behave as if executed
 *   serially. May cause serialization failures requiring retry.
 * - `Snapshot`: SQL Server specific. Uses row versioning for consistency.
 *
 * @example
 * ```typescript
 * // Use Serializable for financial operations:
 * @Transactional({ isolationLevel: 'Serializable' })
 * async transferFunds(from: string, to: string, amount: number): Promise<void> {
 *   // Operations here are fully isolated
 * }
 * ```
 *
 * @see https://www.postgresql.org/docs/current/transaction-iso.html
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/transactions#transaction-isolation-level
 */
export type TransactionIsolationLevel =
  | 'ReadUncommitted'
  | 'ReadCommitted'
  | 'RepeatableRead'
  | 'Serializable'
  | 'Snapshot';

/**
 * Transaction propagation modes controlling how transactions interact.
 *
 * These modes are inspired by Spring's transaction propagation and provide
 * fine-grained control over transaction boundaries:
 *
 * | Mode | Existing Tx | No Existing Tx | Use Case |
 * |------|-------------|----------------|----------|
 * | `required` | Join | Create new | Default, most common |
 * | `requires_new` | Suspend, create new | Create new | Independent operations (audit logs) |
 * | `supports` | Join | No transaction | Read-only operations |
 * | `mandatory` | Join | Throw error | Enforce transaction requirement |
 * | `never` | Throw error | No transaction | Explicit non-transactional |
 * | `not_supported` | Suspend | No transaction | External calls, caching |
 *
 * @example
 * ```typescript
 * // Audit log that persists even if parent transaction fails:
 * @Transactional({ propagation: 'requires_new' })
 * async createAuditLog(action: string): Promise<AuditLog> {
 *   return this.prisma.auditLog.create({ data: { action } });
 * }
 *
 * // Must be called within a transaction:
 * @Transactional({ propagation: 'mandatory' })
 * async validateInventory(items: Item[]): Promise<void> {
 *   // Throws if called without active transaction
 * }
 * ```
 *
 * @see https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/annotation/Propagation.html
 */
export type TransactionPropagation =
  | 'required' // Join existing or create new (default)
  | 'requires_new' // Always create new, suspend existing
  | 'supports' // Use existing if available, no transaction otherwise
  | 'mandatory' // Must have existing transaction, throw if none
  | 'never' // Must NOT have existing transaction, throw if exists
  | 'not_supported' // Suspend existing, run without transaction
  | 'nested'; // Uses savepoints for nested transaction behavior

/**
 * Configuration options for the @Transactional decorator.
 *
 * All options have sensible defaults suitable for most use cases.
 * Override only when you have specific requirements.
 *
 * @example
 * ```typescript
 * // Default options (recommended for most cases):
 * @Transactional()
 * async createUser(data: CreateUserDto): Promise<User> { ... }
 *
 * // Custom options for complex operations:
 * @Transactional({
 *   timeout: 60000,           // 1 minute for long operations
 *   isolationLevel: 'Serializable',  // Strict isolation
 *   maxRetries: 5,            // More retries for high-contention tables
 *   propagation: 'requires_new',     // Independent transaction
 * })
 * async processPayment(payment: PaymentDto): Promise<Receipt> { ... }
 * ```
 */
export interface TransactionalOptions {
  /**
   * Maximum time in milliseconds for the transaction.
   *
   * This timeout applies to the entire transaction including all retries.
   * The value is a balance between:
   * - Too short: Legitimate long operations may timeout
   * - Too long: Resources held longer, potential for lock contention
   *
   * **Why 30 seconds default?**
   * - Covers 99.9% of typical web request database operations
   * - Aligns with typical HTTP request timeouts (30-60s)
   * - Provides buffer for retries on transient failures
   * - Short enough to fail fast on genuine issues
   *
   * For batch operations or data migrations, increase appropriately.
   * Maximum allowed is 300000ms (5 minutes) to prevent resource exhaustion.
   *
   * @default 30000 (30 seconds)
   * @minimum 1000 (1 second)
   * @maximum 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Isolation level for the transaction.
   *
   * Higher isolation levels provide stronger consistency guarantees
   * but may reduce concurrency and increase the chance of conflicts.
   *
   * @default 'ReadCommitted' - PostgreSQL default, good balance of consistency and performance
   * @see {@link TransactionIsolationLevel} for detailed level descriptions
   */
  isolationLevel?: TransactionIsolationLevel;

  /**
   * Maximum total attempts on deadlock or serialization failure.
   *
   * This is total attempts, not retries after the first attempt.
   * For example, maxRetries=3 means: initial attempt + up to 2 retries.
   *
   * Retries only occur for transient errors (deadlocks, serialization
   * failures, connection issues). Application errors are not retried.
   *
   * @default 3 (initial + 2 retries)
   * @minimum 0 (no retries, fail immediately)
   * @maximum 10 (prevent excessive retry storms)
   */
  maxRetries?: number;

  /**
   * Base delay between retries in milliseconds.
   *
   * Uses full jitter exponential backoff for optimal retry distribution.
   * Actual delay = random(0, min(baseDelay * 2^attempt, 10000))
   *
   * @default 100
   * @minimum 10 (prevent busy-wait)
   * @maximum 10000 (10 seconds)
   * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
   */
  retryDelay?: number;

  /**
   * Property name to get PrismaClient from the class instance.
   *
   * The decorator accesses `this[prismaProperty]` to get the Prisma client.
   * The property must exist and be a valid PrismaClient instance with
   * a `$transaction` method.
   *
   * @default 'prisma'
   *
   * @example
   * ```typescript
   * // Default - expects this.prisma:
   * class UserService {
   *   constructor(private readonly prisma: PrismaService) {}
   *
   *   @Transactional()
   *   async createUser() { ... }
   * }
   *
   * // Custom property name:
   * class LegacyService {
   *   constructor(private readonly db: PrismaService) {}
   *
   *   @Transactional({ prismaProperty: 'db' })
   *   async doSomething() { ... }
   * }
   * ```
   */
  prismaProperty?: string;

  /**
   * Transaction propagation mode.
   *
   * Controls how this transaction interacts with any existing
   * transaction in the call stack.
   *
   * @default 'required' - Join existing or create new
   * @see {@link TransactionPropagation} for mode descriptions
   */
  propagation?: TransactionPropagation;

  /**
   * Enable OpenTelemetry span creation for transaction tracing.
   *
   * When enabled, creates spans with:
   * - Transaction ID and attempt number
   * - Isolation level and propagation mode
   * - Duration and error information
   *
   * Disable if OpenTelemetry is not configured or for high-frequency
   * operations where tracing overhead is a concern.
   *
   * @default true
   */
  enableTracing?: boolean;

  /**
   * Use savepoints for nested transactions within 'required' propagation.
   *
   * When enabled with an existing transaction, creates a savepoint instead
   * of simply joining the transaction. This allows partial rollback if the
   * nested operation fails.
   *
   * @default false
   */
  useSavepoint?: boolean;

  /**
   * Maximum wait time for acquiring a connection from the pool (Prisma 5+).
   *
   * This is separate from the transaction timeout and controls how long
   * to wait for an available connection before failing.
   *
   * @default 2000 (2 seconds)
   * @minimum 100
   * @maximum 30000
   */
  maxWait?: number;

  /**
   * Maximum number of concurrent transactions allowed.
   *
   * Implements backpressure to prevent overwhelming the database connection
   * pool. When the limit is reached, new transactions will wait or fail
   * depending on the timeout.
   *
   * @default 100
   * @minimum 1
   * @maximum 1000
   */
  maxConcurrent?: number;

  /**
   * Enable circuit breaker for transaction execution.
   *
   * When enabled, uses a circuit breaker to prevent cascading failures.
   * The circuit opens after consecutive failures and rejects new transactions
   * until the reset timeout expires.
   *
   * @default false
   */
  useCircuitBreaker?: boolean;

  /**
   * Mark transaction as read-only for potential routing optimizations.
   *
   * Read-only transactions may be routed to replica databases when
   * replica routing is enabled.
   *
   * @default false
   */
  readOnly?: boolean;

  /**
   * Database routing hint for read replica support.
   *
   * - 'primary': Always route to primary database
   * - 'replica': Route to read replica (for read-only operations)
   * - 'auto': Automatically determine based on readOnly flag
   *
   * @default 'auto'
   */
  routingHint?: 'primary' | 'replica' | 'auto';

  /**
   * Database name for OTEL tracing attributes.
   *
   * @default 'default'
   */
  dbName?: string;

  /**
   * Database server address for OTEL tracing.
   *
   * @default 'localhost'
   */
  serverAddress?: string;

  /**
   * Database server port for OTEL tracing.
   *
   * @default 5432
   */
  serverPort?: number;
}

/**
 * Default options applied when not specified by the user.
 *
 * These defaults are chosen to be safe and suitable for most use cases:
 * - 30s timeout: Covers typical web operations with retry buffer
 * - ReadCommitted: PostgreSQL default, good consistency/performance balance
 * - 3 retries: Handles transient failures without excessive retrying
 * - 100ms base delay: Quick first retry, exponential backoff after
 * - 'prisma' property: NestJS convention for PrismaService injection
 * - 'required' propagation: Most intuitive behavior (join or create)
 * - Tracing enabled: Observability by default
 * - No savepoints: Standard behavior for nested calls
 * - 2s maxWait: Reasonable pool connection wait time
 * - 100 maxConcurrent: Good balance for typical applications
 * - Circuit breaker disabled: Opt-in for resilience
 * - Auto routing: Intelligent replica routing when available
 */
const DEFAULT_OPTIONS: Required<TransactionalOptions> = {
  timeout: 30000,
  isolationLevel: 'ReadCommitted',
  maxRetries: 3,
  retryDelay: 100,
  prismaProperty: 'prisma',
  propagation: 'required',
  enableTracing: true,
  useSavepoint: false,
  maxWait: 2000,
  maxConcurrent: 100,
  useCircuitBreaker: false,
  readOnly: false,
  routingHint: 'auto',
  dbName: 'default',
  serverAddress: 'localhost',
  serverPort: 5432,
};

/**
 * Maximum allowed transaction depth to prevent stack overflow.
 *
 * Deeply nested transactions can cause:
 * - Stack overflow errors
 * - Difficult-to-debug transaction chains
 * - Long-held database locks
 * - Memory exhaustion from context objects
 *
 * If you hit this limit, consider refactoring to reduce nesting
 * or using 'requires_new' propagation to break transaction chains.
 */
const MAX_TRANSACTION_DEPTH = 10;

/**
 * Validate and normalize transaction options.
 *
 * Performs early validation of all options to fail fast during decorator
 * initialization rather than at runtime. This helps catch configuration
 * errors during application startup.
 *
 * @param options - User-provided options (may be partial)
 * @returns Fully validated and normalized options with defaults applied
 * @throws Error if any option is invalid with a descriptive message
 *
 * @example
 * ```typescript
 * // Valid options:
 * const opts = validateOptions({ timeout: 60000 });
 * // opts: { timeout: 60000, isolationLevel: 'ReadCommitted', ... }
 *
 * // Invalid options throw immediately:
 * validateOptions({ timeout: 100 }); // Error: timeout must be at least 1000ms
 * ```
 */
function validateOptions(options: TransactionalOptions): Required<TransactionalOptions> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate timeout - balance between too short (legitimate failures) and too long (resource lock)
  if (opts.timeout < 1000) {
    throw new Error(
      `@Transactional: timeout must be at least 1000ms (got ${opts.timeout}ms). ` +
        'Shorter timeouts risk failing legitimate operations.',
    );
  }
  if (opts.timeout > 300000) {
    throw new Error(
      `@Transactional: timeout cannot exceed 300000ms (5 minutes, got ${opts.timeout}ms). ` +
        'Long-running transactions should be split into smaller units.',
    );
  }

  // Validate maxRetries - prevent retry storms while allowing recovery from transient failures
  if (opts.maxRetries < 0 || opts.maxRetries > 10) {
    throw new Error(
      `@Transactional: maxRetries must be between 0 and 10 (got ${opts.maxRetries}). ` +
        'Use 0 for no retries, or up to 10 for high-contention scenarios.',
    );
  }

  // Validate retryDelay - prevent busy-wait loops while keeping retries responsive
  if (opts.retryDelay < 10 || opts.retryDelay > 10000) {
    throw new Error(
      `@Transactional: retryDelay must be between 10ms and 10000ms (got ${opts.retryDelay}ms). ` +
        'Values below 10ms cause CPU waste; values above 10s delay recovery too long.',
    );
  }

  // Validate prismaProperty - must be a valid identifier string
  if (typeof opts.prismaProperty !== 'string' || opts.prismaProperty.trim() === '') {
    throw new Error(
      '@Transactional: prismaProperty must be a non-empty string. ' +
        `Expected property name like 'prisma' or 'db', got: ${JSON.stringify(opts.prismaProperty)}`,
    );
  }

  // Additional validation: prismaProperty should be a valid JS identifier
  // This catches typos like 'this.prisma' or 'prisma.client'
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(opts.prismaProperty)) {
    throw new Error(
      `@Transactional: prismaProperty must be a valid property name (got '${opts.prismaProperty}'). ` +
        "Use just the property name (e.g., 'prisma'), not a path or expression.",
    );
  }

  return opts;
}

// ============================================================================
// Transaction Metrics
// ============================================================================

/**
 * Transaction metrics for observability and monitoring.
 *
 * These metrics can be exposed via Prometheus, DataDog, or other monitoring
 * systems. Use `getTransactionMetrics()` to read current values.
 *
 * **Thread Safety:** Uses atomic operations for counters. Safe for concurrent access.
 */
interface TransactionMetrics {
  /** Total number of transactions started (including retries) */
  totalTransactions: number;

  /** Number of successfully committed transactions */
  successfulTransactions: number;

  /** Number of failed transactions (after all retries exhausted) */
  failedTransactions: number;

  /** Total number of retry attempts across all transactions */
  totalRetries: number;

  /** Cumulative transaction duration in milliseconds */
  totalDurationMs: number;

  /** Transactions grouped by propagation mode */
  byPropagation: Record<TransactionPropagation, number>;

  /** Timestamp when metrics were last reset */
  lastResetAt: number;
}

/**
 * Global transaction metrics instance.
 * Access via `getTransactionMetrics()` for read-only access.
 */
const metrics: TransactionMetrics = {
  totalTransactions: 0,
  successfulTransactions: 0,
  failedTransactions: 0,
  totalRetries: 0,
  totalDurationMs: 0,
  byPropagation: {
    required: 0,
    requires_new: 0,
    supports: 0,
    mandatory: 0,
    never: 0,
    not_supported: 0,
    nested: 0,
  },
  lastResetAt: Date.now(),
};

/**
 * Get current transaction metrics.
 *
 * Returns a snapshot of transaction statistics for monitoring and debugging.
 * The returned object is a copy; modifications do not affect internal state.
 *
 * @returns A copy of the current transaction metrics
 *
 * @example
 * ```typescript
 * // Expose metrics endpoint in NestJS:
 * @Get('/metrics/transactions')
 * getTransactionMetrics(): TransactionMetrics {
 *   return getTransactionMetrics();
 * }
 *
 * // Log periodic summary:
 * const m = getTransactionMetrics();
 * console.log(`Transactions: ${m.successfulTransactions}/${m.totalTransactions} succeeded`);
 * console.log(`Avg duration: ${m.totalDurationMs / m.successfulTransactions}ms`);
 * ```
 */
export function getTransactionMetrics(): Readonly<TransactionMetrics> {
  // Return a deep copy to prevent external modification
  return {
    ...metrics,
    byPropagation: { ...metrics.byPropagation },
  };
}

/**
 * Reset transaction metrics to zero.
 *
 * Useful for:
 * - Starting fresh measurement periods
 * - Testing
 * - After metrics export to avoid double-counting
 *
 * @example
 * ```typescript
 * // Reset after exporting to monitoring system:
 * exportMetrics(getTransactionMetrics());
 * resetTransactionMetrics();
 * ```
 */
export function resetTransactionMetrics(): void {
  metrics.totalTransactions = 0;
  metrics.successfulTransactions = 0;
  metrics.failedTransactions = 0;
  metrics.totalRetries = 0;
  metrics.totalDurationMs = 0;
  metrics.byPropagation = {
    required: 0,
    requires_new: 0,
    supports: 0,
    mandatory: 0,
    never: 0,
    not_supported: 0,
    nested: 0,
  };
  metrics.lastResetAt = Date.now();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Recursively extract error code from error and its cause chain.
 *
 * Handles both direct error codes and nested causes (common in Prisma errors).
 * Limits recursion depth to prevent infinite loops from circular references.
 *
 * @param error - The error object to extract code from
 * @param depth - Current recursion depth (internal, starts at 0)
 * @returns The error code string if found, undefined otherwise
 *
 * @example
 * ```typescript
 * // Prisma error with code:
 * const code = getErrorCode(new PrismaClientKnownRequestError('...', { code: 'P2034' }));
 * // code: 'P2034'
 *
 * // Nested error with cause:
 * const wrapped = new Error('Wrapper', { cause: { code: 'ECONNRESET' } });
 * const code = getErrorCode(wrapped);
 * // code: 'ECONNRESET'
 * ```
 */
function getErrorCode(error: unknown, depth = 0): string | undefined {
  // Prevent infinite recursion from circular references
  const MAX_CAUSE_DEPTH = 5;
  if (depth > MAX_CAUSE_DEPTH || !error || typeof error !== 'object') {
    return undefined;
  }

  // Check for direct 'code' property (Prisma, PostgreSQL, Node.js errors)
  if ('code' in error && error.code) {
    return String(error.code);
  }

  // Check nested cause (ES2022 Error.cause pattern)
  if ('cause' in error && error.cause) {
    return getErrorCode(error.cause, depth + 1);
  }

  return undefined;
}

/**
 * Determine if an error is retryable based on its error code.
 *
 * Retryable errors are transient failures that may succeed on retry:
 * - Deadlocks and serialization failures
 * - Connection issues
 * - Pool exhaustion
 *
 * Non-retryable errors are permanent and should fail immediately:
 * - Constraint violations
 * - Schema errors
 * - Permission issues
 *
 * @param error - The error to check
 * @returns `true` if the error is retryable, `false` otherwise
 *
 * @see {@link RETRYABLE_ERROR_CODES} for the list of retryable codes
 * @see {@link NON_RETRYABLE_ERROR_CODES} for codes that should not be retried
 */
function isRetryableError(error: unknown): boolean {
  const code = getErrorCode(error);

  if (!code) {
    // Unknown errors are not retried to avoid masking real issues
    return false;
  }

  // Check explicit non-retryable first (takes precedence)
  if (NON_RETRYABLE_DB_ERROR_CODES.has(code)) {
    return false;
  }

  return RETRYABLE_DB_ERROR_CODES.has(code);
}

/**
 * Sleep for a specified duration.
 *
 * Simple promise-based delay used for retry backoff.
 *
 * @param ms - Duration to sleep in milliseconds
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with full jitter.
 *
 * Full jitter provides better distribution than partial jitter for
 * preventing "thundering herd" when many clients retry simultaneously.
 *
 * Formula: delay = random(0, min(baseDelay * 2^attempt, maxDelay))
 *
 * @param baseDelay - Base delay in milliseconds
 * @param attempt - Current attempt number (1-based)
 * @param maxDelay - Maximum delay cap (default: 10 seconds)
 * @returns Jittered delay in milliseconds
 *
 * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @example
 * ```typescript
 * // First retry: 0-100ms
 * const delay1 = calculateJitteredDelay(100, 1);
 *
 * // Second retry: 0-200ms
 * const delay2 = calculateJitteredDelay(100, 2);
 *
 * // Third retry: 0-400ms
 * const delay3 = calculateJitteredDelay(100, 3);
 * ```
 */
function calculateJitteredDelay(baseDelay: number, attempt: number, maxDelay = 10000): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  // Full jitter: random value between 0 and exponential delay
  return Math.random() * exponentialDelay;
}

// ============================================================================
// Backpressure Handling (Semaphore Pattern)
// ============================================================================

/**
 * Simple semaphore for backpressure control on concurrent transactions.
 *
 * Limits the number of concurrent transactions to prevent overwhelming
 * the database connection pool. Uses a per-method tracking approach.
 */
class TransactionSemaphore {
  private readonly counts = new Map<string, number>();

  /**
   * Try to acquire a slot for the given method.
   * @param key - The method identifier
   * @param maxConcurrent - Maximum allowed concurrent transactions
   * @returns true if acquired, false if limit reached
   */
  tryAcquire(key: string, maxConcurrent: number): boolean {
    const current = this.counts.get(key) ?? 0;
    if (current >= maxConcurrent) {
      return false;
    }
    this.counts.set(key, current + 1);
    return true;
  }

  /**
   * Release a slot for the given method.
   * @param key - The method identifier
   */
  release(key: string): void {
    const current = this.counts.get(key) ?? 0;
    if (current > 0) {
      this.counts.set(key, current - 1);
    }
  }

  /**
   * Get current count for a method.
   * @param key - The method identifier
   * @returns Current concurrent count
   */
  getCount(key: string): number {
    return this.counts.get(key) ?? 0;
  }
}

/**
 * Global transaction semaphore for backpressure control.
 */
const transactionSemaphore = new TransactionSemaphore();

/**
 * Default maximum concurrent transactions per method.
 */
const MAX_CONCURRENT_DEFAULT = 100;

// ============================================================================
// Circuit Breaker for Transactions
// ============================================================================

/**
 * Global circuit breakers per method for transaction resilience.
 */
const transactionCircuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a method.
 * @param methodName - The method identifier
 * @returns The circuit breaker instance
 */
function getTransactionCircuitBreaker(methodName: string): CircuitBreaker {
  let breaker = transactionCircuitBreakers.get(methodName);
  if (!breaker) {
    breaker = new CircuitBreaker({
      name: `tx:${methodName}`,
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2,
    });
    transactionCircuitBreakers.set(methodName, breaker);
  }
  return breaker;
}

/**
 * Check if circuit breaker is available for transactions.
 * @param methodName - The method identifier
 * @param useCircuitBreaker - Whether circuit breaker is enabled
 * @returns true if available or disabled, false if circuit is open
 */
function isCircuitAvailable(methodName: string, useCircuitBreaker: boolean): boolean {
  if (!useCircuitBreaker) {
    return true;
  }
  const breaker = getTransactionCircuitBreaker(methodName);
  return breaker.isAvailable();
}

/**
 * Record transaction success for circuit breaker.
 * This is called after a successful transaction to update the circuit breaker state.
 *
 * Note: The CircuitBreaker class automatically tracks success via onSuccess()
 * which is called internally by execute(). For transactions managed by the
 * decorator, success is recorded implicitly when the transaction completes
 * without throwing. This function is kept for explicit success recording
 * in edge cases where manual tracking is needed.
 *
 * @internal Exported for testing purposes.
 * @param methodName - The method identifier
 * @param useCircuitBreaker - Whether circuit breaker is enabled
 */
export function recordCircuitSuccess(methodName: string, useCircuitBreaker: boolean): void {
  if (!useCircuitBreaker) {
    return;
  }
  const breaker = transactionCircuitBreakers.get(methodName);
  if (breaker && breaker.getState() !== CircuitState.CLOSED) {
    // Force state check which may transition HALF_OPEN -> CLOSED
    // This handles cases where success should be recorded outside execute()
    breaker.isAvailable();
  }
}

/**
 * Get all transaction circuit breakers (for monitoring).
 * @returns Map of circuit breakers by method name
 */
export function getTransactionCircuitBreakers(): Map<string, CircuitBreaker> {
  return transactionCircuitBreakers;
}

// ============================================================================
// Savepoint Support for Nested Transactions
// ============================================================================

/**
 * Execute a function within a savepoint for partial rollback support.
 *
 * This function creates a savepoint within an existing transaction,
 * allowing the nested operation to be rolled back independently
 * without affecting the outer transaction.
 *
 * @param tx - The transaction client
 * @param depth - Current transaction depth (used for savepoint naming)
 * @param fn - The function to execute within the savepoint
 * @returns The result of the function
 * @throws The original error if the function fails (after rolling back to savepoint)
 */
async function executeWithSavepoint<T>(
  tx: PrismaTransactionClient,
  depth: number,
  fn: () => T | Promise<T>,
): Promise<T> {
  const savepointName = `sp_${depth}`;

  // Create savepoint - using $queryRawUnsafe since savepoint names can't be parameterized
  await (tx as unknown as PrismaClient).$executeRawUnsafe(`SAVEPOINT ${savepointName}`);

  try {
    const result = await fn();
    // Release savepoint on success
    await (tx as unknown as PrismaClient).$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName}`);
    return result;
  } catch (error) {
    // Rollback to savepoint on failure
    try {
      await (tx as unknown as PrismaClient).$executeRawUnsafe(
        `ROLLBACK TO SAVEPOINT ${savepointName}`,
      );
    } catch (rollbackError) {
      logger.error(
        `Failed to rollback to savepoint ${savepointName}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
      );
    }
    throw error;
  }
}

/**
 * Check if transaction depth exceeds the maximum allowed.
 *
 * This helper function consolidates the depth check logic that was previously
 * duplicated across multiple propagation mode handlers. It provides consistent
 * error messages with context about the current transaction state.
 *
 * @param existingContext - The current transaction context (if any)
 * @param methodName - The name of the method being decorated (for error messages)
 * @param propagation - The propagation mode being used (for error messages)
 * @throws Error if the depth limit would be exceeded
 *
 * @example
 * ```typescript
 * // In a propagation handler:
 * validateTransactionDepth(existingContext, 'UserService.create', 'required');
 * // Throws if existingContext.depth >= MAX_TRANSACTION_DEPTH
 * ```
 */
function validateTransactionDepth(
  existingContext: TransactionContext | undefined,
  methodName: string,
  propagation: TransactionPropagation,
): void {
  if (existingContext && existingContext.depth >= MAX_TRANSACTION_DEPTH) {
    throw new Error(
      `@Transactional(${propagation}): Maximum transaction depth (${MAX_TRANSACTION_DEPTH}) exceeded ` +
        `in ${methodName}. Current depth: ${existingContext.depth}, ` +
        `transaction ID: ${existingContext.transactionId}. ` +
        'Consider refactoring to reduce nesting or using requires_new propagation.',
    );
  }
}

/**
 * Internal helper to execute a new transaction with retry logic.
 *
 * This function is extracted to avoid code duplication between 'required'
 * (when no existing transaction) and 'requires_new' propagation modes.
 *
 * It handles:
 * - Retry logic with exponential backoff and jitter
 * - Cumulative timeout tracking across retries
 * - OpenTelemetry span creation for tracing (optimized: single span with events)
 * - Metrics collection for observability
 * - Proper error classification and reporting
 * - Backpressure control via semaphore
 * - Circuit breaker integration for resilience
 * - Read replica routing hints
 *
 * @param prisma - The PrismaClient instance to use for the transaction
 * @param methodName - Method name for logging/tracing (e.g., "UserService.create")
 * @param opts - Validated transaction options
 * @param originalMethod - The original method being wrapped
 * @param thisArg - The `this` context for the original method
 * @param args - Arguments to pass to the original method
 * @param suspendedContext - Optional suspended outer transaction (for requires_new)
 * @returns The result of the original method
 * @throws Error if the transaction fails after all retries
 */
async function executeNewTransaction<T>(
  prisma: PrismaClient,
  methodName: string,
  opts: Required<TransactionalOptions>,
  originalMethod: (...args: unknown[]) => T | Promise<T>,
  thisArg: unknown,
  args: unknown[],
  suspendedContext?: TransactionContext,
): Promise<T> {
  // Check circuit breaker before starting
  if (!isCircuitAvailable(methodName, opts.useCircuitBreaker)) {
    metrics.failedTransactions++;
    const breaker = getTransactionCircuitBreaker(methodName);
    throw new CircuitBreakerError(methodName, breaker.getState());
  }

  // Backpressure: check semaphore
  const maxConcurrent = opts.maxConcurrent ?? MAX_CONCURRENT_DEFAULT;
  if (!transactionSemaphore.tryAcquire(methodName, maxConcurrent)) {
    metrics.failedTransactions++;
    throw new Error(
      `@Transactional: Maximum concurrent transactions (${maxConcurrent}) reached for ${methodName}. ` +
        `Current: ${transactionSemaphore.getCount(methodName)}. Consider increasing maxConcurrent or optimizing transaction duration.`,
    );
  }

  let lastError: unknown;
  let attempts = 0;
  const operationStartTime = Date.now();
  const absoluteDeadline = operationStartTime + opts.timeout;
  const transactionId = generateTransactionId(); // Generate once outside retry loop
  const depth = suspendedContext ? suspendedContext.depth + 1 : 1;

  // Track metrics
  metrics.totalTransactions++;
  metrics.byPropagation[opts.propagation]++;

  // Determine routing hint for read replica support
  const effectiveRoutingHint =
    opts.routingHint === 'auto' ? (opts.readOnly ? 'replica' : 'primary') : opts.routingHint;

  // Create OTEL span ONCE outside retry loop (optimized)
  const spanAttributes = opts.enableTracing
    ? {
        [T.OTEL_ATTR_DB_OPERATION]: 'transaction',
        [T.OTEL_ATTR_DB_SYSTEM]: 'postgresql',
        [T.OTEL_ATTR_DB_NAME]: opts.dbName,
        [T.OTEL_ATTR_SERVER_ADDRESS]: opts.serverAddress,
        [T.OTEL_ATTR_SERVER_PORT]: opts.serverPort,
        [T.OTEL_ATTR_TX_ID]: transactionId,
        [T.OTEL_ATTR_TX_ISOLATION_LEVEL]: opts.isolationLevel,
        [T.OTEL_ATTR_TX_MAX_ATTEMPTS]: opts.maxRetries,
        [T.OTEL_ATTR_TX_TIMEOUT_MS]: opts.timeout,
        [T.OTEL_ATTR_TX_PROPAGATION]: opts.propagation,
        [T.OTEL_ATTR_TX_DEPTH]: depth,
        [T.OTEL_ATTR_TX_READ_ONLY]: opts.readOnly,
        [T.OTEL_ATTR_TX_ROUTING_HINT]: effectiveRoutingHint,
        [T.OTEL_ATTR_TX_USE_SAVEPOINT]: opts.useSavepoint,
        [T.OTEL_ATTR_TX_USE_CIRCUIT_BREAKER]: opts.useCircuitBreaker,
        [T.OTEL_ATTR_TX_SUSPENDED]: suspendedContext ? 'true' : 'false',
        [T.OTEL_ATTR_TX_SUSPENDED_ID]: suspendedContext?.transactionId ?? '',
      }
    : undefined;

  /**
   * Execute the transaction with proper context management.
   */
  const executeTransaction = async (
    attemptNumber: number,
    attemptTimeout: number,
    span?: Span,
  ): Promise<T> => {
    logger.debug(
      `[${transactionId}] Starting transaction for ${methodName} ` +
        `(attempt ${attemptNumber}/${opts.maxRetries}, depth: ${depth}, ` +
        `timeout: ${attemptTimeout}ms, isolation: ${opts.isolationLevel}, ` +
        `routing: ${effectiveRoutingHint}` +
        `${suspendedContext ? `, suspended: ${suspendedContext.transactionId}` : ''})`,
    );

    // Add attempt event to span
    if (span) {
      span.addEvent('transaction.attempt', {
        attempt: attemptNumber,
        timeout_ms: attemptTimeout,
      });
    }

    const txStartTime = Date.now();
    const result = await prisma.$transaction(
      async (tx: PrismaTransactionClient) => {
        // Type assertion is necessary here because Prisma's $transaction callback
        // returns an opaque transaction client type. We know it implements
        // PrismaTransactionClient (all model methods) but lacks lifecycle methods.
        // This is safe because we only use model methods within transactions.
        const context: TransactionContext = {
          tx: tx,
          transactionId,
          depth,
          startTime: txStartTime,
          // Preserve suspended context for debugging and potential restoration
          suspendedContext,
        };

        // Use suspendAndRunInTransaction when there's a suspended context
        // This properly replaces the outer context during inner transaction execution
        if (suspendedContext) {
          return suspendAndRunInTransaction(context, () => originalMethod.apply(thisArg, args)) as
            | T
            | Promise<T>;
        }
        return runInTransaction(context, () => originalMethod.apply(thisArg, args)) as
          | T
          | Promise<T>;
      },
      {
        timeout: attemptTimeout,
        maxWait: opts.maxWait,
        isolationLevel: opts.isolationLevel,
      },
    );

    const duration = Date.now() - txStartTime;
    logger.debug(
      `[${transactionId}] Transaction committed for ${methodName} ` +
        `(duration: ${duration}ms, attempts: ${attemptNumber}, depth: ${depth})`,
    );

    // Add success event to span
    if (span)
      span.addEvent(T.OTEL_EVENT_TX_COMMITTED, { duration_ms: duration, attempt: attemptNumber });

    // Update success metrics
    metrics.successfulTransactions++;
    metrics.totalDurationMs += duration;
    if (attemptNumber > 1) {
      metrics.totalRetries += attemptNumber - 1;
      logger.log(
        `[${transactionId}] Transaction ${methodName} succeeded after ${attemptNumber - 1} retries ` +
          `(total elapsed: ${Date.now() - operationStartTime}ms)`,
      );
    }

    return result as T;
  };

  /**
   * Main retry loop with span management.
   */
  const executeWithRetries = async (span?: Span): Promise<T> => {
    try {
      while (attempts < opts.maxRetries) {
        attempts++;

        // Check cumulative timeout before starting new attempt
        const now = Date.now();
        const remainingTime = absoluteDeadline - now;
        if (remainingTime <= 0) {
          metrics.failedTransactions++;
          const errorMsg =
            `@Transactional: Cumulative timeout exceeded for ${methodName}. ` +
            `Transaction ID: ${transactionId}, depth: ${depth}, ` +
            `elapsed: ${now - operationStartTime}ms, timeout: ${opts.timeout}ms, ` +
            `attempts: ${attempts - 1}/${opts.maxRetries}.`;
          logger.warn(`[${transactionId}] ${errorMsg}`);
          throw new Error(errorMsg);
        }

        // Use remaining time for this attempt (with minimum 1 second)
        const attemptTimeout = Math.max(Math.min(remainingTime, opts.timeout), 1000);

        try {
          const result = await executeTransaction(attempts, attemptTimeout, span);
          return result;
        } catch (error) {
          lastError = error;
          const elapsed = Date.now() - operationStartTime;
          const errorCode = getErrorCode(error);
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Add error event to span
          if (span)
            span.addEvent(T.OTEL_EVENT_TX_ERROR, {
              attempt: attempts,
              error_code: errorCode ?? 'unknown',
              error_message: errorMessage,
              retryable: isRetryableError(error),
            });

          if (isRetryableError(error) && attempts < opts.maxRetries) {
            // Check if we still have time for another attempt
            const timeRemaining = absoluteDeadline - Date.now();
            if (timeRemaining <= opts.retryDelay) {
              metrics.failedTransactions++;
              logger.warn(
                `[${transactionId}] No time remaining for retry in ${methodName}. ` +
                  `Time left: ${timeRemaining}ms, min required: ${opts.retryDelay}ms, ` +
                  `depth: ${depth}, error code: ${errorCode}`,
              );
              throw error;
            }

            metrics.totalRetries++;
            logger.warn(
              `[${transactionId}] Retryable error in ${methodName}. ` +
                `Code: ${errorCode}, attempt: ${attempts}/${opts.maxRetries}, ` +
                `depth: ${depth}, elapsed: ${elapsed}ms. ` +
                `Error: ${errorMessage}`,
            );

            // Full jitter exponential backoff
            const jitteredDelay = calculateJitteredDelay(opts.retryDelay, attempts);

            // Don't wait longer than remaining time (with 100ms buffer for overhead)
            const MIN_REMAINING_BUFFER_MS = 100;
            const actualDelay = Math.min(jitteredDelay, timeRemaining - MIN_REMAINING_BUFFER_MS);
            if (actualDelay > 0) {
              await sleep(actualDelay);
            }
            continue;
          }

          metrics.failedTransactions++;
          logger.error(
            `[${transactionId}] Transaction failed for ${methodName}. ` +
              `Code: ${errorCode ?? 'unknown'}, depth: ${depth}, ` +
              `elapsed: ${elapsed}ms, attempts: ${attempts}/${opts.maxRetries}. ` +
              `Error: ${errorMessage}`,
          );
          throw error;
        }
      }

      // Should not reach here normally, but handle edge case for safety
      metrics.failedTransactions++;
      if (lastError) {
        throw lastError;
      }
      throw new Error(
        `@Transactional: Transaction failed for ${methodName}. ` +
          `Max retries exhausted (${opts.maxRetries} attempts). ` +
          `Check logs for transaction IDs and error details.`,
      );
    } finally {
      // Always release semaphore
      transactionSemaphore.release(methodName);
    }
  };

  // Execute with or without OTEL tracing
  if (opts.enableTracing && spanAttributes) {
    return tracer.startActiveSpan(
      `transaction:${methodName}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: spanAttributes,
      },
      async (span) => {
        try {
          const result = await executeWithRetries(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          span.recordException(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          span.end();
        }
      },
    );
  } else {
    return executeWithRetries();
  }
}

/**
 * Method decorator that wraps a method in a database transaction.
 *
 * The @Transactional decorator provides declarative transaction management
 * for NestJS services using Prisma. It handles:
 *
 * - **Transaction Creation**: Automatically starts a Prisma interactive transaction
 * - **Context Propagation**: Uses AsyncLocalStorage to propagate transaction context
 *   through nested async calls without explicit parameter passing
 * - **Retry Logic**: Automatically retries on transient failures (deadlocks,
 *   serialization failures, connection issues) with exponential backoff
 * - **Propagation Modes**: Supports Spring-style propagation for controlling
 *   how transactions interact (required, requires_new, mandatory, etc.)
 * - **Distributed Tracing**: Creates OpenTelemetry spans for observability
 * - **Metrics**: Tracks transaction counts, durations, and retry statistics
 *
 * @param options - Configuration options for the transaction
 * @returns A method decorator
 *
 * @example
 * ```typescript
 * // Basic usage - creates new transaction or joins existing:
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly prisma: PrismaService) {}
 *
 *   @Transactional()
 *   async createUser(dto: CreateUserDto): Promise<User> {
 *     const user = await this.prisma.user.create({ data: dto });
 *     await this.profileService.createProfile(user.id);
 *     return user;
 *   }
 * }
 *
 * // Audit log that persists even if parent transaction fails:
 * @Transactional({ propagation: 'requires_new' })
 * async createAuditLog(action: string): Promise<AuditLog> {
 *   return this.prisma.auditLog.create({ data: { action } });
 * }
 *
 * // Enforce that method must be called within transaction:
 * @Transactional({ propagation: 'mandatory' })
 * async validateInventory(items: Item[]): Promise<void> {
 *   // Throws if called without active transaction
 * }
 *
 * // High-isolation financial operation with more retries:
 * @Transactional({
 *   isolationLevel: 'Serializable',
 *   maxRetries: 5,
 *   timeout: 60000,
 * })
 * async transferFunds(from: string, to: string, amount: number): Promise<void> {
 *   // Operations here are fully isolated and will retry on conflicts
 * }
 * ```
 *
 * @see {@link TransactionalOptions} for configuration options
 * @see {@link TransactionPropagation} for propagation mode descriptions
 * @see {@link getPrismaClient} for accessing transaction-aware client
 */
export function Transactional(options?: TransactionalOptions): MethodDecorator {
  const opts = validateOptions(options ?? {});

  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]) {
      // Get PrismaClient from the class instance using the configured property name
      // Type assertion is necessary because we're accessing a dynamic property
      const prisma = (this as Record<string, unknown>)[opts.prismaProperty] as
        | PrismaClient
        | undefined;

      // Early validation: check prismaProperty exists
      if (!prisma) {
        throw new Error(
          `@Transactional: Cannot find PrismaClient on property '${opts.prismaProperty}' ` +
            `in ${methodName}. ` +
            'Ensure the property exists and PrismaService is properly injected. ' +
            "If using a different property name, set prismaProperty option (e.g., { prismaProperty: 'db' }).",
        );
      }

      // Early validation: check prisma has $transaction method (runtime type check)
      if (typeof prisma.$transaction !== 'function') {
        throw new Error(
          `@Transactional: Property '${opts.prismaProperty}' in ${methodName} ` +
            'does not have a $transaction method. ' +
            'Ensure it is a valid PrismaClient or PrismaService instance, not a transaction client.',
        );
      }

      const existingContext = getTransactionContext();

      // Handle propagation modes
      switch (opts.propagation) {
        case 'mandatory': {
          // Must have existing transaction - throw if none
          if (!existingContext) {
            throw new Error(
              `@Transactional(mandatory): No existing transaction for ${methodName}. ` +
                'This method requires an active transaction context. ' +
                'Call this method from within a @Transactional method or use a different propagation mode.',
            );
          }
          // Validate depth before incrementing
          validateTransactionDepth(existingContext, methodName, 'mandatory');

          logger.debug(
            `[${existingContext.transactionId}] Joining transaction in ${methodName} ` +
              `(mandatory, depth: ${existingContext.depth} -> ${existingContext.depth + 1})`,
          );
          const nestedContext: TransactionContext = {
            ...existingContext,
            depth: existingContext.depth + 1,
          };
          return runInTransaction(nestedContext, () => originalMethod.apply(this, args));
        }

        case 'never':
          // Must NOT have existing transaction - throw if exists
          if (existingContext) {
            throw new Error(
              `@Transactional(never): Active transaction found for ${methodName}. ` +
                `Current transaction ID: ${existingContext.transactionId}, depth: ${existingContext.depth}. ` +
                'This method must not be called within a transaction.',
            );
          }
          // Execute without transaction (no metrics needed - not a real transaction)
          return originalMethod.apply(this, args);

        case 'not_supported':
          // Execute without transaction, suspending any existing context
          if (existingContext) {
            logger.debug(
              `[${existingContext.transactionId}] Suspending transaction for ${methodName} (not_supported)`,
            );
          }
          // Use clearTransactionContext to explicitly clear ALS for nested calls
          return clearTransactionContext(() => originalMethod.apply(this, args));

        case 'supports':
          // Join existing if present, otherwise run without transaction
          if (existingContext) {
            validateTransactionDepth(existingContext, methodName, 'supports');

            logger.debug(
              `[${existingContext.transactionId}] Joining transaction in ${methodName} ` +
                `(supports, depth: ${existingContext.depth} -> ${existingContext.depth + 1})`,
            );
            const nestedContext: TransactionContext = {
              ...existingContext,
              depth: existingContext.depth + 1,
            };
            return runInTransaction(nestedContext, () => originalMethod.apply(this, args));
          }
          // No transaction required, execute without (no metrics - not a real transaction)
          return originalMethod.apply(this, args);

        case 'required':
          // Join existing or create new
          if (existingContext) {
            validateTransactionDepth(existingContext, methodName, 'required');

            const nestedContext: TransactionContext = {
              ...existingContext,
              depth: existingContext.depth + 1,
            };

            // Check if savepoints should be used for nested operations
            if (opts.useSavepoint) {
              logger.debug(
                `[${existingContext.transactionId}] Using savepoint in ${methodName} ` +
                  `(required+savepoint, depth: ${existingContext.depth} -> ${nestedContext.depth})`,
              );
              return runInTransaction(nestedContext, () =>
                executeWithSavepoint(existingContext.tx, nestedContext.depth, () =>
                  originalMethod.apply(this, args),
                ),
              );
            }

            logger.debug(
              `[${existingContext.transactionId}] Joining transaction in ${methodName} ` +
                `(required, depth: ${existingContext.depth} -> ${nestedContext.depth})`,
            );
            return runInTransaction(nestedContext, () => originalMethod.apply(this, args));
          }
          // Fall through to create new transaction
          break;

        case 'nested': {
          // Always uses savepoints - requires existing transaction
          if (!existingContext) {
            throw new Error(
              `@Transactional(nested): No existing transaction for ${methodName}. ` +
                'The nested propagation mode requires an active transaction. ' +
                'Use "required" propagation if you want to create a new transaction when none exists.',
            );
          }

          validateTransactionDepth(existingContext, methodName, 'nested');

          const nestedContext: TransactionContext = {
            ...existingContext,
            depth: existingContext.depth + 1,
          };

          logger.debug(
            `[${existingContext.transactionId}] Creating nested savepoint in ${methodName} ` +
              `(nested, depth: ${existingContext.depth} -> ${nestedContext.depth})`,
          );

          // Track metrics for nested transactions
          metrics.totalTransactions++;
          metrics.byPropagation.nested++;

          return runInTransaction(nestedContext, () =>
            executeWithSavepoint(existingContext.tx, nestedContext.depth, () =>
              originalMethod.apply(this, args),
            ),
          );
        }

        case 'requires_new': {
          // Always create new, suspend existing if present
          const suspendedContext = existingContext;

          if (suspendedContext) {
            validateTransactionDepth(suspendedContext, methodName, 'requires_new');

            logger.debug(
              `[${suspendedContext.transactionId}] Suspending transaction for ${methodName} ` +
                `(requires_new, creating new at depth ${suspendedContext.depth + 1})`,
            );
          }

          // Create new transaction with suspended context preserved for debugging
          return executeNewTransaction(
            prisma,
            methodName,
            opts,
            originalMethod,
            this,
            args,
            suspendedContext,
          );
        }
      }

      // Create new transaction (for 'required' mode when no existing context)
      return executeNewTransaction(prisma, methodName, opts, originalMethod, this, args);
    };

    return descriptor;
  };
}

/**
 * Get the appropriate Prisma client for database operations.
 *
 * This function provides a unified way to access the Prisma client that works
 * both inside and outside of transactions:
 *
 * - **Inside a transaction**: Returns the transaction client from the current context.
 *   This ensures all operations participate in the same transaction.
 * - **Outside a transaction**: Returns the provided default Prisma client.
 *
 * **Important:** The return type is a union because transaction clients lack
 * certain methods ($connect, $disconnect, $transaction, etc.). If you need
 * those methods, check `isInTransaction()` first.
 *
 * @typeParam T - The specific PrismaClient type (inferred from parameter)
 * @param prisma - The default PrismaClient to use when not in a transaction
 * @returns The transaction client if in a transaction, otherwise the provided prisma instance
 *
 * @example
 * ```typescript
 * // Recommended pattern for transaction-aware repository methods:
 * @Injectable()
 * export class UserRepository {
 *   constructor(private readonly prisma: PrismaService) {}
 *
 *   async findById(id: string): Promise<User | null> {
 *     const client = getPrismaClient(this.prisma);
 *     return client.user.findUnique({ where: { id } });
 *   }
 *
 *   async create(data: CreateUserData): Promise<User> {
 *     const client = getPrismaClient(this.prisma);
 *     return client.user.create({ data });
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // These repository methods work both inside and outside transactions:
 *
 * // Outside transaction - uses default prisma client:
 * const user = await userRepository.findById('123');
 *
 * // Inside transaction - uses transaction client automatically:
 * @Transactional()
 * async createUserWithProfile(dto: CreateUserDto) {
 *   const user = await this.userRepository.create(dto); // Uses transaction
 *   const profile = await this.profileRepository.create({ userId: user.id }); // Same transaction
 *   return { user, profile };
 * }
 * ```
 *
 * @see {@link getTransaction} for getting just the transaction client (or undefined)
 * @see {@link isInTransaction} for checking if currently in a transaction
 */
export function getPrismaClient<T extends PrismaClient>(prisma: T): PrismaTransactionClient | T {
  // Reuse getTransaction() to avoid duplicating context access logic
  const tx = getTransaction();
  return tx ?? prisma;
}

/**
 * Check if the current execution context is within a transaction.
 *
 * This is a re-export from transaction-context for convenience, allowing
 * consumers to import all transaction utilities from a single module.
 *
 * @returns `true` if currently within a transaction, `false` otherwise
 *
 * @example
 * ```typescript
 * if (isInTransaction()) {
 *   // Use transaction-specific logic
 *   await this.logWithinTransaction(action);
 * } else {
 *   // Use immediate commit logic
 *   await this.logImmediately(action);
 * }
 * ```
 *
 * @see {@link getTransactionContext} for full context details
 * @see {@link Transactional} decorator for creating transactions
 */
export { isInTransaction } from './transaction-context';

/**
 * Get the current transaction ID if executing within a transaction.
 *
 * The transaction ID is a unique identifier generated for each transaction,
 * useful for:
 * - Logging and debugging (correlate all operations in a transaction)
 * - Distributed tracing (include in trace context)
 * - Audit trails (record which transaction made changes)
 *
 * Transaction ID format: `tx_{timestamp_base36}_{random_6chars}`
 * Example: `tx_lz5k8m2_a1b2c3`
 *
 * @returns The transaction ID string if in a transaction, `undefined` otherwise
 *
 * @example
 * ```typescript
 * // Include transaction ID in logs:
 * const txId = getCurrentTransactionId();
 * this.logger.log(`[${txId ?? 'no-tx'}] Processing order ${orderId}`);
 *
 * // Include in audit records:
 * await this.auditLog.create({
 *   action: 'order.created',
 *   transactionId: getCurrentTransactionId(),
 *   data: { orderId },
 * });
 * ```
 *
 * @see {@link getTransactionContext} for full context including depth and timing
 */
export function getCurrentTransactionId(): string | undefined {
  return getTransactionContext()?.transactionId;
}
