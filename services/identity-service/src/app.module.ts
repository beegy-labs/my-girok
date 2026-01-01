import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database';
import { CommonModule } from './common/common.module';
import { MessagingModule } from './common/messaging/messaging.module';
import { SagaModule } from './common/saga/saga.module';
import { HealthModule } from './common/health';
import { ScheduledModule } from './common/scheduled';
import { IdentityModule } from './identity/identity.module';
import { CompositionModule } from './composition/composition.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { GrpcModule } from './grpc';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
      cache: true,
    }),
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 1000,
      },
    ]),
    // Cron jobs (for sanction expiration, saga cleanup, etc.)
    ScheduleModule.forRoot(),
    DatabaseModule,
    CommonModule,
    MessagingModule,
    SagaModule,
    HealthModule,
    ScheduledModule,
    IdentityModule,
    CompositionModule,
    GrpcModule,
  ],
  controllers: [],
  providers: [
    // Global rate limiting guard (ThrottlerModule requires explicit guard registration)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global exception filter for Prisma errors
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
  ],
})
export class AppModule {}
