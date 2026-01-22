# GraphQL Federation - 2026 Best Practices

> Apollo Federation, schema composition, microservices | **Researched**: 2026-01-22

## Overview

| Concept        | Description                           |
| -------------- | ------------------------------------- |
| **Supergraph** | Unified graph from multiple subgraphs |
| **Subgraph**   | Individual GraphQL service            |
| **Router**     | Gateway composing subgraphs           |
| **Entity**     | Type shared across subgraphs          |

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Clients                     │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│             Apollo Router                    │
│        (Schema Composition)                  │
└─────────────────────────────────────────────┘
        │           │           │
        ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │ Users  │  │ Orders │  │Products│
   │Subgraph│  │Subgraph│  │Subgraph│
   └────────┘  └────────┘  └────────┘
```

## Entity Definition

### User Service (Owner)

```graphql
# users-subgraph/schema.graphql
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String!
  createdAt: DateTime!
}

type Query {
  user(id: ID!): User
  users(limit: Int = 10, offset: Int = 0): [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
}
```

### Orders Service (Extender)

```graphql
# orders-subgraph/schema.graphql
type Order @key(fields: "id") {
  id: ID!
  status: OrderStatus!
  total: Float!
  createdAt: DateTime!
  user: User!
}

# Extend User from users-subgraph
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

type Query {
  order(id: ID!): Order
  ordersByUser(userId: ID!): [Order!]!
}
```

## NestJS Implementation

### Subgraph Module

```typescript
// users-subgraph/app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
        path: './schema.graphql',
      },
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

### Entity Resolver

```typescript
// users/users.resolver.ts
import { Resolver, Query, Mutation, Args, ResolveReference } from '@nestjs/graphql';
import { User } from './user.entity';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  // For federation entity resolution
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }): Promise<User> {
    return this.usersService.findById(reference.id);
  }

  @Query(() => User, { nullable: true })
  async user(@Args('id') id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }

  @Query(() => [User])
  async users(
    @Args('limit', { defaultValue: 10 }) limit: number,
    @Args('offset', { defaultValue: 0 }) offset: number,
  ): Promise<User[]> {
    return this.usersService.findAll({ limit, offset });
  }
}
```

### Entity Extension

```typescript
// orders/user.resolver.ts (in orders-subgraph)
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { User } from './user.entity';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @ResolveField(() => [Order])
  async orders(@Parent() user: User): Promise<Order[]> {
    return this.ordersService.findByUserId(user.id);
  }
}
```

## Federation Directives

| Directive       | Purpose                               | Example                      |
| --------------- | ------------------------------------- | ---------------------------- |
| `@key`          | Define entity identifier              | `@key(fields: "id")`         |
| `@external`     | Field owned by another subgraph       | `id: ID! @external`          |
| `@requires`     | Field needs external data             | `@requires(fields: "price")` |
| `@provides`     | Provides fields for downstream        | `@provides(fields: "name")`  |
| `@shareable`    | Field can exist in multiple subgraphs | `@shareable`                 |
| `@inaccessible` | Hide from public schema               | `@inaccessible`              |
| `@tag`          | Metadata for tooling                  | `@tag(name: "internal")`     |

## Router Configuration

### supergraph.yaml

```yaml
federation_version: 2
subgraphs:
  users:
    routing_url: http://users-service:4001/graphql
    schema:
      subgraph_url: http://users-service:4001/graphql
  orders:
    routing_url: http://orders-service:4002/graphql
    schema:
      subgraph_url: http://orders-service:4002/graphql
  products:
    routing_url: http://products-service:4003/graphql
    schema:
      subgraph_url: http://products-service:4003/graphql
```

### router.yaml

```yaml
# Apollo Router configuration
supergraph:
  introspection: false
  listen: 0.0.0.0:4000

cors:
  origins:
    - https://app.example.com
  allow_credentials: true

headers:
  all:
    request:
      - propagate:
          named: authorization
      - propagate:
          named: x-request-id

telemetry:
  instrumentation:
    spans:
      mode: spec_compliant
  exporters:
    tracing:
      otlp:
        enabled: true
        endpoint: http://otel-collector:4317
```

## Security Best Practices

### 1. Keep Subgraphs Internal

```yaml
# Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: subgraph-internal
spec:
  podSelector:
    matchLabels:
      app: users-subgraph
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: apollo-router
```

### 2. Disable Introspection in Production

```typescript
GraphQLModule.forRoot<ApolloFederationDriverConfig>({
  introspection: process.env.NODE_ENV !== 'production',
  playground: false,
});
```

### 3. Authentication at Router

```yaml
# router.yaml
authorization:
  require_authentication: true
  directives:
    enabled: true

authentication:
  router:
    jwt:
      jwks:
        url: https://auth.example.com/.well-known/jwks.json
```

## Performance Optimization

### DataLoader for N+1 Prevention

```typescript
import DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class UsersLoader {
  private readonly loader: DataLoader<string, User>;

  constructor(private readonly usersService: UsersService) {
    this.loader = new DataLoader(async (ids: string[]) => {
      const users = await this.usersService.findByIds(ids);
      const userMap = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => userMap.get(id) || null);
    });
  }

  async load(id: string): Promise<User | null> {
    return this.loader.load(id);
  }
}
```

### Query Complexity Limiting

```typescript
import { ComplexityPlugin } from '@nestjs/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot({
      plugins: [
        new ComplexityPlugin({
          estimators: [simpleEstimator({ defaultComplexity: 1 })],
          maximumComplexity: 100,
        }),
      ],
    }),
  ],
})
```

## Schema Evolution

### Adding Fields (Non-Breaking)

```graphql
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String!
  # New field - non-breaking
  avatar: String
}
```

### Deprecating Fields

```graphql
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String!
  # Deprecated - remove in next major
  fullName: String @deprecated(reason: "Use 'name' instead")
}
```

## When to Use Federation

| Scenario                     | Recommendation                |
| ---------------------------- | ----------------------------- |
| Single team, small app       | Monolith GraphQL              |
| Multiple teams, domains      | Federation                    |
| Need independent deployments | Federation                    |
| Complex cross-domain queries | Federation                    |
| Rapid prototyping            | Start monolith, migrate later |

## Anti-Patterns

| Don't                        | Do                     | Reason           |
| ---------------------------- | ---------------------- | ---------------- |
| Expose subgraphs publicly    | Route through gateway  | Security         |
| Enable introspection in prod | Disable in production  | Schema exposure  |
| Skip auth at router          | Enforce auth at entry  | Defense in depth |
| Circular entity refs         | Design clear ownership | Complexity       |
| N+1 in resolvers             | Use DataLoader         | Performance      |

## Sources

- [Apollo Federation Introduction](https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/federation)
- [GraphQL Federation Overview](https://graphql.org/learn/federation/)
- [Apollo Federation Best Practices](https://www.apollographql.com/blog/introducing-the-apollo-federation-best-practices-series)
- [Securing Federation Subgraphs](https://www.apollographql.com/blog/securing-apollo-federation-subgraphs-context-and-best-practices)
- [Federated GraphQL Microservices](https://www.velotio.com/engineering-blog/implementing-federated-graphql-microservices-using-apollo-federation)
