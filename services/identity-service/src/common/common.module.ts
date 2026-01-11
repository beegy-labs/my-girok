import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  PrismaClientExceptionFilter,
  PrismaValidationExceptionFilter,
  PrismaInitializationExceptionFilter,
} from './filters';
import { RequestContextInterceptor, IdempotencyInterceptor } from './interceptors';
import { OutboxModule } from './outbox';
import { CacheModule } from './cache';
import { CryptoService } from './crypto';
import { ApiKeyGuard } from './guards';
import { AuditModule } from './audit';
import { ResilienceModule } from './resilience';
import { TelemetryModule } from './telemetry';

/**
 * Common Module
 *
 * Global module providing cross-cutting concerns.
 *
 * 2026 Best Practices:
 * - Exception filters (Prisma, validation)
 * - Interceptors (request context, idempotency)
 * - Guards (API key)
 * - Services (crypto, cache, outbox, audit)
 * - Resilience patterns (circuit breaker)
 * - Observability (OpenTelemetry)
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
        return {
          secret: configService.get<string>('JWT_SECRET', ''),
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
            issuer: configService.get<string>('JWT_ISSUER', 'identity-service'),
            audience: configService.get<string>('JWT_AUDIENCE', 'my-girok'),
          },
        };
      },
    }),
    OutboxModule,
    CacheModule,
    AuditModule,
    ResilienceModule,
    TelemetryModule,
  ],
  providers: [
    CryptoService,
    // Global exception filters
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
    // Global interceptors (order matters: RequestContext first, then Idempotency)
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    // Global guards
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
  exports: [
    JwtModule,
    OutboxModule,
    CacheModule,
    AuditModule,
    ResilienceModule,
    TelemetryModule,
    CryptoService,
  ],
})
export class CommonModule {}
