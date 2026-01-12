# Authorization Policy

> Zanzibar-style ReBAC (Self-implemented) | 2026 Best Practice

## Service

**authorization-service**: `docs/llm/services/authorization-service.md`

## Architecture

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

## Why OpenFGA

| Feature     | Custom RBAC | OpenFGA         |
| ----------- | ----------- | --------------- |
| Inheritance | SQL JOINs   | Graph traversal |
| Performance | O(n)        | O(1) + cache    |
| Scale       | Limited     | Google-scale    |
| Audit       | Custom      | Built-in        |

## Core Concepts

### Relationship Tuple

```
(subject, relation, object)

Examples:
(user:alice, member, team:cs-korea)
(team:cs-korea, viewer, session_recording:service-a)
(admin:kim, admin, service:service-a)
```

### Permission Inheritance

```
user:alice ──member──> team:cs-kr ──viewer──> session_recording:service-a
                                        │
                                        ▼
                            alice can view recordings
```

## Authorization Model (DSL)

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

| Level | Role          | Can Manage                    |
| ----- | ------------- | ----------------------------- |
| 0     | Super Admin   | All services, all permissions |
| 1     | Service Admin | Service-scoped permissions    |
| 2     | Team Lead     | Team members only             |
| 3     | Operator      | No permission management      |

```yaml
Rules:
  - Level N can only assign Level > N
  - Service Admin cannot cross service boundary
  - Team Lead can only add members to owned teams
```

## Scoping Hierarchy

```
Platform (global)
└── Service (service-a, service-b)
    └── Country (kr, us, jp)
        └── Feature (session_recording, user_management)
```

## Permission Format

```
{resource}:{action}[:{scope}]

Examples:
  users:read                    # Default scope
  users:read:service-a          # Service-scoped
  orders:manage:service-b:kr    # Service + Country
  session-recordings:view       # Feature permission
  permissions:manage            # Meta-permission
```

### Wildcards

```
*                 # Super admin
users:*           # All user actions
*:read            # Read-only all resources
```

## Standard Actions

| Action | Description         |
| ------ | ------------------- |
| create | Create resources    |
| read   | View/list resources |
| update | Modify resources    |
| delete | Remove resources    |
| manage | Full CRUD + special |
| export | Download data       |
| assign | Assign to others    |

## Standard Resources

| Resource           | Description                  |
| ------------------ | ---------------------------- |
| users              | User management              |
| operators          | Operator management          |
| roles              | Role definitions             |
| permissions        | Permission definitions       |
| teams              | Team (policy set) management |
| services           | Service configuration        |
| audit-logs         | Audit log access             |
| session-recordings | Session replay               |

## API Design

### Check Permission

```typescript
// POST /api/admin/authorization/check
interface CheckRequest {
  user: string; // "user:alice"
  relation: string; // "can_view"
  object: string; // "session_recording:service-a"
}
```

### Grant/Revoke

```typescript
// POST /api/admin/authorization/grant
// POST /api/admin/authorization/revoke
interface GrantRequest {
  user: string;
  relation: string;
  object: string;
  reason?: string;
  expiresAt?: string; // TTL
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

## NestJS Guard

```typescript
@FgaCheck({
  relation: 'can_view',
  objectType: 'session_recording',
  objectIdParam: 'serviceSlug',
})
async listSessions(@Query('serviceSlug') serviceSlug: string) {
  // Only if user has can_view on session_recording:{serviceSlug}
}
```

## Database Schema

### OpenFGA Managed

```
tuples, authorization_models, stores
```

### Application Metadata

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

```typescript
// Clone existing service permissions
await createServiceWithAuthorization({
  slug: 'poc-new-feature',
  features: ['session_recording', 'user_management'],
  copyFromService: 'service-a', // Clone structure
});
```

## Infrastructure

### Docker Compose

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

| Variable         | Description           |
| ---------------- | --------------------- |
| OPENFGA_API_URL  | OpenFGA HTTP endpoint |
| OPENFGA_STORE_ID | Store identifier      |

## Caching Strategy

| Cache Key              | TTL   | Invalidation         |
| ---------------------- | ----- | -------------------- |
| auth:perms:{type}:{id} | 5min  | On assignment change |
| auth:role:{id}:perms   | 15min | On role update       |

## Migration Strategy

| Phase | Description                  |
| ----- | ---------------------------- |
| 1     | Deploy OpenFGA, create model |
| 2     | Dual-write (DB + OpenFGA)    |
| 3     | Switch reads to OpenFGA      |
| 4     | Remove legacy tables         |

## Anti-Patterns

```yaml
NEVER:
  - Store permissions in JWT (use check API)
  - Cache permissions > 5 minutes
  - Skip audit logging
  - Allow self-assignment of higher level
  - Cross-service permission without Platform scope
```

## Correct Patterns

```yaml
OK:
  - Real-time permission checks via OpenFGA
  - Team-based permission grouping
  - Service-scoped authorization
  - Delegation with level constraints
  - Clone for POC rapid setup
```

## Requirements Checklist

| Requirement               | Support | Implementation           |
| ------------------------- | ------- | ------------------------ |
| Dynamic permission groups | Yes     | Team type                |
| Permission assignment     | Yes     | Tuple write              |
| Super user management     | Yes     | platform:super_admin     |
| Delegation                | Yes     | Level-based model        |
| Service-scoped            | Yes     | service:{slug}           |
| Country-scoped            | Yes     | country:{service}-{code} |
| POC rapid setup           | Yes     | Clone function           |
| Audit trail               | Yes     | PermissionAuditLog       |
| Time-limited access       | Yes     | TTL + background job     |

## References

- [OpenFGA Documentation](https://openfga.dev/docs)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- [SpiceDB](https://github.com/authzed/spicedb)
