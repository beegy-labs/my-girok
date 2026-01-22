# Observability - 2026 Best Practices

> OpenTelemetry, distributed tracing, metrics, logging | **Researched**: 2026-01-22

## Three Pillars of Observability

| Signal      | Purpose                      | OpenTelemetry API |
| ----------- | ---------------------------- | ----------------- |
| **Traces**  | Request flow across services | `TracerProvider`  |
| **Metrics** | Quantitative measurements    | `MeterProvider`   |
| **Logs**    | Discrete events              | `LoggerProvider`  |

## OpenTelemetry Setup

### Node.js SDK Configuration

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'auth-service',
    [ATTR_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://otel-collector:4318/v1/metrics',
    }),
    exportIntervalMillis: 60000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

### Manual Span Creation

```typescript
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('auth-service');

async function authenticateUser(email: string): Promise<User> {
  return tracer.startActiveSpan('authenticate-user', { kind: SpanKind.INTERNAL }, async (span) => {
    try {
      span.setAttribute('user.email', email);

      const user = await findUserByEmail(email);
      if (!user) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'User not found' });
        throw new Error('User not found');
      }

      span.setAttribute('user.id', user.id);
      span.setStatus({ code: SpanStatusCode.OK });
      return user;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Context Propagation

### W3C Trace Context

```typescript
// Automatic propagation with HTTP instrumentation
// Headers: traceparent, tracestate

// Manual propagation for custom transports
import { propagation, context } from '@opentelemetry/api';

// Extract context from incoming request
const extractedContext = propagation.extract(context.active(), request.headers);

// Inject context into outgoing request
const headers: Record<string, string> = {};
propagation.inject(context.active(), headers);
```

### Cross-Service Tracing

```
Service A           Service B           Service C
    │                   │                   │
    │ traceparent       │                   │
    ├──────────────────>│                   │
    │                   │ traceparent       │
    │                   ├──────────────────>│
    │                   │                   │
    │<──────────────────┼───────────────────┤
```

## Collector Deployment

### Agent Pattern (Sidecar)

```yaml
# Kubernetes DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector-agent
spec:
  template:
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector:latest
          env:
            - name: K8S_NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
```

**Pros**: Low latency, isolation between apps
**Cons**: More resource usage

### Gateway Pattern (Centralized)

```yaml
# Collector configuration
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 1000

exporters:
  otlp/tempo:
    endpoint: tempo:4317
  prometheus:
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
```

## Sampling Strategies

### Head-Based Sampling

```typescript
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

// Sample 10% of traces
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),
});
```

### Tail-Based Sampling (Collector)

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      # Always sample errors
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Sample 5% of successful requests
      - name: success-sample
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
      # Always sample slow requests
      - name: latency
        type: latency
        latency:
          threshold_ms: 1000
```

### Sampling Guidelines

| Traffic Level       | Sampling Rate | Strategy       |
| ------------------- | ------------- | -------------- |
| Low (<1K RPS)       | 100%          | None needed    |
| Medium (1K-10K RPS) | 10-50%        | Head-based     |
| High (>10K RPS)     | 1-5%          | Tail-based     |
| Errors              | 100%          | Always capture |

## Metrics Best Practices

### Custom Business Metrics

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('auth-service');

// Counter
const loginAttempts = meter.createCounter('auth.login.attempts', {
  description: 'Number of login attempts',
  unit: '1',
});

// Histogram
const loginDuration = meter.createHistogram('auth.login.duration', {
  description: 'Login request duration',
  unit: 'ms',
});

// Usage
loginAttempts.add(1, { method: 'password', success: 'true' });
loginDuration.record(150, { method: 'password' });
```

### Key Metrics to Track

| Category     | Metric        | Type      |
| ------------ | ------------- | --------- |
| Availability | Error rate    | Counter   |
| Latency      | P50, P95, P99 | Histogram |
| Throughput   | Requests/sec  | Counter   |
| Saturation   | CPU, Memory   | Gauge     |

## Log Correlation

### Structured Logging with Trace Context

```typescript
import { trace, context } from '@opentelemetry/api';
import pino from 'pino';

const logger = pino({
  mixin() {
    const span = trace.getSpan(context.active());
    if (span) {
      const { traceId, spanId } = span.spanContext();
      return { traceId, spanId };
    }
    return {};
  },
});

// Logs automatically include trace context
logger.info({ userId: '123' }, 'User authenticated');
// Output: {"level":30,"traceId":"abc...","spanId":"def...","userId":"123","msg":"User authenticated"}
```

## Instrumentation Checklist

```
✅ HTTP client/server (auto-instrumented)
✅ Database queries (Prisma, pg, mysql)
✅ Redis operations
✅ gRPC calls
✅ Message queue operations (Kafka, BullMQ)
✅ External API calls
✅ Business-critical operations (manual spans)
```

## Performance Considerations

| Optimization              | Implementation                        |
| ------------------------- | ------------------------------------- |
| Batch exports             | `BatchSpanProcessor` with 10s timeout |
| Async export              | Never block application threads       |
| Selective instrumentation | Focus on critical paths               |
| Attribute limits          | Max 128 attributes per span           |
| Memory limits             | Configure `memory_limiter` processor  |

## Anti-Patterns

| Don't                | Do                        | Reason           |
| -------------------- | ------------------------- | ---------------- |
| Log everything       | Sample appropriately      | Cost/performance |
| Huge span attributes | Keep attributes focused   | Memory/bandwidth |
| Sync span export     | Use batch processor       | Latency          |
| Skip error spans     | Always capture errors     | Debugging        |
| Ignore trace context | Propagate across services | Correlation      |

## Sources

- [OpenTelemetry Traces Documentation](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenTelemetry Best Practices](https://betterstack.com/community/guides/observability/opentelemetry-best-practices/)
- [Distributed Observability Playbook 2026](https://bix-tech.com/distributed-observability-for-data-pipelines-with-opentelemetry-a-practical-endtoend-playbook-for-2026/)
- [vFunction OpenTelemetry Guide](https://vfunction.com/blog/opentelemetry-tracing-guide/)
- [Coralogix OpenTelemetry Tutorial](https://coralogix.com/guides/opentelemetry/opentelemetry-tracing-how-it-works-tutorial-and-best-practices/)
