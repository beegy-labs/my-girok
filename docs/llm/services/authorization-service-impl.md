# Authorization Service - Implementation

> Database schema, check engine algorithm, and caching strategy

## Database Schema

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

-- authorization_models
id UUID PK
version_id VARCHAR(26)      -- ULID
schema_version VARCHAR(10)
dsl_source TEXT
compiled_model JSONB
type_definitions JSONB
is_active BOOLEAN

-- authorization_changelog
id BIGSERIAL PK
operation VARCHAR(10)       -- 'WRITE', 'DELETE'
tuple_id UUID
txid BIGINT
timestamp TIMESTAMPTZ
processed BOOLEAN

-- effective_permissions (Materialized View)
user_type, user_id
relation
object_type, object_id
path UUID[]
depth INT
```

## Check Engine Algorithm

```yaml
check_flow:
  1: Cache lookup (L1 → L2)
  2_cache_miss:
    a: Get type definition for object
    b: Get relation rewrite rules
    c_evaluate:
      direct: Check tuple exists
      computed: Check another relation
      tupleToUserset: Follow relation, check target
      union: OR logic
      intersection: AND logic
      exclusion: base BUT NOT subtract
  3: Cache result
  4: Return allowed/denied

cycle_detection:
  visited: Set<string> # "user|rewrite|object"
  maxDepth: 25
```

## gRPC Messages

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

message WriteRequest {
  repeated TupleKey writes = 1;
  repeated TupleKey deletes = 2;
}

message WriteResponse {
  string consistency_token = 1;
}
```

## Caching Strategy

| Layer | Storage       | TTL      | Purpose                  |
| ----- | ------------- | -------- | ------------------------ |
| L1    | In-memory LRU | 30s      | Per-instance fast lookup |
| L2    | Valkey        | 5min     | Shared across instances  |
| Bloom | In-memory     | -        | Fast negative lookup     |
| MView | PostgreSQL    | Realtime | Precomputed permissions  |

### Cache Invalidation

```yaml
flow:
  trigger: Tuple Write/Delete
  1: authorization_changelog
  2: ChangelogProcessor (poll 1s)
  3_actions:
    - Invalidate L1/L2 cache
    - Refresh Materialized View
    - Emit event (pg_notify)
```

## Related Documentation

- **Integration & Deployment**: `authorization-service-impl-deployment.md`
- Main: `authorization-service.md`
