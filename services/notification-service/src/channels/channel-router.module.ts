import { Module } from '@nestjs/common';
import { ChannelRouterService } from './channel-router.service';
import { InappModule } from './inapp';
import { PushModule } from './push';
import { SmsModule } from './sms';
import { EmailModule } from './email';
import { PreferencesModule } from '../preferences';
import { QuietHoursModule } from '../quiet-hours';

@Module({
  imports: [InappModule, PushModule, SmsModule, EmailModule, PreferencesModule, QuietHoursModule],
  providers: [ChannelRouterService],
  exports: [ChannelRouterService],
})
export class ChannelRouterModule {}
