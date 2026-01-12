import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { HttpExceptionFilter, PinoLoggerModule, OtelModule } from '@my-girok/nest-common';

import configuration from './config/configuration';
import { SessionModule } from './session/session.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { OperatorModule } from './operator/operator.module';
import { OAuthModule } from './oauth/oauth.module';
import { GrpcClientsModule } from './grpc-clients/grpc-clients.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { SessionRecordingsModule } from './session-recordings/session-recordings.module';
import { AnalyticsModule } from './admin/analytics/analytics.module';
import { AuthorizationModule as AdminAuthorizationModule } from './admin/authorization/authorization.module';
import { TeamsModule } from './admin/teams/teams.module';
import { SessionGuard } from './common/guards/session.guard';

@Module({
  imports: [
    OtelModule.forRoot(),
    PinoLoggerModule.forRoot({
      serviceName: 'auth-bff',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const host = configService.get('valkey.host');
        const port = configService.get('valkey.port');
        const password = configService.get('valkey.password');
        const db = configService.get('valkey.db');

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
        ttl: 60000,
        limit: 100,
      },
    ]),
    EventEmitterModule.forRoot(),
    SessionModule,
    CommonModule,
    GrpcClientsModule,
    UserModule,
    AdminModule,
    OperatorModule,
    OAuthModule,
    HealthModule,
    SessionRecordingsModule,
    AnalyticsModule,
    AdminAuthorizationModule,
    TeamsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
