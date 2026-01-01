import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
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

/**
 * Common Module
 * Global module providing cross-cutting concerns:
 * - Exception filters (Prisma, validation)
 * - Interceptors (request context, idempotency)
 * - Guards (API key)
 * - Services (crypto, cache, outbox)
 */
@Global()
@Module({
  imports: [OutboxModule, CacheModule],
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
  exports: [OutboxModule, CacheModule, CryptoService],
})
export class CommonModule {}
