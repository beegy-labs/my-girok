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

## gRPC (Summary)

```
Auth & Security:
LogAuthEvent, LogSecurityEvent, LogAdminAction
Get*Events, GenerateComplianceReport

Session Recording:
RecordEvent, ListSessions, GetSession, GetSessionEvents
GetSessionStats, GetDeviceBreakdown, GetTopPages
```

**SSOT**: `docs/llm/services/audit-service.md`
