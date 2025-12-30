import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule, PinoLoggerModule, OtelModule } from '@my-girok/nest-common';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { ClickHouseModule } from './shared/clickhouse/clickhouse.module';
import { AuditModule } from './audit/audit.module';
import { AdminAuditModule } from './admin-audit/admin-audit.module';
import { RetentionModule } from './retention/retention.module';
import configuration from './config/configuration';

@Module({
  imports: [
    OtelModule.forRoot(),
    PinoLoggerModule.forRoot({
      serviceName: 'audit-service',
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
    ScheduleModule.forRoot(),
    HealthModule,
    ClickHouseModule,
    AuditModule,
    AdminAuditModule,
    RetentionModule,
  ],
})
export class AppModule {}
