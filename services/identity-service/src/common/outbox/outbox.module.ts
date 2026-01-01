import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { DlqService } from './dlq.service';

@Module({
  providers: [OutboxService, DlqService],
  exports: [OutboxService, DlqService],
})
export class OutboxModule {}
