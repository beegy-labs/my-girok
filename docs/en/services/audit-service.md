# Audit Service

> Compliance logging and audit trail with ClickHouse

## Service Info

| Property | Value                     |
| -------- | ------------------------- |
| REST     | :3003                     |
| gRPC     | N/A                       |
| Database | audit_db (ClickHouse)     |
| Cache    | Valkey DB 3               |
| Events   | N/A                       |
| Codebase | `services/audit-service/` |

## Domain Boundaries

| This Service Owns | NOT This Service (Other Services)  |
| ----------------- | ---------------------------------- |
| UI Events         | Business analytics (analytics-svc) |
| API Logs          | Session management (identity-svc)  |
| Data Audit        | Authorization (auth-service)       |
| Compliance        | User data (personal-service)       |

## REST API

### Audit Logs

| Method | Endpoint                   | Description         |
| ------ | -------------------------- | ------------------- |
| GET    | `/v1/audit/ui-events`      | List UI events      |
| GET    | `/v1/audit/ui-events/:id`  | Get UI event by ID  |
| GET    | `/v1/audit/api-logs`       | List API logs       |
| GET    | `/v1/audit/api-logs/:id`   | Get API log by ID   |
| GET    | `/v1/audit/audit-logs`     | List audit logs     |
| GET    | `/v1/audit/audit-logs/:id` | Get audit log by ID |

### Session & Trace

| Method | Endpoint                              | Description           |
| ------ | ------------------------------------- | --------------------- |
| GET    | `/v1/audit/sessions/:id/events`       | Get session events    |
| GET    | `/v1/audit/traces/:traceId`           | Get trace details     |
| GET    | `/v1/audit/targets/:targetId/history` | Target change history |
| GET    | `/v1/audit/actor/:id`                 | Actor activity        |
| GET    | `/v1/audit/errors`                    | List errors           |
| GET    | `/v1/audit/stats/overview`            | Stats overview        |

### Exports & Retention

| Method | Endpoint                   | Description               |
| ------ | -------------------------- | ------------------------- |
| POST   | `/v1/exports`              | Create export job         |
| GET    | `/v1/exports`              | List exports              |
| GET    | `/v1/exports/:id/download` | Download export           |
| GET    | `/v1/retention/policies`   | Get retention policies    |
| PUT    | `/v1/retention/policies`   | Update retention policies |

## Database Tables (ClickHouse)

| Table            | TTL | Purpose                       |
| ---------------- | --- | ----------------------------- |
| admin_ui_events  | 7y  | Admin UI interaction tracking |
| admin_api_logs   | 7y  | Admin API call logging        |
| admin_audit_logs | 7y  | Data change audit trail       |
| admin_sessions   | 2y  | Admin session tracking        |
| consent_history  | 5y  | Consent change history        |

## Materialized Views

| MV                     | TTL | Purpose                    |
| ---------------------- | --- | -------------------------- |
| admin_ui_events_hourly | 90d | Hourly UI event aggregates |
| admin_audit_daily      | 2y  | Daily audit summaries      |
| admin_errors           | 30d | Error aggregates           |

## Cache Keys (Valkey)

| Key Pattern            | TTL   | Description            |
| ---------------------- | ----- | ---------------------- |
| `audit:export:{id}`    | 24h   | Export job status      |
| `audit:retention:{id}` | 1h    | Retention policy cache |
| `audit:session:{id}`   | 30min | Session data cache     |

## Environment Variables

```bash
# REST API port
PORT=3003

# ClickHouse configuration
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=audit_db
CLICKHOUSE_USERNAME=audit_user
CLICKHOUSE_PASSWORD=
CLICKHOUSE_ASYNC_INSERT=true
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true

# Valkey cache
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_DB=3

# MinIO (S3-compatible) for exports
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_EXPORT_BUCKET=audit-exports
```

---

**Schema**: `infrastructure/clickhouse/schemas/01-audit_db.sql`
**LLM Reference**: `docs/llm/services/audit-service.md`
