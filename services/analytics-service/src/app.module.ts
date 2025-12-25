import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from '@my-girok/nest-common';
import { ClickHouseModule } from './shared/clickhouse/clickhouse.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { BehaviorModule } from './behavior/behavior.module';
import { FunnelModule } from './funnel/funnel.module';
import { SessionModule } from './session/session.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'events',
        ttl: 60000,
        limit: 100,
      },
    ]),
    HealthModule,
    ClickHouseModule,
    IngestionModule,
    BehaviorModule,
    FunnelModule,
    SessionModule,
  ],
})
export class AppModule {}
