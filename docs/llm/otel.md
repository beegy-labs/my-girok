# OTEL Integration

OpenTelemetry patterns for admin audit and observability

## Architecture

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

## Admin Routing

```typescript
// Logs with audit.type = "admin" -> audit_db
otel.setAttributes({
  'audit.type': 'admin',
  'session.id': sessionId,
  'actor.id': user.sub,
});
```

## Browser SDK

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

## Session

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

## Retention

| Data         | TTL     |
| ------------ | ------- |
| UI Events    | 7 years |
| API Logs     | 7 years |
| Audit Logs   | 7 years |
| Sessions     | 2 years |
| General OTEL | 30 days |
