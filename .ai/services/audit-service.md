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
| Kafka consumers    | Event production   |

## gRPC (Summary)

```
Auth & Security:
LogAuthEvent, LogSecurityEvent, LogAdminAction
Get*Events, GenerateComplianceReport

Session Recording:
RecordEvent, ListSessions, GetSession, GetSessionEvents
GetSessionStats, GetDeviceBreakdown, GetTopPages
```

## Kafka Consumers

```
Admin Events (from auth-service):
admin.created, admin.updated, admin.deactivated
admin.reactivated, admin.invited, admin.roleChanged

Consumer Group: audit-service-admin-events
Target: admin_audit_logs (ClickHouse)
```

**SSOT**: `docs/llm/services/audit-service.md`
