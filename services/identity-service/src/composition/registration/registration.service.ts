import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AccountsService } from '../../identity/accounts/accounts.service';
import { ProfilesService } from '../../identity/profiles/profiles.service';
import { ConsentsService } from '../../legal/consents/consents.service';
import { LawRegistryService } from '../../legal/law-registry/law-registry.service';
import { SagaOrchestratorService } from '../../common/saga/saga-orchestrator.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { SagaDefinition } from '../../common/saga/saga.types';
import { RegisterUserDto, RegistrationResponseDto } from './dto/registration.dto';
import { ConsentType } from '.prisma/identity-legal-client';

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
  consentIds?: string[];

  // Result
  account?: {
    id: string;
    email: string;
    createdAt: Date;
  };
}

/**
 * Registration Service
 * Orchestrates user registration across multiple domains
 */
@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly profilesService: ProfilesService,
    private readonly consentsService: ConsentsService,
    private readonly lawRegistryService: LawRegistryService,
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
    // Validate required consents for the country
    await this.validateRequiredConsents(dto.countryCode, dto.consents);

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

    // Publish registration event
    await this.outbox.publish('identity', {
      aggregateType: 'Account',
      aggregateId: ctx.accountId!,
      eventType: 'USER_REGISTERED',
      payload: {
        accountId: ctx.accountId,
        email: dto.email,
        displayName: dto.displayName,
        countryCode: dto.countryCode,
        consents: dto.consents.map((c) => c.consentType),
      },
    });

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
   * Validate that all required consents for the country are provided
   */
  private async validateRequiredConsents(
    countryCode: string,
    consents: { consentType: ConsentType }[],
  ): Promise<void> {
    try {
      const requirements = await this.lawRegistryService.getCountryConsentRequirements(countryCode);
      const providedTypes = consents.map((c) => c.consentType);

      // Filter for required consents only
      const requiredConsents = requirements.filter((r) => r.isRequired).map((r) => r.consentType);

      const missingRequired = requiredConsents.filter(
        (required) => !providedTypes.includes(required),
      );

      if (missingRequired.length > 0) {
        throw new BadRequestException(`Missing required consents: ${missingRequired.join(', ')}`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // If law registry doesn't have data for this country, use defaults
      this.logger.warn(`No law registry data for country ${countryCode}, using defaults`);

      const requiredDefaults: ConsentType[] = [
        ConsentType.TERMS_OF_SERVICE,
        ConsentType.PRIVACY_POLICY,
      ];

      const providedTypes = consents.map((c) => c.consentType);
      const missingRequired = requiredDefaults.filter(
        (required) => !providedTypes.includes(required),
      );

      if (missingRequired.length > 0) {
        throw new BadRequestException(`Missing required consents: ${missingRequired.join(', ')}`);
      }
    }
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
          name: 'GrantConsents',
          execute: async (ctx) => {
            if (!ctx.accountId) {
              throw new Error('Account ID is required');
            }
            this.logger.debug('Granting consents...');
            const consents = await this.consentsService.grantBulkConsents(
              ctx.accountId,
              ctx.dto.countryCode,
              ctx.dto.consents,
              ctx.ipAddress,
              ctx.userAgent,
            );
            return { ...ctx, consentIds: consents.map((c) => c.id) };
          },
          compensate: async (_ctx) => {
            // Consents are not deleted for audit trail purposes
            // They will be cleaned up when the account is deleted
            this.logger.debug('Skipping consent compensation (audit trail preserved)');
          },
        },
      ],
    };
  }

  /**
   * Generate a username from email address
   * Takes the part before @ and appends cryptographically secure random suffix for uniqueness
   */
  private generateUsername(email: string): string {
    const base = email.split('@')[0];
    // Clean up and ensure valid username characters
    const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
    // Add cryptographically secure random suffix for uniqueness
    // Using crypto.randomBytes instead of Math.random for security
    const suffix = crypto.randomBytes(3).toString('hex'); // 6 hex chars
    return `${cleaned}_${suffix}`;
  }
}
