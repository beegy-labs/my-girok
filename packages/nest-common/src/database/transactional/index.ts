/**
 * Transaction Management Module
 *
 * This module provides comprehensive transaction management for NestJS applications
 * using Prisma. It includes:
 *
 * - **@Transactional decorator**: Declarative transaction management with automatic
 *   retry, timeout, and propagation control
 * - **Context utilities**: AsyncLocalStorage-based context propagation for transparent
 *   transaction access across the call stack
 * - **Metrics**: Transaction count, duration, and retry statistics for observability
 *
 * @example
 * ```typescript
 * // Basic usage with decorator:
 * import { Transactional, getPrismaClient } from '@my-girok/nest-common';
 *
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly prisma: PrismaService) {}
 *
 *   @Transactional()
 *   async createUser(dto: CreateUserDto): Promise<User> {
 *     return this.prisma.user.create({ data: dto });
 *   }
 * }
 *
 * // Access transaction-aware client in repositories:
 * async findUser(id: string): Promise<User | null> {
 *   const client = getPrismaClient(this.prisma);
 *   return client.user.findUnique({ where: { id } });
 * }
 *
 * // Monitor transaction health:
 * const metrics = getTransactionMetrics();
 * console.log(`Success rate: ${metrics.successfulTransactions / metrics.totalTransactions}`);
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Transaction Context
// ============================================================================

export {
  /**
   * AsyncLocalStorage instance for transaction context.
   * Prefer using helper functions instead of accessing directly.
   */
  transactionStorage,
  /**
   * Get the full transaction context including ID, depth, and timing.
   */
  getTransactionContext,
  /**
   * Get just the Prisma transaction client (or undefined if not in transaction).
   */
  getTransaction,
  /**
   * Check if currently executing within a transaction.
   */
  isInTransaction,
  /**
   * Run a function within a transaction context.
   * @internal Used by @Transactional decorator.
   */
  runInTransaction,
  /**
   * Generate a unique transaction ID.
   */
  generateTransactionId,
  /**
   * Clear transaction context for nested calls.
   * @internal Used by not_supported propagation.
   */
  clearTransactionContext,
  /**
   * Suspend current transaction and run in new context.
   * @internal Used by requires_new propagation.
   */
  suspendAndRunInTransaction,
} from './transaction-context';

export type {
  /**
   * Transaction context with ID, depth, client, and timing information.
   */
  TransactionContext,
  /**
   * Prisma client type available within transactions (subset of PrismaClient).
   */
  PrismaTransactionClient,
} from './transaction-context';

// ============================================================================
// Transactional Decorator
// ============================================================================

export {
  /**
   * Method decorator for declarative transaction management.
   */
  Transactional,
  /**
   * Get transaction-aware Prisma client (falls back to provided client).
   */
  getPrismaClient,
  /**
   * Get current transaction ID if in a transaction.
   */
  getCurrentTransactionId,
  /**
   * Get current transaction metrics for monitoring.
   */
  getTransactionMetrics,
  /**
   * Reset transaction metrics to zero.
   */
  resetTransactionMetrics,
  /**
   * Get all transaction circuit breakers for monitoring.
   */
  getTransactionCircuitBreakers,
} from './transactional.decorator';

export type {
  /**
   * Configuration options for @Transactional decorator.
   */
  TransactionalOptions,
  /**
   * Transaction isolation levels (ReadCommitted, Serializable, etc.).
   */
  TransactionIsolationLevel,
  /**
   * Transaction propagation modes (required, requires_new, mandatory, nested, etc.).
   */
  TransactionPropagation,
} from './transactional.decorator';
