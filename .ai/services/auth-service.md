# Auth Service

> Authorization, RBAC, operators, and sanctions management

## Service Info

| Property | Value                    |
| -------- | ------------------------ |
| REST     | :3001                    |
| gRPC     | :50052                   |
| Database | auth_db (PostgreSQL)     |
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

### Roles & Permissions

```
POST/GET/PATCH/DELETE  /roles, /roles/:id
POST/DELETE            /roles/:id/permissions/:permissionId
POST/GET/PATCH/DELETE  /permissions, /permissions/:id
GET                    /permissions/categories
```

### Operators

```
POST/GET/PATCH/DELETE  /operators, /operators/:id
POST                   /operators/invite, /operators/accept-invite
POST/DELETE            /operators/:id/permissions/:permissionId
```

### Sanctions

```
POST/GET/PATCH         /sanctions, /sanctions/:id
POST                   /sanctions/:id/revoke|extend|reduce
GET/POST               /sanctions/:id/appeal
POST                   /sanctions/:id/appeal/review
```

### Services & Features

```
POST/GET/PATCH         /services, /services/:id
GET/PATCH              /services/:id/config
POST/GET/PATCH/DELETE  /services/:id/features/:featureId
GET/POST/DELETE        /services/:id/testers/users|admins
```

### Settings

```
GET/POST/PATCH/DELETE  /settings/countries, /settings/locales
```

## gRPC Server (:50052)

| Method                 | Description              |
| ---------------------- | ------------------------ |
| CheckPermission        | Check single permission  |
| CheckPermissions       | Check multiple           |
| GetOperatorPermissions | Get all permissions      |
| GetRole                | Get role by ID           |
| GetRolesByOperator     | Get operator's roles     |
| GetOperator            | Get operator by ID       |
| ValidateOperator       | Check operator status    |
| CheckSanction          | Check active sanctions   |
| GetActiveSanctions     | Get all active sanctions |

**Proto**: `packages/proto/auth/v1/auth.proto`

```typescript
import { AuthGrpcClient } from '@my-girok/nest-common';

const { allowed } = await this.authClient.checkPermission({
  operator_id: operatorId,
  resource: 'role',
  action: 'read',
});
```

## Database Tables

| Table                  | Purpose              |
| ---------------------- | -------------------- |
| roles                  | Role definitions     |
| permissions            | Permission defs      |
| role_permissions       | Role-Permission join |
| operators              | Service operators    |
| operator_invitations   | Invitations          |
| operator_permissions   | Direct permissions   |
| sanctions              | Account sanctions    |
| sanction_notifications | Sanction notices     |
| services               | Registered services  |
| service_configs        | Service config       |
| service_features       | Feature flags        |
| service_testers        | Tester management    |
| countries, locales     | Settings             |

## H-RBAC Hierarchy

```
SYSTEM: system_super(100) > system_admin(80) > system_moderator(50)
TENANT: partner_super(100) > partner_admin(80) > partner_editor(50)
```

```typescript
@Permissions('role:read')      // resource:action
@Permissions('*')              // Wildcard
```

## Sanction Types

| Type                | Severity |
| ------------------- | -------- |
| WARNING             | LOW      |
| TEMPORARY_BAN       | MEDIUM   |
| PERMANENT_BAN       | HIGH     |
| FEATURE_RESTRICTION | MEDIUM   |

## Event Types

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
DATABASE_URL=postgresql://...auth_db
REDIS_HOST=localhost
JWT_SECRET=...
API_KEYS=key1,key2
```

---

**Full docs**: `docs/services/AUTH_SERVICE.md`
