import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { SagaDefinition } from '../saga.types';
import { SagaOrchestratorService } from '../saga-orchestrator.service';
import { AccountsService } from '../../../identity/accounts/accounts.service';
import { ProfilesService } from '../../../identity/profiles/profiles.service';
import { ConsentsService } from '../../../legal/consents/consents.service';
import { ConsentType } from '.prisma/identity-legal-client';

/**
 * Registration context
 */
export interface RegistrationContext {
  // Input
  email: string;
  password: string;
  displayName: string;
  countryCode: string;
  consents: {
    consentType: ConsentType;
    documentId?: string;
    documentVersion?: string;
  }[];
  ipAddress?: string;
  userAgent?: string;

  // Created resources (for compensation)
  accountId?: string;
  profileId?: string;
  consentIds?: string[];
}

/**
 * Registration Saga
 * Orchestrates account registration across multiple services
 *
 * Steps:
 * 1. Create account
 * 2. Create profile
 * 3. Grant consents
 *
 * Compensation:
 * - If step 3 fails: Delete consents, delete profile, delete account
 * - If step 2 fails: Delete profile, delete account
 * - If step 1 fails: Delete account
 */
@Injectable()
export class RegistrationSaga {
  private readonly logger = new Logger(RegistrationSaga.name);

  constructor(
    private readonly sagaOrchestrator: SagaOrchestratorService,
    private readonly accountsService: AccountsService,
    private readonly profilesService: ProfilesService,
    private readonly consentsService: ConsentsService,
  ) {}

  /**
   * Execute the registration saga
   */
  async execute(context: RegistrationContext): Promise<{
    success: boolean;
    accountId?: string;
    error?: string;
  }> {
    const definition = this.getDefinition();
    const result = await this.sagaOrchestrator.execute(definition, context);

    if (result.success) {
      return {
        success: true,
        accountId: result.context.accountId,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * Get saga definition
   */
  private getDefinition(): SagaDefinition<RegistrationContext> {
    return {
      name: 'UserRegistration',
      steps: [
        {
          name: 'CreateAccount',
          execute: async (ctx) => {
            this.logger.debug('Creating account...');
            // Generate username from email (part before @)
            const username = this.generateUsername(ctx.email);
            const account = await this.accountsService.create({
              email: ctx.email,
              username,
              password: ctx.password,
            });
            return { ...ctx, accountId: account.id };
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
            const profile = await this.profilesService.create(ctx.accountId, ctx.displayName);
            return { ...ctx, profileId: profile.id };
          },
          compensate: async (ctx) => {
            if (ctx.accountId) {
              this.logger.debug(`Compensating: Deleting profile for account ${ctx.accountId}`);
              await this.profilesService.delete(ctx.accountId);
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
              ctx.countryCode,
              ctx.consents,
              ctx.ipAddress,
              ctx.userAgent,
            );
            return { ...ctx, consentIds: consents.map((c) => c.id) };
          },
          compensate: async (ctx) => {
            if (ctx.consentIds && ctx.consentIds.length > 0) {
              this.logger.debug(`Compensating: Withdrawing ${ctx.consentIds.length} consents`);
              await this.consentsService.withdrawBulkConsents(
                ctx.consentIds,
                'Registration rollback - saga compensation',
                ctx.ipAddress,
                ctx.userAgent,
              );
            }
          },
        },
      ],
    };
  }

  /**
   * Generate a username from email address
   * Takes the part before @ and appends cryptographically secure random suffix
   */
  private generateUsername(email: string): string {
    const base = email.split('@')[0];
    // Clean up and ensure valid username characters, remove consecutive underscores
    const cleaned = base
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 20);
    // Add cryptographically secure random suffix for uniqueness
    const randomBytes = crypto.randomBytes(3);
    const suffix = randomBytes.toString('hex'); // 6 hex characters
    return `${cleaned}_${suffix}`;
  }
}
