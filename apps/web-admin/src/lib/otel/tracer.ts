/**
 * OpenTelemetry Tracer Initialization
 * Phase 6.1 - Admin Audit System (#415)
 */
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { trace, SpanStatusCode, Span, Tracer } from '@opentelemetry/api';
import { resourceAttributes, otelConfig, SpanAttributes, UIEventType } from './config';
import { getSessionId, getSessionMetadata } from './session';

let tracerProvider: WebTracerProvider | null = null;
let tracer: Tracer | null = null;
let isInitialized = false;

/**
 * Initialize OpenTelemetry
 */
export function initOtel(): void {
  if (isInitialized) {
    return;
  }

  try {
    // Create OTLP exporter
    const exporter = new OTLPTraceExporter({
      url: `${otelConfig.endpoint}/v1/traces`,
      headers: {},
    });

    // Create tracer provider with resource
    const resource = resourceFromAttributes(resourceAttributes);
    tracerProvider = new WebTracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(exporter, otelConfig.batchConfig)],
    });

    // Register with context manager
    tracerProvider.register({
      contextManager: new ZoneContextManager(),
    });

    // Register fetch instrumentation
    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: [/https:\/\/.*\.girok\.dev/, /http:\/\/localhost/],
          clearTimingResources: true,
        }),
      ],
    });

    // Get tracer instance
    tracer = trace.getTracer(otelConfig.serviceName, otelConfig.serviceVersion);
    isInitialized = true;

    console.info('[OTEL] Initialized successfully');
  } catch (error) {
    console.error('[OTEL] Failed to initialize:', error);
  }
}

/**
 * Get the tracer instance
 */
export function getTracer(): Tracer | null {
  return tracer;
}

/**
 * Check if OTEL is initialized
 */
export function isOtelInitialized(): boolean {
  return isInitialized;
}

/**
 * Shutdown OTEL
 */
export async function shutdownOtel(): Promise<void> {
  if (tracerProvider) {
    await tracerProvider.shutdown();
    isInitialized = false;
    tracer = null;
    tracerProvider = null;
  }
}

/**
 * User context to add to all spans
 */
interface UserContext {
  userId?: string;
  email?: string;
  role?: string;
}

let currentUserContext: UserContext = {};

/**
 * Set user context for spans
 */
export function setUserContext(user: UserContext): void {
  currentUserContext = user;
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  currentUserContext = {};
}

/**
 * Track a UI event
 */
export function trackUIEvent(
  eventType: UIEventType,
  attributes: Record<string, string | number | boolean> = {},
): void {
  if (!tracer) {
    return;
  }

  const span = tracer.startSpan(`ui.${eventType}`);

  try {
    // Add session metadata
    const sessionMeta = getSessionMetadata();
    span.setAttribute(SpanAttributes.SESSION_ID, sessionMeta.sessionId);

    // Add user context
    if (currentUserContext.userId) {
      span.setAttribute(SpanAttributes.USER_ID, currentUserContext.userId);
    }
    if (currentUserContext.email) {
      span.setAttribute(SpanAttributes.USER_EMAIL, currentUserContext.email);
    }
    if (currentUserContext.role) {
      span.setAttribute(SpanAttributes.USER_ROLE, currentUserContext.role);
    }

    // Add event type
    span.setAttribute(SpanAttributes.EVENT_TYPE, eventType);

    // Add custom attributes
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } finally {
    span.end();
  }
}

/**
 * Track a page view
 */
export function trackPageView(path: string, title?: string): void {
  trackUIEvent(UIEventType.PAGE_VIEW, {
    [SpanAttributes.PAGE_PATH]: path,
    [SpanAttributes.PAGE_TITLE]: title || document.title,
  });
}

/**
 * Track a click event
 */
export function trackClick(componentName: string, targetId?: string, targetText?: string): void {
  trackUIEvent(UIEventType.CLICK, {
    [SpanAttributes.COMPONENT_NAME]: componentName,
    ...(targetId && { [SpanAttributes.TARGET_ID]: targetId }),
    ...(targetText && { [SpanAttributes.TARGET_TEXT]: targetText }),
  });
}

/**
 * Track an error
 */
export function trackError(error: Error, componentName?: string): void {
  if (!tracer) {
    return;
  }

  const span = tracer.startSpan('ui.error');

  try {
    span.setAttribute(SpanAttributes.SESSION_ID, getSessionId());
    span.setAttribute(SpanAttributes.EVENT_TYPE, UIEventType.ERROR);
    span.setAttribute(SpanAttributes.ERROR_TYPE, error.name);
    span.setAttribute(SpanAttributes.ERROR_MESSAGE, error.message);

    if (error.stack) {
      span.setAttribute(SpanAttributes.ERROR_STACK, error.stack);
    }
    if (componentName) {
      span.setAttribute(SpanAttributes.COMPONENT_NAME, componentName);
    }

    // Add user context
    if (currentUserContext.userId) {
      span.setAttribute(SpanAttributes.USER_ID, currentUserContext.userId);
    }

    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  } finally {
    span.end();
  }
}

/**
 * Create a span for an async operation
 */
export function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes: Record<string, string | number | boolean> = {},
): Promise<T> {
  if (!tracer) {
    return fn(null as unknown as Span);
  }

  return tracer.startActiveSpan(name, async (span) => {
    try {
      // Add session and user context
      span.setAttribute(SpanAttributes.SESSION_ID, getSessionId());
      if (currentUserContext.userId) {
        span.setAttribute(SpanAttributes.USER_ID, currentUserContext.userId);
      }

      // Add custom attributes
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });

      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
