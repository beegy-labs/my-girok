import { Module, Global } from '@nestjs/common';
import { SessionGuard } from './guards/session.guard';
import { ClickHouseService } from './services/clickhouse.service';
import { PrismaAuthzService } from './services/prisma-authz.service';
import { GeoIPService } from './services/geoip.service';

@Global()
@Module({
  providers: [SessionGuard, ClickHouseService, PrismaAuthzService, GeoIPService],
  exports: [SessionGuard, ClickHouseService, PrismaAuthzService, GeoIPService],
})
export class CommonModule {}
