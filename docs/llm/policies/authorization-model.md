# Authorization Model (DSL)

> OpenFGA model definition for my-girok

## Authorization Model

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

```
Platform (global)
└── Service (service-a, service-b)
    └── Country (kr, us, jp)
        └── Feature (session_recording, user_management)
```

## Wildcards

```
*                 # Super admin
users:*           # All user actions
*:read            # Read-only all resources
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
  serviceId   String? @map("service_id")
  @@unique([name, serviceId])
}

model PermissionAuditLog {
  id            String @id @default(uuid())
  actorId       String @map("actor_id")
  action        String
  tupleUser     String @map("tuple_user")
  tupleRelation String @map("tuple_relation")
  tupleObject   String @map("tuple_object")
  createdAt     DateTime @default(now())
}
```

## Caching Strategy

| Cache Key              | TTL   | Invalidation         |
| ---------------------- | ----- | -------------------- |
| auth:perms:{type}:{id} | 5min  | On assignment change |
| auth:role:{id}:perms   | 15min | On role update       |

---

_Related: `authorization.md` | `authorization-api.md`_
