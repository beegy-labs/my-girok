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

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

/**
 * Configuration options for OpenTelemetry SDK
 */
export interface OtelConfig {
  /** Service name for identification in traces and metrics */
  serviceName: string;

  /** Service version (defaults to SERVICE_VERSION env or '0.0.0') */
  serviceVersion?: string;

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
}

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK with auto-instrumentation.
 *
 * This function MUST be called as the first thing in main.ts,
 * before any other imports, to ensure all modules are properly instrumented.
 *
 * @param config - OpenTelemetry configuration options
 * @returns The initialized NodeSDK instance
 *
 * @example
 * ```typescript
 * // main.ts - FIRST LINE
 * import { initOtel } from '@my-girok/nest-common';
 * initOtel({ serviceName: 'auth-service' });
 * ```
 */
export function initOtel(config: OtelConfig): NodeSDK | null {
  // Allow disabling via config or environment
  if (config.disabled || process.env.OTEL_SDK_DISABLED === 'true') {
    console.log('[OTEL] OpenTelemetry SDK disabled');
    return null;
  }

  // Enable debug logging if requested
  if (config.debug || process.env.OTEL_DEBUG === 'true') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const serviceName = config.serviceName;
  const serviceVersion = config.serviceVersion ?? process.env.SERVICE_VERSION ?? '0.0.0';
  const environment = config.environment ?? process.env.NODE_ENV ?? 'development';
  const otlpEndpoint =
    config.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

  // Build resource with service identification
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': environment,
    'host.name': process.env.HOSTNAME ?? process.env.POD_NAME ?? 'localhost',
    ...config.resourceAttributes,
  });

  // Configure trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  // Configure metric exporter with periodic export
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${otlpEndpoint}/v1/metrics`,
    }),
    exportIntervalMillis: 60000, // Export every 60 seconds
  });

  // Initialize SDK with auto-instrumentation
  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable fs instrumentation (too noisy)
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        // Configure HTTP instrumentation
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => {
            // Ignore health check endpoints
            const url = req.url ?? '';
            return url.includes('/health') || url.includes('/ready') || url.includes('/live');
          },
        },
      }),
    ],
  });

  // Start the SDK
  sdk.start();

  console.log(`[OTEL] OpenTelemetry SDK initialized for ${serviceName} (${environment})`);

  return sdk;
}

/**
 * Shutdown the OpenTelemetry SDK gracefully.
 * Should be called during application shutdown.
 */
export async function shutdownOtel(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      console.log('[OTEL] OpenTelemetry SDK shutdown complete');
    } catch (error) {
      console.error('[OTEL] Error shutting down OpenTelemetry SDK:', error);
    }
  }
}

/**
 * Get the current SDK instance (if initialized).
 */
export function getOtelSdk(): NodeSDK | null {
  return sdk;
}
