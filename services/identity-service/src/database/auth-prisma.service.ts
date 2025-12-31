import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '.prisma/identity-auth-client';

@Injectable()
export class AuthPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthPrismaService.name);

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
    this.logger.log('Connecting to Auth database...');
    await this.$connect();
    this.logger.log('Connected to Auth database');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from Auth database...');
    await this.$disconnect();
    this.logger.log('Disconnected from Auth database');
  }

  /**
   * Whitelist of tables that can be truncated in test environment
   * This prevents SQL injection by only allowing known table names
   */
  private static readonly ALLOWED_TABLES = [
    'roles',
    'permissions',
    'role_permissions',
    'operators',
    'operator_permissions',
    'operator_invitations',
    'sanctions',
    'sanction_notifications',
    'outbox_events',
  ] as const;

  /**
   * Clean database for testing purposes
   * WARNING: Only use in test environment
   * Uses whitelist approach to prevent SQL injection
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production environment');
    }

    // Use whitelist approach instead of dynamic table names to prevent SQL injection
    for (const table of AuthPrismaService.ALLOWED_TABLES) {
      await this.$executeRaw`TRUNCATE TABLE "public".${this.escapeIdentifier(table)} CASCADE`;
    }

    this.logger.log('Auth database cleaned (test mode)');
  }

  /**
   * Escape SQL identifier using Prisma's raw query mechanism
   */
  private escapeIdentifier(name: string): string {
    // Validate against whitelist - only allow alphanumeric and underscore
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid identifier: ${name}`);
    }
    return `"${name}"`;
  }
}
