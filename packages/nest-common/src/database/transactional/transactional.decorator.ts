import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import {
  getTransactionContext,
  generateTransactionId,
  runInTransaction,
  TransactionContext,
} from './transaction-context';

const logger = new Logger('Transactional');
const tracer = trace.getTracer('transactional');

/**
 * Transaction isolation levels supported by Prisma.
 */
export type TransactionIsolationLevel =
  | 'ReadUncommitted'
  | 'ReadCommitted'
  | 'RepeatableRead'
  | 'Serializable'
  | 'Snapshot';

/**
 * Transaction propagation modes.
 */
export type TransactionPropagation =
  | 'required' // Join existing or create new (default)
  | 'requires_new' // Always create new, suspend existing
  | 'supports' // Use existing if available, no transaction otherwise
  | 'mandatory' // Must have existing transaction, throw if none
  | 'never' // Must NOT have existing transaction, throw if exists
  | 'not_supported'; // Suspend existing, run without transaction

/**
 * Options for @Transactional decorator
 */
export interface TransactionalOptions {
  /**
   * Maximum time in milliseconds for the transaction.
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Isolation level for the transaction.
   * @default 'ReadCommitted'
   */
  isolationLevel?: TransactionIsolationLevel;

  /**
   * Maximum retry attempts on deadlock or serialization failure.
   * @default 3
   */
  maxRetries?: number;

  /**
   * Base delay between retries in milliseconds.
   * Uses full jitter exponential backoff.
   * @default 100
   */
  retryDelay?: number;

  /**
   * Property name to get PrismaClient from the class instance.
   * @default 'prisma'
   */
  prismaProperty?: string;

  /**
   * Transaction propagation mode.
   * @default 'required' - Join existing or create new
   */
  propagation?: TransactionPropagation;

  /**
   * Enable OpenTelemetry span creation for transaction tracing.
   * @default true
   */
  enableTracing?: boolean;
}

const DEFAULT_OPTIONS: Required<TransactionalOptions> = {
  timeout: 30000,
  isolationLevel: 'ReadCommitted',
  maxRetries: 3,
  retryDelay: 100,
  prismaProperty: 'prisma',
  propagation: 'required',
  enableTracing: true,
};

/**
 * Comprehensive retryable error codes for transaction retry logic.
 * Includes Prisma, PostgreSQL, and network errors.
 */
const RETRYABLE_ERROR_CODES = new Set([
  // Prisma error codes
  'P2034', // Transaction failed due to write conflict or deadlock
  'P2015', // Record to update not found (retryable in concurrent deletes)
  'P2024', // Connection pool timeout
  'P2028', // Transaction API error
  'P1017', // Server closed connection
  'P1001', // Can't reach database server
  'P1002', // Database server timeout

  // PostgreSQL error codes
  '40001', // Serialization failure
  '40P01', // Deadlock detected
  '25P02', // Transaction aborted / idle in transaction
  '57014', // Query cancelled (statement timeout)
  '08000', // Connection exception
  '08003', // Connection does not exist
  '08006', // Connection failure
  '53300', // Too many connections
  '55P03', // Lock not available

  // Network errors
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ECONNRESET',
  'ENOTFOUND',
  'EPIPE',
  'EHOSTUNREACH',
]);

/**
 * Non-retryable error codes that should fail immediately.
 */
const NON_RETRYABLE_ERROR_CODES = new Set([
  '23505', // Unique violation - data conflict, retry won't help
  '53100', // Disk full
  '53200', // Out of memory
  '57P01', // Admin shutdown
  '42P01', // Undefined table
  '42703', // Undefined column
]);

/**
 * Recursively extract error code from error and its cause chain.
 */
function getErrorCode(error: unknown, depth = 0): string | undefined {
  if (depth > 5 || !error || typeof error !== 'object') {
    return undefined;
  }

  if ('code' in error && error.code) {
    return String(error.code);
  }

  if ('cause' in error && error.cause) {
    return getErrorCode(error.cause, depth + 1);
  }

  return undefined;
}

/**
 * Check if error is retryable (deadlock, serialization failure, network issues).
 */
function isRetryableError(error: unknown): boolean {
  const code = getErrorCode(error);

  if (!code) {
    return false;
  }

  // Explicitly non-retryable
  if (NON_RETRYABLE_ERROR_CODES.has(code)) {
    return false;
  }

  return RETRYABLE_ERROR_CODES.has(code);
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate full jitter exponential backoff delay.
 * Better distribution than partial jitter for preventing thundering herd.
 *
 * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
function calculateJitteredDelay(baseDelay: number, attempt: number, maxDelay = 10000): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  // Full jitter: random value between 0 and exponential delay
  return Math.random() * exponentialDelay;
}

/**
 * Decorator that wraps a method in a database transaction with OpenTelemetry tracing.
 *
 * Uses AsyncLocalStorage to propagate transaction context through the call stack,
 * enabling nested service calls to participate in the same transaction.
 *
 * @param options - Transaction options
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class SanctionService {
 *   constructor(private readonly prisma: PrismaService) {}
 *
 *   @Transactional()
 *   async create(dto: CreateSanctionDto): Promise<Sanction> {
 *     // All database operations within this method use the same transaction
 *     const sanction = await this.prisma.sanction.create({ data: dto });
 *     await this.auditService.log('sanction.created', sanction.id);
 *     return sanction;
 *   }
 *
 *   @Transactional({ propagation: 'mandatory' })
 *   async auditLog(action: string): Promise<void> {
 *     // Requires existing transaction - throws if called without one
 *   }
 *
 *   @Transactional({ timeout: 60000, isolationLevel: 'Serializable' })
 *   async complexOperation(): Promise<void> {
 *     // Custom timeout and isolation level
 *   }
 * }
 * ```
 */
export function Transactional(options?: TransactionalOptions): MethodDecorator {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]) {
      // Get PrismaClient from the class instance
      const prisma = (this as Record<string, unknown>)[opts.prismaProperty] as PrismaClient;

      if (!prisma) {
        throw new Error(
          `@Transactional: Cannot find PrismaClient on property '${opts.prismaProperty}'. ` +
            `Make sure to inject PrismaService and use the correct property name.`,
        );
      }

      const existingContext = getTransactionContext();

      // Handle propagation modes
      switch (opts.propagation) {
        case 'mandatory':
          if (!existingContext) {
            throw new Error(
              `@Transactional(mandatory): No existing transaction for ${methodName}. ` +
                'This method requires an active transaction context.',
            );
          }
          // Fall through to join existing
          break;

        case 'never':
          if (existingContext) {
            throw new Error(
              `@Transactional(never): Active transaction found for ${methodName}. ` +
                'This method must not be called within a transaction.',
            );
          }
          // Execute without transaction
          return originalMethod.apply(this, args);

        case 'not_supported':
          // Execute without transaction, ignoring any existing context
          logger.debug(`[not_supported] Executing ${methodName} outside transaction context`);
          return originalMethod.apply(this, args);

        case 'supports':
          if (existingContext) {
            // Join existing transaction
            logger.debug(
              `[${existingContext.transactionId}] Joining transaction in ${methodName} (supports, depth: ${existingContext.depth + 1})`,
            );
            const nestedContext: TransactionContext = {
              ...existingContext,
              depth: existingContext.depth + 1,
            };
            return runInTransaction(nestedContext, () => originalMethod.apply(this, args));
          }
          // No transaction required, execute without
          return originalMethod.apply(this, args);

        case 'required':
          if (existingContext) {
            // Join existing transaction
            logger.debug(
              `[${existingContext.transactionId}] Joining transaction in ${methodName} (depth: ${existingContext.depth + 1})`,
            );
            const nestedContext: TransactionContext = {
              ...existingContext,
              depth: existingContext.depth + 1,
            };
            return runInTransaction(nestedContext, () => originalMethod.apply(this, args));
          }
          // Fall through to create new transaction
          break;

        case 'requires_new':
          if (existingContext) {
            logger.debug(
              `[${existingContext.transactionId}] Suspending transaction, creating new for ${methodName}`,
            );
          }
          // Fall through to create new transaction
          break;
      }

      // Create new transaction with retry logic and cumulative timeout tracking
      let lastError: unknown;
      let attempts = 0;
      const operationStartTime = Date.now();
      const absoluteDeadline = operationStartTime + opts.timeout;

      while (attempts < opts.maxRetries) {
        attempts++;
        const transactionId = generateTransactionId();

        // Check cumulative timeout before starting new attempt
        const now = Date.now();
        const remainingTime = absoluteDeadline - now;
        if (remainingTime <= 0) {
          logger.warn(
            `[${transactionId}] Cumulative timeout exceeded for ${methodName} after ${attempts - 1} attempts (${now - operationStartTime}ms elapsed)`,
          );
          throw new Error(
            `Transaction timeout: ${methodName} exceeded ${opts.timeout}ms across ${attempts - 1} retry attempts`,
          );
        }

        // Use remaining time for this attempt (with minimum 1 second)
        const attemptTimeout = Math.max(Math.min(remainingTime, opts.timeout), 1000);

        // Create OTEL span for transaction if tracing is enabled
        const spanOptions = opts.enableTracing
          ? {
              kind: SpanKind.INTERNAL,
              attributes: {
                'db.operation': 'transaction',
                'db.system': 'postgresql',
                'db.transaction.id': transactionId,
                'db.transaction.isolation_level': opts.isolationLevel,
                'db.transaction.attempt': attempts,
                'db.transaction.timeout_ms': attemptTimeout,
              },
            }
          : undefined;

        const executeTransaction = async (): Promise<unknown> => {
          logger.debug(
            `[${transactionId}] Starting transaction for ${methodName} (attempt ${attempts}/${opts.maxRetries}, timeout: ${attemptTimeout}ms)`,
          );

          const txStartTime = Date.now();
          const result = await prisma.$transaction(
            async (tx) => {
              const context: TransactionContext = {
                tx: tx as unknown as PrismaClient,
                transactionId,
                depth: 1,
                startTime: txStartTime,
              };

              return runInTransaction(context, () => originalMethod.apply(this, args));
            },
            {
              timeout: attemptTimeout,
              isolationLevel: opts.isolationLevel,
            },
          );

          const duration = Date.now() - txStartTime;
          logger.debug(
            `[${transactionId}] Transaction committed for ${methodName} (${duration}ms, ${attempts} attempt(s))`,
          );

          // Log metrics for observability
          if (attempts > 1) {
            logger.log(
              `[${transactionId}] Transaction ${methodName} succeeded after ${attempts} retries (total: ${Date.now() - operationStartTime}ms)`,
            );
          }

          return result;
        };

        try {
          // Execute with or without OTEL tracing
          if (opts.enableTracing && spanOptions) {
            const result = await tracer.startActiveSpan(
              `transaction:${methodName}`,
              spanOptions,
              async (span) => {
                try {
                  const result = await executeTransaction();
                  span.setStatus({ code: SpanStatusCode.OK });
                  return result;
                } catch (error) {
                  span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : String(error),
                  });
                  span.recordException(error as Error);
                  throw error;
                } finally {
                  span.end();
                }
              },
            );
            return result;
          } else {
            return await executeTransaction();
          }
        } catch (error) {
          lastError = error;
          const elapsed = Date.now() - operationStartTime;
          const errorCode = getErrorCode(error);

          if (isRetryableError(error) && attempts < opts.maxRetries) {
            // Check if we still have time for another attempt
            const timeRemaining = absoluteDeadline - Date.now();
            if (timeRemaining <= opts.retryDelay) {
              logger.warn(
                `[${transactionId}] No time remaining for retry in ${methodName} (${timeRemaining}ms left)`,
              );
              throw error;
            }

            logger.warn(
              `[${transactionId}] Retryable error (${errorCode}) in ${methodName}, attempt ${attempts}/${opts.maxRetries} (${elapsed}ms elapsed): ${error instanceof Error ? error.message : error}`,
            );

            // Full jitter exponential backoff
            const jitteredDelay = calculateJitteredDelay(opts.retryDelay, attempts);

            // Don't wait longer than remaining time
            const actualDelay = Math.min(jitteredDelay, timeRemaining - 100);
            if (actualDelay > 0) {
              await sleep(actualDelay);
            }
            continue;
          }

          logger.error(
            `[${transactionId}] Transaction failed for ${methodName} after ${elapsed}ms (code: ${errorCode}): ${error instanceof Error ? error.message : error}`,
          );
          throw error;
        }
      }

      // Should not reach here, but handle edge case
      if (lastError) {
        throw lastError;
      }
      throw new Error(
        `Transaction failed for ${methodName}: max retries (${opts.maxRetries}) exhausted`,
      );
    };

    return descriptor;
  };
}

/**
 * Get the Prisma client to use for database operations.
 * Returns the transaction client if in a transaction, otherwise the provided prisma instance.
 *
 * @param prisma - Default PrismaClient to use if not in transaction
 *
 * @example
 * ```typescript
 * async findUser(id: string): Promise<User> {
 *   const client = getPrismaClient(this.prisma);
 *   return client.user.findUnique({ where: { id } });
 * }
 * ```
 */
export function getPrismaClient<T extends PrismaClient>(prisma: T): T {
  const context = getTransactionContext();
  return (context?.tx as T) ?? prisma;
}

/**
 * Check if currently executing within a transaction context.
 */
export function isInTransaction(): boolean {
  return getTransactionContext() !== null;
}

/**
 * Get the current transaction ID if in a transaction.
 */
export function getCurrentTransactionId(): string | undefined {
  return getTransactionContext()?.transactionId;
}
