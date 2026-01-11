/**
 * Minimal PrismaClient type declaration for nest-common.
 *
 * This file provides a minimal type declaration for @prisma/client
 * so that nest-common can compile without requiring prisma generate.
 * The actual PrismaClient implementation comes from each service's
 * generated Prisma client.
 */

declare module '@prisma/client' {
  /**
   * Base PrismaClient interface with common methods.
   * This is a minimal type that will be overridden by the actual
   * generated PrismaClient in each service.
   */
  export interface PrismaClient {
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction<T>(
      fn: (
        tx: Omit<
          PrismaClient,
          '$connect' | '$disconnect' | '$transaction' | '$on' | '$use' | '$extends'
        >,
      ) => Promise<T>,
      options?: { maxWait?: number; timeout?: number; isolationLevel?: string },
    ): Promise<T>;
    $on(event: string, callback: (event: unknown) => void): void;
    $use(
      middleware: (
        params: unknown,
        next: (params: unknown) => Promise<unknown>,
      ) => Promise<unknown>,
    ): void;
    $extends: unknown;
    $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
    $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
    $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
    $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  }
}
