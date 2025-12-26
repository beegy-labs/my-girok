import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../node_modules/.prisma/auth-client';
import { uuidv7Extension } from '@my-girok/nest-common';

/**
 * Prisma service for database connection management
 * Extended with UUIDv7 auto-generation for id fields
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // Apply UUIDv7 extension for auto-generating IDs
    return new PrismaClient().$extends(uuidv7Extension) as this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
