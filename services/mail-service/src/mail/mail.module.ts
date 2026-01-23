import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { TemplateModule } from '../templates';
import { KafkaModule } from '../kafka';

@Module({
  imports: [TemplateModule, KafkaModule],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
