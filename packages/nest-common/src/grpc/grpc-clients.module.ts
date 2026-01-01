/**
 * gRPC Clients Module
 *
 * Dynamic module for registering gRPC clients for inter-service communication.
 *
 * Usage:
 * ```typescript
 * // Import all clients
 * @Module({
 *   imports: [GrpcClientsModule.forRoot()],
 * })
 *
 * // Import specific clients
 * @Module({
 *   imports: [GrpcClientsModule.forRoot({ identity: true, auth: true })],
 * })
 *
 * // With custom configuration
 * @Module({
 *   imports: [
 *     GrpcClientsModule.forRootAsync({
 *       useFactory: (config: ConfigService) => ({
 *         identity: {
 *           host: config.get('IDENTITY_HOST'),
 *           port: config.get('IDENTITY_PORT'),
 *         },
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * ```
 */

import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { ClientsModule, ClientsModuleOptions, ClientOptions } from '@nestjs/microservices';
import {
  GRPC_SERVICES,
  GrpcClientConfig,
  createIdentityGrpcOptions,
  createAuthGrpcOptions,
  createLegalGrpcOptions,
} from './grpc.options';
import { IdentityGrpcClient } from './identity-grpc.client';
import { AuthGrpcClient } from './auth-grpc.client';
import { LegalGrpcClient } from './legal-grpc.client';

/**
 * Options for which clients to register
 */
export interface GrpcClientsOptions {
  /**
   * Enable Identity service client (port 50051)
   * @default true
   */
  identity?: boolean | GrpcClientConfig;

  /**
   * Enable Auth service client (port 50052)
   * @default true
   */
  auth?: boolean | GrpcClientConfig;

  /**
   * Enable Legal service client (port 50053)
   * @default true
   */
  legal?: boolean | GrpcClientConfig;
}

/**
 * Async options for GrpcClientsModule
 */
export interface GrpcClientsAsyncOptions {
  imports?: Type<unknown>[];
  useFactory: (...args: unknown[]) => GrpcClientsOptions | Promise<GrpcClientsOptions>;
  inject?: unknown[];
}

@Module({})
export class GrpcClientsModule {
  /**
   * Register gRPC clients synchronously
   *
   * @param options - Which clients to register (all by default)
   */
  static forRoot(options?: GrpcClientsOptions): DynamicModule {
    const opts = options ?? { identity: true, auth: true, legal: true };
    const { clientsModuleOptions, providers, exports } = this.buildConfiguration(opts);

    return {
      module: GrpcClientsModule,
      imports: [ClientsModule.register(clientsModuleOptions)],
      providers,
      exports: [...exports, ...providers],
    };
  }

  /**
   * Register gRPC clients asynchronously
   *
   * @param options - Async factory options
   */
  static forRootAsync(options: GrpcClientsAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: GrpcClientsModule,
      imports: [
        ...(options.imports ?? []),
        ClientsModule.registerAsync(this.createClientsAsyncOptions(options)),
      ],
      providers: asyncProviders,
      exports: asyncProviders,
    };
  }

  /**
   * Build module configuration from options
   */
  private static buildConfiguration(options: GrpcClientsOptions): {
    clientsModuleOptions: ClientsModuleOptions;
    providers: Provider[];
    exports: string[];
  } {
    const clientsModuleOptions: ClientsModuleOptions = [];
    const providers: Provider[] = [];
    const exports: string[] = [];

    // Identity client
    if (options.identity) {
      const config = typeof options.identity === 'object' ? options.identity : undefined;
      clientsModuleOptions.push({
        name: GRPC_SERVICES.IDENTITY,
        ...createIdentityGrpcOptions(config),
      });
      providers.push(IdentityGrpcClient);
      exports.push(GRPC_SERVICES.IDENTITY);
    }

    // Auth client
    if (options.auth) {
      const config = typeof options.auth === 'object' ? options.auth : undefined;
      clientsModuleOptions.push({
        name: GRPC_SERVICES.AUTH,
        ...createAuthGrpcOptions(config),
      });
      providers.push(AuthGrpcClient);
      exports.push(GRPC_SERVICES.AUTH);
    }

    // Legal client
    if (options.legal) {
      const config = typeof options.legal === 'object' ? options.legal : undefined;
      clientsModuleOptions.push({
        name: GRPC_SERVICES.LEGAL,
        ...createLegalGrpcOptions(config),
      });
      providers.push(LegalGrpcClient);
      exports.push(GRPC_SERVICES.LEGAL);
    }

    return { clientsModuleOptions, providers, exports };
  }

  /**
   * Create async providers for clients
   */
  private static createAsyncProviders(options: GrpcClientsAsyncOptions): Provider[] {
    return [IdentityGrpcClient, AuthGrpcClient, LegalGrpcClient];
  }

  /**
   * Create async options for ClientsModule
   */
  private static createClientsAsyncOptions(
    options: GrpcClientsAsyncOptions,
  ): {
    name: string;
    useFactory: (...args: unknown[]) => ClientOptions | Promise<ClientOptions>;
    inject?: unknown[];
  }[] {
    const factory = options.useFactory;
    const inject = options.inject ?? [];

    return [
      {
        name: GRPC_SERVICES.IDENTITY,
        useFactory: async (...args: unknown[]) => {
          const config = await factory(...args);
          const identityConfig = typeof config.identity === 'object' ? config.identity : undefined;
          return createIdentityGrpcOptions(identityConfig);
        },
        inject,
      },
      {
        name: GRPC_SERVICES.AUTH,
        useFactory: async (...args: unknown[]) => {
          const config = await factory(...args);
          const authConfig = typeof config.auth === 'object' ? config.auth : undefined;
          return createAuthGrpcOptions(authConfig);
        },
        inject,
      },
      {
        name: GRPC_SERVICES.LEGAL,
        useFactory: async (...args: unknown[]) => {
          const config = await factory(...args);
          const legalConfig = typeof config.legal === 'object' ? config.legal : undefined;
          return createLegalGrpcOptions(legalConfig);
        },
        inject,
      },
    ];
  }
}

/**
 * Register only Identity client
 */
@Module({})
export class IdentityGrpcClientModule {
  static forRoot(config?: GrpcClientConfig): DynamicModule {
    return GrpcClientsModule.forRoot({
      identity: config ?? true,
      auth: false,
      legal: false,
    });
  }
}

/**
 * Register only Auth client
 */
@Module({})
export class AuthGrpcClientModule {
  static forRoot(config?: GrpcClientConfig): DynamicModule {
    return GrpcClientsModule.forRoot({
      identity: false,
      auth: config ?? true,
      legal: false,
    });
  }
}

/**
 * Register only Legal client
 */
@Module({})
export class LegalGrpcClientModule {
  static forRoot(config?: GrpcClientConfig): DynamicModule {
    return GrpcClientsModule.forRoot({
      identity: false,
      auth: false,
      legal: config ?? true,
    });
  }
}
