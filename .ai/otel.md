# OTEL Integration

> OpenTelemetry patterns for observability | **Last Updated**: 2026-01-11

## Architecture

```
Browser (OTEL SDK) ──OTLP/HTTP──> OTEL Collector ──> ClickHouse
NestJS (OTEL SDK)  ──OTLP/gRPC──> OTEL Collector ──> ClickHouse
```

## Pipelines

| Pipeline   | Source             | Database | TTL     |
| ---------- | ------------------ | -------- | ------- |
| traces     | NestJS, Browser    | otel     | 30 days |
| metrics    | NestJS, Prometheus | otel     | 30 days |
| logs/admin | Browser SDK        | audit_db | 7 years |

## NestJS Setup

```typescript
// main.ts - MUST BE FIRST IMPORT
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'my-service' });
```

## Browser SDK

```typescript
import { useAuditEvent } from '@/hooks';
const { trackButtonClick, trackFormSubmit } = useAuditEvent();
```

## Key Attributes

| Category | Attributes                                        |
| -------- | ------------------------------------------------- |
| Session  | `session.id`, `session.start`, `session.sequence` |
| Actor    | `actor.id`, `actor.email`, `actor.role`           |
| Event    | `event.type`, `event.name`, `event.action`        |

## Retention

| Data         | TTL     |
| ------------ | ------- |
| Audit Logs   | 7 years |
| General OTEL | 30 days |

**SSOT**: `docs/llm/otel.md`
