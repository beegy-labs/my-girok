import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  transactionStorage,
  getTransactionContext,
  generateTransactionId,
  runInTransaction,
  TransactionContext,
} from './transaction-context';

const logger = new Logger('Transactional');

/**
 * Options for @Transactional decorator
 */
/**
 * Transaction isolation levels supported by Prisma.
 */
export type TransactionIsolationLevel =
  | 'ReadUncommitted'
  | 'ReadCommitted'
  | 'RepeatableRead'
  | 'Serializable'
  | 'Snapshot';

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
   * Delay between retries in milliseconds.
   * @default 100
   */
  retryDelay?: number;

  /**
   * Property name to get PrismaClient from the class instance.
   * @default 'prisma'
   */
  prismaProperty?: string;

  /**
   * Whether to propagate existing transaction (join) or create new (requires_new).
   * @default 'required' - Join existing or create new
   */
  propagation?: 'required' | 'requires_new' | 'supports';
}

const DEFAULT_OPTIONS: Required<TransactionalOptions> = {
  timeout: 30000,
  isolationLevel: 'ReadCommitted',
  maxRetries: 3,
  retryDelay: 100,
  prismaProperty: 'prisma',
  propagation: 'required',
};

/**
 * Check if error is retryable (deadlock or serialization failure)
 */
function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    // P2034: Transaction failed due to a write conflict or a deadlock
    // 40001: Serialization failure (PostgreSQL)
    // 40P01: Deadlock detected (PostgreSQL)
    return code === 'P2034' || code === '40001' || code === '40P01';
  }
  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Decorator that wraps a method in a database transaction.
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
      if (existingContext) {
        switch (opts.propagation) {
          case 'supports':
          case 'required':
            // Join existing transaction
            logger.debug(
              `[${existingContext.transactionId}] Joining existing transaction in ${methodName} (depth: ${existingContext.depth + 1})`,
            );
            const nestedContext: TransactionContext = {
              ...existingContext,
              depth: existingContext.depth + 1,
            };
            return runInTransaction(nestedContext, () => originalMethod.apply(this, args));

          case 'requires_new':
            // Create new transaction (suspend existing)
            logger.debug(
              `[${existingContext.transactionId}] Suspending transaction, creating new for ${methodName}`,
            );
            break;
        }
      } else if (opts.propagation === 'supports') {
        // No transaction required, execute without transaction
        return originalMethod.apply(this, args);
      }

      // Create new transaction with retry logic
      let lastError: unknown;
      let attempts = 0;

      while (attempts < opts.maxRetries) {
        attempts++;
        const transactionId = generateTransactionId();

        try {
          logger.debug(
            `[${transactionId}] Starting transaction for ${methodName} (attempt ${attempts}/${opts.maxRetries})`,
          );

          const result = await prisma.$transaction(
            async (tx) => {
              const context: TransactionContext = {
                tx: tx as unknown as PrismaClient,
                transactionId,
                depth: 1,
                startTime: Date.now(),
              };

              return runInTransaction(context, () => originalMethod.apply(this, args));
            },
            {
              timeout: opts.timeout,
              isolationLevel: opts.isolationLevel,
            },
          );

          logger.debug(
            `[${transactionId}] Transaction committed for ${methodName} (${Date.now() - Date.now()}ms)`,
          );
          return result;
        } catch (error) {
          lastError = error;

          if (isRetryableError(error) && attempts < opts.maxRetries) {
            logger.warn(
              `[${transactionId}] Retryable error in ${methodName}, attempt ${attempts}/${opts.maxRetries}: ${error instanceof Error ? error.message : error}`,
            );
            await sleep(opts.retryDelay * attempts); // Exponential backoff
            continue;
          }

          logger.error(
            `[${transactionId}] Transaction failed for ${methodName}: ${error instanceof Error ? error.message : error}`,
          );
          throw error;
        }
      }

      throw lastError;
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
