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

## Environment Variables

| Variable     | Required | Default | Description        |
| ------------ | -------- | ------- | ------------------ |
| JWT_SECRET   | Yes      | -       | JWT signing secret |
| PORT         | No       | config  | Server port        |
| NODE_ENV     | No       | dev     | Environment        |
| CORS_ORIGINS | No       | -       | Comma-separated    |

---

## CacheKey Helper

```typescript
import { CacheKey } from '@my-girok/nest-common';

CacheKey.make('auth', 'permissions', roleId); // "dev:auth:permissions:{uuid}"
CacheKey.pattern('auth', 'permissions', '*'); // "dev:auth:permissions:*"
```

Format: `{env}:{service}:{entity}:{identifier}`

## CacheTTL Constants

```typescript
import { CacheTTL } from '@my-girok/nest-common';
await cache.set(key, data, CacheTTL.STATIC_CONFIG); // 24h
```

| Constant          | Duration | Use Cases               |
| ----------------- | -------- | ----------------------- |
| `STATIC_CONFIG`   | 24h      | services, permissions   |
| `SEMI_STATIC`     | 15m      | legal_docs, funnel      |
| `USER_DATA`       | 5m       | user_prefs, resume_meta |
| `SESSION`         | 30m      | admin/operator sessions |
| `SHORT_LIVED`     | 1m       | rate_limit, temp_tokens |
| `EPHEMERAL`       | 10s      | real-time metrics       |
| `USERNAME_LOOKUP` | 2h       | username -> userId      |
| `EXPORT_STATUS`   | 24h      | export job tracking     |

---

## ID Generation (UUIDv7 - RFC 9562)

```typescript
import { ID, UUIDv7, ParseUUIDPipe, ParseUUIDv7Pipe } from '@my-girok/nest-common';

ID.generate();                    // "01935c6d-c2d0-7abc-8def-1234567890ab"
ID.isValid(id);                   // Any UUID v1-8
UUIDv7.isValid(id);               // UUIDv7 only
ID.getTimestamp(id);              // Date object
ID.compare(id1, id2);             // -1, 0, 1

// Pipes
@Get(':id') async get(@Param('id', ParseUUIDv7Pipe) id: string) {}

// Prisma extension
const prisma = new PrismaClient().$extends(uuidv7Extension);  // Auto-generate UUIDv7

// Utilities
sortByUUID(items, 'id', 'desc');
filterByTimeRange(items, 'id', startDate, endDate);
```

---

## ClickHouse Integration

```typescript
import { ClickHouseModule, ClickHouseService, createQueryBuilder } from '@my-girok/nest-common';

@Module({ imports: [ClickHouseModule] })

// Service
await clickhouse.query<T>('SELECT * FROM t WHERE id = {id:UUID}', { id });
await clickhouse.insert('table', [{ id, data }]);
await clickhouse.batchInsert('table', largeDataset, 5000);

// Query Builder (SQL injection prevention)
const builder = createQueryBuilder()
  .whereBetween('timestamp', start, end, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID')
  .whereIn('event_name', events, 'String');
const { whereClause, params } = builder.build();

// Partition helper
formatPartition(new Date(), 'month');  // "202601"
```

| ENV                              | Default | Description         |
| -------------------------------- | ------- | ------------------- |
| CLICKHOUSE_HOST                  | -       | Host (required)     |
| CLICKHOUSE_PORT                  | 8123    | Port                |
| CLICKHOUSE_DATABASE              | -       | DB (required)       |
| CLICKHOUSE_USERNAME              | -       | User (required)     |
| CLICKHOUSE_PASSWORD              | -       | Password (required) |
| CLICKHOUSE_ASYNC_INSERT          | true    | Async insert        |
| CLICKHOUSE_WAIT_FOR_ASYNC_INSERT | true    | Wait for completion |

---

## OpenTelemetry (OTEL) SDK

```typescript
// main.ts - MUST BE FIRST IMPORT
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'auth-service' });

// Then other imports...
import { NestFactory } from '@nestjs/core';
```

| Config Option        | Default                 | Description        |
| -------------------- | ----------------------- | ------------------ |
| serviceName          | required                | Service identifier |
| otlpEndpoint         | localhost:4318          | OTLP collector     |
| samplingRatio        | 1.0                     | Sampling (0.0-1.0) |
| metricExportInterval | 60000                   | Metric interval ms |
| ignoreEndpoints      | ['/health', '/metrics'] | Skip endpoints     |
| disabled             | false                   | Disable OTEL       |

| ENV                         | Default   | Description     |
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
  imports: [PinoLoggerModule.forRoot(createPinoHttpConfig({
    serviceName: 'auth-service', level: 'info',
    additionalRedactPaths: ['req.body.customSecret'],
  }))],
})
```

**Auto-redacted fields**: password, token, secret, apiKey, ssn, email, phone, creditCard, etc. (100+ patterns)

**Security**: Unicode normalization, ANSI escape stripping, control character removal, IP validation, request ID validation

**Output**: ECS 8.11.0 compliant JSON with OTEL trace correlation

---

## Rate Limiting

```typescript
import { RateLimitModule, Throttle, SkipThrottle } from '@my-girok/nest-common';

// Basic (in-memory)
@Module({ imports: [RateLimitModule.forRoot()] })

// Distributed (Redis/Valkey)
RateLimitModule.forRoot({ defaultTier: 'AUTH', redisUrl: 'redis://localhost:6379' })

// Usage
@Throttle({ default: { limit: 5, ttl: 60000 } }) @Post('login')
@SkipThrottle() @Get('health')
```

| Tier           | Limit | TTL | Description     |
| -------------- | ----- | --- | --------------- |
| STANDARD       | 100   | 60s | Default         |
| AUTH           | 10    | 60s | Login/register  |
| HIGH_FREQUENCY | 1000  | 60s | Public read     |
| WRITE_HEAVY    | 30    | 60s | Create/update   |
| ADMIN          | 500   | 60s | Admin APIs      |
| PUBLIC         | 50    | 60s | Unauthenticated |

Circuit breaker: CLOSED -> OPEN (5 failures) -> HALF-OPEN (30s reset)

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

// Options
@Transactional({ timeout: 60000, isolationLevel: 'Serializable', maxRetries: 5, propagation: 'requires_new' })
```

| Propagation   | Behavior                                |
| ------------- | --------------------------------------- |
| required      | Join existing or create new (default)   |
| requires_new  | Always new, suspend existing            |
| supports      | Join if exists, else non-transactional  |
| mandatory     | Error if no transaction                 |
| never         | Error if transaction exists             |
| not_supported | Suspend existing, run non-transactional |

| Option         | Default       | Description            |
| -------------- | ------------- | ---------------------- |
| timeout        | 30000         | Transaction timeout ms |
| isolationLevel | ReadCommitted | Isolation level        |
| maxRetries     | 3             | Retry attempts         |
| retryDelay     | 100           | Base delay for backoff |
| enableTracing  | true          | OTEL span creation     |

**SSoT files**: `db-error-codes.ts`, `transactional.constants.ts`

---

## gRPC Clients

```typescript
import { GrpcClientsModule, IdentityGrpcClient, AuthGrpcClient, LegalGrpcClient } from '@my-girok/nest-common';

@Module({
  imports: [GrpcClientsModule.forRoot({ identity: true, auth: true, legal: true })],
})
```

| Client       | Port  | Operations                           |
| ------------ | ----- | ------------------------------------ |
| IdentityGrpc | 50051 | Account, Session, Device, Profile    |
| AuthGrpc     | 50052 | Permission, Role, Operator, Sanction |
| LegalGrpc    | 50053 | Consent, Document, DSR, Law Registry |

```typescript
// Example
const { valid } = await identityClient.validateAccount({ id });
const { is_sanctioned } = await authClient.checkSanction({ subject_id, subject_type });
const { all_required_granted } = await legalClient.checkConsents({ account_id, country_code, required_types });

// Error handling
if (isGrpcError(error)) { switch(error.code) { case GrpcStatus.NOT_FOUND: ... } }
```

| ENV                | Default   | Description   |
| ------------------ | --------- | ------------- |
| IDENTITY_GRPC_HOST | localhost | Identity host |
| IDENTITY_GRPC_PORT | 50051     | Identity port |
| AUTH_GRPC_HOST     | localhost | Auth host     |
| AUTH_GRPC_PORT     | 50052     | Auth port     |
| LEGAL_GRPC_HOST    | localhost | Legal host    |
| LEGAL_GRPC_PORT    | 50053     | Legal port    |

---

## PII Masking

```typescript
import { maskEmail, maskPhone, maskObject } from '@my-girok/nest-common';

maskEmail('user@example.com'); // "u***@example.com"
maskPhone('+821012345678'); // "+820***5678"
maskObject({ email: 'user@example.com', status: 'active' }); // Auto-detect PII
```

| Function       | Output                  |
| -------------- | ----------------------- |
| maskEmail      | u\*\*\*@example.com     |
| maskPhone      | 010-\*\*\*-5678         |
| maskIpAddress  | 192.168.x.x             |
| maskName       | J*** D*** / Kim\*\*     |
| maskUuid       | 0193\*\*\*\*890a        |
| maskCreditCard | 4111-\***\*-\*\***-1111 |
| maskBirthDate  | 1990-**-**              |
| maskObject     | Auto-detect fields      |
