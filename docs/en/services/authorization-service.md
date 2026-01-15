# Authorization Service

> Zanzibar-style ReBAC (Relationship-Based Access Control) engine for fine-grained permissions

## Service Info

| Property | Value                             |
| -------- | --------------------------------- |
| REST     | :3012                             |
| gRPC     | :50055                            |
| Database | authorization_db (PostgreSQL)     |
| Cache    | Valkey (L1 in-memory, L2 shared)  |
| Codebase | `services/authorization-service/` |

## Domain Boundaries

| This Service Owns          | NOT This Service (Other Services) |
| -------------------------- | --------------------------------- |
| Relationship Tuples        | User accounts (identity-service)  |
| Authorization Models (DSL) | Authentication (auth-service)     |
| Permission Check Engine    | Session management (auth-bff)     |
| Change Watch/Propagation   | Audit logging (audit-service)     |

## Core Concepts

### Relationship Tuple

```
(subject, relation, object)

Examples:
(user:alice, member, team:cs-korea)
(team:cs-korea, viewer, session_recording:service-a)
(admin:kim, admin, service:service-a)
```

### Authorization Model DSL

```yaml
model
  schema 1.1

type service
  relations
    define owner: [user, admin]
    define admin: [user, admin, team#member]
    define viewer: [user, admin, team#member]
    define can_manage: owner or admin
    define can_view: can_manage or viewer

type team
  relations
    define owner: [user, admin]
    define member: [user, admin]

type session_recording
  relations
    define parent_service: [service]
    define viewer: [user, admin, team#member]
    define can_view: viewer or parent_service->can_view
```

## gRPC Server (:50055)

| Method      | Description                          |
| ----------- | ------------------------------------ |
| Check       | Check if user has relation on object |
| BatchCheck  | Check multiple permissions at once   |
| Write       | Write/delete relationship tuples     |
| ListObjects | List objects user has relation on    |
| ListUsers   | List users with relation on object   |
| Expand      | Expand permission tree for debugging |
| WriteModel  | Create/update authorization model    |
| ReadModel   | Get authorization model              |

**Proto file**: `packages/proto/authorization/v1/authorization.proto`

## REST API (via auth-bff proxy)

### Permission Check

| Method | Endpoint                     | Description               |
| ------ | ---------------------------- | ------------------------- |
| POST   | `/api/authorization/check`   | Check permission          |
| POST   | `/api/authorization/write`   | Write relationship tuples |
| GET    | `/api/authorization/objects` | List objects for user     |
| GET    | `/api/authorization/users`   | List users for object     |

### Model Management

| Method | Endpoint                                   | Description      |
| ------ | ------------------------------------------ | ---------------- |
| POST   | `/admin/authorization/models`              | Create new model |
| POST   | `/admin/authorization/models/:id/activate` | Activate model   |
| GET    | `/admin/authorization/models`              | Get active model |
| GET    | `/admin/authorization/models/:id`          | Get model by ID  |

## Database Tables

| Table                   | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| authorization_tuples    | Relationship storage (user, relation, object) |
| authorization_models    | DSL source and compiled model storage         |
| authorization_changelog | Change tracking for cache invalidation        |
| effective_permissions   | Materialized view for fast list queries       |

### authorization_tuples Schema

| Column            | Type         | Description                      |
| ----------------- | ------------ | -------------------------------- |
| id                | UUID         | Primary key                      |
| user_type         | VARCHAR(64)  | Subject type (user, team, admin) |
| user_id           | VARCHAR(256) | Subject identifier               |
| user_relation     | VARCHAR(64)  | For usersets: team#member        |
| relation          | VARCHAR(64)  | Relation name (viewer, admin)    |
| object_type       | VARCHAR(64)  | Object type (service, team)      |
| object_id         | VARCHAR(256) | Object identifier                |
| condition_name    | VARCHAR(128) | Optional condition               |
| condition_context | JSONB        | Condition parameters             |
| created_txid      | BIGINT       | Creation transaction ID          |
| deleted_txid      | BIGINT       | Soft delete transaction ID       |

### authorization_models Schema

| Column           | Type        | Description             |
| ---------------- | ----------- | ----------------------- |
| id               | UUID        | Primary key             |
| version_id       | VARCHAR(26) | ULID version identifier |
| schema_version   | VARCHAR(10) | DSL schema version      |
| dsl_source       | TEXT        | Raw DSL source code     |
| compiled_model   | JSONB       | Compiled AST            |
| type_definitions | JSONB       | Type definition lookup  |
| is_active        | BOOLEAN     | Whether model is active |

## Caching Strategy

| Layer | Storage       | TTL      | Purpose                  |
| ----- | ------------- | -------- | ------------------------ |
| L1    | In-memory LRU | 30s      | Per-instance fast lookup |
| L2    | Valkey        | 5min     | Shared across instances  |
| Bloom | In-memory     | -        | Fast negative lookup     |
| MView | PostgreSQL    | Realtime | Precomputed permissions  |

## Cache Keys (Valkey)

| Key Pattern                         | TTL   | Description             |
| ----------------------------------- | ----- | ----------------------- |
| `authz:check:{user}:{rel}:{obj}`    | 5 min | Permission check result |
| `authz:model:active`                | 5 min | Active model cache      |
| `authz:objects:{user}:{rel}:{type}` | 5 min | List objects result     |

## Check Engine Algorithm

```
Check(user, relation, object):
  1. Cache lookup (L1 -> L2)
  2. If cache miss:
     a. Get type definition for object
     b. Get relation rewrite rules
     c. Evaluate recursively:
        - direct: Check tuple exists
        - computed: Check another relation
        - tupleToUserset: Follow relation, check target
        - union: OR logic
        - intersection: AND logic
        - exclusion: base BUT NOT subtract
  3. Cache result
  4. Return allowed/denied
```

## Environment Variables

```bash
# REST API port
HTTP_PORT=3012

# gRPC port for internal service communication
GRPC_PORT=50055

# PostgreSQL database connection
DATABASE_URL=postgresql://user:password@host:5432/authorization_db

# Valkey (Redis-compatible) cache
VALKEY_URL=redis://localhost:6379

# Check engine settings
CHECK_MAX_DEPTH=25

# Cache TTL settings
CACHE_L1_TTL_MS=30000
CACHE_L2_TTL_SEC=300
```

## Monitoring Metrics

| Metric                  | Type      | Description         |
| ----------------------- | --------- | ------------------- |
| authz_check_duration_ms | Histogram | Check latency       |
| authz_check_cache_hit   | Counter   | Cache hit rate      |
| authz_tuples_total      | Gauge     | Total tuples        |
| authz_changelog_lag     | Gauge     | Unprocessed changes |

## Guard Integration (NestJS)

```typescript
@AuthzCheck({
  relation: 'can_view',
  objectType: 'session_recording',
  objectIdFrom: 'query',
  objectIdKey: 'serviceSlug',
})
async listSessions() {}
```

---

**LLM Reference**: `docs/llm/services/authorization-service.md`
