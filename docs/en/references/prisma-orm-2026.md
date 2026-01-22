# Prisma ORM Best Practices - 2026

This guide covers Prisma ORM best practices as of 2026, focusing on Prisma 7 features, query optimization, and TypeScript integration.

## Prisma 7.0 Changes (January 2026)

Prisma 7 represents a major shift with a pure TypeScript runtime replacing the previous Rust engine:

| Feature         | Before (v6)     | After (v7)           |
| --------------- | --------------- | -------------------- |
| Runtime         | Rust engine     | Pure TypeScript      |
| Query speed     | Baseline        | Up to 3.4x faster    |
| Bundle size     | ~14MB           | ~1.6MB (90% smaller) |
| Type generation | Slow            | 70% faster           |
| Generated code  | In node_modules | Separate directory   |

**Important**: Prisma 7 does not support MongoDB. Projects using MongoDB should remain on Prisma 6.

## Client Configuration

### Basic Setup

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Usage
import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
});
```

### Connection Pooling

Configure via DATABASE_URL or programmatically:

```
postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
```

For serverless environments, consider Prisma Accelerate for connection pooling.

## Query Optimization

### Avoiding N+1 Problems

```typescript
// BAD: N+1 Problem - makes N+1 database queries
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
  });
}

// GOOD: Include (separate optimized queries)
const users = await prisma.user.findMany({
  include: { posts: true },
});

// BETTER: Join strategy (single query)
const users = await prisma.user.findMany({
  include: { posts: true },
  relationLoadStrategy: 'join',
});
```

### Select Only Needed Fields

```typescript
// BAD: Fetches all columns
const users = await prisma.user.findMany();

// GOOD: Fetches only needed columns
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
  },
});

// With relations
const posts = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    author: {
      select: { name: true },
    },
  },
});
```

### Pagination Strategies

**Offset pagination** (simple, but slow for large offsets):

```typescript
const page1 = await prisma.post.findMany({
  skip: 0,
  take: 20,
  orderBy: { createdAt: 'desc' },
});
```

**Cursor pagination** (efficient for large datasets):

```typescript
const posts = await prisma.post.findMany({
  take: 20,
  cursor: { id: lastPostId },
  skip: 1, // Skip the cursor itself
  orderBy: { createdAt: 'desc' },
});
```

## Transactions

### Interactive Transactions

For complex operations requiring reads and writes:

```typescript
const result = await prisma.$transaction(
  async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: fromAccountId },
    });

    if (account.balance < amount) {
      throw new Error('Insufficient funds');
    }

    await tx.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } },
    });

    await tx.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } },
    });

    return { success: true };
  },
  {
    maxWait: 5000, // Max time to acquire connection
    timeout: 10000, // Max transaction duration
    isolationLevel: 'Serializable',
  },
);
```

### Batch Transactions

For multiple independent operations:

```typescript
const [users, posts, comments] = await prisma.$transaction([
  prisma.user.findMany(),
  prisma.post.findMany({ take: 10 }),
  prisma.comment.count(),
]);
```

## Raw Queries

### Safe Parameterized Queries

```typescript
// Safe: Uses parameterized queries
const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM "User"
  WHERE email = ${email}
  AND status = ${status}
`;

// With Prisma.sql for dynamic queries
import { Prisma } from '@prisma/client';

const orderBy = Prisma.sql`ORDER BY "createdAt" DESC`;
const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM "User"
  ${orderBy}
  LIMIT ${limit}
`;
```

### Avoid Unsafe Queries

```typescript
// DANGEROUS: SQL Injection vulnerable
await prisma.$queryRawUnsafe(`
  SELECT * FROM "User" WHERE email = '${email}'
`);
```

## Schema Indexing

### Define Indexes in Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  status    String
  createdAt DateTime @default(now())

  // Single column index
  @@index([status])

  // Composite index (order matters)
  @@index([status, createdAt])
}

model Post {
  id       String @id @default(uuid())
  title    String
  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  // Foreign key index (always recommended)
  @@index([authorId])
}
```

### Index Selection Guide

| Query Pattern                        | Index Type                    |
| ------------------------------------ | ----------------------------- |
| `WHERE email = ?`                    | Single column                 |
| `WHERE status = ? AND createdAt > ?` | Composite (status, createdAt) |
| `WHERE title LIKE '%search%'`        | Full-text index               |
| Foreign keys                         | Always index                  |

## Monitoring and Debugging

### Query Logging

```typescript
const prisma = new PrismaClient({
  log: [{ level: 'query', emit: 'event' }],
});

prisma.$on('query', (e) => {
  console.log('Query:', e.query);
  console.log('Params:', e.params);
  console.log('Duration:', `${e.duration}ms`);
});
```

### OpenTelemetry Integration

```typescript
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

registerInstrumentations({
  instrumentations: [new PrismaInstrumentation()],
});
```

## Type Safety Patterns

### Typed Filters

```typescript
import { Prisma } from '@prisma/client';

type UserWhereInput = Prisma.UserWhereInput;

function buildUserFilter(params: { search?: string; status?: string }): UserWhereInput {
  const where: UserWhereInput = {};

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.status) {
    where.status = params.status;
  }

  return where;
}
```

### Typed Return Values

```typescript
import { Prisma } from '@prisma/client';

const userWithPosts = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { posts: true },
});

type UserWithPosts = Prisma.UserGetPayload<typeof userWithPosts>;

async function getUserWithPosts(id: string): Promise<UserWithPosts | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { posts: true },
  });
}
```

## Anti-Patterns to Avoid

| Don't                   | Do                       | Reason                         |
| ----------------------- | ------------------------ | ------------------------------ |
| N+1 queries in loops    | Use `include` or `join`  | Performance                    |
| `SELECT *`              | Use `select`             | Reduces data transfer          |
| Raw SQL without params  | Use `$queryRaw` template | SQL injection prevention       |
| Skip connection pooling | Configure pool limits    | Prevents connection exhaustion |
| Ignore index warnings   | Add suggested indexes    | Query performance              |
| Large offset pagination | Use cursor pagination    | Memory and speed               |

## Sources

- [Prisma 7.0 Announcement](https://www.infoq.com/news/2026/01/prisma-7-performance/)
- [Prisma Query Optimization](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance)
- [Prisma Performance Benchmarks](https://www.prisma.io/blog/prisma-orm-without-rust-latest-performance-benchmarks)
- [Prisma Best Practices Guide](https://codeit.mk/home/blog/Prisma-Best-Practices-for-Node.js-Developers--A-Comprehensive-Guide)
- [PlanetScale Prisma Best Practices](https://planetscale.com/docs/vitess/tutorials/prisma-best-practices)

---

_Last Updated: 2026-01-22_
