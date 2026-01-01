import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DsrDeadlineJob } from './dsr-deadline.job';
import { ConsentExpirationJob } from './consent-expiration.job';

/**
 * Jobs Module for legal-service
 *
 * Provides scheduled jobs for:
 * - DSR deadline monitoring (GDPR compliance)
 * - Consent expiration tracking
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [DsrDeadlineJob, ConsentExpirationJob],
  exports: [DsrDeadlineJob, ConsentExpirationJob],
})
export class JobsModule {}
