# Auth Service

> Authorization, RBAC, operators, and sanctions management (Phase 3)

## Overview

The Auth Service manages authorization and access control for the my-girok Identity Platform. It is one of three separated services in the Phase 3 architecture.

> **WARNING**: This service handles ONLY authorization. Authentication (login, sessions) is handled by `identity-service`.

## Quick Reference

| Property  | Value                      |
| --------- | -------------------------- |
| REST Port | 3001                       |
| gRPC Port | 50052                      |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | auth_db (PostgreSQL 16)    |
| Codebase  | `services/auth-service/`   |

---

## Domain Boundaries

### What Belongs HERE (auth-service)

| Domain      | Tables/Entities                           |
| ----------- | ----------------------------------------- |
| Roles       | `roles`, `role_permissions`               |
| Permissions | `permissions`                             |
| Operators   | `operators`, `operator_invitations`       |
| Sanctions   | `sanctions`, `sanction_notifications`     |
| Services    | `services`, `service_configs`, `features` |
| Settings    | `countries`, `locales`                    |

### What Does NOT Belong Here

| Domain                 | Correct Service  |
| ---------------------- | ---------------- |
| Accounts, Sessions     | identity-service |
| Devices, Profiles      | identity-service |
| Authentication (login) | identity-service |
| Consents, Documents    | legal-service    |
| DSR Requests           | legal-service    |

---

## API Endpoints

### Roles

| Method | Endpoint                            | Permission    | Description       |
| ------ | ----------------------------------- | ------------- | ----------------- |
| POST   | `/v1/roles`                         | `role:create` | Create role       |
| GET    | `/v1/roles`                         | `role:read`   | List roles        |
| GET    | `/v1/roles/:id`                     | `role:read`   | Get role by ID    |
| PATCH  | `/v1/roles/:id`                     | `role:update` | Update role       |
| DELETE | `/v1/roles/:id`                     | `role:delete` | Delete role       |
| POST   | `/v1/roles/:id/permissions`         | `role:update` | Assign permission |
| DELETE | `/v1/roles/:id/permissions/:permId` | `role:update` | Remove permission |

### Permissions

| Method | Endpoint                     | Permission          | Description       |
| ------ | ---------------------------- | ------------------- | ----------------- |
| POST   | `/v1/permissions`            | `permission:create` | Create permission |
| GET    | `/v1/permissions`            | `permission:read`   | List permissions  |
| GET    | `/v1/permissions/:id`        | `permission:read`   | Get permission    |
| PATCH  | `/v1/permissions/:id`        | `permission:update` | Update permission |
| DELETE | `/v1/permissions/:id`        | `permission:delete` | Delete permission |
| GET    | `/v1/permissions/categories` | `permission:read`   | List categories   |

### Operators

| Method | Endpoint                             | Permission        | Description       |
| ------ | ------------------------------------ | ----------------- | ----------------- |
| POST   | `/v1/operators`                      | `operator:create` | Create operator   |
| GET    | `/v1/operators`                      | `operator:read`   | List operators    |
| GET    | `/v1/operators/:id`                  | `operator:read`   | Get operator      |
| PATCH  | `/v1/operators/:id`                  | `operator:update` | Update operator   |
| DELETE | `/v1/operators/:id`                  | `operator:delete` | Delete operator   |
| POST   | `/v1/operators/invite`               | `operator:create` | Invite operator   |
| POST   | `/v1/operators/accept-invite`        | -                 | Accept invitation |
| POST   | `/v1/operators/:id/permissions`      | `operator:update` | Grant permission  |
| DELETE | `/v1/operators/:id/permissions/:pId` | `operator:update` | Revoke permission |

### Sanctions

| Method | Endpoint                          | Permission        | Description     |
| ------ | --------------------------------- | ----------------- | --------------- |
| POST   | `/v1/sanctions`                   | `sanction:create` | Create sanction |
| GET    | `/v1/sanctions`                   | `sanction:read`   | List sanctions  |
| GET    | `/v1/sanctions/:id`               | `sanction:read`   | Get sanction    |
| PATCH  | `/v1/sanctions/:id`               | `sanction:update` | Update sanction |
| POST   | `/v1/sanctions/:id/revoke`        | `sanction:revoke` | Revoke sanction |
| POST   | `/v1/sanctions/:id/extend`        | `sanction:update` | Extend duration |
| POST   | `/v1/sanctions/:id/reduce`        | `sanction:update` | Reduce duration |
| GET    | `/v1/sanctions/:id/appeal`        | `sanction:read`   | Get appeal      |
| POST   | `/v1/sanctions/:id/appeal`        | -                 | Submit appeal   |
| POST   | `/v1/sanctions/:id/appeal/review` | `sanction:review` | Review appeal   |

### Services & Features

| Method | Endpoint                         | Permission       | Description    |
| ------ | -------------------------------- | ---------------- | -------------- |
| POST   | `/v1/services`                   | `service:create` | Create service |
| GET    | `/v1/services`                   | `service:read`   | List services  |
| GET    | `/v1/services/:id`               | `service:read`   | Get service    |
| PATCH  | `/v1/services/:id`               | `service:update` | Update service |
| GET    | `/v1/services/:id/config`        | `service:read`   | Get config     |
| PATCH  | `/v1/services/:id/config`        | `service:update` | Update config  |
| GET    | `/v1/services/:id/features`      | `feature:read`   | List features  |
| POST   | `/v1/services/:id/features`      | `feature:create` | Create feature |
| PATCH  | `/v1/services/:id/features/:fId` | `feature:update` | Update feature |
| DELETE | `/v1/services/:id/features/:fId` | `feature:delete` | Delete feature |

### Settings (Global)

| Method | Endpoint                    | Permission        | Description    |
| ------ | --------------------------- | ----------------- | -------------- |
| GET    | `/v1/settings/countries`    | `settings:read`   | List countries |
| POST   | `/v1/settings/countries`    | `settings:create` | Create country |
| PATCH  | `/v1/settings/countries/:c` | `settings:update` | Update country |
| DELETE | `/v1/settings/countries/:c` | `settings:delete` | Delete country |
| GET    | `/v1/settings/locales`      | `settings:read`   | List locales   |
| POST   | `/v1/settings/locales`      | `settings:create` | Create locale  |
| PATCH  | `/v1/settings/locales/:l`   | `settings:update` | Update locale  |
| DELETE | `/v1/settings/locales/:l`   | `settings:delete` | Delete locale  |

---

## gRPC Server (Port 50052)

The auth-service exposes a gRPC server for inter-service authorization checks.

### Proto Definition

```protobuf
// packages/proto/auth/v1/auth.proto
service AuthService {
  // Permission Operations
  rpc CheckPermission(CheckPermissionRequest) returns (CheckPermissionResponse);
  rpc CheckPermissions(CheckPermissionsRequest) returns (CheckPermissionsResponse);
  rpc GetOperatorPermissions(GetOperatorPermissionsRequest) returns (GetOperatorPermissionsResponse);

  // Role Operations
  rpc GetRole(GetRoleRequest) returns (GetRoleResponse);
  rpc GetRolesByOperator(GetRolesByOperatorRequest) returns (GetRolesByOperatorResponse);

  // Operator Operations
  rpc GetOperator(GetOperatorRequest) returns (GetOperatorResponse);
  rpc ValidateOperator(ValidateOperatorRequest) returns (ValidateOperatorResponse);

  // Sanction Operations
  rpc CheckSanction(CheckSanctionRequest) returns (CheckSanctionResponse);
  rpc GetActiveSanctions(GetActiveSanctionsRequest) returns (GetActiveSanctionsResponse);
}
```

### Client Usage (from other services)

```typescript
import { GrpcClientsModule, AuthGrpcClient } from '@my-girok/nest-common';

@Module({
  imports: [GrpcClientsModule.forRoot({ auth: true })],
})
export class AppModule {}

@Injectable()
export class SomeService {
  constructor(private readonly authClient: AuthGrpcClient) {}

  async canAccessResource(operatorId: string, resource: string) {
    const { allowed } = await this.authClient.checkPermission({
      operator_id: operatorId,
      resource,
      action: 'read',
    });
    return allowed;
  }
}
```

---

## Database Schema (auth_db)

### Core Tables

```sql
-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    level INT NOT NULL DEFAULT 0,
    scope VARCHAR(20) DEFAULT 'TENANT',
    parent_id UUID REFERENCES roles(id),
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    scope VARCHAR(20) DEFAULT 'TENANT',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE(resource, action)
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    conditions JSONB,
    PRIMARY KEY (role_id, permission_id)
);

-- Operators
CREATE TABLE operators (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,  -- References identity_db.accounts (NO FK)
    service_id UUID REFERENCES services(id),
    role_id UUID REFERENCES roles(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    country_code CHAR(2),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Sanctions
CREATE TABLE sanctions (
    id UUID PRIMARY KEY,
    subject_id UUID NOT NULL,
    subject_type VARCHAR(20) NOT NULL,  -- ACCOUNT, OPERATOR
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    reason TEXT NOT NULL,
    evidence JSONB,
    starts_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ(6),
    issued_by UUID,
    issuer_type VARCHAR(20),
    appeal_status VARCHAR(20),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
```

---

## H-RBAC (Hierarchical Role-Based Access Control)

### Role Hierarchy

```
SYSTEM LEVEL (Platform-wide)
├── system_super   (level 100) - Full platform access (*)
├── system_admin   (level 80)  - Partner, User, Legal management
└── system_moderator (level 50) - Content moderation

TENANT LEVEL (Per-service)
├── partner_super  (level 100) - Full tenant access
├── partner_admin  (level 80)  - Admin management
├── partner_editor (level 50)  - Content editing
└── partner_viewer (level 20)  - View only
```

### Permission Format

```typescript
// resource:action format
@Permissions('role:read')
@Permissions('operator:create')
@Permissions('sanction:revoke')
@Permissions('*')  // Wildcard - all permissions
```

---

## Sanction Types

| Type                  | Description                     | Severity |
| --------------------- | ------------------------------- | -------- |
| `WARNING`             | Warning notice, no restrictions | LOW      |
| `TEMPORARY_BAN`       | Time-limited access restriction | MEDIUM   |
| `PERMANENT_BAN`       | Indefinite access restriction   | HIGH     |
| `FEATURE_RESTRICTION` | Specific feature blocked        | MEDIUM   |

### Appeal Workflow

```
SANCTION CREATED
     │
     ▼
User submits appeal → appealStatus: PENDING
     │
     ▼
Admin reviews → appealStatus: UNDER_REVIEW
     │
     ├─► APPROVED → status: REVOKED
     ├─► REJECTED → appeal_response explains why
     └─► ESCALATED → higher-level admin review
```

---

## Event Types

```typescript
// Role Events
'ROLE_CREATED';
'ROLE_UPDATED';
'ROLE_DELETED';
'ROLE_PERMISSION_ASSIGNED';
'ROLE_PERMISSION_REMOVED';

// Operator Events
'OPERATOR_CREATED';
'OPERATOR_INVITED';
'OPERATOR_ACCEPTED';
'OPERATOR_UPDATED';
'OPERATOR_DELETED';

// Sanction Events
'SANCTION_CREATED';
'SANCTION_REVOKED';
'SANCTION_EXTENDED';
'SANCTION_REDUCED';
'SANCTION_APPEALED';
'SANCTION_APPEAL_RESOLVED';

// Service Events
'SERVICE_CREATED';
'SERVICE_UPDATED';
'SERVICE_CONFIG_UPDATED';
'SERVICE_FEATURE_UPDATED';
```

---

## Environment Variables

```env
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@host:5432/auth_db

# Cache (Valkey/Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (for admin/operator tokens)
JWT_SECRET=...

# API Keys (service-to-service)
API_KEYS=key1,key2

# gRPC
AUTH_GRPC_PORT=50052
```

---

## Caching Strategy

| Cache Key Pattern           | TTL  | Purpose          |
| --------------------------- | ---- | ---------------- |
| `auth:role:{id}`            | 24h  | Role by ID       |
| `auth:permissions:{roleId}` | 24h  | Role permissions |
| `auth:operator:{id}`        | 1h   | Operator by ID   |
| `auth:service:{slug}`       | 24h  | Service config   |
| `auth:sanction:active:{id}` | 5min | Active sanctions |

---

## Development

```bash
# Start service
pnpm --filter @my-girok/auth-service dev

# Run tests
pnpm --filter @my-girok/auth-service test

# Generate Prisma client
pnpm --filter @my-girok/auth-service prisma:generate

# Run migrations
goose -dir migrations/auth postgres "$DATABASE_URL" up
```

---

## Related Documentation

- [Architecture Overview](../../.ai/architecture.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md)
- [Auth Service LLM Reference](../../.ai/services/auth-service.md)
- [Identity Service](./IDENTITY_SERVICE.md)
- [Legal Service](./LEGAL_SERVICE.md)
- [gRPC Guide](../guides/GRPC.md)
