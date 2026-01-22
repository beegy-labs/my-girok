# API Design Best Practices - 2026

This guide covers API design best practices as of 2026, comparing REST, GraphQL, and gRPC approaches to help you choose the right style for your use case.

## API Style Comparison (2026)

| Aspect           | REST              | GraphQL               | gRPC                 |
| ---------------- | ----------------- | --------------------- | -------------------- |
| Adoption         | 93% of APIs       | 50-60% enterprise     | Growing for internal |
| Best For         | Public APIs, CRUD | Complex UIs, mobile   | Microservices        |
| Caching          | HTTP native       | Custom implementation | Client-side          |
| Learning Curve   | Low               | Medium                | Medium               |
| Tooling Maturity | Very mature       | Growing               | Excellent            |

## When to Use What

```
Public API → REST (broad compatibility, easy integration)
Complex UI → GraphQL (flexible queries, reduced over-fetching)
Internal services → gRPC (performance, type safety)
Real-time → WebSocket or gRPC streaming
```

## REST Best Practices

### Resource Naming

```
# Good patterns
/users                 # Collection
/users/{id}            # Single resource
/users/{id}/orders     # Sub-resource
/search?q=term         # Query operation

# Patterns to avoid
/getUsers              # Verb in URL
/user/{id}             # Inconsistent plural/singular
/users/{id}/getOrders  # Redundant verb
```

### HTTP Methods

| Method | Purpose          | Idempotent |
| ------ | ---------------- | ---------- |
| GET    | Read resources   | Yes        |
| POST   | Create resource  | No         |
| PUT    | Replace resource | Yes        |
| PATCH  | Partial update   | Yes        |
| DELETE | Remove resource  | Yes        |

### Status Codes

| Code | Meaning           | Use Case                          |
| ---- | ----------------- | --------------------------------- |
| 200  | OK                | Successful GET, PUT, PATCH        |
| 201  | Created           | Successful POST                   |
| 204  | No Content        | Successful DELETE                 |
| 400  | Bad Request       | Validation error                  |
| 401  | Unauthorized      | Missing or invalid authentication |
| 403  | Forbidden         | Insufficient permissions          |
| 404  | Not Found         | Resource doesn't exist            |
| 429  | Too Many Requests | Rate limited                      |
| 500  | Internal Error    | Server-side error                 |

### Versioning Strategies

```
URL path:   /api/v1/users       # Recommended - explicit, easy to route
Header:     Accept: application/vnd.api+json;version=1
Query:      /api/users?version=1
```

## GraphQL Best Practices

### Schema Design

```graphql
# Use domain-driven subgraphs with entity references
type User @key(fields: "id") {
  id: ID!
  email: String!
  profile: Profile
  orders: [Order!]!
}

# Implement cursor-based pagination
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}
```

### Performance Considerations

| Issue         | Solution            |
| ------------- | ------------------- |
| N+1 queries   | DataLoader batching |
| Deep nesting  | Depth limits        |
| Large queries | Cost analysis       |
| Cache misses  | Persisted queries   |

### Security Measures

```typescript
// Implement depth limiting
const depthLimit = require('graphql-depth-limit');

// Add cost analysis
const costAnalysis = require('graphql-cost-analysis');

// Disable introspection in production
const server = new ApolloServer({
  introspection: process.env.NODE_ENV !== 'production',
});
```

### Federation for Microservices

```graphql
# Subgraph A: Users service
extend type Query {
  user(id: ID!): User
}

type User @key(fields: "id") {
  id: ID!
  email: String!
}

# Subgraph B: Orders service (extends User)
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

## gRPC Best Practices

### Protocol Buffer Design

```protobuf
syntax = "proto3";

package user.v1;

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream User);  // Server streaming
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

// Server-side: Map errors to gRPC status codes
throw new RpcException({
  code: status.NOT_FOUND,
  message: 'User not found',
});

// Client-side: Handle gRPC status codes
try {
  const user = await client.getUser({ id });
} catch (error) {
  if (error.code === status.NOT_FOUND) {
    throw new NotFoundException();
  }
}
```

## Hybrid Architectures

### GraphQL Gateway over Services

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

### BFF (Backend for Frontend) Pattern

```
Mobile App → Mobile BFF (optimized payloads, offline support)
Web App → Web BFF (SSR support, full data)
Admin → Admin BFF (full access, bulk operations)
         ↓
    Microservices (gRPC internally)
```

## API Documentation

| Tool            | API Style | Features                           |
| --------------- | --------- | ---------------------------------- |
| OpenAPI 3.1     | REST      | Industry standard, code generation |
| GraphQL Voyager | GraphQL   | Interactive schema visualization   |
| gRPC-web        | gRPC      | Browser support                    |
| Stoplight       | REST      | Design-first workflow              |

## Rate Limiting

```typescript
// NestJS throttler decorator
@Throttle({ default: { limit: 100, ttl: 60000 } })
@Controller('api')
export class ApiController {}
```

Include rate limit headers in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Sources

- [REST vs GraphQL vs tRPC Guide 2026](https://dev.to/dataformathub/rest-vs-graphql-vs-trpc-the-ultimate-api-design-guide-for-2026-8n3)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [API Types Guide 2026](https://dev.to/sizan_mahmud0_e7c3fd0cb68/the-complete-guide-to-api-types-in-2026-rest-graphql-grpc-soap-and-beyond-191)
- [GraphQL vs REST - AWS](https://aws.amazon.com/compare/the-difference-between-graphql-and-rest/)

---

_Last Updated: 2026-01-22_
