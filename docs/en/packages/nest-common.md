# @my-girok/nest-common

> Shared NestJS utilities for microservices

## Quick Start

```typescript
import {
  configureApp,
  JwtAuthGuard,
  HttpExceptionFilter,
  HealthModule,
} from '@my-girok/nest-common';

// main.ts
const app = await NestFactory.create(AppModule);
await configureApp(app, {
  serviceName: 'Auth Service',
  description: 'Auth microservice',
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
export class AppModule {}
```

## Decorators

```typescript
@Public()       // Skip JWT authentication
@CurrentUser()  // Get authenticated user from request
```

## Health Endpoints

| Endpoint        | Kubernetes Probe | Description                 |
| --------------- | ---------------- | --------------------------- |
| `/health`       | General          | Overall health check        |
| `/health/live`  | Liveness         | Container is running        |
| `/health/ready` | Readiness        | Returns 503 during shutdown |

## configureApp Options

| Option                 | Default    | Description                   |
| ---------------------- | ---------- | ----------------------------- |
| serviceName            | required   | Service name for logs/swagger |
| description            | required   | Swagger API description       |
| defaultPort            | 3000       | HTTP server port              |
| enableSwagger          | true       | Enable API docs at /docs      |
| enableGracefulShutdown | true       | Handle SIGTERM gracefully     |
| shutdownTimeout        | 30000      | Shutdown timeout in ms        |
| excludeFromPrefix      | ['health'] | Paths without /v1 prefix      |

## Environment Variables

| Variable     | Required | Default     | Description             |
| ------------ | -------- | ----------- | ----------------------- |
| JWT_SECRET   | Yes      | -           | JWT signing secret      |
| PORT         | No       | config      | Server port             |
| NODE_ENV     | No       | development | Environment             |
| CORS_ORIGINS | No       | -           | Comma-separated origins |

---

## CacheKey Helper

Standardized cache key generation with environment prefix:

```typescript
import { CacheKey } from '@my-girok/nest-common';

// Generate key
CacheKey.make('auth', 'permissions', roleId);
// Output: "dev:auth:permissions:{uuid}"

// Generate pattern for scanning
CacheKey.pattern('auth', 'permissions', '*');
// Output: "dev:auth:permissions:*"
```

**Format**: `{env}:{service}:{entity}:{identifier}`

## CacheTTL Constants

```typescript
import { CacheTTL } from '@my-girok/nest-common';

await cache.set(key, data, CacheTTL.STATIC_CONFIG);
```

| Constant        | Duration | Use Cases                         |
| --------------- | -------- | --------------------------------- |
| STATIC_CONFIG   | 24h      | Services, permissions             |
| SEMI_STATIC     | 15m      | Legal docs, funnel configs        |
| USER_DATA       | 5m       | User preferences, resume metadata |
| SESSION         | 30m      | Admin/operator sessions           |
| SHORT_LIVED     | 1m       | Rate limits, temporary tokens     |
| EPHEMERAL       | 10s      | Real-time metrics                 |
| USERNAME_LOOKUP | 2h       | Username to userId mapping        |
| EXPORT_STATUS   | 24h      | Export job tracking               |

---

## ID Generation (UUIDv7 - RFC 9562)

```typescript
import { ID, UUIDv7, ParseUUIDPipe, ParseUUIDv7Pipe } from '@my-girok/nest-common';

// Generate new ID
ID.generate(); // "01935c6d-c2d0-7abc-8def-1234567890ab"

// Validation
ID.isValid(id); // Any UUID v1-8
UUIDv7.isValid(id); // UUIDv7 only

// Extract timestamp
ID.getTimestamp(id); // Returns Date object

// Compare for sorting
ID.compare(id1, id2); // Returns -1, 0, or 1
```

### Controller Pipes

```typescript
@Get(':id')
async get(@Param('id', ParseUUIDv7Pipe) id: string) {
  // id is validated as UUIDv7
}
```

### Prisma Extension

```typescript
const prisma = new PrismaClient().$extends(uuidv7Extension);
// Auto-generates UUIDv7 for new records
```

### Utility Functions

```typescript
sortByUUID(items, 'id', 'desc');
filterByTimeRange(items, 'id', startDate, endDate);
```

---

## ClickHouse Integration

```typescript
import { ClickHouseModule, ClickHouseService, createQueryBuilder } from '@my-girok/nest-common';

@Module({ imports: [ClickHouseModule] })
export class AppModule {}
```

### Service Methods

```typescript
// Simple query
await clickhouse.query<T>('SELECT * FROM t WHERE id = {id:UUID}', { id });

// Insert single/array
await clickhouse.insert('table', [{ id, data }]);

// Batch insert (large datasets)
await clickhouse.batchInsert('table', largeDataset, 5000);
```

### Query Builder (SQL Injection Prevention)

```typescript
const builder = createQueryBuilder()
  .whereBetween('timestamp', start, end, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID')
  .whereIn('event_name', events, 'String');

const { whereClause, params } = builder.build();
```

### Partition Helper

```typescript
formatPartition(new Date(), 'month'); // "202601"
```

### Environment Variables

| Variable                         | Default | Description         |
| -------------------------------- | ------- | ------------------- |
| CLICKHOUSE_HOST                  | -       | Host (required)     |
| CLICKHOUSE_PORT                  | 8123    | HTTP port           |
| CLICKHOUSE_DATABASE              | -       | Database (required) |
| CLICKHOUSE_USERNAME              | -       | Username (required) |
| CLICKHOUSE_PASSWORD              | -       | Password (required) |
| CLICKHOUSE_ASYNC_INSERT          | true    | Enable async insert |
| CLICKHOUSE_WAIT_FOR_ASYNC_INSERT | true    | Wait for completion |

---

## OpenTelemetry (OTEL) SDK

**CRITICAL**: Must be first import in main.ts

```typescript
// main.ts - MUST BE FIRST IMPORT
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'auth-service' });

// Then other imports...
import { NestFactory } from '@nestjs/core';
```

### Configuration Options

| Option               | Default                 | Description               |
| -------------------- | ----------------------- | ------------------------- |
| serviceName          | required                | Service identifier        |
| otlpEndpoint         | localhost:4318          | OTLP collector URL        |
| samplingRatio        | 1.0                     | Sampling ratio (0.0-1.0)  |
| metricExportInterval | 60000                   | Metric export interval ms |
| ignoreEndpoints      | ['/health', '/metrics'] | Skip these endpoints      |
| disabled             | false                   | Disable OTEL entirely     |

### Environment Variables

| Variable                    | Default   | Description     |
| --------------------------- | --------- | --------------- |
| OTEL_EXPORTER_OTLP_ENDPOINT | localhost | OTLP endpoint   |
| OTEL_SDK_DISABLED           | false     | Disable OTEL    |
| OTEL_TRACES_SAMPLER_ARG     | 1.0       | Sampling ratio  |
| OTEL_METRIC_EXPORT_INTERVAL | 60000     | Metric interval |
| SERVICE_VERSION             | 0.0.0     | Service version |

---

## Pino Logging

```typescript
import { PinoLoggerModule, createPinoHttpConfig } from '@my-girok/nest-common';

@Module({
  imports: [
    PinoLoggerModule.forRoot(
      createPinoHttpConfig({
        serviceName: 'auth-service',
        level: 'info',
        additionalRedactPaths: ['req.body.customSecret'],
      }),
    ),
  ],
})
export class AppModule {}
```

### Features

- **Auto-redacted fields**: password, token, secret, apiKey, ssn, email, phone, creditCard, etc. (100+ patterns)
- **Security**: Unicode normalization, ANSI escape stripping, control character removal
- **Output**: ECS 8.11.0 compliant JSON with OTEL trace correlation

---

## Rate Limiting

```typescript
import { RateLimitModule, Throttle, SkipThrottle } from '@my-girok/nest-common';

// Basic (in-memory)
@Module({ imports: [RateLimitModule.forRoot()] })

// Distributed (Redis/Valkey)
RateLimitModule.forRoot({
  defaultTier: 'AUTH',
  redisUrl: 'redis://localhost:6379'
})
```

### Usage

```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login() {}

@SkipThrottle()
@Get('health')
async health() {}
```

### Rate Limit Tiers

| Tier           | Limit | TTL | Use Case                  |
| -------------- | ----- | --- | ------------------------- |
| STANDARD       | 100   | 60s | Default endpoints         |
| AUTH           | 10    | 60s | Login/register            |
| HIGH_FREQUENCY | 1000  | 60s | Public read APIs          |
| WRITE_HEAVY    | 30    | 60s | Create/update operations  |
| ADMIN          | 500   | 60s | Admin APIs                |
| PUBLIC         | 50    | 60s | Unauthenticated endpoints |

### Circuit Breaker

CLOSED → OPEN (5 failures) → HALF-OPEN (30s reset)

---

## @Transactional Decorator

```typescript
import { Transactional, getPrismaClient, isInTransaction } from '@my-girok/nest-common';

@Transactional()
async createUserWithProfile(dto: CreateUserDto) {
  const user = await this.prisma.user.create({ data: { email: dto.email } });
  await this.profileService.createProfile(user.id, dto.profile);  // Same transaction
  return user;
}
```

### Options

```typescript
@Transactional({
  timeout: 60000,
  isolationLevel: 'Serializable',
  maxRetries: 5,
  propagation: 'requires_new'
})
```

### Propagation Modes

| Mode          | Behavior                                |
| ------------- | --------------------------------------- |
| required      | Join existing or create new (default)   |
| requires_new  | Always new, suspend existing            |
| supports      | Join if exists, else non-transactional  |
| mandatory     | Error if no transaction exists          |
| never         | Error if transaction exists             |
| not_supported | Suspend existing, run non-transactional |

### Configuration Options

| Option         | Default       | Description            |
| -------------- | ------------- | ---------------------- |
| timeout        | 30000         | Transaction timeout ms |
| isolationLevel | ReadCommitted | Isolation level        |
| maxRetries     | 3             | Retry attempts         |
| retryDelay     | 100           | Base delay for backoff |
| enableTracing  | true          | OTEL span creation     |

---

## gRPC Clients

```typescript
import {
  GrpcClientsModule,
  IdentityGrpcClient,
  AuthGrpcClient,
  LegalGrpcClient,
} from '@my-girok/nest-common';

@Module({
  imports: [
    GrpcClientsModule.forRoot({
      identity: true,
      auth: true,
      legal: true,
    }),
  ],
})
export class AppModule {}
```

### Available Clients

| Client       | Port  | Operations                           |
| ------------ | ----- | ------------------------------------ |
| IdentityGrpc | 50051 | Account, Session, Device, Profile    |
| AuthGrpc     | 50052 | Permission, Role, Operator, Sanction |
| LegalGrpc    | 50053 | Consent, Document, DSR, Law Registry |

### Usage Examples

```typescript
// Identity
const { valid } = await identityClient.validateAccount({ id });

// Auth
const { is_sanctioned } = await authClient.checkSanction({
  subject_id,
  subject_type,
});

// Legal
const { all_required_granted } = await legalClient.checkConsents({
  account_id,
  country_code,
  required_types,
});
```

### Error Handling

```typescript
import { isGrpcError, GrpcStatus } from '@my-girok/nest-common';

if (isGrpcError(error)) {
  switch (error.code) {
    case GrpcStatus.NOT_FOUND:
      // Handle not found
      break;
  }
}
```

### Environment Variables

| Variable           | Default   | Description           |
| ------------------ | --------- | --------------------- |
| IDENTITY_GRPC_HOST | localhost | Identity service host |
| IDENTITY_GRPC_PORT | 50051     | Identity service port |
| AUTH_GRPC_HOST     | localhost | Auth service host     |
| AUTH_GRPC_PORT     | 50052     | Auth service port     |
| LEGAL_GRPC_HOST    | localhost | Legal service host    |
| LEGAL_GRPC_PORT    | 50053     | Legal service port    |

---

## PII Masking

```typescript
import { maskEmail, maskPhone, maskObject } from '@my-girok/nest-common';

maskEmail('user@example.com'); // "u***@example.com"
maskPhone('+821012345678'); // "+820***5678"
maskObject({ email: 'user@example.com', status: 'active' });
```

### Available Functions

| Function       | Output Example          |
| -------------- | ----------------------- |
| maskEmail      | u\*\*\*@example.com     |
| maskPhone      | 010-\*\*\*-5678         |
| maskIpAddress  | 192.168.x.x             |
| maskName       | J*** D*** / Kim\*\*     |
| maskUuid       | 0193\*\*\*\*890a        |
| maskCreditCard | 4111-\***\*-\*\***-1111 |
| maskBirthDate  | 1990-**-**              |
| maskObject     | Auto-detect PII fields  |

---

**LLM Reference**: `docs/llm/packages/nest-common.md`
