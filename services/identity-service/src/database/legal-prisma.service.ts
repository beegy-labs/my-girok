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
   * Uses Prisma's typed methods to prevent SQL injection
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production environment');
    }

    // Use Prisma's deleteMany for type-safe table cleanup
    // Order matters due to foreign key constraints
    await this.dsrRequestLog.deleteMany();
    await this.dsrRequest.deleteMany();
    await this.consentLog.deleteMany();
    await this.consent.deleteMany();
    await this.lawRegistry.deleteMany();
    await this.legalDocument.deleteMany();
    await this.outboxEvent.deleteMany();

    this.logger.log('Legal database cleaned (test mode)');
  }
}
