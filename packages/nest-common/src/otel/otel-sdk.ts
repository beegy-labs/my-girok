/**
 * OpenTelemetry SDK initialization.
 *
 * CRITICAL: This module MUST be imported as the FIRST import in main.ts
 * before any other imports to ensure proper instrumentation of all modules.
 *
 * @example
 * ```typescript
 * // main.ts - FIRST LINE
 * import { initOtel } from '@my-girok/nest-common';
 * initOtel({ serviceName: 'auth-service' });
 *
 * // Then other imports...
 * import { NestFactory } from '@nestjs/core';
 * ```
 */

import { randomUUID } from 'crypto';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  OTLPMetricExporter,
  AggregationTemporalityPreference,
} from '@opentelemetry/exporter-metrics-otlp-http';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_TELEMETRY_SDK_LANGUAGE,
  ATTR_TELEMETRY_SDK_NAME,
  ATTR_TELEMETRY_SDK_VERSION,
  TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS,
} from '@opentelemetry/semantic-conventions';

// Incubating/experimental semantic convention attribute keys (not yet stable)
// These are defined locally since the '/incubating' subpath export is not
// compatible with the current moduleResolution setting in tsconfig.json.
// Values match @opentelemetry/semantic-conventions v1.38.0+ incubating exports.
const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';
const ATTR_SERVICE_INSTANCE_ID = 'service.instance.id';
const ATTR_SERVICE_NAMESPACE = 'service.namespace';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import {
  CompositePropagator,
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} from '@opentelemetry/core';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  AlwaysOnSampler,
  AlwaysOffSampler,
} from '@opentelemetry/sdk-trace-node';

/**
 * Configuration options for OpenTelemetry SDK
 */
export interface OtelConfig {
  /** Service name for identification in traces and metrics */
  serviceName: string;

  /** Service version (defaults to SERVICE_VERSION env or '0.0.0') */
  serviceVersion?: string;

  /** Service namespace for grouping related services */
  serviceNamespace?: string;

  /** Deployment environment (defaults to NODE_ENV) */
  environment?: string;

  /** OTLP endpoint for traces (defaults to OTEL_EXPORTER_OTLP_ENDPOINT or http://localhost:4318) */
  otlpEndpoint?: string;

  /** Enable debug logging for OTEL SDK (default: false) */
  debug?: boolean;

  /** Disable OTEL entirely (useful for testing) */
  disabled?: boolean;

  /** Additional resource attributes (supports string, number, boolean, or arrays) */
  resourceAttributes?: Record<string, string | number | boolean | Array<string | number | boolean>>;

  /**
   * Sampling ratio (0.0 to 1.0) for trace sampling.
   * When set, creates a ParentBasedSampler with TraceIdRatioBasedSampler.
   * Defaults to OTEL_TRACES_SAMPLER_ARG env var or 1.0 (100%)
   */
  samplingRatio?: number;

  /**
   * Metric export interval in milliseconds.
   * @default 60000 (1 minute)
   */
  metricExportInterval?: number;

  /**
   * Metric export timeout in milliseconds.
   * @default 30000 (30 seconds)
   */
  metricExportTimeout?: number;

  /**
   * Trace export timeout in milliseconds.
   * @default 30000 (30 seconds)
   */
  traceExportTimeout?: number;

  /**
   * Endpoints to ignore for tracing (e.g., health checks).
   * @default ['/health', '/ready', '/live', '/metrics']
   */
  ignoreEndpoints?: string[];

  /**
   * Enforce HTTPS for OTLP endpoint in production.
   * When true and environment is 'production', HTTP endpoints will throw an error.
   * When false (default), HTTP endpoints in production will only log a warning.
   * @default false
   */
  enforceHttps?: boolean;
}

/** @internal Module state machine for thread safety */
const OTEL_STATES = [
  'uninitialized',
  'initializing',
  'initialized',
  'failed',
  'shutting_down',
] as const;
type OtelState = (typeof OTEL_STATES)[number];
let state: OtelState = 'uninitialized' as const;
let sdk: NodeSDK | null = null;

/** Valid service name pattern (alphanumeric, hyphen, underscore, dot) */
const SERVICE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_.-]*$/;

/** Default endpoints to ignore for tracing as Set for O(1) lookup */
const DEFAULT_IGNORE_ENDPOINTS_SET = new Set([
  '/health',
  '/ready',
  '/live',
  '/metrics',
  '/healthz',
  '/readyz',
  '/livez',
]);

/**
 * OpenTelemetry SDK version.
 * TODO: Update this when upgrading @opentelemetry/sdk-node dependency.
 */
const OTEL_SDK_VERSION = '0.57.0';

/** Default shutdown timeout in milliseconds */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;

/** Minimum shutdown timeout in milliseconds */
const MIN_SHUTDOWN_TIMEOUT_MS = 1000;

/** Default OTLP endpoint */
const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4318';

/** Default service version */
const DEFAULT_SERVICE_VERSION = '0.0.0';

/** Default service namespace */
const DEFAULT_SERVICE_NAMESPACE = 'my-girok';

/** Default environment */
const DEFAULT_ENVIRONMENT = 'development';

/** Minimum export timeout in milliseconds */
const MIN_EXPORT_TIMEOUT_MS = 1000;

/** Default trace export timeout in milliseconds */
const DEFAULT_TRACE_EXPORT_TIMEOUT_MS = 30000;

/** Default metric export interval in milliseconds */
const DEFAULT_METRIC_EXPORT_INTERVAL_MS = 60000;

/** Default metric export timeout in milliseconds */
const DEFAULT_METRIC_EXPORT_TIMEOUT_MS = 30000;

/** Instance ID display truncation length */
const INSTANCE_ID_DISPLAY_LENGTH = 8;

/**
 * Patterns to detect sensitive/PII attribute keys.
 * These patterns match common sensitive data attribute names that should be filtered.
 */
const SENSITIVE_ATTRIBUTE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /ssn/i,
  /social[_-]?security/i,
  /credit[_-]?card/i,
  /cvv/i,
  /pin/i,
  /session[_-]?id/i,
  /cookie/i,
  /bearer/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /jwt/i,
  /email/i,
  /phone/i,
  /address/i,
  /birth/i,
  /dob/i,
] as const;

/**
 * Sanitize resource attributes by filtering out potentially sensitive/PII data.
 *
 * @param attributes - The resource attributes to sanitize
 * @returns Sanitized attributes with sensitive keys removed
 *
 * @internal
 */
function sanitizeAttributes(
  attributes:
    | Record<string, string | number | boolean | Array<string | number | boolean>>
    | undefined,
): Record<string, string | number | boolean | Array<string | number | boolean>> {
  if (!attributes) return {};

  const sanitized: Record<string, string | number | boolean | Array<string | number | boolean>> =
    {};

  for (const [key, value] of Object.entries(attributes)) {
    const isSensitive = SENSITIVE_ATTRIBUTE_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      console.warn(`[OTEL] Filtered potentially sensitive resource attribute: ${key}`);
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Parse integer from environment variable with validation.
 *
 * @param value - The environment variable value to parse
 * @param defaultValue - Default value to return if parsing fails or value is undefined
 * @param minValue - Minimum allowed value (default: 0)
 * @returns Parsed integer or default value if invalid/undefined
 *
 * @internal
 */
function parseEnvInt(value: string | undefined, defaultValue: number, minValue = 0): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < minValue) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Validate sampling ratio to [0.0, 1.0] range.
 *
 * @param value - Configured sampling ratio from OtelConfig
 * @param envValue - OTEL_TRACES_SAMPLER_ARG environment variable value
 * @returns Validated sampling ratio between 0.0 and 1.0 (defaults to 1.0)
 *
 * @remarks
 * Logs a warning if the provided value is invalid (NaN, infinite, or out of range).
 *
 * @internal
 */
function validateSamplingRatio(value: number | undefined, envValue: string | undefined): number {
  const raw = value ?? (envValue ? parseFloat(envValue) : 1.0);
  if (Number.isNaN(raw) || !Number.isFinite(raw) || raw < 0 || raw > 1) {
    console.warn(
      `[OTEL] Invalid sampling ratio: ${raw}. Must be between 0.0 and 1.0. Defaulting to 1.0`,
    );
    return 1.0;
  }
  return raw;
}

/**
 * Validate and normalize OTLP endpoint URL.
 *
 * @param endpoint - The OTLP endpoint URL to validate
 * @param environment - Current deployment environment (for security warnings)
 * @param enforceHttps - Whether to enforce HTTPS in production (throws error if HTTP)
 * @returns Normalized URL origin (scheme + host + port, no path)
 * @throws Error if URL is malformed or if HTTP is used in production with enforceHttps=true
 *
 * @remarks
 * - Removes trailing slashes and paths from the URL
 * - Warns if using HTTP in production environment (when enforceHttps is false)
 * - Throws error if using HTTP in production environment (when enforceHttps is true)
 *
 * @internal
 */
function validateAndNormalizeEndpoint(
  endpoint: string,
  environment: string,
  enforceHttps = false,
): string {
  try {
    const url = new URL(endpoint);

    // Handle HTTP in production based on enforceHttps setting
    if (environment === 'production' && url.protocol === 'http:') {
      if (enforceHttps) {
        throw new Error(
          '[OTEL] HTTPS is required for OTLP endpoint in production when enforceHttps is enabled. ' +
            `Received: ${endpoint}. Please use HTTPS (e.g., https://otel-collector.example.com)`,
        );
      }
      console.warn(
        '[OTEL] WARNING: Using HTTP for OTLP endpoint in production. ' +
          'Consider using HTTPS for secure telemetry transport or set enforceHttps: true.',
      );
    }

    // Remove trailing slash and return origin
    return url.origin;
  } catch (error) {
    // Re-throw enforceHttps errors as-is
    if (error instanceof Error && error.message.includes('HTTPS is required')) {
      throw error;
    }
    throw new Error(
      `[OTEL] Invalid OTLP endpoint URL: ${endpoint}. ` +
        'Please provide a valid URL (e.g., http://localhost:4318 or https://otel-collector.example.com)',
    );
  }
}

/**
 * Initialize OpenTelemetry SDK with auto-instrumentation.
 *
 * This function MUST be called as the first thing in main.ts,
 * before any other imports, to ensure all modules are properly instrumented.
 *
 * @param config - OpenTelemetry configuration options
 * @returns The initialized NodeSDK instance, or null if disabled/failed
 *
 * @example
 * ```typescript
 * // main.ts - FIRST LINE
 * import { initOtel } from '@my-girok/nest-common';
 * initOtel({ serviceName: 'auth-service' });
 * ```
 */
export function initOtel(config: OtelConfig): NodeSDK | null {
  // State machine check - only proceed if uninitialized
  if (state === 'initialized' || state === 'failed') {
    console.warn('[OTEL] OpenTelemetry SDK already initialized, skipping re-initialization');
    return sdk;
  }

  if (state === 'initializing') {
    console.warn('[OTEL] OpenTelemetry SDK initialization already in progress');
    return null;
  }

  // Allow disabling via config or environment
  if (config.disabled || process.env.OTEL_SDK_DISABLED === 'true') {
    console.log('[OTEL] OpenTelemetry SDK disabled');
    state = 'initialized';
    return null;
  }

  state = 'initializing';

  try {
    // Enable debug logging if requested, or at least error logging by default
    if (config.debug || process.env.OTEL_DEBUG === 'true') {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
    } else {
      // Enable error-level diagnostics by default for exporter issues
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
    }

    const serviceName = config.serviceName?.trim();
    if (!serviceName) {
      throw new Error('[OTEL] serviceName is required and cannot be empty');
    }
    if (!SERVICE_NAME_REGEX.test(serviceName)) {
      console.warn(
        `[OTEL] serviceName "${serviceName}" contains non-standard characters. ` +
          'Recommended format: start with letter, contain only alphanumeric, hyphen, underscore, or dot.',
      );
    }
    const serviceVersion =
      config.serviceVersion ?? process.env.SERVICE_VERSION ?? DEFAULT_SERVICE_VERSION;
    const serviceNamespace =
      config.serviceNamespace ?? process.env.SERVICE_NAMESPACE ?? DEFAULT_SERVICE_NAMESPACE;
    const environment = config.environment ?? process.env.NODE_ENV ?? DEFAULT_ENVIRONMENT;

    // Validate OTLP endpoint
    const rawEndpoint =
      config.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? DEFAULT_OTLP_ENDPOINT;
    const otlpEndpoint = validateAndNormalizeEndpoint(
      rawEndpoint,
      environment,
      config.enforceHttps,
    );

    // Generate unique service instance ID
    const serviceInstanceId = process.env.POD_NAME ?? process.env.HOSTNAME ?? randomUUID();

    // Build resource with comprehensive semantic conventions
    const resource = new Resource({
      // Required service attributes
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      [ATTR_SERVICE_NAMESPACE]: serviceNamespace,
      [ATTR_SERVICE_INSTANCE_ID]: serviceInstanceId,

      // Process attributes (per OTEL semantic conventions)
      'process.pid': process.pid,
      'process.runtime.name': 'nodejs',
      'process.runtime.version': process.version,
      'process.executable.name': 'node',
      'process.executable.path': process.execPath,

      // Telemetry SDK attributes (per OTEL spec)
      [ATTR_TELEMETRY_SDK_NAME]: 'opentelemetry',
      [ATTR_TELEMETRY_SDK_VERSION]: OTEL_SDK_VERSION,
      [ATTR_TELEMETRY_SDK_LANGUAGE]: TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS,

      // Deployment attributes (per OTEL semantic conventions v1.38+)
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
      'host.name': process.env.HOSTNAME ?? 'localhost',
      'host.arch': process.arch,

      // Kubernetes attributes (if available)
      ...(process.env.K8S_NAMESPACE && { 'k8s.namespace.name': process.env.K8S_NAMESPACE }),
      ...(process.env.POD_NAME && { 'k8s.pod.name': process.env.POD_NAME }),
      ...(process.env.K8S_DEPLOYMENT && { 'k8s.deployment.name': process.env.K8S_DEPLOYMENT }),
      ...(process.env.K8S_NODE_NAME && { 'k8s.node.name': process.env.K8S_NODE_NAME }),

      // Cloud/container attributes (if available)
      ...(process.env.CLOUD_PROVIDER && { 'cloud.provider': process.env.CLOUD_PROVIDER }),
      ...(process.env.CLOUD_REGION && { 'cloud.region': process.env.CLOUD_REGION }),
      ...(process.env.CONTAINER_ID && { 'container.id': process.env.CONTAINER_ID }),

      // Custom attributes (sanitized to remove PII)
      ...sanitizeAttributes(config.resourceAttributes),
    });

    // Configure trace exporter with timeout
    const traceExportTimeout =
      config.traceExportTimeout ??
      parseEnvInt(
        process.env.OTEL_TRACE_EXPORT_TIMEOUT,
        DEFAULT_TRACE_EXPORT_TIMEOUT_MS,
        MIN_EXPORT_TIMEOUT_MS,
      );

    // Validate trace export timeout from config
    if (
      config.traceExportTimeout !== undefined &&
      config.traceExportTimeout < MIN_EXPORT_TIMEOUT_MS
    ) {
      console.warn(
        `[OTEL] traceExportTimeout ${config.traceExportTimeout}ms is below minimum (${MIN_EXPORT_TIMEOUT_MS}ms). ` +
          `Using minimum value.`,
      );
    }
    const effectiveTraceTimeout = Math.max(traceExportTimeout, MIN_EXPORT_TIMEOUT_MS);

    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      timeoutMillis: effectiveTraceTimeout,
      compression: CompressionAlgorithm.GZIP,
    });

    // Get endpoints to ignore for tracing as Set for O(1) lookups
    const ignoreEndpointsSet = config.ignoreEndpoints
      ? new Set(config.ignoreEndpoints)
      : DEFAULT_IGNORE_ENDPOINTS_SET;

    // Parse and validate sampling ratio
    const samplingRatio = validateSamplingRatio(
      config.samplingRatio,
      process.env.OTEL_TRACES_SAMPLER_ARG,
    );

    // Always use ParentBasedSampler to respect remote parent decisions
    const sampler = new ParentBasedSampler({
      root:
        samplingRatio <= 0
          ? new AlwaysOffSampler()
          : samplingRatio >= 1.0
            ? new AlwaysOnSampler()
            : new TraceIdRatioBasedSampler(samplingRatio),
      remoteParentSampled: new AlwaysOnSampler(),
      remoteParentNotSampled: new AlwaysOffSampler(),
      localParentSampled: new AlwaysOnSampler(),
      localParentNotSampled: new AlwaysOffSampler(),
    });

    // Configure metric exporter with timeout (validated)
    const metricExportInterval =
      config.metricExportInterval ??
      parseEnvInt(
        process.env.OTEL_METRIC_EXPORT_INTERVAL,
        DEFAULT_METRIC_EXPORT_INTERVAL_MS,
        MIN_EXPORT_TIMEOUT_MS,
      );
    const metricExportTimeout =
      config.metricExportTimeout ??
      parseEnvInt(
        process.env.OTEL_METRIC_EXPORT_TIMEOUT,
        DEFAULT_METRIC_EXPORT_TIMEOUT_MS,
        MIN_EXPORT_TIMEOUT_MS,
      );

    // Validate metric config values from config
    if (
      config.metricExportInterval !== undefined &&
      config.metricExportInterval < MIN_EXPORT_TIMEOUT_MS
    ) {
      console.warn(
        `[OTEL] metricExportInterval ${config.metricExportInterval}ms is below minimum (${MIN_EXPORT_TIMEOUT_MS}ms). ` +
          `Using minimum value.`,
      );
    }
    if (
      config.metricExportTimeout !== undefined &&
      config.metricExportTimeout < MIN_EXPORT_TIMEOUT_MS
    ) {
      console.warn(
        `[OTEL] metricExportTimeout ${config.metricExportTimeout}ms is below minimum (${MIN_EXPORT_TIMEOUT_MS}ms). ` +
          `Using minimum value.`,
      );
    }
    const effectiveMetricInterval = Math.max(metricExportInterval, MIN_EXPORT_TIMEOUT_MS);
    const effectiveMetricTimeout = Math.max(metricExportTimeout, MIN_EXPORT_TIMEOUT_MS);

    const metricExporter = new OTLPMetricExporter({
      url: `${otlpEndpoint}/v1/metrics`,
      timeoutMillis: effectiveMetricTimeout,
      compression: CompressionAlgorithm.GZIP,
      temporalityPreference: AggregationTemporalityPreference.DELTA,
    });

    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: effectiveMetricInterval,
      exportTimeoutMillis: effectiveMetricTimeout,
    });

    // Set up W3C Trace Context propagators for distributed tracing
    // Supports traceparent, tracestate, and baggage headers
    const compositePropagator = new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    });

    // Initialize SDK with auto-instrumentation and propagator
    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader,
      sampler,
      textMapPropagator: compositePropagator,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation (too noisy)
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          // Disable DNS instrumentation (noisy in K8s)
          '@opentelemetry/instrumentation-dns': {
            enabled: false,
          },
          // Configure HTTP instrumentation
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (req) => {
              // Ignore configured endpoints (health checks, metrics, etc.)
              const url = req.url ?? '';
              // Check exact match first for performance
              if (ignoreEndpointsSet.has(url)) {
                return true;
              }
              // Check prefix match for nested routes (e.g., /health/deep)
              // Use for...of loop for better performance than Array.from().some()
              for (const endpoint of ignoreEndpointsSet) {
                if (url.startsWith(endpoint + '/')) {
                  return true;
                }
              }
              return false;
            },
          },
        }),
      ],
    });

    // Start the SDK (propagator is already registered via textMapPropagator option)
    sdk.start();

    // Log initialization with safe truncation
    const instanceIdDisplay =
      serviceInstanceId.length > INSTANCE_ID_DISPLAY_LENGTH
        ? `${serviceInstanceId.substring(0, INSTANCE_ID_DISPLAY_LENGTH)}...`
        : serviceInstanceId;
    console.log(
      `[OTEL] OpenTelemetry SDK initialized for ${serviceName}@${serviceVersion} ` +
        `(${environment}, instance: ${instanceIdDisplay})`,
    );

    if (samplingRatio < 1.0) {
      console.log(
        `[OTEL] Trace sampling: ${(samplingRatio * 100).toFixed(1)}% (ParentBasedSampler)`,
      );
    }

    state = 'initialized';
    return sdk;
  } catch (error) {
    console.error('[OTEL] Failed to initialize OpenTelemetry SDK:', error);
    // Don't crash the app - telemetry is non-critical
    sdk = null;
    state = 'failed'; // Mark as failed to prevent retry loops
    return null;
  }
}

/**
 * Shutdown the OpenTelemetry SDK gracefully.
 * Should be called during application shutdown to flush any pending telemetry data.
 *
 * @param timeoutMs - Maximum time to wait for shutdown in milliseconds.
 *                    Default: 10000ms. Minimum: 1000ms.
 *                    Values below minimum will be clamped to minimum with a warning.
 * @returns Promise that resolves when shutdown completes or times out
 *
 * @remarks
 * - This function never throws errors to prevent blocking app termination
 * - If shutdown times out, telemetry data may be lost
 * - Safe to call multiple times (subsequent calls are no-ops)
 *
 * @example
 * ```typescript
 * // In your application shutdown handler
 * process.on('SIGTERM', async () => {
 *   await shutdownOtel();
 *   process.exit(0);
 * });
 * ```
 */
export async function shutdownOtel(timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS): Promise<void> {
  // Can only shutdown if currently initialized
  if (state === 'shutting_down') {
    console.warn('[OTEL] Shutdown already in progress');
    return;
  }

  if (!sdk || state !== 'initialized') return;

  // Enforce minimum timeout
  let effectiveTimeout = timeoutMs;
  if (timeoutMs < MIN_SHUTDOWN_TIMEOUT_MS) {
    console.warn(
      `[OTEL] Shutdown timeout ${timeoutMs}ms is below minimum (${MIN_SHUTDOWN_TIMEOUT_MS}ms). ` +
        `Using minimum value.`,
    );
    effectiveTimeout = MIN_SHUTDOWN_TIMEOUT_MS;
  }

  state = 'shutting_down';

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      sdk.shutdown(),
      new Promise<void>((_, reject) => {
        timeoutId = setTimeout(
          () =>
            reject(
              new Error(
                `[OTEL] Shutdown timed out after ${effectiveTimeout}ms. ` +
                  'Some telemetry data may not have been exported.',
              ),
            ),
          effectiveTimeout,
        );
      }),
    ]);
    console.log('[OTEL] OpenTelemetry SDK shutdown complete');
  } catch (error) {
    console.error('[OTEL] Error during OpenTelemetry SDK shutdown:', error);
    // Don't throw - shutdown errors shouldn't prevent app termination
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    sdk = null;
    state = 'uninitialized';
  }
}

/**
 * Get the current OpenTelemetry SDK instance.
 *
 * @returns The initialized NodeSDK instance, or null if not initialized/disabled/failed
 *
 * @remarks
 * This is useful for advanced scenarios where direct SDK access is needed,
 * such as registering additional instrumentation or accessing tracer/meter providers.
 *
 * @example
 * ```typescript
 * const sdk = getOtelSdk();
 * if (sdk) {
 *   // SDK is available for advanced configuration
 * }
 * ```
 */
export function getOtelSdk(): NodeSDK | null {
  return sdk;
}

/**
 * Check if the OpenTelemetry SDK is initialized and ready.
 *
 * @returns true if SDK is initialized and running, false otherwise
 *
 * @remarks
 * Returns false if:
 * - SDK was never initialized
 * - SDK was disabled via config or environment
 * - SDK initialization failed
 * - SDK has been shut down
 *
 * @example
 * ```typescript
 * if (isOtelInitialized()) {
 *   // Safe to use OpenTelemetry APIs
 * }
 * ```
 */
export function isOtelInitialized(): boolean {
  return state === 'initialized' && sdk !== null;
}
