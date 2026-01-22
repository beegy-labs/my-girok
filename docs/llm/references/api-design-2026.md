# API Design - 2026 Best Practices

> REST, GraphQL, gRPC comparison and patterns | **Updated**: 2026-01-22

## API Style Comparison (2026)

| Aspect         | REST              | GraphQL             | gRPC             |
| -------------- | ----------------- | ------------------- | ---------------- |
| Adoption       | 93%               | 50-60% enterprise   | Growing internal |
| Best For       | Public APIs, CRUD | Complex UIs, mobile | Microservices    |
| Caching        | HTTP native       | Custom              | Client-side      |
| Learning Curve | Low               | Medium              | Medium           |
| Tooling        | Mature            | Growing             | Excellent        |

## When to Use What

```
Public API → REST (broad compatibility)
Complex UI → GraphQL (flexible queries)
Internal services → gRPC (performance)
Real-time → WebSocket or gRPC streaming
```

## REST Best Practices

### Resource Naming

```
✅ /users                 # Collection
✅ /users/{id}            # Resource
✅ /users/{id}/orders     # Sub-resource
✅ /search?q=term         # Query operation

❌ /getUsers              # Verb in URL
❌ /user/{id}             # Inconsistent plural
❌ /users/{id}/getOrders  # Redundant verb
```

### HTTP Methods

| Method | Purpose        | Idempotent |
| ------ | -------------- | ---------- |
| GET    | Read           | Yes        |
| POST   | Create         | No         |
| PUT    | Replace        | Yes        |
| PATCH  | Partial update | Yes        |
| DELETE | Remove         | Yes        |

### Status Codes

| Code | Meaning           | Use Case                   |
| ---- | ----------------- | -------------------------- |
| 200  | OK                | Successful GET, PUT, PATCH |
| 201  | Created           | Successful POST            |
| 204  | No Content        | Successful DELETE          |
| 400  | Bad Request       | Validation error           |
| 401  | Unauthorized      | Missing/invalid auth       |
| 403  | Forbidden         | Insufficient permissions   |
| 404  | Not Found         | Resource doesn't exist     |
| 429  | Too Many Requests | Rate limited               |
| 500  | Internal Error    | Server error               |

### Versioning

```
URL path:   /api/v1/users    (Recommended)
Header:     Accept: application/vnd.api+json;version=1
Query:      /api/users?version=1
```

## GraphQL Best Practices

### Schema Design

```graphql
# Domain-Driven Subgraphs
type User @key(fields: "id") {
  id: ID!
  email: String!
  profile: Profile
  orders: [Order!]!
}

# Pagination
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}
```

### Performance

| Issue         | Solution            |
| ------------- | ------------------- |
| N+1 queries   | DataLoader batching |
| Deep nesting  | Depth limits        |
| Large queries | Cost analysis       |
| Cache misses  | Persisted queries   |

### Security

```typescript
// Depth limiting
const depthLimit = require('graphql-depth-limit');

// Cost analysis
const costAnalysis = require('graphql-cost-analysis');

// Production: Disable introspection
const server = new ApolloServer({
  introspection: process.env.NODE_ENV !== 'production',
});
```

### Federation (2026)

```graphql
# Subgraph A: Users
extend type Query {
  user(id: ID!): User
}

type User @key(fields: "id") {
  id: ID!
  email: String!
}

# Subgraph B: Orders (extends User)
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

## gRPC Best Practices

### Proto Design

```protobuf
syntax = "proto3";

package user.v1;

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream User);  // Streaming
}

message GetUserRequest {
  string id = 1;
}

message User {
  string id = 1;
  string email = 2;
  google.protobuf.Timestamp created_at = 3;
}
```

### Error Handling

```typescript
import { status } from '@grpc/grpc-js';

// Map to gRPC status codes
throw new RpcException({
  code: status.NOT_FOUND,
  message: 'User not found',
});

// Client handling
try {
  const user = await client.getUser({ id });
} catch (error) {
  if (error.code === status.NOT_FOUND) {
    throw new NotFoundException();
  }
}
```

## Hybrid Architectures

### GraphQL over REST

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GraphQL
┌──────▼──────┐
│   Gateway   │  (Apollo Federation)
└──────┬──────┘
       │ REST/gRPC
┌──────▼──────┐
│  Services   │
└─────────────┘
```

### BFF Pattern

```
Mobile App → Mobile BFF (optimized payloads)
Web App → Web BFF (SSR support)
Admin → Admin BFF (full access)
         ↓
    Microservices (gRPC)
```

## API Documentation

| Tool            | Style   | Features             |
| --------------- | ------- | -------------------- |
| OpenAPI 3.1     | REST    | Industry standard    |
| GraphQL Voyager | GraphQL | Schema visualization |
| gRPC-web        | gRPC    | Browser support      |
| Stoplight       | REST    | Design-first         |

## Rate Limiting

```typescript
// Token bucket algorithm
@Throttle({ default: { limit: 100, ttl: 60000 } })
@Controller('api')
export class ApiController {}

// Response headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Sources

- [REST vs GraphQL vs tRPC Guide 2026](https://dev.to/dataformathub/rest-vs-graphql-vs-trpc-the-ultimate-api-design-guide-for-2026-8n3)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [API Types Guide 2026](https://dev.to/sizan_mahmud0_e7c3fd0cb68/the-complete-guide-to-api-types-in-2026-rest-graphql-grpc-soap-and-beyond-191)
- [GraphQL vs REST - AWS](https://aws.amazon.com/compare/the-difference-between-graphql-and-rest/)
