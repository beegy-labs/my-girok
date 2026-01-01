import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import {
  PrismaClientExceptionFilter,
  PrismaValidationExceptionFilter,
  PrismaInitializationExceptionFilter,
} from './filters';
import { RequestContextInterceptor } from './interceptors';
import { OutboxModule } from './outbox';
import { CryptoService } from './crypto';
import { ApiKeyGuard, JwtAuthGuard, PermissionGuard } from './guards';
import { CacheConfigModule, CacheService } from './cache';

@Global()
@Module({
  imports: [OutboxModule, CacheConfigModule],
  providers: [
    CryptoService,
    JwtAuthGuard,
    PermissionGuard,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
  exports: [
    OutboxModule,
    CryptoService,
    CacheConfigModule,
    CacheService,
    JwtAuthGuard,
    PermissionGuard,
  ],
})
export class CommonModule {}
