import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma';
import { HealthModule } from './health';
import { MailModule } from './mail/mail.module';
import { TemplateModule } from './templates';
import { KafkaModule } from './kafka';
import { SesModule } from './ses';
import { WebhookModule } from './webhook';
import { AuditModule } from './audit';
import {
  PrismaClientExceptionFilter,
  PrismaValidationExceptionFilter,
  PrismaInitializationExceptionFilter,
} from './common/filters';

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
    // Cron jobs (for email retries, cleanup, etc.)
    ScheduleModule.forRoot(),
    // Core modules
    PrismaModule,
    HealthModule,
    // Email template system
    TemplateModule,
    // AWS SES integration
    SesModule,
    // Audit logging (gRPC to audit-service)
    AuditModule,
    // Kafka messaging (must come after SES, Templates, Audit)
    KafkaModule,
    // SES webhook handler
    WebhookModule,
    // Main mail service
    MailModule,
  ],
  controllers: [],
  providers: [
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global exception filters for Prisma errors
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaInitializationExceptionFilter,
    },
  ],
})
export class AppModule {}
