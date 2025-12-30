# Audit Service

> Compliance and audit logging service with ClickHouse storage

## Overview

The Audit Service provides centralized audit logging for the Admin Audit System. It captures UI events, API logs, audit trails, and sessions for 7-year regulatory compliance.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (web-admin)                       │
│  - OTEL Browser SDK (WebTracerProvider + BatchSpanProcessor)│
└─────────────────────────────────────────────────────────────┘
              │ OTLP (protobuf)
              ▼
┌─────────────────────────────────────────────────────────────┐
│              OTEL Collector (Kubernetes)                     │
│  - receivers: otlp (grpc, http)                             │
│  - processors: batch, memory_limiter                        │
│  - exporters: clickhouse                                    │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ClickHouse (audit_db)                     │
│  - admin_ui_events (7yr)    - admin_api_logs (7yr)          │
│  - admin_audit_logs (7yr)   - admin_sessions (2yr)          │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Audit Service (NestJS)                    │
│  - AdminAuditController (/v1/audit/*)                       │
│  - AdminAuditService (CircuitBreaker + ClickHouse queries)  │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

All endpoints require `AdminAuthGuard` with `audit:read` permission.

### UI Events

| Method | Endpoint                  | Description                    |
| ------ | ------------------------- | ------------------------------ |
| GET    | `/v1/audit/ui-events`     | List UI events with pagination |
| GET    | `/v1/audit/ui-events/:id` | Get single UI event            |

### API Logs

| Method | Endpoint                 | Description                   |
| ------ | ------------------------ | ----------------------------- |
| GET    | `/v1/audit/api-logs`     | List API logs with pagination |
| GET    | `/v1/audit/api-logs/:id` | Get single API log            |

### Audit Logs

| Method | Endpoint                   | Description                     |
| ------ | -------------------------- | ------------------------------- |
| GET    | `/v1/audit/audit-logs`     | List audit logs with pagination |
| GET    | `/v1/audit/audit-logs/:id` | Get single audit log            |

### Sessions

| Method | Endpoint                               | Description                   |
| ------ | -------------------------------------- | ----------------------------- |
| GET    | `/v1/audit/sessions`                   | List sessions with pagination |
| GET    | `/v1/audit/sessions/:sessionId`        | Get session details           |
| GET    | `/v1/audit/sessions/:sessionId/events` | Get session's UI events       |

### Traces & Activity

| Method | Endpoint                              | Description                  |
| ------ | ------------------------------------- | ---------------------------- |
| GET    | `/v1/audit/traces/:traceId`           | Get correlated trace data    |
| GET    | `/v1/audit/actors/:actorId/activity`  | Get actor's activity history |
| GET    | `/v1/audit/targets/:targetId/history` | Get target's change history  |

### Stats

| Method | Endpoint                   | Description             |
| ------ | -------------------------- | ----------------------- |
| GET    | `/v1/audit/stats/overview` | Get statistics overview |

## Resilience

### CircuitBreaker

```typescript
const circuitBreaker = new CircuitBreaker({
  name: 'clickhouse-audit',
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 30000, // Wait 30s before half-open
  successThreshold: 2, // Close after 2 successes
});
```

## Data Retention

| Table            | Retention | Purpose                 |
| ---------------- | --------- | ----------------------- |
| admin_ui_events  | 7 years   | UI interaction tracking |
| admin_api_logs   | 7 years   | API request logging     |
| admin_audit_logs | 7 years   | Data change audit trail |
| admin_sessions   | 2 years   | Session analytics       |

## Related Documentation

- [.ai/services/audit-service.md](../../.ai/services/audit-service.md)
- [docs/guides/ADMIN_AUDIT.md](../guides/ADMIN_AUDIT.md)
- [docs/guides/OTEL_BROWSER.md](../guides/OTEL_BROWSER.md)
