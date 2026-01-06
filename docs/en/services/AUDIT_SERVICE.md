# Audit Service

> Compliance and audit logging service with ClickHouse (7-year retention)

## Overview

The Audit Service provides centralized audit logging for regulatory compliance. It captures UI events, API logs, audit trails, and sessions with 7-year retention for compliance requirements.

| Property  | Value                      |
| --------- | -------------------------- |
| REST Port | 3003                       |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | audit_db (ClickHouse)      |

## Architecture

```
Browser (web-admin)
  │ OTEL SDK
  ▼
OTEL Collector
  │ processors: batch, memory_limiter
  ▼
ClickHouse (audit_db)
  │
  ▼
Audit Service (NestJS)
  └── AdminAuditController (/v1/audit/*)
```

## API Reference

> See `.ai/services/audit-service.md` for quick endpoint list.

All endpoints require `AdminAuthGuard` with `audit:read` permission.

### UI Events API

| Method | Endpoint                  | Description      |
| ------ | ------------------------- | ---------------- |
| GET    | `/v1/audit/ui-events`     | List UI events   |
| GET    | `/v1/audit/ui-events/:id` | Get single event |

### API Logs API

| Method | Endpoint                 | Description    |
| ------ | ------------------------ | -------------- |
| GET    | `/v1/audit/api-logs`     | List API logs  |
| GET    | `/v1/audit/api-logs/:id` | Get single log |

### Audit Logs API

| Method | Endpoint                   | Description     |
| ------ | -------------------------- | --------------- |
| GET    | `/v1/audit/audit-logs`     | List audit logs |
| GET    | `/v1/audit/audit-logs/:id` | Get single log  |

### Sessions API

| Method | Endpoint                        | Description      |
| ------ | ------------------------------- | ---------------- |
| GET    | `/v1/audit/sessions`            | List sessions    |
| GET    | `/v1/audit/sessions/:id`        | Get session      |
| GET    | `/v1/audit/sessions/:id/events` | Session's events |

### Traces & Activity API

| Method | Endpoint                              | Description      |
| ------ | ------------------------------------- | ---------------- |
| GET    | `/v1/audit/traces/:traceId`           | Correlated trace |
| GET    | `/v1/audit/actors/:actorId/activity`  | Actor history    |
| GET    | `/v1/audit/targets/:targetId/history` | Target history   |
| GET    | `/v1/audit/stats/overview`            | Stats overview   |

## ClickHouse Schema

### admin_ui_events

Tracks all admin UI interactions.

```sql
CREATE TABLE audit_db.admin_ui_events (
    id UUID DEFAULT generateUUIDv7(),
    date Date DEFAULT toDate(timestamp),
    timestamp DateTime64(3),
    actor_id UUID,
    actor_email String,
    session_id String,
    service_id Nullable(UUID),
    event_type LowCardinality(String),  -- click, page_view, form_submit, modal_open, error
    event_name String,                   -- sanction_create_btn, tester_add_btn
    event_category LowCardinality(String),
    page_path String,
    trace_id String,
    span_id String,
    metadata String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, actor_id, session_id, timestamp, id)
TTL date + INTERVAL 7 YEAR;
```

### admin_api_logs

Tracks all admin API requests with performance metrics.

```sql
CREATE TABLE audit_db.admin_api_logs (
    id UUID DEFAULT generateUUIDv7(),
    date Date DEFAULT toDate(timestamp),
    timestamp DateTime64(3),
    actor_id UUID,
    actor_email String,
    session_id String,
    service_id Nullable(UUID),
    method LowCardinality(String),
    path String,
    path_template String,
    status_code UInt16,
    response_time_ms UInt32,
    error_type LowCardinality(String),
    error_message String,
    ui_event_id Nullable(UUID),
    trace_id String,
    span_id String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, service_id, path_template, timestamp, id)
TTL date + INTERVAL 7 YEAR;
```

### admin_audit_logs

Core compliance table with tamper detection.

```sql
CREATE TABLE audit_db.admin_audit_logs (
    id UUID DEFAULT generateUUIDv7(),
    date Date DEFAULT toDate(timestamp),
    timestamp DateTime64(3),
    actor_id UUID,
    actor_email String,
    service_id UUID,
    resource LowCardinality(String),   -- service_config, tester_user, sanction
    action LowCardinality(String),      -- create, update, delete, revoke
    target_id UUID,
    target_name String,
    before_state Nullable(String),
    after_state Nullable(String),
    changed_fields Array(String),
    change_diff String,
    reason String,
    ip_address String,
    user_agent String,
    compliance_tags Array(String),      -- ['GDPR', 'PIPA', 'SOX']
    checksum String,                    -- SHA-256 for tamper detection
    legal_hold Bool DEFAULT false,
    trace_id String,
    span_id String,
    api_log_id Nullable(UUID)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, service_id, resource, timestamp, id)
TTL date + INTERVAL 7 YEAR DELETE WHERE NOT legal_hold;
```

### admin_sessions

Session management with activity metrics.

```sql
CREATE TABLE audit_db.admin_sessions (
    id String,
    date Date DEFAULT toDate(started_at),
    actor_id UUID,
    actor_email String,
    started_at DateTime64(3),
    last_activity_at DateTime64(3),
    page_views UInt32,
    clicks UInt32,
    api_calls UInt32,
    data_changes UInt32,
    status LowCardinality(String),
    ip_address String,
    user_agent String
) ENGINE = ReplacingMergeTree(last_activity_at)
PARTITION BY toYYYYMM(date)
ORDER BY (date, actor_id, id)
TTL date + INTERVAL 2 YEAR;
```

## Resource Types

| Resource        | Actions                        |
| --------------- | ------------------------------ |
| service_config  | update                         |
| service_domain  | create, delete                 |
| service_feature | create, update, delete         |
| tester_user     | create, delete                 |
| tester_admin    | create, delete                 |
| sanction        | create, update, revoke, extend |
| sanction_appeal | create, approve, reject        |

## Data Retention

| Table                 | Retention | Legal Hold       |
| --------------------- | --------- | ---------------- |
| admin_ui_events       | 7 years   | No               |
| admin_api_logs        | 7 years   | No               |
| admin_audit_logs      | 7 years   | Yes (TTL exempt) |
| admin_sessions        | 2 years   | No               |
| admin\_\*\_hourly MVs | 90 days   | No               |
| admin\_\*\_daily MVs  | 1-2 years | No               |

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

## Query Examples

```sql
-- UI events by actor in last 7 days
SELECT event_type, event_name, count() as cnt
FROM audit_db.admin_ui_events
WHERE actor_id = {actorId:UUID}
  AND date >= today() - 7
GROUP BY event_type, event_name
ORDER BY cnt DESC;

-- Slowest API endpoints (last 24h)
SELECT path_template, method,
    avg(response_time_ms) as avg_time,
    quantile(0.95)(response_time_ms) as p95_time
FROM audit_db.admin_api_logs
WHERE date >= today() - 1
GROUP BY path_template, method
ORDER BY p95_time DESC
LIMIT 20;

-- Data changes for a specific target
SELECT timestamp, actor_email, action, changed_fields, reason
FROM audit_db.admin_audit_logs
WHERE target_id = {targetId:UUID}
ORDER BY timestamp DESC;
```

## Related Documentation

- [Admin Audit Guide](../guides/ADMIN_AUDIT.md)
- [OTEL Browser Guide](../guides/OTEL_BROWSER.md)
- [ClickHouse Infrastructure](../infrastructure/CLICKHOUSE.md)
