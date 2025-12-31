import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '.prisma/identity-legal-client';

@Injectable()
export class LegalPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LegalPrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to Legal database...');
    await this.$connect();
    this.logger.log('Connected to Legal database');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from Legal database...');
    await this.$disconnect();
    this.logger.log('Disconnected from Legal database');
  }

  /**
   * Clean database for testing purposes
   * WARNING: Only use in test environment
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production environment');
    }

    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations' && name !== 'goose_db_version')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  }
}
