# audit-service

```yaml
port: 4002
grpc: 50054
db: audit_db (ClickHouse)
cache: Valkey DB 3
codebase: services/audit-service/
```

## Boundaries

| Owns       | Not                |
| ---------- | ------------------ |
| UI Events  | Business analytics |
| API Logs   | Session mgmt       |
| Data Audit | Authorization      |
| Compliance | User data          |

## REST

```
GET /v1/audit/ui-events[/:id]
GET /v1/audit/api-logs[/:id]
GET /v1/audit/audit-logs[/:id]
GET /v1/audit/sessions/:id/events
GET /v1/audit/traces/:traceId
GET /v1/audit/targets/:targetId/history
GET /v1/audit/actor/:id
GET /v1/audit/errors
GET /v1/audit/stats/overview
POST/GET /v1/exports[/:id/download]
GET/PUT /v1/retention/policies
```

## gRPC (50054)

| Method                   | Desc               |
| ------------------------ | ------------------ |
| LogAuthEvent             | Log auth event     |
| GetAuthEvents            | Query auth events  |
| LogSecurityEvent         | Log security event |
| GetSecurityEvents        | Query security     |
| LogAdminAction           | Log admin action   |
| GetAdminAuditLog         | Query admin audit  |
| GenerateComplianceReport | Generate report    |

Proto: `packages/proto/audit/v1/audit.proto`

## Tables

| Table            | TTL | Purpose      |
| ---------------- | --- | ------------ |
| admin_ui_events  | 7y  | UI tracking  |
| admin_api_logs   | 7y  | API tracking |
| admin_audit_logs | 7y  | Data audit   |
| admin_sessions   | 2y  | Sessions     |
| consent_history  | 5y  | Consent      |

## MVs

| MV                     | TTL |
| ---------------------- | --- |
| admin_ui_events_hourly | 90d |
| admin_audit_daily      | 2y  |
| admin_errors           | 30d |

## Cache

| Key                    | TTL |
| ---------------------- | --- |
| `audit:export:{id}`    | 24h |
| `audit:retention:{id}` | 1h  |
| `audit:session:{id}`   | 30m |

## Env

```bash
PORT=3003
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_DATABASE=audit_db
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true
VALKEY_HOST=localhost
VALKEY_DB=3
```

---

Schema: `infrastructure/clickhouse/schemas/01-audit_db.sql`
Full: `docs/en/services/AUDIT_SERVICE.md`
