# Audit Service

> Compliance logging (ClickHouse, 7yr retention) | Port: 4002 | gRPC: 50054

| Owns               | NOT This Service   |
| ------------------ | ------------------ |
| Auth events        | Business analytics |
| Security events    | Session management |
| Admin actions      | Authorization      |
| Compliance reports | User data storage  |

## gRPC (Summary)

```
LogAuthEvent, LogSecurityEvent, LogAdminAction
Get*Events, GenerateComplianceReport
```

**SSOT**: `docs/llm/services/audit-service.md`
