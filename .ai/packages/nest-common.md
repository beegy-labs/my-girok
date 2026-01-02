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
  CacheTTL,
  // ID (UUIDv7 - RFC 9562)
  ID,
  UUIDv7,
  GenerateId,
  uuidv7Extension,
  ParseUUIDPipe,
  ParseUUIDv7Pipe,
  // Resilience
  CircuitBreaker,
  CircuitBreakerError,
  CircuitState,
  // ClickHouse
  ClickHouseService,
  ClickHouseModule,
  createQueryBuilder,
  // OTEL
  initOtel,
  shutdownOtel,
  getOtelSdk,
  isOtelInitialized,
  // Logging
  PinoLoggerModule,
  createPinoConfig,
  createPinoHttpConfig,
  // Rate Limiting
  RateLimitModule,
  RedisThrottlerStorage,
  RateLimitTiers,
  Throttle,
  SkipThrottle,
  // Transactional
  Transactional,
  getPrismaClient,
  isInTransaction,
  getCurrentTransactionId,
  getTransactionDepth,
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

## CacheTTL Constants

Standardized TTL values (in milliseconds) for cache-manager v5+.

```typescript
import { CacheTTL } from '@my-girok/nest-common';

await this.cache.set(key, data, CacheTTL.STATIC_CONFIG); // 24h
await this.cache.set(key, data, CacheTTL.USER_DATA); // 5m
await this.cache.set(key, data, CacheTTL.SESSION); // 30m
```

| Constant          | Duration | Use Cases                    |
| ----------------- | -------- | ---------------------------- |
| `STATIC_CONFIG`   | 24h      | services, permissions        |
| `SEMI_STATIC`     | 15m      | legal documents, funnel data |
| `USER_DATA`       | 5m       | preferences, analytics       |
| `SESSION`         | 30m      | admin/operator sessions      |
| `SHORT_LIVED`     | 1m       | rate limits, temp tokens     |
| `EPHEMERAL`       | 10s      | real-time metrics            |
| `USERNAME_LOOKUP` | 2h       | username → userId mapping    |
| `EXPORT_STATUS`   | 24h      | export job tracking          |

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

## Circuit Breaker

Resilience pattern to prevent cascading failures.

```typescript
import { CircuitBreaker, CircuitState } from '@my-girok/nest-common';

// Create circuit breaker
const breaker = new CircuitBreaker({
  name: 'clickhouse',
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 30000, // Wait 30s before testing
  successThreshold: 2, // Need 2 successes to close
});

// Execute with circuit breaker protection
const result = await breaker.execute(async () => {
  return clickhouse.query({ query: 'SELECT 1' });
});

// Execute with fallback (never throws)
const data = await breaker.executeWithFallback(
  async () => clickhouse.query(sql),
  () => [], // Fallback value
);

// Check state
breaker.getState(); // CLOSED, OPEN, HALF_OPEN
breaker.isAvailable(); // Can we make requests?
breaker.getStats(); // { state, failureCount, successCount, lastFailureTime }
breaker.reset(); // Manual reset to CLOSED
```

### Circuit States

| State     | Description      | Behavior                    |
| --------- | ---------------- | --------------------------- |
| CLOSED    | Normal operation | Requests pass through       |
| OPEN      | Service failing  | Requests rejected/fallback  |
| HALF_OPEN | Testing recovery | Allow 1 request for testing |

### Options

| Option             | Default  | Description                |
| ------------------ | -------- | -------------------------- |
| `name`             | required | Name for logging           |
| `failureThreshold` | 5        | Failures before opening    |
| `resetTimeout`     | 30000    | Ms before testing recovery |
| `successThreshold` | 2        | Successes to close circuit |
| `fallback`         | -        | Default fallback function  |

---

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

## OpenTelemetry (OTEL) SDK

Auto-instrumentation for distributed tracing and metrics.

```typescript
// main.ts - MUST be FIRST import
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'auth-service' });

// Then other imports...
import { NestFactory } from '@nestjs/core';
```

### OtelConfig Options

| Option                 | Default                 | Description                 |
| ---------------------- | ----------------------- | --------------------------- |
| `serviceName`          | required                | Service identifier          |
| `serviceVersion`       | `SERVICE_VERSION` env   | Version string              |
| `serviceNamespace`     | `my-girok`              | Service grouping            |
| `environment`          | `NODE_ENV`              | Deployment environment      |
| `otlpEndpoint`         | `http://localhost:4318` | OTLP collector URL          |
| `samplingRatio`        | `1.0`                   | Trace sampling (0.0-1.0)    |
| `metricExportInterval` | `60000`                 | Metric export interval (ms) |
| `metricExportTimeout`  | `30000`                 | Metric export timeout (ms)  |
| `traceExportTimeout`   | `30000`                 | Trace export timeout (ms)   |
| `ignoreEndpoints`      | health endpoints        | Endpoints to skip tracing   |
| `resourceAttributes`   | `{}`                    | Additional OTEL attributes  |
| `disabled`             | `false`                 | Disable OTEL entirely       |
| `debug`                | `false`                 | Enable OTEL debug logging   |
| `enforceHttps`         | `false`                 | Require HTTPS in production |

### Helper Functions

```typescript
import { shutdownOtel, getOtelSdk, isOtelInitialized } from '@my-girok/nest-common';

// Graceful shutdown
await shutdownOtel(10000); // 10s timeout

// Check status
if (isOtelInitialized()) {
  /* ... */
}
const sdk = getOtelSdk();
```

### Environment Variables

| Variable                      | Description               |
| ----------------------------- | ------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector URL        |
| `OTEL_SDK_DISABLED`           | Set `true` to disable     |
| `OTEL_DEBUG`                  | Set `true` for debug logs |
| `OTEL_TRACES_SAMPLER_ARG`     | Sampling ratio (0.0-1.0)  |
| `SERVICE_VERSION`             | Service version           |
| `K8S_NAMESPACE`, `POD_NAME`   | K8s attributes            |

---

## Pino Logging

ECS 8.11.0 compliant structured logging with OTEL trace correlation.

```typescript
import { PinoLoggerModule, createPinoHttpConfig } from '@my-girok/nest-common';

// app.module.ts
@Module({
  imports: [
    PinoLoggerModule.forRoot(createPinoHttpConfig({
      serviceName: 'auth-service',
      additionalRedactPaths: ['req.body.customSecret'],
    })),
  ],
})
```

### Security Features

- **100+ sensitive field redaction**: passwords, tokens, PII, credentials
- **Log injection prevention**: ANSI escape, control chars, Unicode normalization
- **IP validation**: IPv4/IPv6 format validation
- **Request ID validation**: UUID format only

### PinoConfigOptions

| Option                  | Default                       | Description            |
| ----------------------- | ----------------------------- | ---------------------- |
| `serviceName`           | `SERVICE_NAME` env            | Service name           |
| `serviceVersion`        | `SERVICE_VERSION` env         | Version                |
| `environment`           | `NODE_ENV`                    | Environment            |
| `level`                 | `info` (prod) / `debug` (dev) | Log level              |
| `additionalRedactPaths` | `[]`                          | Extra fields to redact |

### Log Output (ECS 8.11.0)

```json
{
  "@timestamp": "2024-01-01T00:00:00.000Z",
  "log.level": "info",
  "message": "Request completed",
  "ecs.version": "8.11.0",
  "service.name": "auth-service",
  "trace.id": "abc123...",
  "span.id": "def456...",
  "trace.sampled": true,
  "http.status_code": 200,
  "event.category": "web",
  "event.outcome": "success"
}
```

### Redacted Fields (excerpt)

```
password, token, secret, apiKey, authorization, refreshToken,
accessToken, privateKey, ssn, creditCard, cvv, email, phone,
awsSecretAccessKey, azureClientSecret, **.password, **.token...
```

---

## Rate Limiting

Distributed rate limiting with Redis/Valkey, circuit breaker, fail-open.

```typescript
import { RateLimitModule } from '@my-girok/nest-common';

// Basic (in-memory)
@Module({
  imports: [RateLimitModule.forRoot()],
})

// With Redis (distributed)
@Module({
  imports: [
    RateLimitModule.forRoot({
      defaultTier: 'AUTH',
      redisUrl: 'redis://localhost:6379',
    }),
  ],
})

// Async from ConfigService
@Module({
  imports: [RateLimitModule.forRootAsync()],
})
```

### Rate Limit Tiers

| Tier             | Limit | TTL | Use Case        |
| ---------------- | ----- | --- | --------------- |
| `STANDARD`       | 100   | 60s | Default APIs    |
| `AUTH`           | 10    | 60s | Login, register |
| `HIGH_FREQUENCY` | 1000  | 60s | Public read     |
| `WRITE_HEAVY`    | 30    | 60s | Create/update   |
| `ADMIN`          | 500   | 60s | Admin APIs      |
| `PUBLIC`         | 50    | 60s | Unauthenticated |

### Controller Usage

```typescript
import { Throttle, SkipThrottle } from '@my-girok/nest-common';

@Controller('auth')
export class AuthController {
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login() {}

  @SkipThrottle()
  @Get('health')
  health() {}
}
```

### Redis Storage Options

| Option                    | Default     | Description            |
| ------------------------- | ----------- | ---------------------- |
| `url`                     | required    | Redis URL              |
| `keyPrefix`               | `throttle:` | Key prefix             |
| `connectTimeout`          | `5000`      | Connection timeout     |
| `commandTimeout`          | `3000`      | Command timeout        |
| `enableFallback`          | `true`      | Allow on Redis failure |
| `circuitBreakerThreshold` | `5`         | Failures before open   |
| `circuitBreakerResetTime` | `30000`     | Reset wait time        |

### Response Headers (IETF RFC 9110)

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 60          (delta seconds until reset)
RateLimit-Policy: 100;w=60   (limit;window in seconds)
Retry-After: 60              (when 429)
```

> **Note**: Headers follow IETF RateLimit Fields draft standard.
> Reset value is delta seconds (not Unix timestamp).

### Environment Variables

| Variable                   | Description         |
| -------------------------- | ------------------- |
| `RATE_LIMIT_TTL`           | Default TTL (ms)    |
| `RATE_LIMIT_STANDARD`      | Standard tier limit |
| `RATE_LIMIT_AUTH`          | Auth tier limit     |
| `VALKEY_URL` / `REDIS_URL` | Redis connection    |
| `RATE_LIMIT_KEY_PREFIX`    | Key prefix          |

---

## @Transactional Decorator

Prisma transaction management with AsyncLocalStorage context propagation.

```typescript
import { Transactional, getPrismaClient, isInTransaction } from '@my-girok/nest-common';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  @Transactional()
  async createWithProfile(dto: CreateUserDto) {
    const user = await this.prisma.user.create({ data: dto });
    await this.profileService.create(user.id); // Same transaction!
    return user;
  }

  @Transactional({ propagation: 'requires_new', isolationLevel: 'Serializable' })
  async criticalOperation() {
    /* ... */
  }
}
```

### Propagation Modes

| Mode                 | Behavior                                   |
| -------------------- | ------------------------------------------ |
| `required` (default) | Join existing or create new                |
| `requires_new`       | Always create new, suspend existing        |
| `supports`           | Use existing if available, no tx otherwise |
| `mandatory`          | Must have existing, throw if none          |
| `never`              | Must NOT have existing, throw if exists    |
| `not_supported`      | Suspend existing, run without tx           |

### TransactionalOptions

| Option           | Default         | Description              |
| ---------------- | --------------- | ------------------------ |
| `timeout`        | `30000`         | Transaction timeout (ms) |
| `isolationLevel` | `ReadCommitted` | Isolation level          |
| `maxRetries`     | `3`             | Total retry attempts     |
| `retryDelay`     | `100`           | Base delay (ms)          |
| `prismaProperty` | `prisma`        | Property name            |
| `propagation`    | `required`      | Propagation mode         |
| `enableTracing`  | `true`          | OTEL span creation       |

### Isolation Levels

`ReadUncommitted`, `ReadCommitted`, `RepeatableRead`, `Serializable`, `Snapshot`

### Helper Functions

```typescript
// Get transaction-aware client
const client = getPrismaClient(this.prisma);

// Check transaction state
if (isInTransaction()) {
  /* ... */
}

// Get current transaction ID
const txId = getCurrentTransactionId();

// Get nesting depth
const depth = getTransactionDepth();
```

### Retryable Errors

Automatically retried: `P2034` (deadlock), `P2024` (pool timeout), `40001` (serialization), `40P01` (deadlock), network errors.

NOT retried: `23505` (unique violation), `23503` (FK violation), syntax errors.

### OTEL Span Attributes

```
db.operation: transaction
db.system: postgresql
db.transaction.id: tx_abc123
db.transaction.isolation_level: ReadCommitted
db.transaction.attempt: 1
db.transaction.propagation: required
```

---

## gRPC Clients

Inter-service communication via typed gRPC clients.

### Module Setup

```typescript
import { GrpcClientsModule, IdentityGrpcClient } from '@my-girok/nest-common';

@Module({
  imports: [
    GrpcClientsModule.forRoot({
      identity: true, // Enable identity-service client
      auth: true, // Enable auth-service client
      legal: true, // Enable legal-service client
    }),
  ],
})
export class AppModule {}
```

### Clients

| Client               | Service          | gRPC Port | Methods                                             |
| -------------------- | ---------------- | --------- | --------------------------------------------------- |
| `IdentityGrpcClient` | identity-service | 50051     | getAccount, validateSession, createAccount, etc.    |
| `AuthGrpcClient`     | auth-service     | 50052     | checkPermission, getOperator, checkSanction, etc.   |
| `LegalGrpcClient`    | legal-service    | 50053     | checkConsents, grantConsent, createDsrRequest, etc. |

### Usage

```typescript
@Injectable()
export class SomeService {
  constructor(private readonly identityClient: IdentityGrpcClient) {}

  async getUser(id: string) {
    const { account } = await this.identityClient.getAccount({ id });
    return account;
  }
}
```

### Error Handling

```typescript
import { isGrpcError, GrpcError } from '@my-girok/nest-common';
import { status as GrpcStatus } from '@grpc/grpc-js';

try {
  await this.identityClient.getAccount({ id });
} catch (error) {
  if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
    throw new NotFoundException('Account not found');
  }
  throw error;
}
```

### Configuration

| Env Variable         | Default   | Description           |
| -------------------- | --------- | --------------------- |
| `IDENTITY_GRPC_HOST` | localhost | Identity service host |
| `IDENTITY_GRPC_PORT` | 50051     | Identity gRPC port    |
| `AUTH_GRPC_HOST`     | localhost | Auth service host     |
| `AUTH_GRPC_PORT`     | 50052     | Auth gRPC port        |
| `LEGAL_GRPC_HOST`    | localhost | Legal service host    |
| `LEGAL_GRPC_PORT`    | 50053     | Legal gRPC port       |

---

## PII Masking

Utilities for masking Personally Identifiable Information in logs and audit trails.

```typescript
import {
  maskEmail,
  maskPhone,
  maskIpAddress,
  maskName,
  maskObject,
  createMaskedUserLog,
} from '@my-girok/nest-common';
```

### Functions

| Function              | Purpose               | Example Output        |
| --------------------- | --------------------- | --------------------- |
| `maskEmail`           | Email masking         | `u***@example.com`    |
| `maskPhone`           | Phone masking         | `010-***-5678`        |
| `maskIpAddress`       | IP masking            | `192.168.x.x`         |
| `maskName`            | Name masking          | `J*** D***` / `김**`  |
| `maskUuid`            | UUID masking          | `0193****890a`        |
| `maskCreditCard`      | Card masking          | `4111-****-****-1111` |
| `maskBirthDate`       | Date masking          | `1990-**-**`          |
| `maskAddress`         | Address masking       | `Seoul ***`           |
| `maskObject`          | Recursive PII masking | Auto-detect fields    |
| `createMaskedUserLog` | User log data masking | Combined masking      |

### Usage

```typescript
// Single field masking
maskEmail('user@example.com'); // "u***@example.com"
maskPhone('+821012345678'); // "+820***5678"
maskName('John Doe'); // "J*** D***"
maskName('김철수'); // "김**"

// Object masking (auto-detects PII fields)
const masked = maskObject({
  email: 'user@example.com',
  phone: '010-1234-5678',
  name: 'John Doe',
  status: 'active', // Not masked
});
// { email: 'u***@example.com', phone: '010-***-5678', name: 'J*** D***', status: 'active' }

// Custom fields
const masked = maskObject(data, {
  fieldsToMask: ['customEmail', 'secretField'],
});
```

### Default PII Fields

Auto-detected by `maskObject`:

```
email, phone, name, firstName, lastName, username, password,
ssn, birthDate, address, creditCard, ipAddress, ip
```

---

**Detailed docs**: `docs/packages/nest-common.md`
