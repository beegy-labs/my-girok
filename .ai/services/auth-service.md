# Auth Service

> Authorization, RBAC, operators, and sanctions management | **Last Updated**: 2026-01-06

## Service Info

| Property | Value                    |
| -------- | ------------------------ |
| REST     | :3001                    |
| gRPC     | :50052                   |
| Database | auth_db (PostgreSQL)     |
| Cache    | Valkey DB 0              |
| Events   | `auth.*` (Redpanda)      |
| Codebase | `services/auth-service/` |

## Domain Boundaries

| This Service           | NOT This Service              |
| ---------------------- | ----------------------------- |
| Roles, Permissions     | Accounts, Sessions (identity) |
| Operators, Invitations | Devices, Profiles (identity)  |
| Sanctions, Appeals     | Consents, Documents (legal)   |
| Services, Features     | DSR Requests (legal)          |

## REST API

```
POST/GET/PATCH/DELETE  /roles, /roles/:id
POST/DELETE            /roles/:id/permissions/:permissionId
POST/GET/PATCH/DELETE  /permissions, /permissions/:id

POST/GET/PATCH/DELETE  /operators, /operators/:id
POST   /operators/invite, /operators/accept-invite
POST/DELETE  /operators/:id/permissions/:permissionId

POST/GET/PATCH  /sanctions, /sanctions/:id
POST   /sanctions/:id/revoke|extend|reduce
GET/POST  /sanctions/:id/appeal

POST/GET/PATCH  /services, /services/:id
GET/PATCH  /services/:id/config
POST/GET/PATCH/DELETE  /services/:id/features/:featureId
```

## gRPC Server (:50052)

| Method                 | Description              |
| ---------------------- | ------------------------ |
| CheckPermission        | Check single permission  |
| CheckPermissions       | Check multiple           |
| GetOperatorPermissions | Get all permissions      |
| GetRole                | Get role by ID           |
| GetRolesByOperator     | Get operator's roles     |
| ValidateOperator       | Check operator status    |
| CheckSanction          | Check active sanctions   |
| GetActiveSanctions     | Get all active sanctions |

**Proto**: `packages/proto/auth/v1/auth.proto`

## Database Tables

| Table                | Purpose              |
| -------------------- | -------------------- |
| roles                | Role definitions     |
| permissions          | Permission defs      |
| role_permissions     | Role-Permission join |
| operators            | Service operators    |
| operator_invitations | Invitations          |
| sanctions            | Account sanctions    |
| services             | Registered services  |
| service_configs      | Service config       |
| service_features     | Feature flags        |

## Events

```typescript
'ROLE_CREATED' | 'ROLE_UPDATED' | 'ROLE_DELETED';
'OPERATOR_CREATED' | 'OPERATOR_INVITED' | 'OPERATOR_UPDATED';
'SANCTION_CREATED' | 'SANCTION_REVOKED' | 'SANCTION_APPEALED';
'SERVICE_CREATED' | 'SERVICE_CONFIG_UPDATED';
```

## Caching

| Key Pattern                 | TTL  |
| --------------------------- | ---- |
| `auth:role:{id}`            | 24h  |
| `auth:permissions:{roleId}` | 24h  |
| `auth:operator:{id}`        | 1h   |
| `auth:service:{slug}`       | 24h  |
| `auth:sanction:active:{id}` | 5min |

## Environment

```bash
PORT=3001
GRPC_PORT=50052
DATABASE_URL=postgresql://...auth_db
VALKEY_HOST=localhost
JWT_SECRET=...
API_KEYS=key1,key2
```

---

**Full docs**: `docs/en/services/AUTH_SERVICE.md`
