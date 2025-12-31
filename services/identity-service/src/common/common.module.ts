import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  PrismaClientExceptionFilter,
  PrismaValidationExceptionFilter,
  PrismaInitializationExceptionFilter,
} from './filters';
import { RequestContextInterceptor } from './interceptors';
import { OutboxModule } from './outbox';

@Global()
@Module({
  imports: [OutboxModule],
  providers: [
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
  ],
  exports: [OutboxModule],
})
export class CommonModule {}
