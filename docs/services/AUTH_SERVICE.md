# Auth Service

> Authorization, RBAC, operators, and sanctions management

## Overview

The Auth Service manages authorization and access control for the my-girok Identity Platform. It handles roles, permissions, operators, and sanctions.

| Property  | Value                      |
| --------- | -------------------------- |
| REST Port | 3001                       |
| gRPC Port | 50052                      |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | auth_db (PostgreSQL 16)    |

> **Note**: This service handles ONLY authorization. Authentication (login, sessions) is handled by `identity-service`.

## Domain Boundaries

### What Belongs Here

- Roles, Permissions, Role-Permission mappings
- Operators, Invitations, Operator permissions
- Sanctions, Appeals, Notifications
- Services, Service configs, Features, Testers
- Countries, Locales settings

### What Does NOT Belong Here

| Domain              | Correct Service  |
| ------------------- | ---------------- |
| Accounts, Sessions  | identity-service |
| Devices, Profiles   | identity-service |
| Consents, Documents | legal-service    |
| DSR Requests        | legal-service    |

## API Reference

> See `.ai/services/auth-service.md` for quick endpoint list.

### Roles API

| Method | Endpoint                            | Permission    |
| ------ | ----------------------------------- | ------------- |
| POST   | `/v1/roles`                         | `role:create` |
| GET    | `/v1/roles`                         | `role:read`   |
| GET    | `/v1/roles/:id`                     | `role:read`   |
| PATCH  | `/v1/roles/:id`                     | `role:update` |
| DELETE | `/v1/roles/:id`                     | `role:delete` |
| POST   | `/v1/roles/:id/permissions`         | `role:update` |
| DELETE | `/v1/roles/:id/permissions/:permId` | `role:update` |

### Permissions API

| Method | Endpoint                     | Permission          |
| ------ | ---------------------------- | ------------------- |
| POST   | `/v1/permissions`            | `permission:create` |
| GET    | `/v1/permissions`            | `permission:read`   |
| GET    | `/v1/permissions/:id`        | `permission:read`   |
| PATCH  | `/v1/permissions/:id`        | `permission:update` |
| DELETE | `/v1/permissions/:id`        | `permission:delete` |
| GET    | `/v1/permissions/categories` | `permission:read`   |

### Operators API

| Method | Endpoint                             | Permission        |
| ------ | ------------------------------------ | ----------------- |
| POST   | `/v1/operators`                      | `operator:create` |
| GET    | `/v1/operators`                      | `operator:read`   |
| GET    | `/v1/operators/:id`                  | `operator:read`   |
| PATCH  | `/v1/operators/:id`                  | `operator:update` |
| DELETE | `/v1/operators/:id`                  | `operator:delete` |
| POST   | `/v1/operators/invite`               | `operator:create` |
| POST   | `/v1/operators/accept-invite`        | -                 |
| POST   | `/v1/operators/:id/permissions`      | `operator:update` |
| DELETE | `/v1/operators/:id/permissions/:pId` | `operator:update` |

### Sanctions API

| Method | Endpoint                          | Permission        |
| ------ | --------------------------------- | ----------------- |
| POST   | `/v1/sanctions`                   | `sanction:create` |
| GET    | `/v1/sanctions`                   | `sanction:read`   |
| GET    | `/v1/sanctions/:id`               | `sanction:read`   |
| PATCH  | `/v1/sanctions/:id`               | `sanction:update` |
| POST   | `/v1/sanctions/:id/revoke`        | `sanction:revoke` |
| POST   | `/v1/sanctions/:id/extend`        | `sanction:update` |
| POST   | `/v1/sanctions/:id/reduce`        | `sanction:update` |
| GET    | `/v1/sanctions/:id/appeal`        | `sanction:read`   |
| POST   | `/v1/sanctions/:id/appeal`        | -                 |
| POST   | `/v1/sanctions/:id/appeal/review` | `sanction:review` |

### Services API

| Method | Endpoint                         | Permission       |
| ------ | -------------------------------- | ---------------- |
| POST   | `/v1/services`                   | `service:create` |
| GET    | `/v1/services`                   | `service:read`   |
| GET    | `/v1/services/:id`               | `service:read`   |
| PATCH  | `/v1/services/:id`               | `service:update` |
| GET    | `/v1/services/:id/config`        | `service:read`   |
| PATCH  | `/v1/services/:id/config`        | `service:update` |
| GET    | `/v1/services/:id/features`      | `feature:read`   |
| POST   | `/v1/services/:id/features`      | `feature:create` |
| PATCH  | `/v1/services/:id/features/:fId` | `feature:update` |
| DELETE | `/v1/services/:id/features/:fId` | `feature:delete` |

## Database Schema

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
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    scope VARCHAR(20) DEFAULT 'TENANT',
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
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
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
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
    starts_at TIMESTAMPTZ(6) DEFAULT NOW(),
    expires_at TIMESTAMPTZ(6),
    issued_by UUID,
    appeal_status VARCHAR(20),
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);
```

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

## Sanction Workflow

### Types

| Type                  | Description                     | Severity |
| --------------------- | ------------------------------- | -------- |
| `WARNING`             | Warning notice, no restrictions | LOW      |
| `TEMPORARY_BAN`       | Time-limited access restriction | MEDIUM   |
| `PERMANENT_BAN`       | Indefinite access restriction   | HIGH     |
| `FEATURE_RESTRICTION` | Specific feature blocked        | MEDIUM   |

### Appeal Flow

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

## gRPC Server

> See `.ai/services/auth-service.md` for method list.

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

## Development

```bash
# Start service
pnpm --filter @my-girok/auth-service dev

# Run tests
pnpm --filter @my-girok/auth-service test

# Run migrations
goose -dir migrations/auth postgres "$DATABASE_URL" up
```

## Related Documentation

- [Identity Service](./IDENTITY_SERVICE.md)
- [Legal Service](./LEGAL_SERVICE.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md)
- [gRPC Guide](../guides/GRPC.md)
