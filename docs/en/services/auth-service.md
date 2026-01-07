# Auth Service

> Authorization, RBAC, operators, and sanctions management

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

| This Service Owns     | NOT This Service (Other Services)    |
| --------------------- | ------------------------------------ |
| Roles/Permissions     | Accounts/Sessions (identity-service) |
| Operators/Invitations | Devices/Profiles (identity-service)  |
| Sanctions/Appeals     | Consents/Documents (legal-service)   |
| Services/Features     | DSR Requests (legal-service)         |

## REST API

### Roles

| Method | Endpoint                               | Description                 |
| ------ | -------------------------------------- | --------------------------- |
| POST   | `/roles`                               | Create role                 |
| GET    | `/roles`                               | List roles                  |
| GET    | `/roles/:id`                           | Get role by ID              |
| PATCH  | `/roles/:id`                           | Update role                 |
| DELETE | `/roles/:id`                           | Delete role                 |
| POST   | `/roles/:id/permissions/:permissionId` | Add permission to role      |
| DELETE | `/roles/:id/permissions/:permissionId` | Remove permission from role |

### Permissions

| Method | Endpoint           | Description          |
| ------ | ------------------ | -------------------- |
| POST   | `/permissions`     | Create permission    |
| GET    | `/permissions`     | List permissions     |
| GET    | `/permissions/:id` | Get permission by ID |
| PATCH  | `/permissions/:id` | Update permission    |
| DELETE | `/permissions/:id` | Delete permission    |

### Operators

| Method | Endpoint                                   | Description        |
| ------ | ------------------------------------------ | ------------------ |
| POST   | `/operators`                               | Create operator    |
| GET    | `/operators`                               | List operators     |
| GET    | `/operators/:id`                           | Get operator by ID |
| PATCH  | `/operators/:id`                           | Update operator    |
| DELETE | `/operators/:id`                           | Delete operator    |
| POST   | `/operators/invite`                        | Send invitation    |
| POST   | `/operators/accept-invite`                 | Accept invitation  |
| POST   | `/operators/:id/permissions/:permissionId` | Add permission     |
| DELETE | `/operators/:id/permissions/:permissionId` | Remove permission  |

### Sanctions

| Method | Endpoint                | Description        |
| ------ | ----------------------- | ------------------ |
| POST   | `/sanctions`            | Create sanction    |
| GET    | `/sanctions`            | List sanctions     |
| GET    | `/sanctions/:id`        | Get sanction by ID |
| PATCH  | `/sanctions/:id`        | Update sanction    |
| POST   | `/sanctions/:id/revoke` | Revoke sanction    |
| POST   | `/sanctions/:id/extend` | Extend sanction    |
| POST   | `/sanctions/:id/reduce` | Reduce sanction    |
| GET    | `/sanctions/:id/appeal` | Get appeal status  |
| POST   | `/sanctions/:id/appeal` | Submit appeal      |

### Services & Features

| Method | Endpoint                            | Description           |
| ------ | ----------------------------------- | --------------------- |
| POST   | `/services`                         | Register service      |
| GET    | `/services`                         | List services         |
| GET    | `/services/:id`                     | Get service by ID     |
| PATCH  | `/services/:id`                     | Update service        |
| GET    | `/services/:id/config`              | Get service config    |
| PATCH  | `/services/:id/config`              | Update service config |
| POST   | `/services/:id/features/:featureId` | Create feature        |
| GET    | `/services/:id/features/:featureId` | Get feature           |
| PATCH  | `/services/:id/features/:featureId` | Update feature        |
| DELETE | `/services/:id/features/:featureId` | Delete feature        |

## gRPC Server (:50052)

| Method                 | Description                      |
| ---------------------- | -------------------------------- |
| CheckPermission        | Check single permission          |
| CheckPermissions       | Check multiple permissions       |
| GetOperatorPermissions | Get all permissions for operator |
| GetRole                | Get role by ID                   |
| GetRolesByOperator     | Get roles assigned to operator   |
| ValidateOperator       | Validate operator status         |
| CheckSanction          | Check if account has sanction    |
| GetActiveSanctions     | Get all active sanctions         |

**Proto file**: `packages/proto/auth/v1/auth.proto`

## Database Tables

| Table                | Purpose                   |
| -------------------- | ------------------------- |
| roles                | Role definitions          |
| permissions          | Permission definitions    |
| role_permissions     | Role-Permission mapping   |
| operators            | Service operators         |
| operator_invitations | Pending invitations       |
| sanctions            | Account sanctions/bans    |
| services             | Registered services       |
| service_configs      | Service configuration     |
| service_features     | Feature flags per service |

## Events (Redpanda)

Events are published to `auth.*` topics:

```
ROLE_CREATED        - New role created
ROLE_UPDATED        - Role modified
ROLE_DELETED        - Role removed

OPERATOR_CREATED    - New operator added
OPERATOR_INVITED    - Invitation sent
OPERATOR_UPDATED    - Operator modified

SANCTION_CREATED    - Sanction applied
SANCTION_REVOKED    - Sanction revoked
SANCTION_APPEALED   - Appeal submitted

SERVICE_CREATED     - Service registered
SERVICE_CONFIG_UPDATED - Config changed
```

## Cache Keys (Valkey)

| Key Pattern                 | TTL  | Description            |
| --------------------------- | ---- | ---------------------- |
| `auth:role:{id}`            | 24h  | Role data cache        |
| `auth:permissions:{roleId}` | 24h  | Permissions for role   |
| `auth:operator:{id}`        | 1h   | Operator data cache    |
| `auth:service:{slug}`       | 24h  | Service data by slug   |
| `auth:sanction:active:{id}` | 5min | Active sanction status |

## Environment Variables

```bash
# REST API port
PORT=3001

# gRPC port for internal service communication
GRPC_PORT=50052

# PostgreSQL database connection
DATABASE_URL=postgresql://user:password@host:5432/auth_db

# Valkey (Redis-compatible) cache
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_DB=0

# JWT secret for token validation
JWT_SECRET=your-jwt-secret-min-32-chars

# API keys for service-to-service authentication
API_KEYS=key1,key2,key3
```

---

**LLM Reference**: `docs/llm/services/auth-service.md`
