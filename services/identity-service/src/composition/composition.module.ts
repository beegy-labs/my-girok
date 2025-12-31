import { Module } from '@nestjs/common';
import { RegistrationService } from './registration/registration.service';
import { RegistrationController } from './registration/registration.controller';
import { AccountDeletionService } from './account-deletion/account-deletion.service';
import { AccountDeletionController } from './account-deletion/account-deletion.controller';
import { IdentityModule } from '../identity/identity.module';
import { AuthModule } from '../auth/auth.module';
import { LegalModule } from '../legal/legal.module';
import { SagaModule } from '../common/saga/saga.module';
import { MessagingModule } from '../common/messaging/messaging.module';

/**
 * Composition Module
 * Provides service composition and orchestration for complex workflows
 *
 * This module combines functionality from multiple domains (Identity, Auth, Legal)
 * to provide cohesive user-facing operations like:
 * - User registration (account + profile + consents)
 * - Account deletion (GDPR right to erasure)
 * - Account migration
 */
@Module({
  imports: [IdentityModule, AuthModule, LegalModule, SagaModule, MessagingModule],
  controllers: [RegistrationController, AccountDeletionController],
  providers: [RegistrationService, AccountDeletionService],
  exports: [RegistrationService, AccountDeletionService],
})
export class CompositionModule {}
