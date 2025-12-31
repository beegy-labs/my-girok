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
import { ApiKeyGuard } from './guards';

@Global()
@Module({
  imports: [OutboxModule],
  providers: [
    CryptoService,
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
  exports: [OutboxModule, CryptoService],
})
export class CommonModule {}
