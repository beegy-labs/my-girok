import { Module } from '@nestjs/common';
import { DsrRequestsController } from './dsr-requests.controller';
import { DsrRequestsService } from './dsr-requests.service';

@Module({
  controllers: [DsrRequestsController],
  providers: [DsrRequestsService],
  exports: [DsrRequestsService],
})
export class DsrRequestsModule {}
