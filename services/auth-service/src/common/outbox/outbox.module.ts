import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';
import { OutboxPublisherJob } from './outbox-publisher.job';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [OutboxService, OutboxPublisherJob],
  exports: [OutboxService],
})
export class OutboxModule {}
