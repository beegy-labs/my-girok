# @my-girok/nest-common

Shared NestJS utilities for microservices

## Quick Start

```typescript
import { configureApp, JwtAuthGuard, HttpExceptionFilter, HealthModule } from '@my-girok/nest-common';

// main.ts
const app = await NestFactory.create(AppModule);
await configureApp(app, { serviceName: 'Auth Service', description: 'Auth microservice', defaultPort: 4001 });

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
@Public()       // Skip JWT auth
@CurrentUser()  // Get authenticated user
```

## Health Endpoints

| Endpoint        | K8s Probe | Note                |
| --------------- | --------- | ------------------- |
| `/health`       | General   |                     |
| `/health/live`  | Liveness  |                     |
| `/health/ready` | Readiness | 503 during shutdown |

## configureApp Options

| Option                 | Default    | Description         |
| ---------------------- | ---------- | ------------------- |
| serviceName            | required   | Service name        |
| description            | required   | Swagger description |
| defaultPort            | 3000       | Server port         |
| enableSwagger          | true       | API docs at /docs   |
| enableGracefulShutdown | true       | SIGTERM handling    |
| shutdownTimeout        | 30000      | Shutdown timeout ms |
| excludeFromPrefix      | ['health'] | Paths without /v1   |

## Core Modules

| Module            | Purpose              |
| ----------------- | -------------------- |
| CacheKey/CacheTTL | Cache utilities      |
| ID/UUIDv7         | ID generation        |
| ClickHouseModule  | ClickHouse client    |
| PinoLoggerModule  | Structured logging   |
| RateLimitModule   | Rate limiting        |
| @Transactional    | Transaction handling |
| GrpcClientsModule | gRPC clients         |
| PII Masking       | Data masking         |

## Environment Variables

| Variable     | Required | Default | Description        |
| ------------ | -------- | ------- | ------------------ |
| JWT_SECRET   | Yes      | -       | JWT signing secret |
| PORT         | No       | config  | Server port        |
| NODE_ENV     | No       | dev     | Environment        |
| CORS_ORIGINS | No       | -       | Comma-separated    |

## Related Documentation

- **Full API Reference**: `nest-common-modules.md`
