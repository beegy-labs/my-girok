import { DynamicModule, Global, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { shutdownOtel } from './otel-sdk';

/**
 * Configuration options for OtelModule
 */
export interface OtelModuleOptions {
  /** Whether OTEL is enabled (defaults to OTEL_SDK_DISABLED env check) */
  enabled?: boolean;
}

/**
 * NestJS module for OpenTelemetry integration.
 *
 * Note: The actual SDK initialization must happen in main.ts BEFORE
 * NestJS boots. This module provides lifecycle management (shutdown)
 * and makes configuration available to other modules.
 *
 * @example
 * ```typescript
 * // main.ts (FIRST LINE)
 * import { initOtel } from '@my-girok/nest-common';
 * initOtel({ serviceName: 'auth-service' });
 *
 * // app.module.ts
 * @Module({
 *   imports: [OtelModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class OtelModule implements OnModuleDestroy {
  /**
   * Register the module with static configuration.
   */
  static forRoot(options?: OtelModuleOptions): DynamicModule {
    const enabled = options?.enabled ?? process.env.OTEL_SDK_DISABLED !== 'true';

    return {
      module: OtelModule,
      providers: [
        {
          provide: 'OTEL_OPTIONS',
          useValue: { enabled },
        },
      ],
      exports: ['OTEL_OPTIONS'],
    };
  }

  /**
   * Register the module with async configuration from ConfigService.
   */
  static forRootAsync(): DynamicModule {
    return {
      module: OtelModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'OTEL_OPTIONS',
          useFactory: (configService: ConfigService) => ({
            enabled: configService.get('OTEL_SDK_DISABLED') !== 'true',
          }),
          inject: [ConfigService],
        },
      ],
      exports: ['OTEL_OPTIONS'],
    };
  }

  /**
   * Gracefully shutdown OTEL SDK when the module is destroyed.
   */
  async onModuleDestroy(): Promise<void> {
    await shutdownOtel();
  }
}
