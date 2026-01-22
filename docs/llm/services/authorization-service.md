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

## Patterns

| NEVER                                         | OK                                           |
| --------------------------------------------- | -------------------------------------------- |
| Store permissions in JWT                      | All checks via gRPC Check API                |
| Cache permissions > 5min without invalidation | Write tuples via Write API only              |
| Skip cycle detection                          | Use contextual tuples for runtime conditions |
| Direct DB access from other services          | Use consistency tokens for read-after-write  |
| Bypass gRPC client                            | Use materialized view for list operations    |

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

## Related Documentation

- **Implementation Details**: `authorization-service-impl.md`
- [Authorization Policy](../policies/authorization.md)
- [Authorization Model](../policies/authorization-model.md)
- [Authorization API](../policies/authorization-api.md)
