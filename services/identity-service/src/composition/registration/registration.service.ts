import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AccountsService } from '../../identity/accounts/accounts.service';
import { ProfilesService } from '../../identity/profiles/profiles.service';
import { SagaOrchestratorService } from '../../common/saga/saga-orchestrator.service';
import { OutboxService, OutboxEvent } from '../../common/outbox/outbox.service';
import { SagaDefinition } from '../../common/saga/saga.types';
import { RegisterUserDto, RegistrationResponseDto } from './dto/registration.dto';

/**
 * Registration context for saga
 */
interface RegistrationContext {
  // Input
  dto: RegisterUserDto;
  ipAddress?: string;
  userAgent?: string;

  // Created resources
  accountId?: string;
  profileId?: string;
  outboxEventId?: string;

  // Result
  account?: {
    id: string;
    email: string;
    createdAt: Date;
  };
}

/**
 * Registration Service
 * Orchestrates user registration across identity domain
 *
 * Note: Consent handling is done by legal-service separately.
 * Frontend should call legal-service after registration to record consents.
 */
@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly profilesService: ProfilesService,
    private readonly sagaOrchestrator: SagaOrchestratorService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Register a new user
   * Uses saga pattern for distributed transaction
   */
  async register(
    dto: RegisterUserDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RegistrationResponseDto> {
    // Execute registration saga
    const saga = this.getRegistrationSaga();
    const result = await this.sagaOrchestrator.execute(saga, {
      dto,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      throw new BadRequestException(result.error || 'Registration failed');
    }

    const ctx = result.context;
    this.logger.log(`User registered: ${dto.email} [${ctx.accountId}]`);

    return {
      success: true,
      accountId: ctx.accountId!,
      email: dto.email,
      displayName: dto.displayName,
      emailVerificationRequired: true,
      createdAt: ctx.account?.createdAt || new Date(),
    };
  }

  /**
   * Get the registration saga definition
   */
  private getRegistrationSaga(): SagaDefinition<RegistrationContext> {
    return {
      name: 'UserRegistration',
      steps: [
        {
          name: 'CreateAccount',
          execute: async (ctx) => {
            this.logger.debug('Creating account...');
            // Generate username from email (part before @)
            const username = this.generateUsername(ctx.dto.email);
            const account = await this.accountsService.create({
              email: ctx.dto.email,
              username,
              password: ctx.dto.password,
              countryCode: ctx.dto.countryCode,
              locale: ctx.dto.locale,
              timezone: ctx.dto.timezone,
            });
            return {
              ...ctx,
              accountId: account.id,
              account: {
                id: account.id,
                email: account.email,
                createdAt: account.createdAt,
              },
            };
          },
          compensate: async (ctx) => {
            if (ctx.accountId) {
              this.logger.debug(`Compensating: Deleting account ${ctx.accountId}`);
              await this.accountsService.delete(ctx.accountId);
            }
          },
          retryConfig: {
            maxRetries: 2,
            delayMs: 500,
            backoffMultiplier: 2,
          },
        },
        {
          name: 'CreateProfile',
          execute: async (ctx) => {
            if (!ctx.accountId) {
              throw new Error('Account ID is required');
            }
            this.logger.debug('Creating profile...');
            const profile = await this.profilesService.create(ctx.accountId, ctx.dto.displayName);
            return { ...ctx, profileId: profile.id };
          },
          compensate: async (ctx) => {
            if (ctx.accountId) {
              this.logger.debug(`Compensating: Deleting profile for account ${ctx.accountId}`);
              try {
                await this.profilesService.delete(ctx.accountId);
              } catch {
                // Profile might not exist, ignore
              }
            }
          },
        },
        {
          name: 'PublishRegistrationEvent',
          execute: async (ctx) => {
            if (!ctx.accountId) {
              throw new Error('Account ID is required');
            }
            this.logger.debug('Publishing registration event...');
            const outboxEvent: OutboxEvent = await this.outbox.publishEvent({
              aggregateType: 'Account',
              aggregateId: ctx.accountId,
              eventType: 'USER_REGISTERED',
              payload: {
                accountId: ctx.accountId,
                email: ctx.dto.email,
                displayName: ctx.dto.displayName,
                countryCode: ctx.dto.countryCode,
              },
            });
            return { ...ctx, outboxEventId: outboxEvent.id };
          },
          compensate: async (_ctx) => {
            this.logger.debug('Skipping outbox event compensation (handled by event consumers)');
          },
          retryConfig: {
            maxRetries: 3,
            delayMs: 1000,
            backoffMultiplier: 2,
          },
        },
      ],
    };
  }

  /**
   * Generate a username from email address
   */
  private generateUsername(email: string): string {
    const base = email.split('@')[0];
    const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${cleaned}_${suffix}`;
  }
}
