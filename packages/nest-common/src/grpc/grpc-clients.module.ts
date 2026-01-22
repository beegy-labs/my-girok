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
  createAuditGrpcOptions,
  createMailGrpcOptions,
  createNotificationGrpcOptions,
} from './grpc.options';
import { IdentityGrpcClient } from './identity-grpc.client';
import { AuthGrpcClient } from './auth-grpc.client';
import { LegalGrpcClient } from './legal-grpc.client';
import { AuditGrpcClient } from './audit-grpc.client';
import { MailGrpcClient } from './mail-grpc.client';
import { NotificationGrpcClient } from './notification-grpc.client';

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

  /**
   * Enable Audit service client (port 50054)
   * @default false
   */
  audit?: boolean | GrpcClientConfig;

  /**
   * Enable Mail service client (port 50054)
   * @default false
   */
  mail?: boolean | GrpcClientConfig;

  /**
   * Enable Notification service client (port 50055)
   * @default false
   */
  notification?: boolean | GrpcClientConfig;
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
   * @param options - Which clients to register (identity, auth, legal by default)
   */
  static forRoot(options?: GrpcClientsOptions): DynamicModule {
    const opts = options ?? { identity: true, auth: true, legal: true };
    const { clientsModuleOptions, providers } = this.buildConfiguration(opts);

    return {
      module: GrpcClientsModule,
      global: true,
      imports: [ClientsModule.register(clientsModuleOptions)],
      providers,
      exports: [ClientsModule, ...providers],
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
      global: true,
      imports: [
        ...(options.imports ?? []),
        ClientsModule.registerAsync(this.createClientsAsyncOptions(options)),
      ],
      providers: asyncProviders,
      exports: [ClientsModule, ...asyncProviders],
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

    // Audit client
    if (options.audit) {
      const config = typeof options.audit === 'object' ? options.audit : undefined;
      clientsModuleOptions.push({
        name: GRPC_SERVICES.AUDIT,
        ...createAuditGrpcOptions(config),
      });
      providers.push(AuditGrpcClient);
      exports.push(GRPC_SERVICES.AUDIT);
    }

    // Mail client
    if (options.mail) {
      const config = typeof options.mail === 'object' ? options.mail : undefined;
      clientsModuleOptions.push({
        name: GRPC_SERVICES.MAIL,
        ...createMailGrpcOptions(config),
      });
      providers.push(MailGrpcClient);
      exports.push(GRPC_SERVICES.MAIL);
    }

    // Notification client
    if (options.notification) {
      const config = typeof options.notification === 'object' ? options.notification : undefined;
      clientsModuleOptions.push({
        name: GRPC_SERVICES.NOTIFICATION,
        ...createNotificationGrpcOptions(config),
      });
      providers.push(NotificationGrpcClient);
      exports.push(GRPC_SERVICES.NOTIFICATION);
    }

    return { clientsModuleOptions, providers, exports };
  }

  /**
   * Create async providers for clients
   */
  private static createAsyncProviders(_options: GrpcClientsAsyncOptions): Provider[] {
    return [
      IdentityGrpcClient,
      AuthGrpcClient,
      LegalGrpcClient,
      AuditGrpcClient,
      MailGrpcClient,
      NotificationGrpcClient,
    ];
  }

  /**
   * Create async options for ClientsModule
   */
  private static createClientsAsyncOptions(options: GrpcClientsAsyncOptions): {
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
      {
        name: GRPC_SERVICES.AUDIT,
        useFactory: async (...args: unknown[]) => {
          const config = await factory(...args);
          const auditConfig = typeof config.audit === 'object' ? config.audit : undefined;
          return createAuditGrpcOptions(auditConfig);
        },
        inject,
      },
      {
        name: GRPC_SERVICES.MAIL,
        useFactory: async (...args: unknown[]) => {
          const config = await factory(...args);
          const mailConfig = typeof config.mail === 'object' ? config.mail : undefined;
          return createMailGrpcOptions(mailConfig);
        },
        inject,
      },
      {
        name: GRPC_SERVICES.NOTIFICATION,
        useFactory: async (...args: unknown[]) => {
          const config = await factory(...args);
          const notificationConfig =
            typeof config.notification === 'object' ? config.notification : undefined;
          return createNotificationGrpcOptions(notificationConfig);
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
      auth: config ?? true,
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
      legal: config ?? true,
    });
  }
}

/**
 * Register only Audit client
 */
@Module({})
export class AuditGrpcClientModule {
  static forRoot(config?: GrpcClientConfig): DynamicModule {
    return GrpcClientsModule.forRoot({
      audit: config ?? true,
    });
  }
}

/**
 * Register only Mail client
 */
@Module({})
export class MailGrpcClientModule {
  static forRoot(config?: GrpcClientConfig): DynamicModule {
    return GrpcClientsModule.forRoot({
      mail: config ?? true,
    });
  }
}

/**
 * Register only Notification client
 */
@Module({})
export class NotificationGrpcClientModule {
  static forRoot(config?: GrpcClientConfig): DynamicModule {
    return GrpcClientsModule.forRoot({
      notification: config ?? true,
    });
  }
}
