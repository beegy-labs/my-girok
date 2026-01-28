/**
 * gRPC Client Options and Configuration
 *
 * Provides factory functions for creating gRPC client options with
 * enterprise-grade settings for keepalive, connection management,
 * and performance optimization.
 *
 * @see https://grpc.io/docs/guides/keepalive/
 * @see https://grpc.github.io/grpc/node/global.html#ChannelOptions
 */

import { ClientOptions, Transport } from '@nestjs/microservices';
import { ChannelOptions } from '@grpc/grpc-js';
import { join } from 'path';

/**
 * Default timeout for gRPC calls (5 seconds)
 */
export const DEFAULT_GRPC_TIMEOUT = 5000;

/**
 * Default gRPC channel options for enterprise deployments
 * Based on Google Cloud and Kubernetes best practices
 */
export const DEFAULT_CHANNEL_OPTIONS: ChannelOptions = {
  // ============================================================================
  // Keepalive Settings
  // ============================================================================

  /**
   * Send keepalive pings every 30 seconds when there's no activity.
   * Helps detect dead connections in Kubernetes environments.
   */
  'grpc.keepalive_time_ms': 30000,

  /**
   * Wait 10 seconds for keepalive ping response before considering connection dead.
   */
  'grpc.keepalive_timeout_ms': 10000,

  /**
   * Allow sending keepalive pings even without active RPCs.
   * Essential for long-lived connections in microservices.
   */
  'grpc.keepalive_permit_without_calls': 1,

  /**
   * Maximum time between keepalive pings from server perspective.
   * Server should accept keepalive pings at least every 30 seconds.
   */
  'grpc.http2.min_time_between_pings_ms': 30000,

  /**
   * Minimum time between pings without data (matches keepalive_time_ms).
   */
  'grpc.http2.min_ping_interval_without_data_ms': 30000,

  // ============================================================================
  // Connection Settings
  // ============================================================================

  /**
   * Enable TCP keepalive in addition to HTTP/2 keepalive.
   */
  'grpc.enable_http_proxy': 0,

  /**
   * Maximum number of concurrent streams per HTTP/2 connection.
   * Matches gRPC default for optimal performance.
   */
  'grpc.max_concurrent_streams': 100,

  /**
   * Initial connection window size (1MB).
   * Larger window for better throughput.
   */
  'grpc.initial_reconnect_backoff_ms': 1000,

  /**
   * Maximum reconnection backoff (30 seconds).
   * Prevents aggressive reconnection storms.
   */
  'grpc.max_reconnect_backoff_ms': 30000,

  // ============================================================================
  // Message Size Limits
  // ============================================================================

  /**
   * Maximum message size for receiving (10MB).
   * Adjust based on expected payload sizes.
   */
  'grpc.max_receive_message_length': 10 * 1024 * 1024,

  /**
   * Maximum message size for sending (10MB).
   */
  'grpc.max_send_message_length': 10 * 1024 * 1024,

  // ============================================================================
  // Load Balancing
  // ============================================================================

  /**
   * Use round-robin load balancing for better distribution.
   * Works well with Kubernetes headless services.
   */
  'grpc.lb_policy_name': 'round_robin',

  /**
   * Service config for advanced configuration.
   * Can include method-specific timeouts and retry policies.
   */
  'grpc.service_config': JSON.stringify({
    methodConfig: [
      {
        name: [{}], // Apply to all methods
        waitForReady: true,
        timeout: '30s',
        retryPolicy: {
          maxAttempts: 3,
          initialBackoff: '0.1s',
          maxBackoff: '10s',
          backoffMultiplier: 2,
          retryableStatusCodes: ['UNAVAILABLE', 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED'],
        },
      },
    ],
    loadBalancingConfig: [{ round_robin: {} }],
  }),
};

/**
 * Kubernetes-optimized channel options
 * Use when deploying in Kubernetes clusters
 */
export const K8S_CHANNEL_OPTIONS: ChannelOptions = {
  ...DEFAULT_CHANNEL_OPTIONS,
  // More aggressive keepalive for K8s where connections may be dropped
  'grpc.keepalive_time_ms': 15000,
  'grpc.keepalive_timeout_ms': 5000,
  // Required for DNS resolution with headless services
  'grpc.dns_min_time_between_resolutions_ms': 10000,
};

/**
 * Development channel options
 * Less aggressive settings for local development
 */
export const DEV_CHANNEL_OPTIONS: ChannelOptions = {
  'grpc.keepalive_time_ms': 60000,
  'grpc.keepalive_timeout_ms': 20000,
  'grpc.max_receive_message_length': 10 * 1024 * 1024,
  'grpc.max_send_message_length': 10 * 1024 * 1024,
};

/**
 * Default gRPC ports for each service
 */
export const GRPC_PORTS = {
  IDENTITY: 50051,
  AUTH: 50052,
  LEGAL: 50053,
  AUDIT: 50054,
  NOTIFICATION: 50055,
  MAIL: 50056,
} as const;

/**
 * gRPC service names for DI tokens
 */
export const GRPC_SERVICES = {
  IDENTITY: 'IDENTITY_GRPC_SERVICE',
  AUTH: 'AUTH_GRPC_SERVICE',
  LEGAL: 'LEGAL_GRPC_SERVICE',
  AUDIT: 'AUDIT_GRPC_SERVICE',
  MAIL: 'MAIL_GRPC_SERVICE',
  NOTIFICATION: 'NOTIFICATION_GRPC_SERVICE',
} as const;

/**
 * gRPC package names
 */
export const GRPC_PACKAGES = {
  IDENTITY: 'identity.v1',
  AUTH: 'auth.v1',
  LEGAL: 'legal.v1',
  AUDIT: 'audit.v1',
  MAIL: 'mail.v1',
  NOTIFICATION: 'notification.v1',
} as const;

/**
 * Environment detection
 */
export function getEnvironment(): 'production' | 'kubernetes' | 'development' {
  if (process.env.KUBERNETES_SERVICE_HOST) {
    return 'kubernetes';
  }
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  return 'development';
}

/**
 * Get channel options based on environment
 */
export function getChannelOptionsForEnv(): ChannelOptions {
  const env = getEnvironment();
  switch (env) {
    case 'kubernetes':
      return K8S_CHANNEL_OPTIONS;
    case 'production':
      return DEFAULT_CHANNEL_OPTIONS;
    default:
      return DEV_CHANNEL_OPTIONS;
  }
}

/**
 * Configuration options for gRPC clients
 */
export interface GrpcClientConfig {
  host?: string;
  port?: number;
  protoPath?: string;
  /** Custom channel options (overrides environment defaults) */
  channelOptions?: ChannelOptions;
  /** Use production channel options in development */
  useProductionOptions?: boolean;
}

/**
 * Create Identity service gRPC client options
 */
export function createIdentityGrpcOptions(config?: GrpcClientConfig): ClientOptions {
  const host = config?.host ?? process.env.IDENTITY_GRPC_HOST ?? 'localhost';
  const port =
    config?.port ?? (parseInt(process.env.IDENTITY_GRPC_PORT ?? '', 10) || GRPC_PORTS.IDENTITY);
  const protoPath = config?.protoPath ?? getDefaultProtoPath('identity/v1/identity.proto');
  const channelOptions =
    config?.channelOptions ??
    (config?.useProductionOptions ? DEFAULT_CHANNEL_OPTIONS : getChannelOptionsForEnv());

  return {
    transport: Transport.GRPC,
    options: {
      package: GRPC_PACKAGES.IDENTITY,
      protoPath,
      url: `${host}:${port}`,
      channelOptions,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
        includeDirs: getProtoIncludeDirs(),
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
  const channelOptions =
    config?.channelOptions ??
    (config?.useProductionOptions ? DEFAULT_CHANNEL_OPTIONS : getChannelOptionsForEnv());

  return {
    transport: Transport.GRPC,
    options: {
      package: GRPC_PACKAGES.AUTH,
      protoPath,
      url: `${host}:${port}`,
      channelOptions,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
        includeDirs: getProtoIncludeDirs(),
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
  const channelOptions =
    config?.channelOptions ??
    (config?.useProductionOptions ? DEFAULT_CHANNEL_OPTIONS : getChannelOptionsForEnv());

  return {
    transport: Transport.GRPC,
    options: {
      package: GRPC_PACKAGES.LEGAL,
      protoPath,
      url: `${host}:${port}`,
      channelOptions,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
        includeDirs: getProtoIncludeDirs(),
      },
    },
  };
}

/**
 * Create Audit service gRPC client options
 */
export function createAuditGrpcOptions(config?: GrpcClientConfig): ClientOptions {
  const host = config?.host ?? process.env.AUDIT_GRPC_HOST ?? 'localhost';
  const port =
    config?.port ?? (parseInt(process.env.AUDIT_GRPC_PORT ?? '', 10) || GRPC_PORTS.AUDIT);
  const protoPath = config?.protoPath ?? getDefaultProtoPath('audit/v1/audit.proto');
  const channelOptions =
    config?.channelOptions ??
    (config?.useProductionOptions ? DEFAULT_CHANNEL_OPTIONS : getChannelOptionsForEnv());

  return {
    transport: Transport.GRPC,
    options: {
      package: GRPC_PACKAGES.AUDIT,
      protoPath,
      url: `${host}:${port}`,
      channelOptions,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
        includeDirs: getProtoIncludeDirs(),
      },
    },
  };
}

/**
 * Create Mail service gRPC client options
 */
export function createMailGrpcOptions(config?: GrpcClientConfig): ClientOptions {
  const host = config?.host ?? process.env.MAIL_GRPC_HOST ?? 'localhost';
  const port = config?.port ?? (parseInt(process.env.MAIL_GRPC_PORT ?? '', 10) || GRPC_PORTS.MAIL);
  const protoPath = config?.protoPath ?? getDefaultProtoPath('mail/v1/mail.proto');
  const channelOptions =
    config?.channelOptions ??
    (config?.useProductionOptions ? DEFAULT_CHANNEL_OPTIONS : getChannelOptionsForEnv());

  return {
    transport: Transport.GRPC,
    options: {
      package: GRPC_PACKAGES.MAIL,
      protoPath,
      url: `${host}:${port}`,
      channelOptions,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
        includeDirs: getProtoIncludeDirs(),
      },
    },
  };
}

/**
 * Create Notification service gRPC client options
 */
export function createNotificationGrpcOptions(config?: GrpcClientConfig): ClientOptions {
  const host = config?.host ?? process.env.NOTIFICATION_GRPC_HOST ?? 'localhost';
  const port =
    config?.port ??
    (parseInt(process.env.NOTIFICATION_GRPC_PORT ?? '', 10) || GRPC_PORTS.NOTIFICATION);
  const protoPath = config?.protoPath ?? getDefaultProtoPath('notification/v1/notification.proto');
  const channelOptions =
    config?.channelOptions ??
    (config?.useProductionOptions ? DEFAULT_CHANNEL_OPTIONS : getChannelOptionsForEnv());

  return {
    transport: Transport.GRPC,
    options: {
      package: GRPC_PACKAGES.NOTIFICATION,
      protoPath,
      url: `${host}:${port}`,
      channelOptions,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
        includeDirs: getProtoIncludeDirs(),
      },
    },
  };
}

/**
 * Get default proto file path
 * Assumes standard monorepo structure: packages/proto/<path>
 */
function getDefaultProtoPath(relativePath: string): string {
  // From services directory (e.g., services/some-service/dist)
  return join(__dirname, '../../../../packages/proto', relativePath);
}

/**
 * Get proto include directories for resolving imports
 * Returns the root proto directory so imports like "common/v1/common.proto" resolve correctly
 */
function getProtoIncludeDirs(): string[] {
  return [
    // From services directory (e.g., services/some-service/dist)
    join(__dirname, '../../../../packages/proto'),
    // From packages directory (e.g., packages/nest-common/dist)
    join(__dirname, '../../../proto'),
    // Direct path (for development)
    join(process.cwd(), 'packages/proto'),
  ];
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
  auditHost?: string;
  auditPort?: number;
  mailHost?: string;
  mailPort?: number;
  notificationHost?: string;
  notificationPort?: number;
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
    auditHost: process.env.AUDIT_GRPC_HOST,
    auditPort: process.env.AUDIT_GRPC_PORT ? parseInt(process.env.AUDIT_GRPC_PORT, 10) : undefined,
    mailHost: process.env.MAIL_GRPC_HOST,
    mailPort: process.env.MAIL_GRPC_PORT ? parseInt(process.env.MAIL_GRPC_PORT, 10) : undefined,
    notificationHost: process.env.NOTIFICATION_GRPC_HOST,
    notificationPort: process.env.NOTIFICATION_GRPC_PORT
      ? parseInt(process.env.NOTIFICATION_GRPC_PORT, 10)
      : undefined,
    protoBasePath: process.env.GRPC_PROTO_PATH,
  };
}
