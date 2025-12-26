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
  isUUID,
  isUUIDv7,
  // ClickHouse
  ClickHouseService,
  ClickHouseModule,
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

## ID (UUIDv7 - RFC 9562)

UUIDv7-based ID generation for consistent, time-sortable IDs across services.

```typescript
// Generate ID
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
| `isUUID`            | Check if valid UUID                |
| `isUUIDv7`          | Check if valid UUIDv7              |

### Legacy ULID Support

```typescript
// For backward compatibility only (deprecated)
import { ULID, ulidExtension, ParseUlidPipe } from '@my-girok/nest-common';
```

## ClickHouse

Shared ClickHouse client for analytics and audit services.

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
}
```

| Export              | Purpose                   |
| ------------------- | ------------------------- |
| `ClickHouseService` | Query/insert client       |
| `ClickHouseModule`  | NestJS module with config |

### Environment Variables

| Variable              | Required | Description          |
| --------------------- | -------- | -------------------- |
| `CLICKHOUSE_HOST`     | Yes      | ClickHouse host      |
| `CLICKHOUSE_PORT`     | No       | Port (default: 8123) |
| `CLICKHOUSE_DATABASE` | Yes      | Database name        |
| `CLICKHOUSE_USERNAME` | Yes      | Username             |
| `CLICKHOUSE_PASSWORD` | Yes      | Password             |

---

**Detailed docs**: `docs/packages/nest-common.md`
