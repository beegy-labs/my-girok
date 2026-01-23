import { Module } from '@nestjs/common';
import { DeviceTokenService } from './device-token.service';

@Module({
  providers: [DeviceTokenService],
  exports: [DeviceTokenService],
})
export class DeviceTokenModule {}
