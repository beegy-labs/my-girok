# Audit Service

> Compliance logging with ClickHouse (7-year retention)

## Service Info

| Property | Value                     |
| -------- | ------------------------- |
| REST     | :3003                     |
| Database | audit_db (ClickHouse)     |
| Cache    | Valkey DB 3               |
| Codebase | `services/audit-service/` |

## REST API

### Admin Audit Queries

```
GET  /v1/audit/ui-events, /v1/audit/ui-events/:id
GET  /v1/audit/api-logs, /v1/audit/api-logs/:id
GET  /v1/audit/audit-logs, /v1/audit/audit-logs/:id
GET  /v1/audit/sessions, /v1/audit/sessions/:id/events
GET  /v1/audit/traces/:traceId
GET  /v1/audit/targets/:targetId/history
GET  /v1/audit/actor/:id
GET  /v1/audit/errors
GET  /v1/audit/stats/overview
```

### Legacy Endpoints

```
POST/GET  /v1/audit/logs, /v1/audit/logs/:id
GET       /v1/audit/logs/export, /v1/audit/logs/stats
GET       /v1/consent/history, /v1/consent/stats
GET       /v1/admin-actions, /v1/admin-actions/:id
POST/GET  /v1/exports, /v1/exports/:id/download
GET/PUT   /v1/retention/policies
```

## ClickHouse Tables

| Table            | TTL     | Purpose              |
| ---------------- | ------- | -------------------- |
| admin_ui_events  | 7 years | UI event tracking    |
| admin_api_logs   | 7 years | API request tracking |
| admin_audit_logs | 7 years | Data change audit    |
| admin_sessions   | 2 years | Session management   |
| consent_history  | 5 years | Consent changes      |
| access_logs      | 5 years | API access history   |

### Admin UI Events

```sql
-- Key columns
actor_id UUID, session_id String
event_type LowCardinality  -- click, page_view, form_submit, modal_open, error
event_name String          -- sanction_create_btn, tester_add_btn
page_path String           -- /services/xxx/sanctions
trace_id String            -- OTEL correlation

ORDER BY (date, actor_id, session_id, timestamp, id)
```

### Admin Audit Logs (Compliance)

```sql
-- Key columns
actor_id UUID, service_id UUID
resource LowCardinality     -- service_config, tester_user, sanction
action LowCardinality       -- create, update, delete, revoke
target_id UUID
before_state, after_state   -- JSON snapshots
changed_fields Array(String)
checksum String             -- SHA-256 tamper detection
legal_hold Bool             -- Prevent TTL deletion

ORDER BY (date, service_id, resource, timestamp, id)
```

## Materialized Views

| MV                     | TTL     | Purpose           |
| ---------------------- | ------- | ----------------- |
| admin_ui_events_hourly | 90 days | Hourly aggregates |
| admin_audit_daily      | 2 years | Daily changes     |
| admin_errors           | 30 days | Error tracking    |
| admin_actor_daily      | 1 year  | Actor activity    |
| admin_api_performance  | 90 days | API performance   |

## Caching (Valkey DB 3)

| Key Pattern                  | TTL |
| ---------------------------- | --- |
| `audit:export:{exportId}`    | 24h |
| `audit:retention:{policyId}` | 1h  |
| `audit:session:{sessionId}`  | 30m |

## OTEL Integration

```
Browser OTEL SDK → OTEL Collector → ClickHouse
```

| OTEL Attribute | ClickHouse Column |
| -------------- | ----------------- |
| session.id     | session_id        |
| actor.id       | actor_id          |
| event.type     | event_type        |
| http.route     | path_template     |

## Environment

```bash
PORT=3003
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_DATABASE=audit_db
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true
VALKEY_HOST=localhost
VALKEY_DB=3
```

---

**Schema**: `infrastructure/clickhouse/schemas/01-audit_db.sql`
**Full docs**: `docs/services/AUDIT_SERVICE.md`
