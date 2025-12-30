import { DynamicModule, Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createPinoHttpConfig } from './pino.config';
import { RequestContextMiddleware } from './request-context.middleware';

/**
 * Configuration options for PinoLoggerModule
 */
export interface PinoLoggerModuleOptions {
  /** Service name for log identification */
  serviceName?: string;

  /** Service version (defaults to package.json version) */
  serviceVersion?: string;

  /** Environment (defaults to NODE_ENV) */
  environment?: string;

  /** Log level (defaults to LOG_LEVEL env or 'info') */
  level?: string;

  /** Whether to enable request context middleware (default: true) */
  enableRequestContext?: boolean;
}

/**
 * Global Pino Logger Module for NestJS applications.
 * Provides structured JSON logging with ECS-compatible field names.
 *
 * Features:
 * - Structured JSON logs in production
 * - Pretty-printed logs in development
 * - Automatic request/response logging
 * - Sensitive field redaction
 * - Request context propagation via AsyncLocalStorage
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * @Module({
 *   imports: [
 *     PinoLoggerModule.forRoot({
 *       serviceName: 'auth-service',
 *       serviceVersion: '1.0.0',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * ```typescript
 * // In a service
 * import { Logger } from '@nestjs/common';
 *
 * @Injectable()
 * export class MyService {
 *   private readonly logger = new Logger(MyService.name);
 *
 *   doSomething() {
 *     this.logger.log({ 'log.type': 'app_log', action: 'doSomething' }, 'Doing something');
 *   }
 * }
 * ```
 */
@Global()
@Module({})
export class PinoLoggerModule implements NestModule {
  /**
   * Register the module with static configuration.
   */
  static forRoot(options?: PinoLoggerModuleOptions): DynamicModule {
    const pinoHttpConfig = createPinoHttpConfig({
      serviceName: options?.serviceName,
      serviceVersion: options?.serviceVersion,
      environment: options?.environment,
      level: options?.level,
    });

    return {
      module: PinoLoggerModule,
      imports: [LoggerModule.forRoot(pinoHttpConfig)],
      providers: [
        {
          provide: 'PINO_LOGGER_OPTIONS',
          useValue: options ?? {},
        },
      ],
      exports: [LoggerModule],
    };
  }

  /**
   * Register the module with async configuration from ConfigService.
   */
  static forRootAsync(): DynamicModule {
    return {
      module: PinoLoggerModule,
      imports: [
        ConfigModule,
        LoggerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const serviceName = configService.get<string>('SERVICE_NAME');
            const serviceVersion = configService.get<string>('SERVICE_VERSION');
            const environment = configService.get<string>('NODE_ENV', 'development');
            const level = configService.get<string>('LOG_LEVEL');

            return createPinoHttpConfig({
              serviceName,
              serviceVersion,
              environment,
              level,
            });
          },
        }),
      ],
      providers: [
        {
          provide: 'PINO_LOGGER_OPTIONS',
          useFactory: (configService: ConfigService) => ({
            serviceName: configService.get<string>('SERVICE_NAME'),
            serviceVersion: configService.get<string>('SERVICE_VERSION'),
            environment: configService.get<string>('NODE_ENV', 'development'),
            level: configService.get<string>('LOG_LEVEL'),
            enableRequestContext: true,
          }),
          inject: [ConfigService],
        },
      ],
      exports: [LoggerModule],
    };
  }

  /**
   * Configure middleware for request context propagation.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
