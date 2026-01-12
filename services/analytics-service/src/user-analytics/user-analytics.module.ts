import { Module } from '@nestjs/common';
import { UserAnalyticsService } from './user-analytics.service';
import { UserAnalyticsGrpcController } from './user-analytics.grpc.controller';

@Module({
  controllers: [UserAnalyticsGrpcController],
  providers: [UserAnalyticsService],
  exports: [UserAnalyticsService],
})
export class UserAnalyticsModule {}
