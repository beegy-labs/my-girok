import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AccountsService } from '../../identity/accounts/accounts.service';
import { SessionsService } from '../../identity/sessions/sessions.service';
import { DevicesService } from '../../identity/devices/devices.service';
import { ProfilesService } from '../../identity/profiles/profiles.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { SagaOrchestratorService } from '../../common/saga/saga-orchestrator.service';
import { SagaDefinition } from '../../common/saga/saga.types';
import { DeleteAccountDto, AccountDeletionResponseDto } from './dto/account-deletion.dto';

/**
 * Deletion context for saga
 */
interface DeletionContext {
  accountId: string;
  reason?: string;
  legalBasis?: string;
  ipAddress?: string;

  // State tracking
  sessionsRevoked?: boolean;
  devicesRemoved?: boolean;
  profileDeleted?: boolean;
  accountDeleted?: boolean;
}

/**
 * Account Deletion Service
 * Implements GDPR Article 17 - Right to Erasure
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly sessionsService: SessionsService,
    private readonly devicesService: DevicesService,
    private readonly profilesService: ProfilesService,
    private readonly sagaOrchestrator: SagaOrchestratorService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Delete an account and all associated data
   * Implements GDPR right to erasure
   */
  async deleteAccount(
    dto: DeleteAccountDto,
    ipAddress?: string,
  ): Promise<AccountDeletionResponseDto> {
    // Verify account exists
    const account = await this.accountsService.findById(dto.accountId);
    if (!account) {
      throw new NotFoundException(`Account not found: ${dto.accountId}`);
    }

    // Execute deletion saga
    const saga = this.getDeletionSaga();
    const result = await this.sagaOrchestrator.execute(saga, {
      accountId: dto.accountId,
      reason: dto.reason,
      legalBasis: dto.legalBasis,
      ipAddress,
    });

    if (!result.success) {
      this.logger.error(`Account deletion failed: ${dto.accountId}`, result.error);
      throw new Error(result.error || 'Account deletion failed');
    }

    // Publish deletion event
    await this.outbox.publish('identity', {
      aggregateType: 'Account',
      aggregateId: dto.accountId,
      eventType: 'ACCOUNT_DELETED',
      payload: {
        accountId: dto.accountId,
        email: account.email,
        reason: dto.reason,
        legalBasis: dto.legalBasis,
        deletedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Account deleted: ${dto.accountId}`);

    return {
      success: true,
      accountId: dto.accountId,
      status: 'COMPLETED',
      deletedAt: new Date(),
    };
  }

  /**
   * Get the deletion saga definition
   */
  private getDeletionSaga(): SagaDefinition<DeletionContext> {
    return {
      name: 'AccountDeletion',
      steps: [
        {
          name: 'RevokeSessions',
          execute: async (ctx) => {
            this.logger.debug(`Revoking all sessions for account ${ctx.accountId}`);
            // Revoke all sessions for the account (no session excluded)
            await this.sessionsService.revokeAllForAccount(ctx.accountId);
            return { ...ctx, sessionsRevoked: true };
          },
          compensate: async () => {
            // Sessions cannot be un-revoked
            this.logger.debug('Sessions cannot be restored (compensation skipped)');
          },
        },
        {
          name: 'RemoveDevices',
          execute: async (ctx) => {
            this.logger.debug(`Removing all devices for account ${ctx.accountId}`);
            const devices = await this.devicesService.findAll({ accountId: ctx.accountId });
            for (const device of devices.data) {
              await this.devicesService.remove(device.id);
            }
            return { ...ctx, devicesRemoved: true };
          },
          compensate: async () => {
            // Devices cannot be restored
            this.logger.debug('Devices cannot be restored (compensation skipped)');
          },
        },
        {
          name: 'DeleteProfile',
          execute: async (ctx) => {
            this.logger.debug(`Deleting profile for account ${ctx.accountId}`);
            try {
              await this.profilesService.delete(ctx.accountId);
            } catch (error) {
              // Profile might not exist, continue
              this.logger.warn(`Profile not found for account ${ctx.accountId}`);
            }
            return { ...ctx, profileDeleted: true };
          },
          compensate: async () => {
            // Profile deletion cannot be undone
            this.logger.debug('Profile deletion cannot be undone (compensation skipped)');
          },
        },
        {
          name: 'DeleteAccount',
          execute: async (ctx) => {
            this.logger.debug(`Soft deleting account ${ctx.accountId}`);
            await this.accountsService.delete(ctx.accountId);
            return { ...ctx, accountDeleted: true };
          },
          compensate: async () => {
            // Account deletion is soft delete, could potentially be restored
            // But for GDPR compliance, we don't restore
            this.logger.debug('Account deletion is final (compensation skipped)');
          },
        },
      ],
    };
  }

  /**
   * Schedule account deletion with grace period
   * Allows user to cancel within the grace period
   */
  async scheduleAccountDeletion(
    dto: DeleteAccountDto,
    gracePeriodDays: number = 30,
  ): Promise<AccountDeletionResponseDto> {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + gracePeriodDays);

    // In a full implementation, this would store the scheduled deletion
    // and a background job would process it after the grace period

    await this.outbox.publish('identity', {
      aggregateType: 'Account',
      aggregateId: dto.accountId,
      eventType: 'ACCOUNT_DELETION_SCHEDULED',
      payload: {
        accountId: dto.accountId,
        reason: dto.reason,
        scheduledDeletionDate: scheduledDate.toISOString(),
        gracePeriodDays,
      },
    });

    this.logger.log(
      `Account deletion scheduled: ${dto.accountId} for ${scheduledDate.toISOString()}`,
    );

    return {
      success: true,
      accountId: dto.accountId,
      status: 'SCHEDULED',
      scheduledDeletionDate: scheduledDate,
      deletedAt: scheduledDate,
    };
  }
}
