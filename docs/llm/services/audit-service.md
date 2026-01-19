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

## Kafka Consumers

### Admin Events Consumer

Consumes admin account management events from auth-service and persists them to ClickHouse for compliance logging.

| Event Topic       | Handler                 | Target Table     |
| ----------------- | ----------------------- | ---------------- |
| admin.created     | AdminCreatedHandler     | admin_audit_logs |
| admin.updated     | AdminUpdatedHandler     | admin_audit_logs |
| admin.deactivated | AdminDeactivatedHandler | admin_audit_logs |
| admin.reactivated | AdminReactivatedHandler | admin_audit_logs |
| admin.invited     | AdminInvitedHandler     | admin_audit_logs |
| admin.roleChanged | AdminRoleChangedHandler | admin_audit_logs |

**Consumer Group**: `audit-service-admin-events`
**Source Service**: auth-service
**Event Types**: `@my-girok/types/events/auth`

### Architecture

```
auth-service → Redpanda (Kafka) → audit-service → ClickHouse
               (admin.* topics)    (consumers)     (admin_audit_logs)
```

**Implementation**:

- `src/kafka/kafka.module.ts` - Kafka configuration
- `src/admin-audit/consumers/admin-events.consumer.ts` - Event patterns
- `src/admin-audit/handlers/*.handler.ts` - Event handlers (6 types)
- `src/admin-audit/mappers/admin-event.mapper.ts` - Event-to-audit-log mapping

**Error Handling**: Failed events are retried by Kafka (8 retries, exponential backoff)

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

# Kafka/Redpanda
REDPANDA_ENABLED=true
REDPANDA_BROKERS=kafka.girok.dev:9093
REDPANDA_SASL_USERNAME=<vault>
REDPANDA_SASL_PASSWORD=<vault>
```

---

Schema: `infrastructure/clickhouse/schemas/01-audit_db.sql`
Full: `docs/en/services/AUDIT_SERVICE.md`
