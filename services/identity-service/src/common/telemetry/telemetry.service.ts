import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace, context, SpanStatusCode, Tracer, Span, SpanKind } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

/**
 * Span context for tracing
 */
export interface SpanContext {
  name: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * OpenTelemetry Tracing Service
 *
 * Provides distributed tracing for the identity-service.
 *
 * 2026 Best Practices:
 * - Automatic trace context propagation
 * - Custom span creation for business operations
 * - Error tracking with stack traces
 * - Batch export for performance
 */
@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name);
  private provider?: NodeTracerProvider;
  private tracer?: Tracer;
  private readonly serviceName = 'identity-service';
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const enabled = this.configService.get<boolean>('telemetry.enabled', false);
    const endpoint = this.configService.get<string>('telemetry.endpoint');

    if (!enabled) {
      this.logger.log('OpenTelemetry tracing is disabled');
      return;
    }

    if (!endpoint) {
      this.logger.warn('OTEL_EXPORTER_OTLP_ENDPOINT not configured, tracing disabled');
      return;
    }

    try {
      const environment = this.configService.get<string>('NODE_ENV', 'development');
      const version = this.configService.get<string>('version', '1.0.0');

      // Create resource with service info
      const resource = new Resource({
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_SERVICE_VERSION]: version,
        [ATTR_DEPLOYMENT_ENVIRONMENT]: environment,
      });

      // Create trace exporter
      const exporter = new OTLPTraceExporter({
        url: endpoint,
      });

      // Create provider
      this.provider = new NodeTracerProvider({
        resource,
      });

      // Use batch processor in production, simple in development
      if (environment === 'production') {
        this.provider.addSpanProcessor(
          new BatchSpanProcessor(exporter, {
            maxQueueSize: 2048,
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
          }),
        );
      } else {
        this.provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
      }

      // Register provider
      this.provider.register();

      // Get tracer
      this.tracer = trace.getTracer(this.serviceName, version);

      this.isInitialized = true;
      this.logger.log(`OpenTelemetry tracing initialized, exporting to: ${endpoint}`);
    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry', error);
    }
  }

  async onModuleDestroy() {
    if (this.provider) {
      await this.provider.shutdown();
      this.logger.log('OpenTelemetry provider shut down');
    }
  }

  /**
   * Create a span and execute a function within it
   */
  async withSpan<T>(ctx: SpanContext, fn: (span: Span) => Promise<T>): Promise<T> {
    if (!this.isInitialized || !this.tracer) {
      return fn({} as Span);
    }

    const span = this.tracer.startSpan(ctx.name, {
      kind: ctx.kind ?? SpanKind.INTERNAL,
      attributes: ctx.attributes,
    });

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Create a child span from current context
   */
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
    if (!this.isInitialized || !this.tracer) {
      return {} as Span;
    }

    return this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes,
    });
  }

  /**
   * Add attributes to current span
   */
  addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Record an event on current span
   */
  recordSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Record an error on current span
   */
  recordSpanError(error: Error): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  /**
   * Get current trace ID (for logging correlation)
   */
  getTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().traceId;
  }

  /**
   * Check if tracing is enabled
   */
  isEnabled(): boolean {
    return this.isInitialized;
  }
}
