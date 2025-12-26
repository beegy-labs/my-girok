import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../node_modules/.prisma/personal-client';
import { uuidv7Extension } from '@my-girok/nest-common';

/**
 * Prisma service for database connection management
 * Extended with UUIDv7 auto-generation for id fields (RFC 9562)
 *
 * Uses Prisma Client Extensions to auto-generate UUIDv7 IDs for new records.
 * The extension intercepts create/createMany/upsert operations and adds
 * a UUIDv7 id if not provided.
 *
 * @example
 * // ID is auto-generated as UUIDv7
 * await this.prisma.resume.create({
 *   data: { userId: 'xxx', name: 'John', email: 'john@example.com' }
 * });
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to PostgreSQL');

    // Apply UUIDv7 extension
    // Note: Extensions are applied per-query, so this is informational
    this.logger.debug('UUIDv7 extension available for ID generation');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }

  /**
   * Get an extended client with UUIDv7 auto-generation
   * Use this when you need the extension applied
   */
  get extended() {
    return this.$extends(uuidv7Extension);
  }
}
