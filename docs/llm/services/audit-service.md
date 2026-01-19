# audit-service

```yaml
port: 4002
grpc: 50054
db: audit_db (ClickHouse)
cache: Valkey DB 3
codebase: services/audit-service/
```

## Boundaries

| Owns              | Not                |
| ----------------- | ------------------ |
| UI Events         | Business analytics |
| API Logs          | Session mgmt       |
| Data Audit        | Authorization      |
| Compliance        | User data          |
| Telemetry Gateway |                    |

## REST

### Audit API

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

### Telemetry Gateway

**Purpose**: Secure gateway for external telemetry data (traces, metrics, logs) to internal OTEL Collector

```
POST /v1/telemetry/traces   - Accept OTLP trace data
POST /v1/telemetry/metrics  - Accept OTLP metric data
POST /v1/telemetry/logs     - Accept OTLP log data
```

**Authentication**:

- JWT (Frontend): `Authorization: Bearer <token>` with tenantId in payload
- API Key (Backend): `x-api-key: <key>` + `x-tenant-id: <tenant-id>` headers

**Rate Limits** (per tenant, per minute):

- Traces: 1000 requests
- Metrics: 2000 requests
- Logs: 5000 requests

**Features**:

- PII Redaction: Automatically redacts email, SSN, phone, IP, credit card from telemetry data
- Tenant Enrichment: Adds tenant.id, user.id, telemetry.source attributes
- Cost Tracking: Tracks bytes and request counts per tenant per signal type
- Audit Log Categorization: Identifies and marks audit logs for special handling
- gRPC Forwarding: Forwards enriched data to internal OTEL Collector

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

## Session Recording gRPC (50054)

| Method             | Desc              |
| ------------------ | ----------------- |
| SaveEventBatch     | Save rrweb events |
| StartSession       | Start recording   |
| EndSession         | End recording     |
| SavePageView       | Save page view    |
| SaveCustomEvent    | Save custom event |
| ListSessions       | Query sessions    |
| GetSessionEvents   | Get session data  |
| GetSessionStats    | Session analytics |
| GetDeviceBreakdown | Device stats      |
| GetTopPages        | Top pages stats   |

Proto: `packages/proto/session-recording/v1/session-recording.proto`

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

# Telemetry Gateway
OTEL_COLLECTOR_ENDPOINT=http://platform-monitoring-otel-collector.monitoring:4317
OTEL_GATEWAY_ENABLED=true
OTEL_FORWARD_TIMEOUT=30000
TELEMETRY_API_KEYS=<comma-separated-keys>
RATE_LIMIT_TRACES=1000
RATE_LIMIT_METRICS=2000
RATE_LIMIT_LOGS=5000
```

---

Schema: `infrastructure/clickhouse/schemas/01-audit_db.sql`
Full: `docs/en/services/AUDIT_SERVICE.md`
