# User Schema - Permissions & Authorization

> Service-role tables, permission format, and OpenFGA model

## Overview

This document details the permission system and authorization model that complements the global user schema, including database tables for role management and OpenFGA integration.

## Service-Role Tables (auth_db)

### service_role_definitions

Defines available roles for each service type:

```sql
CREATE TABLE service_role_definitions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  service_type      TEXT NOT NULL,
  role_name         TEXT NOT NULL,
  role_level        INT NOT NULL DEFAULT 0,
  display_name      TEXT NOT NULL,
  base_permissions  TEXT[] NOT NULL,
  inherits_from     TEXT[],
  UNIQUE(service_type, role_name)
);
```

### user_service_roles

Assigns roles to users within specific services:

```sql
CREATE TABLE user_service_roles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id           UUID NOT NULL,
  service_id        UUID NOT NULL,
  service_type      TEXT NOT NULL,
  role_name         TEXT NOT NULL,
  role_level        INT NOT NULL,
  custom_permissions TEXT[] DEFAULT '{}',
  scope             JSONB DEFAULT '{}',
  expires_at        TIMESTAMPTZ,
  UNIQUE(user_id, service_id, role_name)
);
```

## Permission Format

```
{resource}:{action}[:{scope}]
```

### Examples by Service

| Service     | Permission Examples                          |
| ----------- | -------------------------------------------- |
| Marketplace | `products:create`, `orders:manage:store-123` |
| LMS         | `courses:create`, `grades:manage:course-101` |
| Fintech     | `accounts:view`, `transfers:create:10000`    |
| Healthcare  | `records:view:own`, `prescriptions:create`   |

### Standard Actions

| Action | Level | Description            |
| ------ | ----- | ---------------------- |
| view   | 0     | Read single resource   |
| list   | 0     | List resources         |
| create | 1     | Create new resource    |
| update | 1     | Modify resource        |
| delete | 2     | Remove resource        |
| manage | 2     | Full CRUD              |
| admin  | 3     | Administrative actions |

## OpenFGA Model

Key type definitions for service-specific authorization:

```yaml
type marketplace
  relations
    define admin: [user, admin]
    define seller: [user, organization#member]
    define buyer: [user]

type store
  relations
    define marketplace: [marketplace]
    define owner: [user]
    define staff: [user]
    define can_manage_products: owner or staff

type lms_platform
  relations
    define instructor: [user]
    define learner: [user]

type course
  relations
    define platform: [lms_platform]
    define instructor: [user]
    define student: [user]
    define can_grade: instructor or platform->admin
```

## Implementation Notes

### JSONB Indexing Strategy

Create targeted indexes for frequent query patterns:

```sql
-- Index for commerce tier filtering
CREATE INDEX idx_accounts_commerce_tier
  ON accounts USING BTREE ((commerce_profile->>'customer_tier'));

-- Index for enterprise department filtering
CREATE INDEX idx_accounts_enterprise_dept
  ON accounts USING BTREE ((enterprise_profile->>'department'));

-- GIN index for linked identities search
CREATE INDEX idx_accounts_linked_identities
  ON accounts USING GIN (linked_identities);
```

### Cross-Service Data Access

- Use gRPC for cross-database queries (no cross-DB JOINs)
- Cache frequently accessed profile data
- Use identity_graph_id for cross-platform identity resolution

### Role Assignment Example

```typescript
// Assign seller role in marketplace
await prisma.userServiceRole.create({
  data: {
    userId: user.id,
    serviceId: marketplace.id,
    serviceType: 'MARKETPLACE',
    roleName: 'SELLER',
    roleLevel: 1,
    customPermissions: ['products:create', 'orders:view:own'],
    scope: { storeIds: ['store-123'] },
  },
});
```

### Permission Check Example

```typescript
// Check if user can manage products
async function canManageProducts(userId: string, storeId: string) {
  const role = await prisma.userServiceRole.findFirst({
    where: {
      userId,
      OR: [
        { scope: { path: ['storeIds'], array_contains: storeId } },
        { roleName: 'MARKETPLACE_ADMIN' },
      ],
    },
  });

  if (!role) return false;

  return (
    role.basePermissions.includes('products:manage') ||
    role.customPermissions.includes('products:manage')
  );
}
```

## Related Documentation

- Main Schema: `docs/en/policies/user-schema.md`
- [SCIM 2.0 Core Schema (RFC 7643)](https://datatracker.ietf.org/doc/html/rfc7643)
- [OpenFGA Documentation](https://openfga.dev/docs)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

---

_This document is auto-generated from `docs/llm/policies/user-schema-permissions.md`_
