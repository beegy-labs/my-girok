import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';

import { PAGINATION, RETRY } from '../common/constants/index.js';

/**
 * Prisma Extension for UUIDv7 auto-generation
 * Automatically generates UUIDv7 IDs for new records
 */
export function createUuidv7Extension<T>(client: T): T {
  return (client as { $extends: (args: unknown) => T }).$extends({
    query: {
      $allModels: {
        async create({
          args,
          query,
        }: {
          args: { data: Record<string, unknown> };
          query: (args: unknown) => Promise<unknown>;
        }) {
          if (!args.data.id) {
            args.data.id = ID.generate();
          }
          return query(args);
        },
        async createMany({
          args,
          query,
        }: {
          args: { data: Record<string, unknown>[] };
          query: (args: unknown) => Promise<unknown>;
        }) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((item) => ({
              ...item,
              id: item.id || ID.generate(),
            }));
          }
          return query(args);
        },
      },
    },
  });
}

/**
 * Base Prisma Service with common functionality
 * Handles lifecycle events and provides utility methods
 */
@Injectable()
export abstract class BasePrismaService implements OnModuleInit, OnModuleDestroy {
  protected readonly logger: Logger;
  protected abstract readonly serviceName: string;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  abstract onModuleInit(): Promise<void>;
  abstract onModuleDestroy(): Promise<void>;

  /**
   * Connect to database with retry logic
   */
  protected async connectWithRetry(
    connectFn: () => Promise<void>,
    maxRetries: number = RETRY.MAX_RETRIES,
    delayMs: number = RETRY.DELAY_MS,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await connectFn();
        this.logger.log(`${this.serviceName} connected successfully`);
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to connect to ${this.serviceName} (attempt ${attempt}/${maxRetries}): ${errorMessage}`,
        );
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(delayMs * attempt);
      }
    }
  }

  /**
   * Delay helper for retry logic
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Re-export constants for backward compatibility
// Deprecated: Use PAGINATION and RETRY from common/constants directly
export const PAGINATION_DEFAULTS = {
  PAGE: PAGINATION.DEFAULT_PAGE,
  LIMIT: PAGINATION.DEFAULT_LIMIT,
  MAX_LIMIT: PAGINATION.MAX_LIMIT,
} as const;

export const RETRY_DEFAULTS = {
  MAX_RETRIES: RETRY.MAX_RETRIES,
  DELAY_MS: RETRY.DELAY_MS,
  BACKOFF_MULTIPLIER: RETRY.BACKOFF_MULTIPLIER,
} as const;
