import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { ChannelRouterModule } from '../channels';
import { PreferencesModule } from '../preferences';
import { DeviceTokenModule } from '../device-token';
import { QuietHoursModule } from '../quiet-hours';
import { AuditModule } from '../audit';
import { InappModule } from '../channels/inapp';

@Module({
  imports: [
    ChannelRouterModule,
    PreferencesModule,
    DeviceTokenModule,
    QuietHoursModule,
    AuditModule,
    InappModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
