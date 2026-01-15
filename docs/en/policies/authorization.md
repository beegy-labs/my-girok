# Authorization Policy

> Zanzibar-style Relationship-Based Access Control (ReBAC) with OpenFGA

## Overview

The my-girok platform uses a Zanzibar-inspired authorization model implemented with OpenFGA. This approach provides scalable, fine-grained access control with support for permission inheritance, team-based grouping, and service-scoped permissions.

For service implementation details, see `docs/llm/services/authorization-service.md`.

## Architecture

The authorization system consists of the following components:

```
Applications (web-admin, auth-bff, services)
              │
              ▼
    Authorization Service (NestJS)
              │
              ▼
         OpenFGA Engine
              │
              ▼
      PostgreSQL (Tuples)
```

Applications communicate with the Authorization Service via REST or gRPC. The service delegates permission checks to OpenFGA, which stores relationship tuples in PostgreSQL.

## Why OpenFGA?

OpenFGA provides significant advantages over traditional RBAC implementations:

| Feature     | Custom RBAC           | OpenFGA             |
| ----------- | --------------------- | ------------------- |
| Inheritance | Complex SQL JOINs     | Graph traversal     |
| Performance | O(n) lookups          | O(1) with caching   |
| Scale       | Limited by DB         | Google-scale design |
| Audit       | Custom implementation | Built-in trail      |

## Core Concepts

### Relationship Tuples

All permissions are expressed as relationship tuples in the format `(subject, relation, object)`:

```
(user:alice, member, team:cs-korea)
(team:cs-korea, viewer, session_recording:service-a)
(admin:kim, admin, service:service-a)
```

### Permission Inheritance

Permissions flow through relationships automatically. For example:

```
user:alice ──member──> team:cs-kr ──viewer──> session_recording:service-a
                                        │
                                        ▼
                            alice can view recordings
```

Alice inherits viewing permission on session recordings through her team membership.

## Authorization Model

The authorization model is defined using OpenFGA's DSL:

```yaml
model
  schema 1.1

type platform
  relations
    define super_admin: [user, admin]
    define admin: [user, admin]

type service
  relations
    define owner: [user, admin]
    define admin: [user, admin, team#member]
    define operator: [user, admin, team#member]
    define viewer: [user, admin, team#member]
    define can_manage: owner or admin
    define can_operate: can_manage or operator
    define can_view: can_operate or viewer

type team
  relations
    define owner: [user, admin]
    define member: [user, admin]

type session_recording
  relations
    define parent_service: [service]
    define viewer: [user, admin, team#member]
    define exporter: [user, admin, team#member]
    define can_view: viewer or parent_service->can_view_recordings
    define can_export: exporter or parent_service->can_manage

type user_management
  relations
    define parent_service: [service]
    define reader: [user, admin, team#member]
    define editor: [user, admin, team#member]
    define can_read: reader or parent_service->can_operate
    define can_edit: editor or parent_service->can_manage

type audit_log
  relations
    define parent_service: [service]
    define viewer: [user, admin, team#member]
    define can_view: viewer or parent_service->can_view_audit
```

## Delegation Model

Permissions can be delegated according to a hierarchical level system:

| Level | Role          | Can Manage                          |
| ----- | ------------- | ----------------------------------- |
| 0     | Super Admin   | All services, all permissions       |
| 1     | Service Admin | Service-scoped permissions only     |
| 2     | Team Lead     | Team members only                   |
| 3     | Operator      | No permission management capability |

### Delegation Rules

```yaml
Rules:
  - Level N can only assign Level > N
  - Service Admin cannot cross service boundary
  - Team Lead can only add members to owned teams
```

## Scoping Hierarchy

Permissions are organized in a hierarchical scope structure:

```
Platform (global)
└── Service (service-a, service-b)
    └── Country (kr, us, jp)
        └── Feature (session_recording, user_management)
```

## Permission Format

Permissions follow a structured format:

```
{resource}:{action}[:{scope}]
```

### Examples

| Permission                   | Description                       |
| ---------------------------- | --------------------------------- |
| `users:read`                 | Read users (default scope)        |
| `users:read:service-a`       | Read users in service-a           |
| `orders:manage:service-b:kr` | Manage orders in service-b, Korea |
| `session-recordings:view`    | View session recordings           |
| `permissions:manage`         | Manage permissions (meta)         |

### Wildcards

Wildcard permissions grant broad access:

| Pattern   | Description                 |
| --------- | --------------------------- |
| `*`       | Super admin (all access)    |
| `users:*` | All user actions            |
| `*:read`  | Read-only for all resources |

## Standard Actions

| Action | Description                       |
| ------ | --------------------------------- |
| create | Create new resources              |
| read   | View or list existing resources   |
| update | Modify existing resources         |
| delete | Remove resources                  |
| manage | Full CRUD plus special operations |
| export | Download or export data           |
| assign | Assign resources to other users   |

## Standard Resources

| Resource           | Description                  |
| ------------------ | ---------------------------- |
| users              | User account management      |
| operators          | Operator account management  |
| roles              | Role definitions             |
| permissions        | Permission definitions       |
| teams              | Team (policy set) management |
| services           | Service configuration        |
| audit-logs         | Audit log access             |
| session-recordings | Session replay functionality |

## API Design

### Checking Permissions

To check if a user has a permission:

```typescript
// POST /api/admin/authorization/check
interface CheckRequest {
  user: string; // "user:alice"
  relation: string; // "can_view"
  object: string; // "session_recording:service-a"
}
```

### Granting and Revoking Permissions

```typescript
// POST /api/admin/authorization/grant
// POST /api/admin/authorization/revoke
interface GrantRequest {
  user: string;
  relation: string;
  object: string;
  reason?: string;
  expiresAt?: string; // TTL for time-limited access
}
```

### Team Management

```typescript
// POST /api/admin/teams
interface CreateTeamRequest {
  name: string;
  displayName: string;
  serviceId?: string;
  members: string[];
  permissions: Array<{
    relation: string;
    object: string;
  }>;
}
```

## NestJS Guard Integration

Use the `@FgaCheck` decorator to protect endpoints:

```typescript
@FgaCheck({
  relation: 'can_view',
  objectType: 'session_recording',
  objectIdParam: 'serviceSlug',
})
async listSessions(@Query('serviceSlug') serviceSlug: string) {
  // Only executes if user has can_view on session_recording:{serviceSlug}
}
```

## Database Schema

### OpenFGA Managed Tables

OpenFGA manages these tables internally:

- `tuples`: Stores relationship tuples
- `authorization_models`: Stores model versions
- `stores`: Multi-tenant store configuration

### Application Metadata

Additional metadata is stored in application tables:

```prisma
model Team {
  id          String @id @default(uuid())
  name        String
  displayName String @map("display_name")
  serviceId   String? @map("service_id")
  createdBy   String @map("created_by")
  @@unique([name, serviceId])
}

model PermissionAuditLog {
  id            String @id @default(uuid())
  actorType     String @map("actor_type")
  actorId       String @map("actor_id")
  action        String
  tupleUser     String @map("tuple_user")
  tupleRelation String @map("tuple_relation")
  tupleObject   String @map("tuple_object")
  createdAt     DateTime @default(now())
}
```

## POC Rapid Setup

For quickly setting up new services with authorization:

```typescript
// Clone existing service permissions
await createServiceWithAuthorization({
  slug: 'poc-new-feature',
  features: ['session_recording', 'user_management'],
  copyFromService: 'service-a', // Clone structure
});
```

## Infrastructure

### Docker Compose Configuration

```yaml
services:
  openfga:
    image: openfga/openfga:latest
    ports:
      - '8080:8080' # HTTP
      - '8081:8081' # gRPC
    environment:
      - OPENFGA_DATASTORE_ENGINE=postgres
      - OPENFGA_DATASTORE_URI=postgres://...
```

### Environment Variables

| Variable         | Description               |
| ---------------- | ------------------------- |
| OPENFGA_API_URL  | OpenFGA HTTP endpoint URL |
| OPENFGA_STORE_ID | OpenFGA store identifier  |

## Caching Strategy

| Cache Key              | TTL   | Invalidation Trigger |
| ---------------------- | ----- | -------------------- |
| auth:perms:{type}:{id} | 5min  | On assignment change |
| auth:role:{id}:perms   | 15min | On role update       |

## Migration Strategy

For migrating from existing authorization systems:

| Phase | Description                                |
| ----- | ------------------------------------------ |
| 1     | Deploy OpenFGA, create authorization model |
| 2     | Dual-write to both DB and OpenFGA          |
| 3     | Switch reads to OpenFGA                    |
| 4     | Remove legacy authorization tables         |

## Best Practices

### Correct Patterns

- Real-time permission checks via OpenFGA
- Team-based permission grouping
- Service-scoped authorization
- Delegation with level constraints
- Clone existing services for POC rapid setup

### Anti-Patterns to Avoid

- **Never** store permissions in JWT (use check API instead)
- **Never** cache permissions longer than 5 minutes
- **Never** skip audit logging for permission changes
- **Never** allow self-assignment of higher permission levels
- **Never** allow cross-service permissions without Platform scope

## Requirements Checklist

| Requirement               | Supported | Implementation           |
| ------------------------- | --------- | ------------------------ |
| Dynamic permission groups | Yes       | Team type                |
| Permission assignment     | Yes       | Tuple write              |
| Super user management     | Yes       | platform:super_admin     |
| Delegation                | Yes       | Level-based model        |
| Service-scoped            | Yes       | service:{slug}           |
| Country-scoped            | Yes       | country:{service}-{code} |
| POC rapid setup           | Yes       | Clone function           |
| Audit trail               | Yes       | PermissionAuditLog       |
| Time-limited access       | Yes       | TTL + background job     |

## References

- [OpenFGA Documentation](https://openfga.dev/docs)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- [SpiceDB](https://github.com/authzed/spicedb)

---

**LLM Reference**: `docs/llm/policies/authorization.md`
