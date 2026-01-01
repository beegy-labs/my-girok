import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { DatabaseModule } from '../../database/database.module';
import { CacheModule } from '../../common/cache';
import { OutboxModule } from '../../common/outbox';

/**
 * Accounts Module
 *
 * Provides account management functionality:
 * - CRUD operations for accounts
 * - MFA (Multi-Factor Authentication) support
 * - Password management with history
 * - Email verification
 * - Account locking on failed attempts
 */
@Module({
  imports: [DatabaseModule, CacheModule, OutboxModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
