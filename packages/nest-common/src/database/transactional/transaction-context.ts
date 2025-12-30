import { AsyncLocalStorage } from 'async_hooks';
import type { PrismaClient } from '@prisma/client';

/**
 * Prisma interactive transaction client type.
 *
 * This type represents the client available within a Prisma interactive transaction.
 * Unlike the full PrismaClient, the transaction client is a subset that:
 * - Has all the same model access methods (user, post, comment, etc.)
 * - Does NOT have lifecycle methods ($connect, $disconnect)
 * - Does NOT have transaction methods ($transaction) - you cannot nest interactive transactions
 * - Does NOT have event methods ($on, $use)
 * - Does NOT have extension methods ($extends)
 * - Is only valid within the transaction callback scope
 *
 * We use Omit to properly type this instead of unsafe type assertions,
 * ensuring type safety when accessing models within transactions.
 *
 * @example
 * ```typescript
 * // Within a transaction callback:
 * prisma.$transaction(async (tx: PrismaTransactionClient) => {
 *   // tx.user.create() - OK
 *   // tx.$connect() - Type error (not available)
 *   // tx.$transaction() - Type error (not available)
 * });
 * ```
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/transactions#interactive-transactions
 */
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$transaction' | '$on' | '$use' | '$extends'
>;

/**
 * Sentinel value to represent cleared/empty transaction context.
 *
 * Used by the `not_supported` propagation mode to explicitly clear the
 * AsyncLocalStorage context for nested calls. This is safer than using
 * undefined or null because:
 * - It's a unique Symbol that cannot be confused with other values
 * - It explicitly indicates intentional context clearing
 * - It avoids unsafe type assertions
 *
 * @internal This is an implementation detail and should not be exported.
 */
const NO_TRANSACTION_CONTEXT = Symbol('NO_TRANSACTION_CONTEXT');

/**
 * Internal storage type that includes the sentinel value.
 *
 * The AsyncLocalStorage can hold either:
 * - A valid TransactionContext (when in a transaction)
 * - The NO_TRANSACTION_CONTEXT sentinel (when context is explicitly cleared)
 * - undefined (when getStore() returns undefined - no context set)
 *
 * @internal This is an implementation detail and should not be exported.
 */
type TransactionStorageValue = TransactionContext | typeof NO_TRANSACTION_CONTEXT;

/**
 * Transaction context stored in AsyncLocalStorage.
 *
 * This interface represents the complete state of a transaction as it propagates
 * through the call stack via AsyncLocalStorage. It allows accessing the current
 * transaction from anywhere in the call stack without explicitly passing parameters.
 *
 * The context is automatically propagated through async operations, making it
 * possible for nested service calls to participate in the same transaction
 * transparently.
 *
 * @example
 * ```typescript
 * // Context is automatically available in nested calls:
 * class OrderService {
 *   @Transactional()
 *   async createOrder(dto: CreateOrderDto) {
 *     // Transaction context is set here
 *     await this.inventoryService.reserve(dto.items);
 *     // inventoryService can access the same transaction via getTransaction()
 *   }
 * }
 * ```
 *
 * @see {@link getTransactionContext} for retrieving the current context
 * @see {@link runInTransaction} for setting a new context
 */
export interface TransactionContext {
  /**
   * Prisma transaction client for database operations.
   *
   * This is a subset of PrismaClient that excludes lifecycle and transaction
   * methods. Use this client for all database operations within the transaction.
   */
  tx: PrismaTransactionClient;

  /**
   * Unique transaction ID for logging, debugging, and distributed tracing.
   *
   * Format: `tx_{timestamp_base36}_{random_6chars}`
   * Example: `tx_lz5k8m2_a1b2c3`
   *
   * This ID should be included in all log messages and error reports
   * to correlate operations within the same transaction.
   */
  transactionId: string;

  /**
   * Current nested transaction depth (1-based).
   *
   * - depth=1: Root transaction
   * - depth=2: First level of nesting
   * - depth=N: N-1 levels of nesting
   *
   * Used to prevent stack overflow from excessive nesting and for
   * debugging/logging purposes.
   */
  depth: number;

  /**
   * Transaction start timestamp in milliseconds (Date.now()).
   *
   * Used for:
   * - Timeout tracking and enforcement
   * - Transaction duration metrics
   * - Performance monitoring
   */
  startTime: number;

  /**
   * Suspended outer context for `requires_new` propagation mode.
   *
   * When a new transaction is started with `requires_new` propagation,
   * the outer transaction context is preserved here. This allows:
   * - Proper cleanup if the inner transaction fails
   * - Debugging and logging of the full transaction stack
   * - Potential future support for resuming suspended transactions
   */
  suspendedContext?: TransactionContext;
}

/**
 * AsyncLocalStorage instance for transaction context propagation.
 *
 * This storage enables automatic propagation of transaction context through
 * the entire async call stack without explicit parameter passing. It uses
 * Node.js AsyncLocalStorage to maintain context across:
 * - Async/await operations
 * - Promise chains
 * - Timers (setTimeout, setInterval)
 * - Event emitters
 *
 * The storage is shared across the entire application, so all services
 * can access the current transaction context transparently.
 *
 * @example
 * ```typescript
 * // Direct access (prefer getTransactionContext() instead):
 * const context = transactionStorage.getStore();
 * ```
 *
 * @see {@link getTransactionContext} for the recommended way to access context
 * @see https://nodejs.org/api/async_context.html#class-asynclocalstorage
 */
export const transactionStorage = new AsyncLocalStorage<TransactionStorageValue>();

/**
 * Get the current transaction context from AsyncLocalStorage.
 *
 * This function retrieves the transaction context for the current async
 * execution context. It's the primary way to access transaction information
 * from anywhere in your application code.
 *
 * @returns The current TransactionContext if within a transaction,
 *          or undefined if not in a transaction or context was cleared.
 *
 * @example
 * ```typescript
 * // Check if in transaction and get details:
 * const ctx = getTransactionContext();
 * if (ctx) {
 *   console.log(`Transaction ${ctx.transactionId} at depth ${ctx.depth}`);
 *   // Use ctx.tx for database operations
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a service method:
 * async findUser(id: string): Promise<User | null> {
 *   const ctx = getTransactionContext();
 *   const client = ctx?.tx ?? this.prisma;
 *   return client.user.findUnique({ where: { id } });
 * }
 * ```
 *
 * @see {@link getTransaction} for a simpler way to get just the Prisma client
 * @see {@link isInTransaction} for a boolean check
 */
export function getTransactionContext(): TransactionContext | undefined {
  const store = transactionStorage.getStore();
  // Return undefined for both no store and sentinel value
  // This handles the case where context was explicitly cleared by not_supported mode
  if (!store || store === NO_TRANSACTION_CONTEXT) {
    return undefined;
  }
  return store;
}

/**
 * Get the current Prisma transaction client.
 *
 * This is a convenience function that extracts just the transaction client
 * from the context. Use this when you only need the Prisma client and don't
 * need other context information like transaction ID or depth.
 *
 * @returns The Prisma transaction client if within a transaction,
 *          or undefined if not in a transaction.
 *
 * @example
 * ```typescript
 * // Get transaction-aware client:
 * async createUser(data: CreateUserDto): Promise<User> {
 *   const tx = getTransaction();
 *   const client = tx ?? this.prisma;
 *   return client.user.create({ data });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Ensure operation is within a transaction:
 * async transferFunds(from: string, to: string, amount: number): Promise<void> {
 *   const tx = getTransaction();
 *   if (!tx) {
 *     throw new Error('Transfer must be executed within a transaction');
 *   }
 *   await tx.account.update({ where: { id: from }, data: { balance: { decrement: amount } } });
 *   await tx.account.update({ where: { id: to }, data: { balance: { increment: amount } } });
 * }
 * ```
 *
 * @see {@link getPrismaClient} in transactional.decorator.ts for a fallback-enabled version
 */
export function getTransaction(): PrismaTransactionClient | undefined {
  const context = getTransactionContext();
  return context?.tx;
}

/**
 * Check if the current execution context is within a transaction.
 *
 * This is a simple boolean check useful for conditional logic based on
 * transaction state. It does not throw errors - use `propagation: 'mandatory'`
 * on @Transactional if you need to enforce transaction presence.
 *
 * @returns `true` if currently within a transaction, `false` otherwise.
 *
 * @example
 * ```typescript
 * // Log differently based on transaction state:
 * async saveAuditLog(action: string): Promise<void> {
 *   if (isInTransaction()) {
 *     // Will be committed with the transaction
 *     await this.auditRepository.create(action);
 *   } else {
 *     // Immediately persisted
 *     await this.auditRepository.create(action);
 *     this.logger.warn('Audit log saved outside transaction');
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Use in guards or interceptors:
 * if (!isInTransaction() && this.requiresTransaction(operation)) {
 *   throw new Error(`Operation ${operation} requires a transaction`);
 * }
 * ```
 */
export function isInTransaction(): boolean {
  return getTransactionContext() !== undefined;
}

/**
 * Run a function within a new transaction context.
 *
 * This function sets up the AsyncLocalStorage context so that all code
 * executed within `fn` (including nested async calls) can access the
 * transaction via `getTransactionContext()` or `getTransaction()`.
 *
 * **Note:** This is primarily used internally by the @Transactional decorator.
 * Direct usage is discouraged unless you're implementing custom transaction
 * management.
 *
 * @typeParam T - The return type of the function
 * @param context - The transaction context to set
 * @param fn - The function to execute within the context
 * @returns The return value of `fn`
 *
 * @example
 * ```typescript
 * // Internal usage by @Transactional:
 * const result = runInTransaction(context, () => originalMethod.apply(this, args));
 * ```
 *
 * @see {@link Transactional} decorator for the recommended way to manage transactions
 */
export function runInTransaction<T>(context: TransactionContext, fn: () => T): T {
  return transactionStorage.run(context, fn);
}

/**
 * Generate a unique transaction ID for logging and tracing.
 *
 * The generated ID has the format: `tx_{timestamp_base36}_{random_6chars}`
 * - Timestamp provides rough ordering and debugging hints
 * - Random suffix ensures uniqueness even with concurrent transactions
 * - Base36 encoding keeps the ID compact
 *
 * Example output: `tx_lz5k8m2_a1b2c3`
 *
 * @returns A unique transaction identifier string
 *
 * @example
 * ```typescript
 * const txId = generateTransactionId();
 * // txId: "tx_lz5k8m2_a1b2c3"
 * logger.info(`[${txId}] Starting transaction`);
 * ```
 */
export function generateTransactionId(): string {
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Run a function with explicitly cleared transaction context.
 *
 * This function is used by the `not_supported` propagation mode to execute
 * code completely outside any transaction context. Even if the caller is
 * within a transaction, the function `fn` and all its nested calls will
 * see no transaction (isInTransaction() returns false).
 *
 * The implementation uses a sentinel Symbol rather than undefined to
 * explicitly indicate the context was intentionally cleared (not just absent).
 *
 * @typeParam T - The return type of the function
 * @param fn - The function to execute without transaction context
 * @returns The return value of `fn`
 *
 * @example
 * ```typescript
 * // Used by not_supported propagation:
 * @Transactional({ propagation: 'not_supported' })
 * async sendEmail(to: string, subject: string): Promise<void> {
 *   // This runs outside any transaction, even if caller was in one
 *   await this.emailService.send(to, subject);
 * }
 * ```
 *
 * @see {@link TransactionPropagation} for propagation mode documentation
 */
export function clearTransactionContext<T>(fn: () => T): T {
  return transactionStorage.run(NO_TRANSACTION_CONTEXT, fn);
}

/**
 * Suspend the current transaction context and run a function in a new context.
 *
 * This function is used by the `requires_new` propagation mode to create
 * a completely new transaction while preserving a reference to the outer
 * (suspended) transaction. The outer transaction is stored in the new
 * context's `suspendedContext` property for:
 * - Logging and debugging (transaction lineage)
 * - Proper depth tracking
 * - Potential future features like transaction resumption
 *
 * **Important:** The suspended transaction is NOT automatically resumed.
 * After the inner transaction completes, execution returns to the caller
 * which is still in the outer transaction's context.
 *
 * @typeParam T - The return type of the function
 * @param newContext - The new transaction context (should have suspendedContext set)
 * @param fn - The function to execute in the new context
 * @returns The return value of `fn`
 *
 * @example
 * ```typescript
 * // Used by requires_new propagation:
 * @Transactional({ propagation: 'requires_new' })
 * async createAuditLog(action: string): Promise<AuditLog> {
 *   // Always runs in its own transaction, even if caller has one
 *   // If outer transaction rolls back, this audit log persists
 *   return this.prisma.auditLog.create({ data: { action } });
 * }
 * ```
 *
 * @see {@link TransactionPropagation} for propagation mode documentation
 */
export function suspendAndRunInTransaction<T>(newContext: TransactionContext, fn: () => T): T {
  return transactionStorage.run(newContext, fn);
}
