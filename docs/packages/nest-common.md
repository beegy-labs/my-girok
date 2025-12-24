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
  }
}
```

## Health Endpoints

| Endpoint        | K8s Probe |
| --------------- | --------- |
| `/health`       | General   |
| `/health/live`  | Liveness  |
| `/health/ready` | Readiness |

## Graceful Shutdown

```typescript
// Auto-handled: SIGTERM → 503 on /health/ready → drain → close → exit
```

## configureApp Options

| Option          | Default | Description             |
| --------------- | ------- | ----------------------- |
| serviceName     | -       | Service name (required) |
| defaultPort     | 3000    | Server port             |
| enableSwagger   | true    | API docs at /docs       |
| enableCors      | true    | CORS enabled            |
| shutdownTimeout | 30000   | Shutdown timeout ms     |

## Included Features

- Global prefix `/v1` (except health)
- Validation pipe (class-validator)
- Security headers (Helmet)
- CORS (iOS Safari compatible)
- Swagger documentation

---

**Quick reference**: `.ai/packages/nest-common.md`
