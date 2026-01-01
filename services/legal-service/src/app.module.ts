import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { ConsentsModule } from './consents/consents.module';
import { DsrRequestsModule } from './dsr-requests/dsr-requests.module';
import { LawRegistryModule } from './law-registry/law-registry.module';
import { LegalDocumentsModule } from './legal-documents/legal-documents.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),

    // Health checks
    TerminusModule,

    // Event emitter
    EventEmitterModule.forRoot(),

    // Database
    DatabaseModule,

    // Feature modules
    ConsentsModule,
    DsrRequestsModule,
    LawRegistryModule,
    LegalDocumentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
