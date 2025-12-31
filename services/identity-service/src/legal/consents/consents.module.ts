import { Module } from '@nestjs/common';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';

/**
 * Consents Module
 *
 * Handles consent management including:
 * - Consent granting with audit trail
 * - Consent withdrawal
 * - Consent status checking
 * - Audit log management
 */
@Module({
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
