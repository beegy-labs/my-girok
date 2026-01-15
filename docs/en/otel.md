# OTEL Integration

> OpenTelemetry patterns for admin audit and observability

## Architecture Overview

The observability stack uses OpenTelemetry to collect traces, metrics, and logs from both browser and backend applications:

```
Browser (OTEL SDK) --OTLP/HTTP--> OTEL Collector --> ClickHouse (audit_db)
NestJS (OTEL SDK)  --OTLP/gRPC--> OTEL Collector --> ClickHouse (otel)
```

## Pipelines

| Pipeline   | Source          | Database | TTL     |
| ---------- | --------------- | -------- | ------- |
| traces     | NestJS, Browser | otel     | 30 days |
| metrics    | NestJS          | otel     | 30 days |
| logs/admin | Browser SDK     | audit_db | 7 years |

Different data types have different retention periods based on compliance requirements and operational needs.

## Admin Routing

Logs with special attributes are routed to the audit database for long-term compliance storage:

```typescript
// Logs with audit.type = "admin" -> audit_db
otel.setAttributes({
  'audit.type': 'admin',
  'session.id': sessionId,
  'actor.id': user.sub,
});
```

## Browser SDK Setup

Configure the WebTracerProvider for browser-side telemetry:

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const tracerProvider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'web-admin',
    'audit.type': 'admin',
  }),
});
```

## Session Management

Generate and persist session IDs for correlating events within a user session:

```typescript
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('otel_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('otel_session_id', sessionId);
  }
  return sessionId;
};
```

## Event Tracking

Use the audit event hooks for tracking user interactions:

```typescript
import { useAuditEvent } from '@/hooks';
const { trackButtonClick, trackFormSubmit } = useAuditEvent();

<Button onClick={() => trackButtonClick('sanction_create_btn', 'create-sanction', 'Create')}>
```

## Standard Attributes

| Category | Attributes                                     |
| -------- | ---------------------------------------------- |
| Session  | session.id, session.start, session.sequence    |
| Actor    | actor.id, actor.email, actor.scope, actor.role |
| Event    | event.type, event.name, event.category         |
| Service  | service.id, service.slug                       |

Consistent attribute naming enables effective filtering and querying across all telemetry data.

## Retention Policies

| Data         | TTL     |
| ------------ | ------- |
| UI Events    | 7 years |
| API Logs     | 7 years |
| Audit Logs   | 7 years |
| Sessions     | 2 years |
| General OTEL | 30 days |

Compliance-related data (UI events, API logs, audit logs) are retained for 7 years per regulatory requirements. General operational telemetry is retained for 30 days.

---

**LLM Reference**: `docs/llm/otel.md`
