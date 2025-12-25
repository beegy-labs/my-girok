import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate Limiting (SECURITY.md: 100 req/min for public endpoints)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute (default for public endpoints)
      },
    ]),
    DatabaseModule,
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
