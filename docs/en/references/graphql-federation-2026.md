# GraphQL Federation Best Practices - 2026

This guide covers GraphQL Federation best practices as of 2026, focusing on Apollo Federation, schema composition, and microservices architecture.

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

### Owner Subgraph (Users)

```graphql
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
```

### Extender Subgraph (Orders)

```graphql
type Order @key(fields: "id") {
  id: ID!
  status: OrderStatus!
  total: Float!
  user: User!
}

extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
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

## NestJS Implementation

### Entity Resolver

```typescript
@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }): Promise<User> {
    return this.usersService.findById(reference.id);
  }

  @Query(() => User, { nullable: true })
  async user(@Args('id') id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }
}
```

## Security Best Practices

1. **Keep Subgraphs Internal**: Only the router should be publicly accessible
2. **Disable Introspection in Production**: Prevent schema exposure
3. **Authentication at Router**: Enforce auth at the entry point

## Performance Optimization

### DataLoader for N+1 Prevention

```typescript
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

## When to Use Federation

| Scenario                     | Recommendation                |
| ---------------------------- | ----------------------------- |
| Single team, small app       | Monolith GraphQL              |
| Multiple teams, domains      | Federation                    |
| Need independent deployments | Federation                    |
| Complex cross-domain queries | Federation                    |
| Rapid prototyping            | Start monolith, migrate later |

## Anti-Patterns to Avoid

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

---

_Last Updated: 2026-01-22_
