import { Module, forwardRef } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma';
import { AuditModule } from '../audit/audit.module';

/**
 * Webhook Module
 * Handles SES event notifications via SNS webhooks
 */
@Module({
  imports: [PrismaModule, forwardRef(() => AuditModule)],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
