/**
 * gRPC Client Options and Configuration
 *
 * Provides factory functions for creating gRPC client options.
 */

import { ClientOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

/**
 * Default gRPC ports for each service
 */
export const GRPC_PORTS = {
  IDENTITY: 50051,
  AUTH: 50052,
  LEGAL: 50053,
} as const;

/**
 * gRPC service names for DI tokens
 */
export const GRPC_SERVICES = {
  IDENTITY: 'IDENTITY_GRPC_SERVICE',
  AUTH: 'AUTH_GRPC_SERVICE',
  LEGAL: 'LEGAL_GRPC_SERVICE',
} as const;

/**
 * gRPC package names
 */
export const GRPC_PACKAGES = {
  IDENTITY: 'identity.v1',
  AUTH: 'auth.v1',
  LEGAL: 'legal.v1',
} as const;

/**
 * Configuration options for gRPC clients
 */
export interface GrpcClientConfig {
  host?: string;
  port?: number;
  protoPath?: string;
}

/**
 * Create Identity service gRPC client options
 */
export function createIdentityGrpcOptions(config?: GrpcClientConfig): ClientOptions {
  const host = config?.host ?? process.env.IDENTITY_GRPC_HOST ?? 'localhost';
  const port =
    config?.port ?? (parseInt(process.env.IDENTITY_GRPC_PORT ?? '', 10) || GRPC_PORTS.IDENTITY);
  const protoPath = config?.protoPath ?? getDefaultProtoPath('identity/v1/identity.proto');

  return {
    transport: Transport.GRPC,
    options: {
      package: GRPC_PACKAGES.IDENTITY,
      protoPath,
      url: `${host}:${port}`,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
      },
    },
  };
}

/**
 * Create Auth service gRPC client options
 */
export function createAuthGrpcOptions(config?: GrpcClientConfig): ClientOptions {
  const host = config?.host ?? process.env.AUTH_GRPC_HOST ?? 'localhost';
  const port = config?.port ?? (parseInt(process.env.AUTH_GRPC_PORT ?? '', 10) || GRPC_PORTS.AUTH);
  const protoPath = config?.protoPath ?? getDefaultProtoPath('auth/v1/auth.proto');

  return {
    transport: Transport.GRPC,
    options: {
      package: GRPC_PACKAGES.AUTH,
      protoPath,
      url: `${host}:${port}`,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
      },
    },
  };
}

/**
 * Create Legal service gRPC client options
 */
export function createLegalGrpcOptions(config?: GrpcClientConfig): ClientOptions {
  const host = config?.host ?? process.env.LEGAL_GRPC_HOST ?? 'localhost';
  const port =
    config?.port ?? (parseInt(process.env.LEGAL_GRPC_PORT ?? '', 10) || GRPC_PORTS.LEGAL);
  const protoPath = config?.protoPath ?? getDefaultProtoPath('legal/v1/legal.proto');

  return {
    transport: Transport.GRPC,
    options: {
      package: GRPC_PACKAGES.LEGAL,
      protoPath,
      url: `${host}:${port}`,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
      },
    },
  };
}

/**
 * Get default proto file path
 * Assumes standard monorepo structure: packages/proto/<path>
 */
function getDefaultProtoPath(relativePath: string): string {
  // Try multiple possible locations
  const possiblePaths = [
    // From services directory (e.g., services/some-service/dist)
    join(__dirname, '../../../../packages/proto', relativePath),
    // From packages directory (e.g., packages/nest-common/dist)
    join(__dirname, '../../../proto', relativePath),
    // Direct path (for development)
    join(process.cwd(), 'packages/proto', relativePath),
  ];

  // Return the first path (caller should ensure proto files exist at deployment)
  return possiblePaths[0];
}

/**
 * Environment-based configuration helper
 */
export interface GrpcEnvironmentConfig {
  identityHost?: string;
  identityPort?: number;
  authHost?: string;
  authPort?: number;
  legalHost?: string;
  legalPort?: number;
  protoBasePath?: string;
}

/**
 * Load gRPC configuration from environment variables
 */
export function loadGrpcConfigFromEnv(): GrpcEnvironmentConfig {
  return {
    identityHost: process.env.IDENTITY_GRPC_HOST,
    identityPort: process.env.IDENTITY_GRPC_PORT
      ? parseInt(process.env.IDENTITY_GRPC_PORT, 10)
      : undefined,
    authHost: process.env.AUTH_GRPC_HOST,
    authPort: process.env.AUTH_GRPC_PORT ? parseInt(process.env.AUTH_GRPC_PORT, 10) : undefined,
    legalHost: process.env.LEGAL_GRPC_HOST,
    legalPort: process.env.LEGAL_GRPC_PORT ? parseInt(process.env.LEGAL_GRPC_PORT, 10) : undefined,
    protoBasePath: process.env.GRPC_PROTO_PATH,
  };
}
