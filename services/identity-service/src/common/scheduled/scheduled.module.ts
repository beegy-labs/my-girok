import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { DatabaseModule } from '../../database';

/**
 * Scheduled Module
 *
 * Contains scheduled jobs for background processing:
 * - Cleanup service for expired records
 *
 * Requires ScheduleModule to be imported in AppModule.
 */
@Module({
  imports: [DatabaseModule],
  providers: [CleanupService],
  exports: [CleanupService],
})
export class ScheduledModule {}
