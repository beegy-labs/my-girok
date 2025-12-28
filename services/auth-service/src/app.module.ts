import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { HttpExceptionFilter, HealthModule } from '@my-girok/nest-common';
import { UnifiedAuthGuard } from './auth/guards';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OAuthConfigModule } from './oauth-config/oauth-config.module';
import { LegalModule } from './legal/legal.module';
import { AdminModule } from './admin/admin.module';
import { ServicesModule } from './services/services.module';
import { OperatorModule } from './operator/operator.module';
import { CommonModule } from './common/common.module';
import configuration from './config/configuration';

@Module({
  imports: [
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
    // Rate Limiting (SECURITY.md: 100 req/min for public endpoints)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute (default for public endpoints)
      },
    ]),
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    OAuthConfigModule,
    LegalModule,
    AdminModule,
    ServicesModule,
    OperatorModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UnifiedAuthGuard,
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
