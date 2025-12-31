import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '.prisma/identity-client';

@Injectable()
export class IdentityPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdentityPrismaService.name);

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
    this.logger.log('Connecting to Identity database...');
    await this.$connect();
    this.logger.log('Connected to Identity database');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from Identity database...');
    await this.$disconnect();
    this.logger.log('Disconnected from Identity database');
  }

  /**
   * Clean database for testing purposes
   * WARNING: Only use in test environment
   * Uses Prisma's typed methods to prevent SQL injection
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production environment');
    }

    // Use Prisma's deleteMany for type-safe table cleanup
    // Order matters due to foreign key constraints
    await this.session.deleteMany();
    await this.device.deleteMany();
    await this.profile.deleteMany();
    await this.outboxEvent.deleteMany();
    await this.account.deleteMany();

    this.logger.log('Identity database cleaned (test mode)');
  }
}
