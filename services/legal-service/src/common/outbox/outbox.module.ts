import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';
import { OutboxPublisherJob } from './outbox-publisher.job';

/**
 * Outbox Module for legal-service
 *
 * Provides the Transactional Outbox pattern for reliable event publishing.
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [OutboxService, OutboxPublisherJob],
  exports: [OutboxService],
})
export class OutboxModule {}
