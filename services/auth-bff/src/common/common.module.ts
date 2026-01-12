import { Module, Global } from '@nestjs/common';
import { SessionGuard } from './guards/session.guard';
import { AnalyticsGrpcClient } from '../grpc-clients/analytics.client';
import { AuthorizationGrpcClient } from '../grpc-clients/authorization.client';

@Global()
@Module({
  providers: [SessionGuard, AnalyticsGrpcClient, AuthorizationGrpcClient],
  exports: [SessionGuard, AnalyticsGrpcClient, AuthorizationGrpcClient],
})
export class CommonModule {}
