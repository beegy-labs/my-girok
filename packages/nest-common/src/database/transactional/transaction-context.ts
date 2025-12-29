import { AsyncLocalStorage } from 'async_hooks';
import type { PrismaClient } from '@prisma/client';

/**
 * Transaction context stored in AsyncLocalStorage.
 * Allows accessing the current transaction from anywhere in the call stack.
 */
export interface TransactionContext {
  /** Prisma transaction client */
  tx: PrismaClient;

  /** Transaction ID for logging/debugging */
  transactionId: string;

  /** Nested transaction depth */
  depth: number;

  /** Start timestamp for timeout tracking */
  startTime: number;
}

/**
 * AsyncLocalStorage for transaction context propagation.
 * Enables accessing the current transaction without passing it through parameters.
 */
export const transactionStorage = new AsyncLocalStorage<TransactionContext>();

/**
 * Get the current transaction context.
 * Returns undefined if not within a transaction.
 */
export function getTransactionContext(): TransactionContext | undefined {
  return transactionStorage.getStore();
}

/**
 * Get the current transaction client.
 * Returns the transaction client if in a transaction, otherwise undefined.
 */
export function getTransaction(): PrismaClient | undefined {
  return transactionStorage.getStore()?.tx;
}

/**
 * Check if currently within a transaction.
 */
export function isInTransaction(): boolean {
  return transactionStorage.getStore() !== undefined;
}

/**
 * Get transaction depth (for nested transactions).
 */
export function getTransactionDepth(): number {
  return transactionStorage.getStore()?.depth ?? 0;
}

/**
 * Run a function within a transaction context.
 * Used internally by @Transactional decorator.
 */
export function runInTransaction<T>(context: TransactionContext, fn: () => T): T {
  return transactionStorage.run(context, fn);
}

/**
 * Generate a unique transaction ID for logging.
 */
export function generateTransactionId(): string {
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}
