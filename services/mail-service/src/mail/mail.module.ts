import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { TemplateModule } from '../templates';
import { KafkaModule } from '../kafka';
import { SesModule } from '../ses/ses.module';

@Module({
  imports: [TemplateModule, KafkaModule, SesModule],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
