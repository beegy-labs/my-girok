# auth-service

```yaml
port: 3001
grpc: 50052
db: auth_db (PostgreSQL)
cache: Valkey DB 0
events: auth.* (Redpanda)
codebase: services/auth-service/
```

## Boundaries

| Owns                  | Not                |
| --------------------- | ------------------ |
| Roles/Permissions     | Accounts/Sessions  |
| Operators/Invitations | Devices/Profiles   |
| Sanctions/Appeals     | Consents/Documents |
| Services/Features     | DSR Requests       |

## REST

```
POST/GET/PATCH/DELETE /roles[/:id]
POST/DELETE /roles/:id/permissions/:permissionId
POST/GET/PATCH/DELETE /permissions[/:id]

POST/GET/PATCH/DELETE /operators[/:id]
POST /operators/invite|accept-invite
POST/DELETE /operators/:id/permissions/:permissionId

POST/GET/PATCH /sanctions[/:id]
POST /sanctions/:id/revoke|extend|reduce
GET/POST /sanctions/:id/appeal

POST/GET/PATCH /services[/:id]
GET/PATCH /services/:id/config
POST/GET/PATCH/DELETE /services/:id/features/:featureId
```

## gRPC (50052)

| Method                 | Desc           |
| ---------------------- | -------------- |
| CheckPermission        | Single check   |
| CheckPermissions       | Multiple       |
| GetOperatorPermissions | All perms      |
| GetRole                | Role by ID     |
| GetRolesByOperator     | Operator roles |
| ValidateOperator       | Status check   |
| CheckSanction          | Active check   |
| GetActiveSanctions     | All active     |

Proto: `packages/proto/auth/v1/auth.proto`

## Tables

| Table                | Purpose             |
| -------------------- | ------------------- |
| roles                | Role defs           |
| permissions          | Permission defs     |
| role_permissions     | Role-Perm join      |
| operators            | Service operators   |
| operator_invitations | Invitations         |
| sanctions            | Account sanctions   |
| services             | Registered services |
| service_configs      | Service config      |
| service_features     | Feature flags       |

## Events

```
ROLE_CREATED|UPDATED|DELETED
OPERATOR_CREATED|INVITED|UPDATED
SANCTION_CREATED|REVOKED|APPEALED
SERVICE_CREATED|CONFIG_UPDATED
```

## Cache

| Key                         | TTL |
| --------------------------- | --- |
| `auth:role:{id}`            | 24h |
| `auth:permissions:{roleId}` | 24h |
| `auth:operator:{id}`        | 1h  |
| `auth:service:{slug}`       | 24h |
| `auth:sanction:active:{id}` | 5m  |

## Env

```bash
PORT=3001
GRPC_PORT=50052
DATABASE_URL=postgresql://...auth_db
VALKEY_HOST=localhost
JWT_SECRET=...
API_KEYS=key1,key2
```

---

Full: `docs/en/services/AUTH_SERVICE.md`
