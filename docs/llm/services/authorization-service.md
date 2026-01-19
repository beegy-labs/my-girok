# Authorization Service

> Zanzibar-style ReBAC Engine | Port: 3012 (REST), 50055 (gRPC) | DB: authorization_db

## Architecture

```yaml
flow:
  applications: [auth-bff, services]
  protocol: gRPC
  service: authorization-service
  storage: authorization_db

domains:
  tuples: Relationship storage (subject, relation, object)
  models: Authorization DSL
  check: Permission evaluation engine
  watch: Change propagation
```

## Relationship Tuple

```
format: (subject, relation, object)

examples:
  - (user:alice, member, team:cs-korea)
  - (team:cs-korea, viewer, session_recording:service-a)
  - (admin:kim, admin, service:service-a)
```

## Authorization DSL

```yaml
model:
  schema: 1.1

  type service:
    relations:
      owner: [user, admin]
      admin: [user, admin, team#member]
      viewer: [user, admin, team#member]
      can_manage: owner or admin
      can_view: can_manage or viewer

  type team:
    relations:
      owner: [user, admin]
      member: [user, admin]

  type session_recording:
    relations:
      parent_service: [service]
      viewer: [user, admin, team#member]
      can_view: viewer or parent_service->can_view
```

## Components

| Component           | File                         | Purpose              |
| ------------------- | ---------------------------- | -------------------- |
| DSL Lexer           | dsl/lexer.ts                 | Tokenize DSL         |
| DSL Parser          | dsl/parser.ts                | Parse to AST         |
| Check Engine        | engine/check-engine.ts       | Graph traversal      |
| Tuple Repository    | storage/tuple.repository.ts  | CRUD tuples          |
| Model Repository    | storage/model.repository.ts  | CRUD models          |
| Permission Cache    | cache/permission-cache.ts    | L1/L2 cache          |
| Bloom Filter        | cache/bloom-filter.ts        | Fast negative lookup |
| Changelog Processor | watch/changelog-processor.ts | Change propagation   |

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

## gRPC API

```protobuf
service AuthorizationService {
  rpc Check(CheckRequest) returns (CheckResponse);
  rpc BatchCheck(BatchCheckRequest) returns (BatchCheckResponse);
  rpc Write(WriteRequest) returns (WriteResponse);
  rpc ListObjects(ListObjectsRequest) returns (ListObjectsResponse);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc Expand(ExpandRequest) returns (ExpandResponse);
  rpc WriteModel(WriteModelRequest) returns (WriteModelResponse);
  rpc ReadModel(ReadModelRequest) returns (ReadModelResponse);
}

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

## Integration

### auth-bff Client

```typescript
@Injectable()
export class AuthorizationGrpcClient {
  async check(user: string, relation: string, object: string): Promise<boolean>;
  async write(writes: TupleKey[], deletes?: TupleKey[]): Promise<string>;
  async listObjects(user: string, relation: string, type: string): Promise<string[]>;
}
```

### REST Proxy (auth-bff)

```
POST /api/authorization/check
POST /api/authorization/write
GET  /api/authorization/objects
GET  /api/authorization/users
POST /api/authorization/models
```

### Guard

```typescript
@AuthzCheck({
  relation: 'can_view',
  objectType: 'session_recording',
  objectIdFrom: 'query',
  objectIdKey: 'serviceSlug',
})
async listSessions() {}
```

## Configuration

| Env              | Default | Description           |
| ---------------- | ------- | --------------------- |
| GRPC_PORT        | 50055   | gRPC server port      |
| HTTP_PORT        | 3012    | REST server port      |
| DATABASE_URL     | -       | PostgreSQL connection |
| VALKEY_URL       | -       | Cache connection      |
| CHECK_MAX_DEPTH  | 25      | Max recursion depth   |
| CACHE_L1_TTL_MS  | 30000   | L1 cache TTL          |
| CACHE_L2_TTL_SEC | 300     | L2 cache TTL          |

## Helm Deployment

### External Secrets (Vault)

| Vault Path                            | Key             | Description           |
| ------------------------------------- | --------------- | --------------------- |
| secret/my-girok/authorization-service | database-url    | PostgreSQL connection |
| secret/my-girok/authorization-service | valkey-password | Valkey password       |

### Values

```yaml
externalSecrets:
  enabled: true
  refreshInterval: '1h'
  secretStoreRef:
    name: 'vault-backend'
    kind: 'ClusterSecretStore'
  vault:
    path: 'secret/data/my-girok/authorization-service'

service:
  type: ClusterIP
  httpPort: 3012
  grpcPort: 50055

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70
```

### Installation

```bash
# Dev
cp values.yaml.example values.yaml
helm install authorization-service . -f values.yaml -n development

# Prod (Vault)
vault kv put secret/my-girok/authorization-service \
  database-url="postgresql://..." \
  valkey-password="..."
helm install authorization-service . -f values.yaml -n production
```

## Patterns

| NEVER                                         | OK                                           |
| --------------------------------------------- | -------------------------------------------- |
| Store permissions in JWT                      | All checks via gRPC Check API                |
| Cache permissions > 5min without invalidation | Write tuples via Write API only              |
| Skip cycle detection                          | Use contextual tuples for runtime conditions |
| Direct DB access from other services          | Use consistency tokens for read-after-write  |
| Bypass gRPC client                            | Use materialized view for list operations    |

## Monitoring

| Metric                  | Type      | Description         |
| ----------------------- | --------- | ------------------- |
| authz_check_duration_ms | Histogram | Check latency       |
| authz_check_cache_hit   | Counter   | Cache hit rate      |
| authz_tuples_total      | Gauge     | Total tuples        |
| authz_changelog_lag     | Gauge     | Unprocessed changes |

## Directory Structure

```
services/authorization-service/
├── src/
│   ├── dsl/            # Lexer, Parser, AST
│   ├── engine/         # Check engine, Evaluator
│   ├── storage/        # Tuple/Model repositories
│   ├── cache/          # Permission cache, Bloom filter
│   ├── watch/          # Changelog processor
│   ├── grpc/           # gRPC controller
│   └── http/           # REST controller
├── prisma/schema.prisma
├── test/
└── helm/
```
