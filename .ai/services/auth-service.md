# Auth Service

> RBAC, operators, sanctions | Port: 3001 | gRPC: 50052 | auth_db

| Owns               | NOT This Service              |
| ------------------ | ----------------------------- |
| Roles, Permissions | Accounts, Sessions (identity) |
| Operators          | Devices, Profiles (identity)  |
| Sanctions, Appeals | Consents, Documents (legal)   |

## gRPC (Summary)

```
CheckPermission, GetRole, ValidateOperator, CheckSanction
Admin*  - Login, MFA, Sessions, Password (for operators)
```

**SSOT**: `docs/llm/services/auth-service.md`
