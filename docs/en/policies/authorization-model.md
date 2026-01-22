# Authorization Model (DSL)

> OpenFGA model definition for fine-grained access control

## Overview

This document defines the OpenFGA authorization model for the my-girok platform. It uses a Relationship-Based Access Control (ReBAC) approach based on Google's Zanzibar system.

## Authorization Model Definition

The model uses OpenFGA's DSL format to define types, relations, and permission inheritance:

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

## Scoping Hierarchy

The authorization model follows a hierarchical scoping structure:

```
Platform (global)
└── Service (service-a, service-b)
    └── Country (kr, us, jp)
        └── Feature (session_recording, user_management)
```

### Hierarchy Explanation

- **Platform**: Global scope for super admins and platform-wide permissions
- **Service**: Tenant-specific resources and features
- **Country**: Geographic segmentation for compliance requirements
- **Feature**: Specific functionality within a service

## Wildcard Patterns

Wildcards enable broad permission grants:

| Pattern   | Meaning                    |
| --------- | -------------------------- |
| `*`       | Super admin (all access)   |
| `users:*` | All user-related actions   |
| `*:read`  | Read-only on all resources |

## Database Schema

### OpenFGA Managed Tables

OpenFGA manages these tables internally:

```
tuples, authorization_models, stores
```

These tables should not be modified directly.

### Application Metadata Tables

Additional metadata is stored in the application database:

```prisma
model Team {
  id          String  @id @default(uuid())
  name        String
  displayName String  @map("display_name")
  serviceId   String? @map("service_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([name, serviceId])
  @@map("teams")
}

model PermissionAuditLog {
  id            String   @id @default(uuid())
  actorId       String   @map("actor_id")
  action        String   // "GRANT" | "REVOKE"
  tupleUser     String   @map("tuple_user")
  tupleRelation String   @map("tuple_relation")
  tupleObject   String   @map("tuple_object")
  reason        String?
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([tupleObject])
  @@index([createdAt])
  @@map("permission_audit_logs")
}
```

## Caching Strategy

To reduce latency for permission checks, implement caching:

| Cache Key                | TTL   | Invalidation         |
| ------------------------ | ----- | -------------------- |
| `auth:perms:{type}:{id}` | 5min  | On assignment change |
| `auth:role:{id}:perms`   | 15min | On role update       |

### Cache Invalidation Rules

1. **On Grant**: Invalidate user's permission cache
2. **On Revoke**: Invalidate user's permission cache
3. **On Team Change**: Invalidate all team members' caches
4. **On Model Update**: Clear all permission caches

## Usage Examples

### Check User Permission

```typescript
// Can user view session recordings for service-a?
const allowed = await fga.check({
  user: 'user:alice',
  relation: 'can_view',
  object: 'session_recording:service-a',
});
```

### Grant Team Access

```typescript
// Give platform-team viewer access to all service-a resources
await fga.write({
  writes: [
    {
      user: 'team:platform-team#member',
      relation: 'viewer',
      object: 'service:service-a',
    },
  ],
});
```

### List User's Accessible Objects

```typescript
// What session recordings can alice view?
const objects = await fga.listObjects({
  user: 'user:alice',
  relation: 'can_view',
  type: 'session_recording',
});
```

## Related Documentation

- Authorization API: `docs/en/policies/authorization-api.md`
- Authorization Policy: `docs/en/policies/authorization.md`
- [OpenFGA Documentation](https://openfga.dev/docs)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)

---

_This document is auto-generated from `docs/llm/policies/authorization-model.md`_
