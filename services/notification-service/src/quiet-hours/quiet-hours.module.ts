import { Module } from '@nestjs/common';
import { QuietHoursService } from './quiet-hours.service';

@Module({
  providers: [QuietHoursService],
  exports: [QuietHoursService],
})
export class QuietHoursModule {}
