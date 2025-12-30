import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { HealthModule, PinoLoggerModule, OtelModule } from '@my-girok/nest-common';
import { ClickHouseModule } from './shared/clickhouse/clickhouse.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { BehaviorModule } from './behavior/behavior.module';
import { FunnelModule } from './funnel/funnel.module';
import { SessionModule } from './session/session.module';
import configuration from './config/configuration';

@Module({
  imports: [
    OtelModule.forRoot(),
    PinoLoggerModule.forRoot({
      serviceName: 'analytics-service',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const host = configService.get('valkey.host');
        const port = configService.get('valkey.port');
        const password = configService.get('valkey.password');
        const db = configService.get('valkey.db');

        // Build Redis URL: redis://[:password@]host[:port][/db]
        const authPart = password ? `:${password}@` : '';
        const redisUrl = `redis://${authPart}${host}:${port}/${db}`;

        return {
          stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
          ttl: 300000, // 5 minutes default
        };
      },
      inject: [ConfigService],
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
