# Audit Service

> Compliance logging (ClickHouse, 7yr retention) | Port: 4002 | gRPC: 50054

| Owns               | NOT This Service   |
| ------------------ | ------------------ |
| Auth events        | Business analytics |
| Security events    | Session management |
| Admin actions      | Authorization      |
| Compliance reports | User data storage  |
| Session recordings | Identity data      |
| Session analytics  |                    |
| Telemetry gateway  |                    |

## gRPC (Summary)

```
Auth & Security:
LogAuthEvent, LogSecurityEvent, LogAdminAction
Get*Events, GenerateComplianceReport

Session Recording:
RecordEvent, ListSessions, GetSession, GetSessionEvents
GetSessionStats, GetDeviceBreakdown, GetTopPages
```

## REST API (Telemetry Gateway)

```
POST /v1/telemetry/traces   - Receive OTLP traces (1000 req/min)
POST /v1/telemetry/metrics  - Receive OTLP metrics (2000 req/min)
POST /v1/telemetry/logs     - Receive OTLP logs (5000 req/min)

Auth: JWT (Bearer token) OR API key (x-api-key + x-tenant-id)
Features: PII redaction, tenant enrichment, cost tracking
```

**SSOT**: `docs/llm/services/audit-service.md`
