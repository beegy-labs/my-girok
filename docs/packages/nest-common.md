# @my-girok/nest-common

> Shared NestJS utilities for microservices

## Quick Start

```typescript
import { configureApp, JwtAuthGuard, HttpExceptionFilter, HealthModule } from '@my-girok/nest-common';

// main.ts
const app = await NestFactory.create(AppModule);
await configureApp(app, {
  serviceName: 'Auth Service',
  description: 'Authentication microservice',
  defaultPort: 4001,
});

// app.module.ts
@Module({
  imports: [HealthModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
```

## Decorators

```typescript
@Public()           // Skip JWT auth
@CurrentUser()      // Get authenticated user
```

## Guards & Strategies

```typescript
JwtAuthGuard; // Global JWT validation
JwtStrategy; // Passport JWT strategy
```

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["email must be valid"]
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/v1/users",
    "statusCode": 400
  }
}
```

## Health Endpoints

| Endpoint        | K8s Probe | Note                |
| --------------- | --------- | ------------------- |
| `/health`       | General   |                     |
| `/health/live`  | Liveness  |                     |
| `/health/ready` | Readiness | 503 during shutdown |

## Graceful Shutdown

### Flow

```
1. K8s sends SIGTERM
2. Service marks NOT ready (/health/ready → 503)
3. K8s stops routing traffic
4. Wait 5s for traffic to drain
5. Complete in-flight requests
6. Close connections
7. Exit 0
```

### Manual Control

```typescript
constructor(private shutdown: GracefulShutdownService) {}

// Check readiness
if (this.shutdown.isServiceReady()) { /* ... */ }

// Manual control
this.shutdown.markNotReady();
this.shutdown.markReady();
```

## configureApp Options

| Option                 | Default    | Description              |
| ---------------------- | ---------- | ------------------------ |
| serviceName            | required   | Service name             |
| description            | required   | Swagger description      |
| defaultPort            | 3000       | Server port              |
| swaggerTags            | []         | Swagger tag definitions  |
| enableSwagger          | true       | API docs at /docs        |
| enableCors             | true       | CORS enabled             |
| enableGracefulShutdown | true       | SIGTERM handling         |
| shutdownTimeout        | 30000      | Shutdown timeout ms      |
| excludeFromPrefix      | ['health'] | Paths without /v1 prefix |

## Included Features

- Global prefix `/v1` (except health)
- Validation pipe (class-validator)
- Security headers (Helmet)
- CORS (iOS Safari compatible)
- Swagger documentation

---

## Common Patterns

### Protected vs Public Endpoints

```typescript
@Controller('users')
export class UsersController {
  // Protected by default (JwtAuthGuard is global)
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  // Explicitly public
  @Public()
  @Get(':id/public')
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.findPublic(id);
  }
}
```

### Custom JWT Strategy

If you need custom validation (e.g., check user exists in DB), create your own strategy instead of importing from nest-common:

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

### Full AppModule Setup

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import {
  JwtAuthGuard,
  JwtStrategy,
  HttpExceptionFilter,
  HealthModule,
} from '@my-girok/nest-common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    HealthModule,
    // ... your modules
  ],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
```

## Environment Variables

| Variable     | Required | Default            | Description             |
| ------------ | -------- | ------------------ | ----------------------- |
| JWT_SECRET   | Yes      | -                  | JWT signing secret      |
| PORT         | No       | config.defaultPort | Server port             |
| NODE_ENV     | No       | development        | Environment             |
| CORS_ORIGINS | No       | -                  | Comma-separated origins |

---

## CacheKey Helper

The `CacheKey` helper provides environment-prefixed cache keys for shared Valkey instances. This allows multiple environments (dev, release, prod) to share the same Valkey cluster without key collisions.

### Usage

```typescript
import { CacheKey } from '@my-girok/nest-common';

// Generate key with automatic environment prefix
const key = CacheKey.make('auth', 'permissions', roleId);
// Development: "dev:auth:permissions:550e8400-e29b-41d4-a716-446655440000"
// Production:  "prod:auth:permissions:550e8400-e29b-41d4-a716-446655440000"

// Create pattern for bulk invalidation (KEYS command)
const pattern = CacheKey.pattern('auth', 'permissions', '*');
// → "dev:auth:permissions:*"
```

### Key Format

```
{env}:{service}:{entity}:{identifier}
```

| Segment    | Description                      | Examples                    |
| ---------- | -------------------------------- | --------------------------- |
| env        | NODE_ENV (dev/release/prod)      | `dev`, `prod`               |
| service    | Service name                     | `auth`, `personal`, `audit` |
| entity     | Data type                        | `permissions`, `service`    |
| identifier | Unique ID (UUID, slug, username) | UUIDv7, `homeshopping`      |

### Methods

| Method                  | Purpose                     | Return Example                  |
| ----------------------- | --------------------------- | ------------------------------- |
| `CacheKey.make(...)`    | Create prefixed cache key   | `dev:auth:service:homeshopping` |
| `CacheKey.pattern(...)` | Create pattern for KEYS cmd | `dev:personal:user_prefs:*`     |

For detailed caching policies, see `docs/policies/CACHING.md`.

---

## CacheTTL Constants

Standardized TTL values (in milliseconds) for cache-manager v7+.

### Usage

```typescript
import { CacheTTL } from '@my-girok/nest-common';

await this.cache.set(key, data, CacheTTL.STATIC_CONFIG); // 24h
await this.cache.set(key, data, CacheTTL.USER_DATA); // 5m
await this.cache.set(key, data, CacheTTL.SESSION); // 30m
```

### Constants

| Constant          | Duration | Use Cases                              |
| ----------------- | -------- | -------------------------------------- |
| `STATIC_CONFIG`   | 24h      | services, oauth_providers, permissions |
| `SEMI_STATIC`     | 15m      | legal_documents, funnel data           |
| `USER_DATA`       | 5m       | user_prefs, resume_meta, analytics     |
| `SESSION`         | 30m      | admin/operator sessions                |
| `SHORT_LIVED`     | 1m       | rate_limit, temp_tokens                |
| `EPHEMERAL`       | 10s      | real-time metrics                      |
| `USERNAME_LOOKUP` | 2h       | username → userId mapping              |
| `EXPORT_STATUS`   | 24h      | export job tracking                    |

For detailed caching policies, see `docs/policies/CACHING.md`.

---

## ID Generation (UUIDv7 - RFC 9562)

UUIDv7 provides time-sortable, globally unique identifiers that are compatible with database UUID types. This replaces ULID as the standard ID format.

### Why UUIDv7?

- **Time-sortable**: Lexicographic sort = chronological sort
- **DB-native**: Works with PostgreSQL UUID, ClickHouse UUID types
- **No conversion**: Direct storage without string conversion
- **Monotonic**: Ordered within the same millisecond

### Basic Usage

```typescript
import { ID, UUIDv7 } from '@my-girok/nest-common';

// Generate new ID (uses crypto.randomBytes internally)
const id = ID.generate(); // "01935c6d-c2d0-7abc-8def-1234567890ab"

// Validate
ID.isValid(id); // true (any UUID v1-8)
UUIDv7.isValid(id); // true (UUIDv7 only)

// Extract timestamp (built into UUIDv7)
ID.getTimestamp(id); // Date object
UUIDv7.extractTimestamp(id);

// Compare (lexicographic = chronological for UUIDv7)
ID.compare(id1, id2); // -1, 0, 1
```

### Validation Pipes

```typescript
import { ParseUUIDPipe, ParseUUIDv7Pipe } from '@my-girok/nest-common';

@Get(':id')
async get(@Param('id', ParseUUIDPipe) id: string) {}    // Any UUID (v1-8)

@Get(':id')
async get(@Param('id', ParseUUIDv7Pipe) id: string) {}  // UUIDv7 only
```

### Prisma Extension

```typescript
import { uuidv7Extension } from '@my-girok/nest-common';

// Auto-generate id for new records
const prisma = new PrismaClient().$extends(uuidv7Extension);

// Now all inserts auto-generate UUIDv7 id
const user = await prisma.user.create({
  data: { email: 'test@example.com' }, // id auto-generated
});
```

### Decorator

```typescript
import { GenerateId } from '@my-girok/nest-common';

class CreateUserDto {
  @GenerateId()
  id: string; // Auto-populated on instantiation

  email: string;
}
```

### Utility Functions

```typescript
import { sortByUUID, filterByTimeRange, getCreatedAt, parseUUIDv7 } from '@my-girok/nest-common';

// Sort by UUID (chronological for UUIDv7)
const sorted = sortByUUID(items, 'id', 'desc');

// Filter by time range using UUID timestamp
const recent = filterByTimeRange(items, 'id', startDate, endDate);

// Extract creation time from entity
const createdAt = getCreatedAt(entity); // Date | null

// Parse UUIDv7 into components
const { timestamp, version, variant, isValid } = parseUUIDv7(uuid);
```

---

## ClickHouse Integration

Shared ClickHouse client for analytics and audit services with SQL injection prevention.

### Module Setup

```typescript
import { ClickHouseModule } from '@my-girok/nest-common';

@Module({
  imports: [ClickHouseModule],
})
export class AppModule {}
```

### Service Usage

```typescript
import { ClickHouseService, createQueryBuilder } from '@my-girok/nest-common';

@Injectable()
export class MyService {
  constructor(private clickhouse: ClickHouseService) {}

  async query() {
    const result = await this.clickhouse.query<MyType>('SELECT * FROM table WHERE id = {id:UUID}', {
      id: someUuid,
    });
    return result.data;
  }

  async insert() {
    await this.clickhouse.insert('table', [{ id, data }]);
  }

  async batchInsert() {
    // For large datasets (auto-chunks by 10000)
    await this.clickhouse.batchInsert('table', largeDataset, 5000);
  }
}
```

### Query Builder (SQL Injection Prevention)

```typescript
import { createQueryBuilder } from '@my-girok/nest-common';

const builder = createQueryBuilder()
  .whereBetween('timestamp', startDate, endDate, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID')
  .whereIn('event_name', events, 'String');

const { whereClause, params } = builder.build();
const sql = `SELECT * FROM events ${whereClause} LIMIT 100`;
const result = await clickhouse.query(sql, params);
```

### Query Builder Methods

| Method                           | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| `where()`                        | Add required condition                        |
| `whereOptional()`                | Add condition if value exists                 |
| `whereIn()`                      | IN clause with array                          |
| `whereInOptional()`              | IN clause if array not empty                  |
| `whereBetween()`                 | Range condition                               |
| `whereNull()` / `whereNotNull()` | NULL checks                                   |
| `whereRaw()`                     | Raw SQL condition (use caution)               |
| `build()`                        | Returns `{ conditions, params, whereClause }` |

### Environment Variables

| Variable                           | Required | Default | Description                |
| ---------------------------------- | -------- | ------- | -------------------------- |
| `CLICKHOUSE_HOST`                  | Yes      | -       | ClickHouse host            |
| `CLICKHOUSE_PORT`                  | No       | 8123    | Port                       |
| `CLICKHOUSE_DATABASE`              | Yes      | -       | Database name              |
| `CLICKHOUSE_USERNAME`              | Yes      | -       | Username                   |
| `CLICKHOUSE_PASSWORD`              | Yes      | -       | Password                   |
| `CLICKHOUSE_ASYNC_INSERT`          | No       | true    | Enable async insert        |
| `CLICKHOUSE_WAIT_FOR_ASYNC_INSERT` | No       | true    | Wait for insert completion |
| `CLICKHOUSE_MAX_RETRIES`           | No       | 3       | Connection retry attempts  |

**Tip**: For analytics-service, set `CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false` for higher throughput. For audit-service, keep it `true` for guaranteed writes.

---

**Quick reference**: `.ai/packages/nest-common.md`
