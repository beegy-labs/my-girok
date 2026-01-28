import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { DeviceTokenModule } from '../../device-token';

@Module({
  imports: [DeviceTokenModule],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
