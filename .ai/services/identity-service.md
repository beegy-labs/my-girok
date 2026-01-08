# Identity Service

> Accounts, sessions, devices, profiles | Port: 3005 | gRPC: 50051 | identity_db

| Owns               | NOT This Service            |
| ------------------ | --------------------------- |
| Accounts, Sessions | Roles, Permissions (auth)   |
| Devices, Profiles  | Operators, Sanctions (auth) |
| MFA enablement     | Consents, Documents (legal) |

## gRPC (Summary)

```
GetAccount, ValidateAccount, GetAccountByEmail
CreateSession, ValidateSession, RevokeSession
GetAccountDevices, TrustDevice
```

**SSOT**: `docs/llm/services/identity-service.md`
