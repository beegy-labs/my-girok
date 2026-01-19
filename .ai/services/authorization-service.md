# Authorization Service

> Zanzibar-style ReBAC Engine | Port: 3012/50055 | DB: authorization_db

| Owns                         | Delegates             |
| ---------------------------- | --------------------- |
| Tuples, Models, Check Engine | auth-bff (REST proxy) |

## Core APIs (gRPC)

| Method                           | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| Check, BatchCheck                | Permission evaluation (single/bulk)         |
| Write                            | Add/remove tuples                           |
| ListObjects, ListUsers           | Objects user can access / Users with access |
| WriteModel, ListModels, GetModel | Model versioning (with notes)               |
| ActivateModel                    | Activate specific version                   |

## Components

| Component     | Purpose                                                 |
| ------------- | ------------------------------------------------------- |
| DSL Parser    | Parse authorization model                               |
| Check Engine  | Recursive graph traversal                               |
| Tuple Storage | Relationship tuples: `(user:alice, member, team:cs-kr)` |
| Cache (L1/L2) | Permission caching                                      |

## Integration

```
auth-bff ──gRPC──▶ authorization-service ──▶ authorization_db
```

## Deployment

| Item       | Value                                                |
| ---------- | ---------------------------------------------------- |
| Helm Chart | `services/authorization-service/helm/`               |
| Secrets    | ESO + Vault: `secret/my-girok/authorization-service` |

**SSOT**: `docs/llm/services/authorization-service.md`
