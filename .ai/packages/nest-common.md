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

---

**Detailed docs**: `docs/packages/nest-common.md`
