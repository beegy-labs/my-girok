import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from '@my-girok/nest-common';
import { ClickHouseModule } from './shared/clickhouse/clickhouse.module';
import { AuditModule } from './audit/audit.module';
import { RetentionModule } from './retention/retention.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    ClickHouseModule,
    AuditModule,
    RetentionModule,
  ],
})
export class AppModule {}
