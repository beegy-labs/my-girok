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
  // ID (ULID)
  ID,
  GenerateId,
  ulidExtension,
  ParseUlidPipe,
  generateIds,
  sortByUlid,
  filterByTimeRange,
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

## ID (ULID)

ULID-based ID generation for consistent IDs across services.

```typescript
// Generate ID
const id = ID.generate(); // "01ARZ3NDEKTSV4RRFFQ69G5FAV"

// Validate
ID.isValid(id); // true

// Extract timestamp
ID.getTimestamp(id); // Date object

// Prisma extension (auto-generate id)
const prisma = new PrismaClient().$extends(ulidExtension);

// Validation pipe
@Get(':id')
async get(@Param('id', ParseUlidPipe) id: string) {}

// Decorator (auto-generate on class property)
class CreateDto {
  @GenerateId()
  id: string;
}
```

| Export              | Purpose                          |
| ------------------- | -------------------------------- |
| `ID`                | ULID generator utilities         |
| `GenerateId`        | Property decorator for auto-gen  |
| `ulidExtension`     | Prisma extension for auto-id     |
| `ParseUlidPipe`     | NestJS validation pipe           |
| `generateIds`       | Generate multiple ULIDs          |
| `sortByUlid`        | Sort objects by ULID field       |
| `filterByTimeRange` | Filter objects by ULID timestamp |

---

**Detailed docs**: `docs/packages/nest-common.md`
