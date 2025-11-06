# Performance Guidelines

> Optimization strategies for my-girok platform

## Performance Budgets

### API Response Times (p95)

- Simple queries (GET by ID): < 50ms
- List endpoints (with pagination): < 200ms
- Complex queries (with joins): < 500ms
- Mutations (POST/PUT/DELETE): < 300ms

### Frontend Performance

- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

### Database

- Query timeout: 5 seconds (hard limit)
- Connection pool: min 2, max 10
- Slow query threshold: 1 second (log warning)

## Database Optimization

### Indexing Strategy

```typescript
// ✅ DO: Add indexes for frequently queried fields
model Post {
  id        String   @id @default(uuid())
  authorId  String
  status    Status
  createdAt DateTime @default(now())
  title     String
  slug      String   @unique

  // Single column indexes
  @@index([authorId])
  @@index([status])
  @@index([slug])

  // Compound indexes (order matters!)
  @@index([status, createdAt(sort: Desc)])
  @@index([authorId, status])

  // Covering index (include frequently accessed columns)
  @@index([authorId], name: "idx_author_posts")
}
```

**Index Guidelines:**
- Add index for foreign keys
- Add index for WHERE clause columns
- Add composite index for multi-column queries
- Order composite index by cardinality (high to low)
- LIMIT indexes per table to avoid write penalty

### Query Optimization

```typescript
// ❌ DON'T: N+1 Query Problem
const posts = await prisma.post.findMany();
for (const post of posts) {
  post.author = await prisma.user.findUnique({ where: { id: post.authorId } });
  post.tags = await prisma.tag.findMany({ where: { postId: post.id } });
}

// ✅ DO: Use include/select
const posts = await prisma.post.findMany({
  include: {
    author: true,
    tags: true,
  },
});

// ✅ BETTER: Select only needed fields
const posts = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    author: {
      select: { id: true, name: true, avatar: true },
    },
  },
});
```

### Connection Pooling

```typescript
// services/*/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Connection string with pool settings
// postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20&connect_timeout=10
```

**Pool Configuration:**
- Development: connection_limit=5
- Production: connection_limit=10 (per instance)
- Pool timeout: 20 seconds
- Connect timeout: 10 seconds

### Slow Query Logging

```typescript
// services/*/src/database/prisma.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Log slow queries
    this.$on('query' as never, (e: any) => {
      if (e.duration > 1000) {
        this.logger.warn({
          message: 'Slow query detected',
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

### Pagination Best Practices

```typescript
// ❌ DON'T: Offset pagination for large datasets
const posts = await prisma.post.findMany({
  skip: 10000, // Slow for large offsets
  take: 20,
});

// ✅ DO: Cursor-based pagination
const posts = await prisma.post.findMany({
  take: 20,
  skip: 1, // Skip the cursor
  cursor: {
    id: lastPostId, // Cursor from previous page
  },
  orderBy: {
    createdAt: 'desc',
  },
});

// Return cursor for next page
return {
  data: posts,
  nextCursor: posts.length > 0 ? posts[posts.length - 1].id : null,
};
```

## Caching Strategy

### Redis Caching

```typescript
// services/*/src/common/cache/cache.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      keyPrefix: 'mygirok:',
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Cache-Aside Pattern

```typescript
@Injectable()
export class PostsService {
  constructor(
    private readonly postsRepo: PostsRepository,
    private readonly cache: CacheService,
  ) {}

  async findOne(id: string): Promise<Post> {
    const cacheKey = `post:${id}`;

    // 1. Check cache
    const cached = await this.cache.get<Post>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Fetch from database
    const post = await this.postsRepo.findById(id);
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    // 3. Store in cache with TTL
    await this.cache.set(cacheKey, post, 300); // 5 minutes

    return post;
  }

  @Transactional()
  async update(id: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.postsRepo.update(id, dto);

    // Invalidate cache on update
    await this.cache.del(`post:${id}`);

    return post;
  }
}
```

### Cache TTL Guidelines

| Data Type | TTL | Reason |
|-----------|-----|--------|
| User profile | 5 min | Frequently accessed, rarely changes |
| Post detail | 5 min | Popular content, moderate changes |
| Post list | 1 min | Frequently updated |
| Static content | 1 hour | Rarely changes |
| Config/Settings | 10 min | Infrequent changes |
| Search results | 30 sec | Real-time preference |

### Cache Invalidation Strategies

```typescript
// 1. Time-based (TTL) - Automatic
await this.cache.set('key', value, 300); // Expires in 5 min

// 2. Event-based - Manual invalidation
async deletePost(id: string) {
  await this.postsRepo.delete(id);

  // Invalidate related caches
  await this.cache.del(`post:${id}`);
  await this.cache.invalidatePattern('posts:list:*');
  await this.cache.del(`user:${post.authorId}:posts`);
}

// 3. Version-based - Include version in key
const cacheKey = `post:${id}:v${post.updatedAt.getTime()}`;
```

## Frontend Optimization

### Next.js Optimization

```typescript
// app/posts/[id]/page.tsx
import { Suspense } from 'react';
import Image from 'next/image';

// 1. Static Generation (when possible)
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ id: post.id }));
}

// 2. Server Component (default)
export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);

  return (
    <article>
      {/* 3. Optimized Images */}
      <Image
        src={post.coverImage}
        alt={post.title}
        width={1200}
        height={630}
        priority
      />

      <h1>{post.title}</h1>

      {/* 4. Streaming with Suspense */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments postId={post.id} />
      </Suspense>
    </article>
  );
}

// 5. Revalidation
export const revalidate = 60; // ISR: revalidate every 60 seconds
```

### Code Splitting

```typescript
// ✅ DO: Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Disable SSR if not needed
});

// ✅ DO: Route-based code splitting (automatic with App Router)
// app/dashboard/page.tsx - Separate bundle
// app/settings/page.tsx - Separate bundle
```

### API Client Optimization

```typescript
// lib/api/client.ts
class ApiClient {
  private cache = new Map<string, { data: any; timestamp: number }>();

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const cacheKey = `${endpoint}${JSON.stringify(options)}`;

    // Client-side cache (5 seconds)
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.data;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(response);
    }

    const data = await response.json();

    // Update cache
    this.cache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
  }
}
```

## Monitoring & Observability

### Health Check Endpoints

```typescript
// services/*/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

### Metrics Collection

```typescript
// services/*/src/common/interceptors/metrics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        // Log request metrics
        this.metricsService.recordRequest({
          method,
          url,
          duration,
          statusCode: context.switchToHttp().getResponse().statusCode,
        });

        // Alert on slow requests
        if (duration > 1000) {
          this.logger.warn(`Slow request: ${method} ${url} took ${duration}ms`);
        }
      }),
    );
  }
}
```

### Alert Thresholds

Monitor and alert on:

- **Error rate > 1%** for 5 minutes
- **Response time p95 > 1s** for 5 minutes
- **CPU usage > 80%** for 10 minutes
- **Memory usage > 90%** for 5 minutes
- **Database connection pool exhausted**
- **Redis connection failures**

## Mobile Performance

### iOS Optimization

```swift
// Lazy loading images
import SDWebImage

imageView.sd_setImage(
    with: URL(string: post.coverImage),
    placeholderImage: UIImage(named: "placeholder"),
    options: [.progressiveLoad, .scaleDownLargeImages]
)

// Background data sync
func scheduleBackgroundRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: "dev.mygirok.refresh")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 min
    try? BGTaskScheduler.shared.submit(request)
}
```

### Android Optimization

```kotlin
// Pagination with Paging 3
val postsFlow = Pager(
    config = PagingConfig(pageSize = 20, enablePlaceholders = false),
    pagingSourceFactory = { PostsPagingSource(apiService) }
).flow.cachedIn(viewModelScope)

// Image loading with Coil
AsyncImage(
    model = ImageRequest.Builder(context)
        .data(post.coverImage)
        .crossfade(true)
        .diskCachePolicy(CachePolicy.ENABLED)
        .build(),
    contentDescription = post.title
)
```

## Performance Checklist

### Before Production
- [ ] Database indexes created for frequent queries
- [ ] Connection pooling configured
- [ ] Redis caching implemented for hot paths
- [ ] Slow query logging enabled
- [ ] API response times measured (p95 < 500ms)
- [ ] Frontend bundle size optimized (< 200KB initial)
- [ ] Images optimized and lazy-loaded
- [ ] Code splitting implemented
- [ ] Health check endpoints working
- [ ] Monitoring and alerts configured
- [ ] Load testing completed (100+ req/s)

### During Development
- [ ] Use SELECT only needed fields
- [ ] Implement cursor pagination for large datasets
- [ ] Avoid N+1 queries (use include/select)
- [ ] Cache frequently accessed data
- [ ] Invalidate cache on updates
- [ ] Use dynamic imports for heavy components
- [ ] Optimize images (WebP, sizes, lazy loading)
- [ ] Profile slow endpoints
- [ ] Monitor database query performance
- [ ] Test with production-like data volumes

## Tools

- **Database**: `EXPLAIN ANALYZE` for query plans
- **Backend**: NestJS Terminus, Prometheus
- **Frontend**: Lighthouse, Web Vitals, Next.js Analytics
- **Load Testing**: k6, Artillery, autocannon
- **APM**: Sentry, DataDog, New Relic
- **Profiling**: Chrome DevTools, React DevTools Profiler
