# Audit Service

> Compliance logging with ClickHouse (7-year retention)

## Service Info

| Property | Value                     |
| -------- | ------------------------- |
| REST     | :3010                     |
| gRPC     | N/A                       |
| Database | audit_db (ClickHouse)     |
| Cache    | Valkey DB 3               |
| Events   | N/A                       |
| Codebase | `services/audit-service/` |

## Domain Boundaries

| This Service       | NOT This Service               |
| ------------------ | ------------------------------ |
| UI Event Tracking  | Business analytics (analytics) |
| API Request Logs   | Session management (identity)  |
| Data Change Audit  | Authorization (auth)           |
| Compliance Reports | User data (personal)           |

## REST API

```
GET  /v1/audit/ui-events, /v1/audit/ui-events/:id
GET  /v1/audit/api-logs, /v1/audit/api-logs/:id
GET  /v1/audit/audit-logs, /v1/audit/audit-logs/:id
GET  /v1/audit/sessions/:id/events
GET  /v1/audit/traces/:traceId
GET  /v1/audit/targets/:targetId/history
GET  /v1/audit/actor/:id
GET  /v1/audit/errors
GET  /v1/audit/stats/overview

POST/GET  /v1/exports, /v1/exports/:id/download
GET/PUT   /v1/retention/policies
```

## gRPC Server

N/A - REST only

## Database Tables

| Table            | TTL     | Purpose              |
| ---------------- | ------- | -------------------- |
| admin_ui_events  | 7 years | UI event tracking    |
| admin_api_logs   | 7 years | API request tracking |
| admin_audit_logs | 7 years | Data change audit    |
| admin_sessions   | 2 years | Session management   |
| consent_history  | 5 years | Consent changes      |

## Materialized Views

| MV                     | TTL     | Purpose           |
| ---------------------- | ------- | ----------------- |
| admin_ui_events_hourly | 90 days | Hourly aggregates |
| admin_audit_daily      | 2 years | Daily changes     |
| admin_errors           | 30 days | Error tracking    |

## Events

N/A

## Caching

| Key Pattern                  | TTL |
| ---------------------------- | --- |
| `audit:export:{exportId}`    | 24h |
| `audit:retention:{policyId}` | 1h  |
| `audit:session:{sessionId}`  | 30m |

## Environment

```bash
PORT=3010
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_DATABASE=audit_db
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true
VALKEY_HOST=localhost
VALKEY_DB=3
```

---

**Schema**: `infrastructure/clickhouse/schemas/01-audit_db.sql`
**SSOT**: `docs/llm/services/audit-service.md` | **Full docs**: `docs/en/services/audit-service.md`
