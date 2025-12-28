# @my-girok/nest-common

> Shared NestJS utilities for microservices

## Imports

```typescript
import {
  configureApp,
  JwtAuthGuard,
  JwtStrategy,
  CurrentUser,
  Public,
  HttpExceptionFilter,
  HealthModule,
  GracefulShutdownService,
  // Cache
  CacheKey,
  // ID (UUIDv7 - RFC 9562)
  ID,
  UUIDv7,
  GenerateId,
  uuidv7Extension,
  ParseUUIDPipe,
  ParseUUIDv7Pipe,
  generateIds,
  sortByUUID,
  filterByTimeRange,
  getCreatedAt,
  parseUUIDv7,
  isUUID,
  isUUIDv7,
  // ClickHouse
  ClickHouseService,
  ClickHouseModule,
  createQueryBuilder,
} from '@my-girok/nest-common';
```

## Quick Start

```typescript
// main.ts
const app = await NestFactory.create(AppModule);
await configureApp(app, {
  serviceName: 'My Service',
  description: 'Service description',
  defaultPort: 4000,
});

// app.module.ts
@Module({
  imports: [HealthModule],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
```

## Decorators

| Decorator        | Purpose                    |
| ---------------- | -------------------------- |
| `@Public()`      | Skip JWT auth for endpoint |
| `@CurrentUser()` | Extract user from request  |

## Guards & Filters

| Export                | Purpose                      |
| --------------------- | ---------------------------- |
| `JwtAuthGuard`        | Global JWT validation        |
| `JwtStrategy`         | Passport JWT strategy        |
| `HttpExceptionFilter` | Standardized error responses |

### Error Response Format

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] },
  "meta": { "timestamp": "...", "path": "/v1/...", "statusCode": 400 }
}
```

## Health Module

| Endpoint        | K8s Probe | Note                |
| --------------- | --------- | ------------------- |
| `/health`       | General   |                     |
| `/health/live`  | Liveness  |                     |
| `/health/ready` | Readiness | 503 during shutdown |

## configureApp Options

| Option              | Default    | Description              |
| ------------------- | ---------- | ------------------------ |
| `serviceName`       | required   | Service name             |
| `description`       | required   | Swagger description      |
| `defaultPort`       | 3000       | Port if PORT env not set |
| `enableSwagger`     | true       | Enable /docs             |
| `enableCors`        | true       | CORS enabled             |
| `shutdownTimeout`   | 30000      | Shutdown timeout (ms)    |
| `excludeFromPrefix` | ['health'] | Paths without /v1        |

## Graceful Shutdown

```
SIGTERM → /health/ready 503 → drain 5s → close → exit 0
```

## Environment Variables

| Variable       | Required | Description             |
| -------------- | -------- | ----------------------- |
| `JWT_SECRET`   | Yes      | JWT signing secret      |
| `PORT`         | No       | Server port             |
| `CORS_ORIGINS` | No       | Comma-separated origins |

## CacheKey Helper

Environment-prefixed cache keys for shared Valkey instance.

```typescript
import { CacheKey } from '@my-girok/nest-common';

// Generate key with auto environment prefix
CacheKey.make('auth', 'permissions', roleId);
// → "dev:auth:permissions:550e8400-e29b-41d4-a716-446655440000"

// Pattern for invalidation
CacheKey.pattern('auth', 'permissions', '*');
// → "dev:auth:permissions:*"
```

| Method      | Purpose                     | Example Output                  |
| ----------- | --------------------------- | ------------------------------- |
| `make()`    | Create prefixed key         | `dev:auth:service:homeshopping` |
| `pattern()` | Create pattern for KEYS cmd | `dev:personal:user_prefs:*`     |

**Policy**: `docs/policies/CACHING.md`

## ID (UUIDv7 - RFC 9562)

UUIDv7-based ID generation for consistent, time-sortable IDs across services.

**Security**: Uses `crypto.randomBytes()` for cryptographically secure random values.

```typescript
// Generate ID (uses crypto.randomBytes internally)
const id = ID.generate(); // "01935c6d-c2d0-7abc-8def-1234567890ab"

// Validate
ID.isValid(id);           // true (any UUID v1-8)
UUIDv7.isValid(id);       // true (UUIDv7 only)

// Extract timestamp (built into UUIDv7)
ID.getTimestamp(id);      // Date object
UUIDv7.extractTimestamp(id);

// Compare (lexicographic = chronological)
ID.compare(id1, id2);     // -1, 0, 1

// Prisma extension (auto-generate id)
const prisma = new PrismaClient().$extends(uuidv7Extension);

// Validation pipes
@Get(':id')
async get(@Param('id', ParseUUIDPipe) id: string) {}    // Any UUID
async get(@Param('id', ParseUUIDv7Pipe) id: string) {}  // UUIDv7 only

// Decorator (auto-generate on class property)
class CreateDto {
  @GenerateId()
  id: string;
}
```

| Export              | Purpose                            |
| ------------------- | ---------------------------------- |
| `ID`                | UUIDv7 generator utilities         |
| `UUIDv7`            | Full UUIDv7 class with all methods |
| `GenerateId`        | Property decorator for auto-gen    |
| `uuidv7Extension`   | Prisma extension for auto-id       |
| `ParseUUIDPipe`     | Validates any UUID (v1-8)          |
| `ParseUUIDv7Pipe`   | Validates UUIDv7 specifically      |
| `generateIds`       | Generate multiple UUIDs            |
| `sortByUUID`        | Sort objects by UUID field         |
| `filterByTimeRange` | Filter by UUID timestamp           |
| `getCreatedAt`      | Extract creation time from entity  |
| `parseUUIDv7`       | Parse UUID into components         |
| `isUUID`            | Check if valid UUID                |
| `isUUIDv7`          | Check if valid UUIDv7              |

### Utility Functions

```typescript
// Sort by UUID (chronological for UUIDv7)
const sorted = sortByUUID(items, 'id', 'desc');

// Filter by time range using UUID timestamp
const recent = filterByTimeRange(items, 'id', startDate, endDate);

// Extract creation time from entity
const createdAt = getCreatedAt(entity); // Date | null

// Parse UUIDv7 into components
const { timestamp, version, variant, isValid } = parseUUIDv7(uuid);
```

### Legacy ULID Support

```typescript
// For backward compatibility only (deprecated)
import { ULID, ulidExtension, ParseUlidPipe } from '@my-girok/nest-common';
```

## ClickHouse

Shared ClickHouse client for analytics and audit services.

### Query Builder

Type-safe query builder to prevent SQL injection:

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

| Method                           | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| `where()`                        | Add required condition                        |
| `whereOptional()`                | Add condition if value exists                 |
| `whereIn()`                      | IN clause with array                          |
| `whereInOptional()`              | IN clause if array not empty                  |
| `whereBetween()`                 | Range condition                               |
| `whereNull()` / `whereNotNull()` | NULL checks                                   |
| `whereRaw()`                     | Raw SQL condition (use caution)               |
| `addParam()`                     | Add parameter manually                        |
| `getConditions()`                | Get conditions joined with AND                |
| `reset()`                        | Reset builder for reuse                       |
| `build()`                        | Returns `{ conditions, params, whereClause }` |

Features:

- Connection retry with exponential backoff
- Configurable async insert behavior
- Batch insert for large datasets
- Health check support

```typescript
// Module import
@Module({
  imports: [ClickHouseModule],
})
export class AppModule {}

// Service usage
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

  isHealthy() {
    return this.clickhouse.isHealthy();
  }
}
```

| Export                   | Purpose                        |
| ------------------------ | ------------------------------ |
| `ClickHouseService`      | Query/insert client            |
| `ClickHouseModule`       | NestJS module with config      |
| `createQueryBuilder`     | Create type-safe query builder |
| `ClickHouseQueryBuilder` | Query builder class            |
| `isHealthy()`            | Check connection status        |
| `batchInsert()`          | Chunked insert for large data  |

### Environment Variables

| Variable                           | Required | Default | Description                   |
| ---------------------------------- | -------- | ------- | ----------------------------- |
| `CLICKHOUSE_HOST`                  | Yes      | -       | ClickHouse host               |
| `CLICKHOUSE_PORT`                  | No       | 8123    | Port                          |
| `CLICKHOUSE_DATABASE`              | Yes      | -       | Database name                 |
| `CLICKHOUSE_USERNAME`              | Yes      | -       | Username                      |
| `CLICKHOUSE_PASSWORD`              | Yes      | -       | Password                      |
| `CLICKHOUSE_ASYNC_INSERT`          | No       | true    | Enable async insert           |
| `CLICKHOUSE_WAIT_FOR_ASYNC_INSERT` | No       | true    | Wait for insert (audit: true) |
| `CLICKHOUSE_MAX_RETRIES`           | No       | 3       | Connection retry attempts     |

**Tip**: For analytics service, set `CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false` for higher throughput.

---

**Detailed docs**: `docs/packages/nest-common.md`
