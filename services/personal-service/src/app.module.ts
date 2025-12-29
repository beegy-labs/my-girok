import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import {
  JwtAuthGuard,
  JwtStrategy,
  HttpExceptionFilter,
  HealthModule,
  PinoLoggerModule,
} from '@my-girok/nest-common';

import { PrismaService } from './database/prisma.service';
import { ResumeModule } from './resume/resume.module';
import { ShareModule } from './share/share.module';
import { UserPreferencesModule } from './user-preferences/user-preferences.module';
import configuration from './config/configuration';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      serviceName: 'personal-service',
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
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is required but not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m') as any,
          },
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ResumeModule,
    ShareModule,
    HealthModule,
    UserPreferencesModule,
  ],
  providers: [
    PrismaService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
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
