# Authorization Service - Implementation Guide

> Database schema, check engine algorithm, and caching strategy for the authorization service.

## Overview

The authorization service implements a relationship-based access control (ReBAC) system with a high-performance check engine, multi-layer caching, and real-time cache invalidation.

## Database Schema

### Authorization Tuples

Stores the relationship tuples that define permissions.

```sql
-- authorization_tuples
id UUID PK
user_type VARCHAR(64)       -- 'user', 'team', 'admin'
user_id VARCHAR(256)        -- UUID or identifier
user_relation VARCHAR(64)   -- For userset: team#member
relation VARCHAR(64)        -- 'viewer', 'admin'
object_type VARCHAR(64)     -- 'service', 'team'
object_id VARCHAR(256)      -- UUID or identifier
condition_name VARCHAR(128)
condition_context JSONB
created_txid BIGINT
deleted_txid BIGINT
```

### Authorization Models

Stores DSL models and their compiled representations.

```sql
-- authorization_models
id UUID PK
version_id VARCHAR(26)      -- ULID
schema_version VARCHAR(10)
dsl_source TEXT
compiled_model JSONB
type_definitions JSONB
is_active BOOLEAN
```

### Authorization Changelog

Tracks changes for cache invalidation.

```sql
-- authorization_changelog
id BIGSERIAL PK
operation VARCHAR(10)       -- 'WRITE', 'DELETE'
tuple_id UUID
txid BIGINT
timestamp TIMESTAMPTZ
processed BOOLEAN
```

### Effective Permissions (Materialized View)

Pre-computed permissions for fast lookups.

```sql
-- effective_permissions (Materialized View)
user_type, user_id
relation
object_type, object_id
path UUID[]
depth INT
```

---

## Check Engine Algorithm

The check engine evaluates permission requests through a multi-step process:

### Flow

1. **Cache Lookup**: Check L1 (in-memory) then L2 (Valkey) cache
2. **On Cache Miss**:
   - Get type definition for the object
   - Get relation rewrite rules
   - Evaluate based on rewrite type:
     - **direct**: Check if tuple exists
     - **computed**: Check another relation
     - **tupleToUserset**: Follow relation, check target
     - **union**: OR logic (any match)
     - **intersection**: AND logic (all must match)
     - **exclusion**: base BUT NOT subtract
3. **Cache Result**: Store for future lookups
4. **Return**: allowed/denied

### Cycle Detection

To prevent infinite loops in recursive permission checks:

```yaml
visited: Set<string> # Format: "user|rewrite|object"
maxDepth: 25
```

---

## gRPC Messages

### Check Request/Response

```protobuf
message CheckRequest {
  string user = 1;           // "user:alice"
  string relation = 2;       // "can_view"
  string object = 3;         // "session_recording:service-a"
  repeated TupleKey contextual_tuples = 4;
  bool trace = 5;
  string consistency_token = 6;
}

message CheckResponse {
  bool allowed = 1;
  ResolutionTrace resolution = 2;
}
```

### Write Request/Response

```protobuf
message WriteRequest {
  repeated TupleKey writes = 1;
  repeated TupleKey deletes = 2;
}

message WriteResponse {
  string consistency_token = 1;
}
```

---

## Caching Strategy

### Cache Layers

| Layer | Storage       | TTL      | Purpose                  |
| ----- | ------------- | -------- | ------------------------ |
| L1    | In-memory LRU | 30s      | Per-instance fast lookup |
| L2    | Valkey        | 5min     | Shared across instances  |
| Bloom | In-memory     | -        | Fast negative lookup     |
| MView | PostgreSQL    | Realtime | Precomputed permissions  |

### Cache Invalidation Flow

When tuples are written or deleted, the following flow ensures cache consistency:

1. **Trigger**: Tuple Write/Delete operation
2. **Log**: Entry added to `authorization_changelog`
3. **Process**: ChangelogProcessor polls every 1 second
4. **Actions**:
   - Invalidate L1/L2 cache entries
   - Refresh Materialized View
   - Emit event via `pg_notify`

---

## Related Documentation

- **Integration & Deployment**: `authorization-service-impl-deployment.md`
- **Main Documentation**: `authorization-service.md`

---

_This document is auto-generated from `docs/llm/services/authorization-service-impl.md`_
