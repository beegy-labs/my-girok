# Web BFF (Backend-for-Frontend)

> Web-optimized API aggregation layer

## Purpose

Aggregates and transforms backend service data specifically for web applications. Handles complex data fetching and provides both REST and GraphQL endpoints.

## Tech Stack

- **Framework**: NestJS 11 + TypeScript 5.7
- **Protocols**: REST + GraphQL (both available)
- **Cache**: Redis for aggregated data

## API Endpoints

### REST API (`/api`)

```typescript
// Authentication (proxies to auth-service)
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
GET  /api/auth/google
GET  /api/auth/google/callback

// Dashboard (aggregated data)
GET  /api/dashboard             # User profile + posts + stats

// Posts (proxies to content-api)
GET  /api/posts
POST /api/posts
```

### GraphQL API (`/graphql`)

```graphql
type Query {
  # Dashboard aggregation
  dashboard: Dashboard!

  # User data
  me: User!

  # Content
  posts(limit: Int, cursor: String): PostConnection!
  post(id: ID!): Post

  # Search
  search(query: String!): SearchResults!
}

type Dashboard {
  user: User!
  recentPosts: [Post!]!
  stats: UserStats!
  activity: [Activity!]!
}

type UserStats {
  totalPosts: Int!
  totalNotes: Int!
  totalViews: Int!
}

type Mutation {
  # Auth
  login(email: String!, password: String!): AuthPayload!
  register(input: RegisterInput!): AuthPayload!

  # Content
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
}
```

## Key Flows

### Dashboard Aggregation

```typescript
async getDashboard(userId: string): Promise<Dashboard> {
  const cacheKey = `dashboard:${userId}`;

  // Check cache
  const cached = await this.cache.get(cacheKey);
  if (cached) return cached;

  // Parallel API calls
  const [user, posts, stats] = await Promise.all([
    this.authClient.getUser(userId),
    this.contentClient.getPosts({ authorId: userId, limit: 5 }),
    this.contentClient.getStats(userId),
  ]);

  const dashboard = {
    user,
    recentPosts: posts.data,
    stats,
  };

  // Cache for 30 seconds
  await this.cache.set(cacheKey, dashboard, 30);

  return dashboard;
}
```

### Service Client Pattern

```typescript
@Injectable()
export class AuthServiceClient {
  private readonly baseUrl = process.env.AUTH_SERVICE_URL;

  constructor(private httpService: HttpService) {}

  async getUser(id: string): Promise<User> {
    const response = await this.httpService
      .get(`${this.baseUrl}/api/v1/users/${id}`)
      .toPromise();
    return response.data;
  }

  async login(dto: LoginDto): Promise<AuthPayload> {
    const response = await this.httpService
      .post(`${this.baseUrl}/api/v1/auth/login`, dto)
      .toPromise();
    return response.data;
  }
}
```

### GraphQL DataLoader (N+1 Prevention)

```typescript
@Injectable()
export class UsersLoader {
  constructor(private authClient: AuthServiceClient) {}

  createLoader() {
    return new DataLoader(async (userIds: string[]) => {
      const users = await this.authClient.getUsersByIds(userIds);
      return userIds.map(id => users.find(u => u.id === id));
    });
  }
}

// Usage in resolver
@Resolver(() => Post)
export class PostsResolver {
  @ResolveField(() => User)
  async author(@Parent() post: Post, @Context() ctx: any) {
    return ctx.loaders.users.load(post.authorId);
  }
}
```

## Integration Points

### Outgoing (This BFF calls)
- **auth-service**: `/api/v1/auth/*`, `/api/v1/users/*`
- **content-api**: `/api/v1/posts/*`, `/api/v1/notes/*`
- **llm-api**: `/api/ai/analyze`

### Incoming (Clients call this BFF)
- **web-main**: Next.js app
- **web-admin**: Admin dashboard

## Environment Variables

```bash
AUTH_SERVICE_URL=http://auth-service:3000
CONTENT_SERVICE_URL=http://content-api:3000
LLM_SERVICE_URL=http://llm-api:8000
REDIS_URL=redis://redis:6379
JWT_SECRET=same-as-auth-service
```

## Common Patterns

### Error Handling

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    // Log to monitoring service
    this.logger.error(exception);

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Response Transformation

```typescript
@Injectable()
export class DashboardAggregator {
  // Transform backend data for web client
  async aggregate(userId: string): Promise<WebDashboard> {
    const [user, posts, stats] = await Promise.all([
      this.authClient.getUser(userId),
      this.contentClient.getPosts({ authorId: userId }),
      this.contentClient.getStats(userId),
    ]);

    // Web-specific transformation
    return {
      profile: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        joinedDate: user.createdAt,
      },
      content: {
        recent: posts.data.slice(0, 5),
        total: stats.totalPosts,
      },
      metrics: {
        posts: stats.totalPosts,
        views: stats.totalViews,
        engagement: this.calculateEngagement(stats),
      },
    };
  }
}
```

## Performance

- Cache aggregated responses (30s - 1min TTL)
- Use DataLoaders for GraphQL (prevent N+1)
- Parallel API calls with Promise.all
- Response compression (gzip)

## Security

- Validate JWT tokens before calling services
- Rate limiting: 1000 req/min per user
- CORS: Only allow web domains
- Sanitize responses before sending to client
