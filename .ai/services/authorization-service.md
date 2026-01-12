# Authorization Service

> Zanzibar-style ReBAC Engine | Port: 3012/50055 | DB: authorization_db

## Ownership

| Owns                         | Delegates             |
| ---------------------------- | --------------------- |
| Tuples, Models, Check Engine | auth-bff (REST proxy) |

## Core APIs (gRPC)

| Method      | Purpose                     |
| ----------- | --------------------------- |
| Check       | Permission evaluation       |
| BatchCheck  | Bulk permission check       |
| Write       | Add/remove tuples           |
| ListObjects | Objects user can access     |
| ListUsers   | Users with access to object |

## Key Components

| Component     | Purpose                   |
| ------------- | ------------------------- |
| DSL Parser    | Parse authorization model |
| Check Engine  | Recursive graph traversal |
| Tuple Storage | Relationship tuples       |
| Cache (L1/L2) | Permission caching        |

## Tuple Format

```
(user:alice, member, team:cs-kr)
(team:cs-kr, viewer, session_recording:service-a)
```

## Integration

```
auth-bff ──gRPC──▶ authorization-service
                          │
                          ▼
                   authorization_db
```

## Deployment

| Item       | Value                                   |
| ---------- | --------------------------------------- |
| Helm Chart | `services/authorization-service/helm/`  |
| Secrets    | ESO (External Secrets Operator)         |
| Vault Path | `secret/my-girok/authorization-service` |

**SSOT**: `docs/llm/services/authorization-service.md`
