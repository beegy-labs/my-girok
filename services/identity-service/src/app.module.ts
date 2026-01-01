import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database';
import { CommonModule } from './common/common.module';
import { MessagingModule } from './common/messaging/messaging.module';
import { SagaModule } from './common/saga/saga.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { IdentityModule } from './identity/identity.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';

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
    // Rate limiting (per-route throttling)
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
    // Core modules (CommonModule includes CacheConfigModule with Valkey support)
    DatabaseModule,
    CommonModule,
    MessagingModule,
    SagaModule,
    HealthModule,
    MetricsModule,
    // Domain modules
    IdentityModule,
  ],
  controllers: [],
  providers: [
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global exception filter (RFC 7807 Problem Details)
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
    // Prisma-specific exception filter
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
    // Global correlation ID interceptor for request tracing
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
  ],
})
export class AppModule {}
