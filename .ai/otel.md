# OTEL Integration

> OpenTelemetry patterns for admin audit and observability | **Last Updated**: 2026-01-06

## Architecture

```
Browser (OTEL SDK) ──OTLP/HTTP──> OTEL Collector ──> ClickHouse (audit_db)
       │                                │
       └── traces, logs ────────────────┘

NestJS (OTEL SDK) ──OTLP/gRPC──> OTEL Collector ──> ClickHouse (otel)
       │                                │
       └── traces, metrics, logs ───────┘
```

## Pipelines

| Pipeline   | Source             | Database | TTL     |
| ---------- | ------------------ | -------- | ------- |
| traces     | NestJS, Browser    | otel     | 30 days |
| metrics    | NestJS, Prometheus | otel     | 30 days |
| logs       | Fluent Bit, NestJS | otel     | 30 days |
| logs/admin | Browser SDK        | audit_db | 7 years |

## Admin Audit Log Routing

Logs with `audit.type = "admin"` resource attribute are routed to `audit_db`:

```typescript
// Browser SDK sets this attribute
otel.setAttributes({
  'audit.type': 'admin',
  'session.id': sessionId,
  'actor.id': user.sub,
  'actor.email': user.email,
});
```

## Browser OTEL SDK Setup

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';

// Initialize providers
const tracerProvider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'web-admin',
    'audit.type': 'admin', // Routes to audit_db
  }),
});

// OTEL Collector endpoint
const collectorUrl = 'https://otel.girok.dev/v1';

// Trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${collectorUrl}/traces`,
});

// Log exporter for admin audit
const logExporter = new OTLPLogExporter({
  url: `${collectorUrl}/logs`,
});

const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
```

## Session Management

Generate session ID on page load, persist across navigation:

```typescript
// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('otel_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('otel_session_id', sessionId);
    sessionStorage.setItem('otel_session_start', new Date().toISOString());
    sessionStorage.setItem('otel_session_seq', '0');
  }
  return sessionId;
};

// Increment sequence for each event
const getNextSequence = (): number => {
  const seq = parseInt(sessionStorage.getItem('otel_session_seq') || '0', 10);
  sessionStorage.setItem('otel_session_seq', String(seq + 1));
  return seq + 1;
};
```

## Event Tracking

```typescript
import { useAuditEvent } from '@/hooks';

const AuditedButton = () => {
  const { trackButtonClick, trackFormSubmit } = useAuditEvent();

  return (
    <Button
      onClick={() => trackButtonClick(
        'sanction_create_btn',  // componentName
        'create-sanction',     // targetId
        'Create Sanction'      // targetText
      )}
    >
      Create Sanction
    </Button>
  );
};
```

## Standard Attributes

### Session Attributes

| Attribute        | Type     | Description            |
| ---------------- | -------- | ---------------------- |
| session.id       | string   | Browser session ID     |
| session.start    | DateTime | Session start time     |
| session.sequence | number   | Event order in session |

### Actor Attributes

| Attribute   | Type   | Description    |
| ----------- | ------ | -------------- |
| actor.id    | UUID   | Admin user ID  |
| actor.email | string | Admin email    |
| actor.scope | string | SYSTEM, TENANT |
| actor.role  | string | Role name      |

### Event Attributes

| Attribute      | Type   | Description                   |
| -------------- | ------ | ----------------------------- |
| event.type     | string | click, page_view, form_submit |
| event.name     | string | sanction_create_btn           |
| event.category | string | sanction, tester, config      |
| event.action   | string | open, submit, cancel          |

### Service Attributes

| Attribute    | Type   | Description     |
| ------------ | ------ | --------------- |
| service.id   | UUID   | Service context |
| service.slug | string | Service slug    |

## Data Sanitization

Sensitive fields are removed by OTEL Collector before storage:

- password
- token
- secret
- refresh_token
- authorization
- api_key
- credentials

## CORS Configuration

Browser OTLP requests require CORS headers:

```yaml
# OTEL Collector config
receivers:
  otlp:
    protocols:
      http:
        cors:
          allowed_origins:
            - 'https://*.girok.dev'
            - 'https://*.girok.com'
            - 'http://localhost:*'
          allowed_headers:
            - '*'
          max_age: 7200
```

## Trace Correlation

Link UI events to API calls using trace context:

```typescript
// In API hook
import { context, trace } from '@opentelemetry/api';

const fetchWithTrace = async (url: string, options: RequestInit) => {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;

  // Add trace header
  const headers = new Headers(options.headers);
  headers.set('X-Trace-ID', traceId || '');

  return fetch(url, { ...options, headers });
};
```

## NestJS Interceptor

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const span = trace.getActiveSpan();

    span?.setAttributes({
      'http.method': request.method,
      'http.route': this.getPathTemplate(request),
      'actor.id': request.user?.sub,
      'actor.type': request.user?.type,
      'service.id': request.params?.serviceId,
      'ui.event_id': request.headers['x-ui-event-id'],
    });

    return next.handle();
  }
}
```

## Retention

| Data         | TTL     | Legal Hold |
| ------------ | ------- | ---------- |
| UI Events    | 7 years | No         |
| API Logs     | 7 years | No         |
| Audit Logs   | 7 years | Yes        |
| Sessions     | 2 years | No         |
| General OTEL | 30 days | No         |

---

**Collector Config**: `platform-gitops/clusters/home/values/opentelemetry-values.yaml`
**ClickHouse Schema**: `infrastructure/clickhouse/schemas/01-audit_db.sql`
