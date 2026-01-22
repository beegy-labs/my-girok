# Prisma ORM - 2026 Best Practices

> Query optimization, performance, TypeScript integration | **Researched**: 2026-01-22

## Prisma 7.0 Changes (January 2026)

| Feature         | Before          | After                |
| --------------- | --------------- | -------------------- |
| Runtime         | Rust engine     | Pure TypeScript      |
| Query speed     | Baseline        | Up to 3.4x faster    |
| Bundle size     | ~14MB           | ~1.6MB (90% smaller) |
| Type generation | Slow            | 70% faster           |
| Generated code  | In node_modules | Separate directory   |

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

```typescript
// Configure via DATABASE_URL
// postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10

// Or programmatically
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// For serverless (Prisma Accelerate recommended)
// https://www.prisma.io/data-platform/accelerate
```

## Query Optimization

### Avoid N+1 Problem

```typescript
// ❌ N+1 Problem
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
  });
}

// ✅ Include (separate queries, optimized)
const users = await prisma.user.findMany({
  include: { posts: true },
});

// ✅ Join strategy (single query)
const users = await prisma.user.findMany({
  include: { posts: true },
  relationLoadStrategy: 'join',
});
```

### Select Only Needed Fields

```typescript
// ❌ Fetches all columns
const users = await prisma.user.findMany();

// ✅ Fetches only needed columns
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
  },
});

// ✅ For relations
const posts = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    author: {
      select: {
        name: true,
      },
    },
  },
});
```

### Pagination

```typescript
// Offset pagination (simple, but slow for large offsets)
const page1 = await prisma.post.findMany({
  skip: 0,
  take: 20,
  orderBy: { createdAt: 'desc' },
});

// Cursor pagination (efficient for large datasets)
const posts = await prisma.post.findMany({
  take: 20,
  cursor: { id: lastPostId },
  skip: 1, // Skip the cursor itself
  orderBy: { createdAt: 'desc' },
});
```

## Transactions

### Interactive Transactions

```typescript
// For complex operations with reads and writes
const result = await prisma.$transaction(
  async (tx) => {
    // Check balance
    const account = await tx.account.findUnique({
      where: { id: fromAccountId },
    });

    if (account.balance < amount) {
      throw new Error('Insufficient funds');
    }

    // Debit
    await tx.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } },
    });

    // Credit
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

```typescript
// Multiple independent operations
const [users, posts, comments] = await prisma.$transaction([
  prisma.user.findMany(),
  prisma.post.findMany({ take: 10 }),
  prisma.comment.count(),
]);
```

## Raw Queries

### Safe Raw Queries

```typescript
// ✅ Parameterized (safe from SQL injection)
const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM "User"
  WHERE email = ${email}
  AND status = ${status}
`;

// ✅ With Prisma.sql for dynamic queries
import { Prisma } from '@prisma/client';

const orderBy = Prisma.sql`ORDER BY "createdAt" DESC`;
const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM "User"
  ${orderBy}
  LIMIT ${limit}
`;
```

### Unsafe Raw Queries (Avoid)

```typescript
// ❌ SQL Injection vulnerable
await prisma.$queryRawUnsafe(`
  SELECT * FROM "User" WHERE email = '${email}'
`);
```

## Indexing

### Schema Indexes

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

  // Foreign key index (Prisma warns if missing)
  @@index([authorId])
}
```

### Index Guidelines

| Query Pattern                        | Index Type                    |
| ------------------------------------ | ----------------------------- |
| `WHERE email = ?`                    | Single column                 |
| `WHERE status = ? AND createdAt > ?` | Composite (status, createdAt) |
| `WHERE title LIKE '%search%'`        | Full-text index               |
| Foreign keys                         | Always index                  |

## Monitoring & Debugging

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

### Prisma Optimize

```typescript
// Use Prisma Optimize for query analysis
// https://www.prisma.io/data-platform/optimize

// Identifies:
// - Slow queries
// - Missing indexes
// - N+1 problems
// - Inefficient patterns
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

### Return Types

```typescript
import { Prisma } from '@prisma/client';

// Define the include/select shape
const userWithPosts = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { posts: true },
});

// Get the return type
type UserWithPosts = Prisma.UserGetPayload<typeof userWithPosts>;

async function getUserWithPosts(id: string): Promise<UserWithPosts | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { posts: true },
  });
}
```

## Anti-Patterns

| Don't                   | Do                       | Reason                |
| ----------------------- | ------------------------ | --------------------- |
| N+1 in loops            | Use `include` or `join`  | Performance           |
| `SELECT *`              | Use `select`             | Less data transfer    |
| Raw SQL without params  | Use `$queryRaw` template | SQL injection         |
| Skip connection pooling | Configure pool limits    | Connection exhaustion |
| Ignore index warnings   | Add suggested indexes    | Query performance     |
| Large offset pagination | Use cursor pagination    | Memory/speed          |

## Sources

- [Prisma 7.0 Announcement](https://www.infoq.com/news/2026/01/prisma-7-performance/)
- [Prisma Query Optimization](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance)
- [Prisma Performance Benchmarks](https://www.prisma.io/blog/prisma-orm-without-rust-latest-performance-benchmarks)
- [Prisma Best Practices Guide](https://codeit.mk/home/blog/Prisma-Best-Practices-for-Node.js-Developers--A-Comprehensive-Guide)
- [PlanetScale Prisma Best Practices](https://planetscale.com/docs/vitess/tutorials/prisma-best-practices)
