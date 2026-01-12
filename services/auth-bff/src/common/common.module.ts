import { Module, Global } from '@nestjs/common';
import { SessionGuard } from './guards/session.guard';
import { AnalyticsGrpcClient } from '../grpc-clients/analytics.client';
import { AuthorizationGrpcClient } from '../grpc-clients/authorization.client';
import { GeoIPService } from './services/geoip.service';

@Global()
@Module({
  providers: [SessionGuard, AnalyticsGrpcClient, AuthorizationGrpcClient, GeoIPService],
  exports: [SessionGuard, AnalyticsGrpcClient, AuthorizationGrpcClient, GeoIPService],
})
export class CommonModule {}
