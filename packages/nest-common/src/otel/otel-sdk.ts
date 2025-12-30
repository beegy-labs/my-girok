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
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  propagation,
  TextMapPropagator,
} from '@opentelemetry/api';
import {
  CompositePropagator,
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} from '@opentelemetry/core';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';

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

  /** Additional resource attributes */
  resourceAttributes?: Record<string, string>;

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
}

// Module state
let sdk: NodeSDK | null = null;
let isInitialized = false;
let initializationInProgress = false;

/**
 * Validate and normalize OTLP endpoint URL.
 * @throws Error if URL is malformed
 */
function validateAndNormalizeEndpoint(endpoint: string, environment: string): string {
  try {
    const url = new URL(endpoint);

    // Warn if using HTTP in production
    if (environment === 'production' && url.protocol === 'http:') {
      console.warn(
        '[OTEL] WARNING: Using HTTP for OTLP endpoint in production. ' +
          'Consider using HTTPS for secure telemetry transport.',
      );
    }

    // Remove trailing slash and return origin
    return url.origin;
  } catch {
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
  // Prevent re-initialization
  if (isInitialized) {
    console.warn('[OTEL] OpenTelemetry SDK already initialized, skipping re-initialization');
    return sdk;
  }

  if (initializationInProgress) {
    console.warn('[OTEL] OpenTelemetry SDK initialization already in progress');
    return null;
  }

  // Allow disabling via config or environment
  if (config.disabled || process.env.OTEL_SDK_DISABLED === 'true') {
    console.log('[OTEL] OpenTelemetry SDK disabled');
    isInitialized = true;
    return null;
  }

  initializationInProgress = true;

  try {
    // Enable debug logging if requested, or at least error logging by default
    if (config.debug || process.env.OTEL_DEBUG === 'true') {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
    } else {
      // Enable error-level diagnostics by default for exporter issues
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
    }

    const serviceName = config.serviceName;
    const serviceVersion = config.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0';
    const serviceNamespace = config.serviceNamespace ?? process.env.SERVICE_NAMESPACE ?? 'my-girok';
    const environment = config.environment ?? process.env.NODE_ENV ?? 'development';

    // Validate OTLP endpoint
    const rawEndpoint =
      config.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';
    const otlpEndpoint = validateAndNormalizeEndpoint(rawEndpoint, environment);

    // Generate unique service instance ID
    const serviceInstanceId = process.env.POD_NAME ?? process.env.HOSTNAME ?? randomUUID();

    // Build resource with comprehensive semantic conventions
    const resource = new Resource({
      // Required service attributes
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      'service.namespace': serviceNamespace,
      'service.instance.id': serviceInstanceId,

      // Telemetry SDK attributes
      'telemetry.sdk.name': '@opentelemetry/sdk-node',
      'telemetry.sdk.language': 'nodejs',
      'telemetry.sdk.version': process.env.OTEL_SDK_VERSION ?? '0.57.0',

      // Deployment attributes
      'deployment.environment': environment,
      'host.name': process.env.HOSTNAME ?? 'localhost',

      // Kubernetes attributes (if available)
      ...(process.env.K8S_NAMESPACE && { 'k8s.namespace.name': process.env.K8S_NAMESPACE }),
      ...(process.env.POD_NAME && { 'k8s.pod.name': process.env.POD_NAME }),
      ...(process.env.K8S_DEPLOYMENT && { 'k8s.deployment.name': process.env.K8S_DEPLOYMENT }),
      ...(process.env.K8S_NODE_NAME && { 'k8s.node.name': process.env.K8S_NODE_NAME }),

      // Custom attributes
      ...config.resourceAttributes,
    });

    // Configure trace exporter with timeout
    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      timeoutMillis: 30000,
    });

    // Parse and validate sampling ratio
    const samplingRatio =
      config.samplingRatio ?? parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG ?? '1.0');

    // Create sampler only if ratio is explicitly configured (not 1.0)
    const sampler =
      samplingRatio < 1.0
        ? new ParentBasedSampler({
            root: new TraceIdRatioBasedSampler(samplingRatio),
          })
        : undefined;

    // Configure metric exporter with timeout
    const metricExportInterval =
      config.metricExportInterval ??
      parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL ?? '60000', 10);
    const metricExportTimeout =
      config.metricExportTimeout ?? parseInt(process.env.OTEL_METRIC_EXPORT_TIMEOUT ?? '30000', 10);

    const metricExporter = new OTLPMetricExporter({
      url: `${otlpEndpoint}/v1/metrics`,
      timeoutMillis: metricExportTimeout,
    });

    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: metricExportInterval,
      exportTimeoutMillis: metricExportTimeout,
    });

    // Set up W3C Trace Context propagators for distributed tracing
    // Supports traceparent, tracestate, and baggage headers
    const compositePropagator: TextMapPropagator = new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    });
    propagation.setGlobalPropagator(compositePropagator);

    // Initialize SDK with auto-instrumentation
    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader,
      sampler,
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
              // Ignore health check endpoints
              const url = req.url ?? '';
              return (
                url.includes('/health') ||
                url.includes('/ready') ||
                url.includes('/live') ||
                url.includes('/metrics')
              );
            },
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();

    console.log(
      `[OTEL] OpenTelemetry SDK initialized for ${serviceName}@${serviceVersion} ` +
        `(${environment}, instance: ${serviceInstanceId.substring(0, 8)}...)`,
    );

    if (samplingRatio < 1.0) {
      console.log(
        `[OTEL] Trace sampling: ${(samplingRatio * 100).toFixed(1)}% (ParentBasedSampler)`,
      );
    }

    isInitialized = true;
    return sdk;
  } catch (error) {
    console.error('[OTEL] Failed to initialize OpenTelemetry SDK:', error);
    // Don't crash the app - telemetry is non-critical
    sdk = null;
    isInitialized = true; // Mark as initialized to prevent retry loops
    return null;
  } finally {
    initializationInProgress = false;
  }
}

/**
 * Shutdown the OpenTelemetry SDK gracefully.
 * Should be called during application shutdown.
 * @param timeoutMs - Maximum time to wait for shutdown (default: 10000ms)
 */
export async function shutdownOtel(timeoutMs = 10000): Promise<void> {
  if (!sdk) return;

  let timeoutId: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      sdk.shutdown(),
      new Promise<void>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('OTEL shutdown timeout')), timeoutMs);
      }),
    ]);
    console.log('[OTEL] OpenTelemetry SDK shutdown complete');
  } catch (error) {
    console.error('[OTEL] Error shutting down OpenTelemetry SDK:', error);
    // Don't throw - shutdown errors shouldn't prevent app termination
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    sdk = null;
    isInitialized = false;
  }
}

/**
 * Get the current SDK instance (if initialized).
 */
export function getOtelSdk(): NodeSDK | null {
  return sdk;
}

/**
 * Check if OTEL SDK is initialized.
 */
export function isOtelInitialized(): boolean {
  return isInitialized && sdk !== null;
}
