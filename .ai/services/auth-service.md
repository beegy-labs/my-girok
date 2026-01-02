# Auth Service

> **WARNING: This is an INDEPENDENT service. Do NOT add identity/legal code here.**

Authorization, RBAC, operators, and sanctions management

## Domain Boundaries

| This Service (auth)       | NOT This Service                      |
| ------------------------- | ------------------------------------- |
| Roles, Permissions        | Accounts, Sessions (identity-service) |
| Operators, Invitations    | Devices, Profiles (identity-service)  |
| Sanctions, Appeals        | Consents, Documents (legal-service)   |
| Service Features, Testers | DSR Requests (legal-service)          |

---

## Service Info

| Property  | Value                      |
| --------- | -------------------------- |
| REST Port | 3001                       |
| gRPC Port | 50052                      |
| Database  | auth_db (PostgreSQL)       |
| Codebase  | `services/auth-service/`   |
| Events    | `auth.*` topics (Redpanda) |

---

## Architecture

```
auth-service (Port 3001)
├── roles/          # RBAC role definitions
├── permissions/    # Fine-grained permissions
├── operators/      # Service operators
├── sanctions/      # User/operator sanctions
├── services/       # Service config, features, testers
└── settings/       # Countries, locales
        │
        ▼
    auth_db (PostgreSQL)
```

**Inter-Service Communication**:

- `identity-service`: Account validation (gRPC)
- `legal-service`: Consent checks (gRPC)

---

## gRPC Server (Port 50052)

This service exposes a gRPC server for authorization checks from other services.

### Available Methods

| Method                 | Request                           | Response                       | Description                  |
| ---------------------- | --------------------------------- | ------------------------------ | ---------------------------- |
| CheckPermission        | `{operator_id, resource, action}` | `{allowed, reason}`            | Check single permission      |
| CheckPermissions       | `{operator_id, permissions[]}`    | `{results[]}`                  | Check multiple permissions   |
| GetOperatorPermissions | `{operator_id}`                   | `{permissions[]}`              | Get all operator permissions |
| GetRole                | `{id}`                            | `{role}`                       | Get role by ID               |
| GetRolesByOperator     | `{operator_id}`                   | `{roles[]}`                    | Get operator's roles         |
| GetOperator            | `{id}`                            | `{operator}`                   | Get operator by ID           |
| ValidateOperator       | `{id}`                            | `{valid, status}`              | Check operator exists/active |
| CheckSanction          | `{subject_id, type}`              | `{is_sanctioned, sanctions[]}` | Check active sanctions       |
| GetActiveSanctions     | `{subject_id}`                    | `{sanctions[]}`                | Get all active sanctions     |

### Proto Definition

```
packages/proto/auth/v1/auth.proto
```

### Client Usage (from other services)

```typescript
import { AuthGrpcClient } from '@my-girok/nest-common';

@Injectable()
export class IdentityService {
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

| Table                    | Purpose                | Key Fields                            |
| ------------------------ | ---------------------- | ------------------------------------- |
| `roles`                  | Role definitions       | id, name, level, scope, parentId      |
| `permissions`            | Permission definitions | id, resource, action, category, scope |
| `role_permissions`       | Role-Permission join   | roleId, permissionId, conditions      |
| `operators`              | Service operators      | id, accountId, serviceId, roleId      |
| `operator_invitations`   | Invitation management  | id, email, token, expiresAt, status   |
| `operator_permissions`   | Direct permissions     | operatorId, permissionId, grantedBy   |
| `sanctions`              | Account sanctions      | id, subjectId, type, status, severity |
| `sanction_notifications` | Sanction notices       | id, sanctionId, channel, sentAt       |
| `services`               | Registered services    | id, slug, name, status                |
| `service_configs`        | Service configuration  | id, serviceId, jwtValidation, etc.    |
| `service_features`       | Feature definitions    | id, serviceId, code, category, path   |
| `service_testers`        | Tester management      | id, serviceId, userId, bypassOptions  |
| `countries`              | Supported countries    | code, name, isActive                  |
| `locales`                | Supported locales      | code, name, isActive                  |
| `outbox_events`          | Event outbox           | id, eventType, payload, status        |

---

## API Endpoints

### Roles

```
POST   /roles                     # Create role
GET    /roles                     # List roles (paginated)
GET    /roles/:id                 # Get role by ID
PATCH  /roles/:id                 # Update role
DELETE /roles/:id                 # Delete role
POST   /roles/:id/permissions     # Assign permissions
DELETE /roles/:id/permissions/:permissionId  # Remove permission
```

### Permissions

```
POST   /permissions               # Create permission
GET    /permissions               # List permissions (paginated)
GET    /permissions/:id           # Get permission by ID
PATCH  /permissions/:id           # Update permission
DELETE /permissions/:id           # Delete permission
GET    /permissions/categories    # List categories
```

### Operators

```
POST   /operators                 # Create operator
GET    /operators                 # List operators (paginated)
GET    /operators/:id             # Get operator by ID
PATCH  /operators/:id             # Update operator
DELETE /operators/:id             # Delete operator
POST   /operators/invite          # Invite operator
POST   /operators/accept-invite   # Accept invitation
POST   /operators/:id/permissions # Grant direct permission
DELETE /operators/:id/permissions/:permissionId  # Revoke permission
```

### Sanctions

```
POST   /sanctions                 # Create sanction
GET    /sanctions                 # List sanctions (paginated)
GET    /sanctions/:id             # Get sanction by ID
PATCH  /sanctions/:id             # Update sanction
POST   /sanctions/:id/revoke      # Revoke sanction
POST   /sanctions/:id/extend      # Extend duration
POST   /sanctions/:id/reduce      # Reduce duration
GET    /sanctions/:id/appeal      # Get appeal
POST   /sanctions/:id/appeal      # Submit appeal
POST   /sanctions/:id/appeal/review  # Review appeal (admin)
GET    /sanctions/:id/notifications  # List notifications
POST   /sanctions/:id/notifications/resend  # Resend notification
```

### Services

```
POST   /services                  # Create service
GET    /services                  # List services (paginated)
GET    /services/:id              # Get service by ID
PATCH  /services/:id              # Update service
GET    /services/:id/config       # Get service config
PATCH  /services/:id/config       # Update service config
```

### Service Features

```
GET    /services/:id/features     # List features (hierarchical)
POST   /services/:id/features     # Create feature
GET    /services/:id/features/:featureId  # Get feature
PATCH  /services/:id/features/:featureId  # Update feature
DELETE /services/:id/features/:featureId  # Delete feature
POST   /services/:id/features/bulk  # Bulk operations
```

### Service Testers

```
GET    /services/:id/testers/users   # List user testers
POST   /services/:id/testers/users   # Add user tester
DELETE /services/:id/testers/users/:userId  # Remove user tester
GET    /services/:id/testers/admins  # List admin testers
POST   /services/:id/testers/admins  # Add admin tester
DELETE /services/:id/testers/admins/:adminId  # Remove admin tester
```

### Settings (Global)

```
GET    /settings/countries        # List countries
POST   /settings/countries        # Create country
PATCH  /settings/countries/:code  # Update country
DELETE /settings/countries/:code  # Delete country
GET    /settings/locales          # List locales
POST   /settings/locales          # Create locale
PATCH  /settings/locales/:code    # Update locale
DELETE /settings/locales/:code    # Delete locale
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

## Code Structure

```
services/auth-service/
├── prisma/
│   └── schema.prisma           # auth_db schema
├── migrations/
│   └── auth/                   # goose migrations
└── src/
    ├── database/
    │   └── prisma.service.ts   # Prisma client + UUIDv7
    ├── common/
    │   ├── cache/              # CacheService
    │   ├── guards/             # JWT, API key, Permission guards
    │   └── decorators/         # @Permissions, @CurrentUser
    ├── roles/
    │   ├── roles.module.ts
    │   ├── roles.controller.ts
    │   ├── roles.service.ts
    │   └── dto/
    ├── permissions/
    │   ├── permissions.module.ts
    │   ├── permissions.controller.ts
    │   ├── permissions.service.ts
    │   └── dto/
    ├── operators/
    │   ├── operators.module.ts
    │   ├── operators.controller.ts
    │   ├── operators.service.ts
    │   └── dto/
    ├── sanctions/
    │   ├── sanctions.module.ts
    │   ├── sanctions.controller.ts
    │   ├── sanctions.service.ts
    │   └── dto/
    ├── services/
    │   ├── services.module.ts
    │   ├── services.controller.ts
    │   ├── services.service.ts
    │   ├── features/
    │   ├── testers/
    │   └── dto/
    └── settings/
        ├── settings.module.ts
        ├── settings.controller.ts
        ├── settings.service.ts
        └── dto/
```

---

## Environment Variables

```env
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...auth_db

# Cache (Valkey/Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=...

# API Keys (service-to-service)
API_KEYS=key1,key2
```

---

## H-RBAC Hierarchy

```
SYSTEM LEVEL
├── system_super   (level 100) - Full access (*)
├── system_admin   (level 80)  - Partner/User/Legal
└── system_moderator (level 50) - Content moderation

TENANT LEVEL
├── partner_super  (level 100) - Full tenant
├── partner_admin  (level 80)  - Admin management
└── partner_editor (level 50)  - View only
```

### Permission Format

```typescript
@Permissions('role:read')         // resource:action
@Permissions('operator:create')
@Permissions('sanction:revoke')
@Permissions('*')                 // Wildcard
```

---

## Sanction Types

| Type                  | Description                     | Severity |
| --------------------- | ------------------------------- | -------- |
| `WARNING`             | Warning notice, no restrictions | LOW      |
| `TEMPORARY_BAN`       | Time-limited access restriction | MEDIUM   |
| `PERMANENT_BAN`       | Indefinite access restriction   | HIGH     |
| `FEATURE_RESTRICTION` | Specific feature access blocked | MEDIUM   |

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

## Guards

```typescript
@UseGuards(JwtAuthGuard)
@Get('roles')
getRoles() { }

@UseGuards(JwtAuthGuard, PermissionGuard)
@Permissions('role:create')
createRole(@Body() dto: CreateRoleDto) { }

@UseGuards(ApiKeyGuard)  // Service-to-service
@Get('internal/permissions/:roleId')
getPermissions(@Param('roleId') roleId: string) { }
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

## 2025 Best Practices

| Standard             | Status | Implementation                  |
| -------------------- | ------ | ------------------------------- |
| RFC 9562 (UUIDv7)    | ✅     | All IDs via `ID.generate()`     |
| Transactional Outbox | ✅     | Atomic with business operations |
| PII Masking          | ✅     | `masking.util.ts` for all logs  |
| Audit Trail          | ✅     | All RBAC changes logged         |

---

## Type Definitions

> SSOT: `packages/types/src/auth/`

| File            | Contents                             |
| --------------- | ------------------------------------ |
| `types.ts`      | Role, Permission, Operator, Sanction |
| `interfaces.ts` | IRoleService, IOperatorService, etc. |
| `enums.ts`      | SanctionType, AppealStatus, etc.     |

---

## Related Services

- **identity-service**: Accounts, sessions, devices → `.ai/services/identity-service.md`
- **legal-service**: Consents, DSR, law registry → `.ai/services/legal-service.md`

---

**Full policy**: `docs/policies/IDENTITY_PLATFORM.md`
