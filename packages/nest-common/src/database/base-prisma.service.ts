import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

/**
 * Base Prisma Service
 * Provides common lifecycle hooks for database connection management
 *
 * Each service should extend this and provide its own PrismaClient
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { BasePrismaService } from '@my-girok/nest-common';
 *
 * @Injectable()
 * export class PrismaService extends BasePrismaService(PrismaClient) {}
 * ```
 */
export function BasePrismaService<T extends new (...args: any[]) => any>(
  PrismaClientClass: T,
) {
  @Injectable()
  class PrismaServiceHost
    extends PrismaClientClass
    implements OnModuleInit, OnModuleDestroy
  {
    async onModuleInit() {
      await this.$connect();
    }

    async onModuleDestroy() {
      await this.$disconnect();
    }
  }

  return PrismaServiceHost;
}

/**
 * Alternative: Simple Prisma Service Mixin
 * If the function-based approach doesn't work, use this class-based mixin
 */
@Injectable()
export abstract class AbstractPrismaService implements OnModuleInit, OnModuleDestroy {
  abstract $connect(): Promise<void>;
  abstract $disconnect(): Promise<void>;

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
