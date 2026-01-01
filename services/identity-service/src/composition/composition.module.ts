import { Module } from '@nestjs/common';
import { RegistrationService } from './registration/registration.service';
import { RegistrationController } from './registration/registration.controller';
import { AccountDeletionService } from './account-deletion/account-deletion.service';
import { AccountDeletionController } from './account-deletion/account-deletion.controller';
import { IdentityModule } from '../identity/identity.module';
import { SagaModule } from '../common/saga/saga.module';
import { MessagingModule } from '../common/messaging/messaging.module';

/**
 * Composition Module
 * Provides service composition and orchestration for complex workflows
 *
 * This module provides cohesive user-facing operations like:
 * - User registration (account + profile)
 * - Account deletion (GDPR right to erasure)
 * - Account migration
 *
 * Auth and Legal are handled by separate services.
 */
@Module({
  imports: [IdentityModule, SagaModule, MessagingModule],
  controllers: [RegistrationController, AccountDeletionController],
  providers: [RegistrationService, AccountDeletionService],
  exports: [RegistrationService, AccountDeletionService],
})
export class CompositionModule {}
