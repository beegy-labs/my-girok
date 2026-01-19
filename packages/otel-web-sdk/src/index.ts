import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';

export interface OtelWebSDKConfig {
  serviceName: string;
  serviceVersion: string;
  environment: 'development' | 'staging' | 'production';
  collectorUrl: string; // https://audit-api.girok.dev/v1/telemetry
  authToken: string;
  tenantId?: string;
  userId?: string;
  debug?: boolean;
}

let isInitialized = false;
let currentConfig: OtelWebSDKConfig | null = null;

/**
 * Initialize OpenTelemetry Web SDK for frontend observability
 *
 * @example
 * ```typescript
 * initializeOtelWebSDK({
 *   serviceName: 'web-girok',
 *   serviceVersion: '1.0.0',
 *   environment: 'production',
 *   collectorUrl: 'https://audit-api.girok.dev/v1/telemetry',
 *   authToken: getUserToken(),
 *   tenantId: user.tenantId,
 *   userId: user.id,
 *   debug: false,
 * });
 * ```
 */
export function initializeOtelWebSDK(config: OtelWebSDKConfig): void {
  if (isInitialized) {
    if (config.debug) {
      console.warn('[OTEL] Already initialized. Skipping re-initialization.');
    }
    return;
  }

  currentConfig = config;

  // Create resource with service information
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    'deployment.environment': config.environment,
    'tenant.id': config.tenantId || 'unknown',
    'user.id': config.userId || 'anonymous',
  });

  // Create OTLP trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${config.collectorUrl}/traces`,
    headers: {
      Authorization: `Bearer ${config.authToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Create and configure tracer provider
  const tracerProvider = new WebTracerProvider({ resource });
  tracerProvider.addSpanProcessor(
    new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 100,
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000, // Export every 5 seconds
      exportTimeoutMillis: 30000,
    }),
  );

  tracerProvider.register();

  // Register automatic instrumentations
  registerInstrumentations({
    instrumentations: [
      // Document load timing
      new DocumentLoadInstrumentation(),

      // Fetch/XHR requests
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [/^https:\/\/.*\.girok\.dev\/.*/, /^http:\/\/localhost.*/],
        clearTimingResources: true,
        applyCustomAttributesOnSpan: (span: Span, request: Request | RequestInit) => {
          // Add custom attributes to fetch spans
          if (request instanceof Request) {
            span.setAttribute('http.url', request.url);
            span.setAttribute('http.method', request.method);
          }
        },
      }),

      // User interactions (clicks, form submits)
      new UserInteractionInstrumentation({
        eventNames: ['click', 'submit', 'change'],
        shouldPreventSpanCreation: (eventType, element) => {
          // Prevent spans for form inputs (too noisy)
          if (eventType === 'change' && element.tagName === 'INPUT') {
            return true;
          }
          return false;
        },
      }),
    ],
  });

  isInitialized = true;

  if (config.debug) {
    console.log('[OTEL] Initialized successfully', {
      serviceName: config.serviceName,
      environment: config.environment,
      collectorUrl: config.collectorUrl,
      tenantId: config.tenantId,
    });
  }
}

/**
 * Get the current tracer instance
 */
export function getTracer() {
  if (!currentConfig) {
    throw new Error('[OTEL] SDK not initialized. Call initializeOtelWebSDK() first.');
  }
  return trace.getTracer(currentConfig.serviceName, currentConfig.serviceVersion);
}

/**
 * Create a manual span for custom tracking
 *
 * @example
 * ```typescript
 * const span = createSpan('user.login', { userId: '123' });
 * try {
 *   await performLogin();
 *   span.setStatus({ code: SpanStatusCode.OK });
 * } catch (error) {
 *   span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
 *   span.recordException(error);
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>,
): Span {
  const tracer = getTracer();
  const span = tracer.startSpan(name, {
    attributes,
  });
  return span;
}

/**
 * Create an audit log event (as a span)
 *
 * Audit logs are special traces that track user actions for compliance.
 *
 * @example
 * ```typescript
 * createAuditLog({
 *   action: 'user.delete',
 *   resource: 'user',
 *   resourceId: 'user-123',
 *   metadata: {
 *     reason: 'GDPR request',
 *     requestedBy: 'admin-456',
 *   },
 * });
 * ```
 */
export function createAuditLog(options: {
  action: string;
  resource: string;
  resourceId?: string;
  result?: 'success' | 'failure';
  metadata?: Record<string, string | number | boolean>;
}): void {
  const tracer = getTracer();

  const span = tracer.startSpan(`audit.${options.action}`, {
    attributes: {
      'audit.action': options.action,
      'audit.resource': options.resource,
      'audit.resource_id': options.resourceId || 'unknown',
      'audit.result': options.result || 'success',
      'audit.compliance': true,
      'log.type': 'audit',
      ...options.metadata,
    },
  });

  // Audit events are instant (no duration)
  span.end();

  if (currentConfig?.debug) {
    console.log('[OTEL] Audit log created', {
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
    });
  }
}

/**
 * Track a custom event (page view, feature usage, etc.)
 *
 * @example
 * ```typescript
 * trackEvent('page.view', {
 *   page: '/dashboard',
 *   referrer: document.referrer,
 * });
 * ```
 */
export function trackEvent(
  eventName: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  const tracer = getTracer();
  const span = tracer.startSpan(`event.${eventName}`, {
    attributes: {
      'event.name': eventName,
      ...attributes,
    },
  });
  span.end();
}

/**
 * Execute a function within a traced context
 *
 * @example
 * ```typescript
 * await withSpan('expensive.operation', async (span) => {
 *   span.setAttribute('custom.attribute', 'value');
 *   await doWork();
 * });
 * ```
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { attributes });

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Update user context after login
 *
 * Call this after user authentication to update telemetry with user info
 */
export function updateUserContext(userId: string, tenantId?: string): void {
  if (!currentConfig) {
    console.warn('[OTEL] SDK not initialized. Cannot update user context.');
    return;
  }

  currentConfig.userId = userId;
  if (tenantId) {
    currentConfig.tenantId = tenantId;
  }

  if (currentConfig.debug) {
    console.log('[OTEL] User context updated', { userId, tenantId });
  }
}

/**
 * Check if OTEL SDK is initialized
 */
export function isOtelInitialized(): boolean {
  return isInitialized;
}

// Export OpenTelemetry API for advanced usage
export { trace, context, SpanStatusCode, type Span } from '@opentelemetry/api';
