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

## OpenTelemetry (OTEL) SDK

The OTEL SDK provides auto-instrumentation for distributed tracing and metrics collection across all microservices.

### Critical: Import Order

The OTEL SDK **MUST** be imported and initialized as the **FIRST** import in your `main.ts` file, before any other imports:

```typescript
// main.ts - FIRST LINES
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'auth-service' });

// Then other imports...
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
}
bootstrap();
```

This ensures all modules (HTTP, database, etc.) are properly instrumented before they're loaded.

### Configuration Options

```typescript
interface OtelConfig {
  serviceName: string; // Required: Service identifier
  serviceVersion?: string; // Default: SERVICE_VERSION env or '0.0.0'
  serviceNamespace?: string; // Default: 'my-girok'
  environment?: string; // Default: NODE_ENV
  otlpEndpoint?: string; // Default: OTEL_EXPORTER_OTLP_ENDPOINT or http://localhost:4318
  samplingRatio?: number; // Default: 1.0 (100% sampling)
  metricExportInterval?: number; // Default: 60000ms (1 minute)
  metricExportTimeout?: number; // Default: 30000ms
  traceExportTimeout?: number; // Default: 30000ms
  ignoreEndpoints?: string[]; // Default: ['/health', '/ready', '/live', '/metrics', ...]
  resourceAttributes?: Record<string, string | number | boolean>;
  disabled?: boolean; // Default: false
  debug?: boolean; // Default: false
}
```

### Production Configuration Example

```typescript
initOtel({
  serviceName: 'auth-service',
  serviceVersion: process.env.SERVICE_VERSION,
  samplingRatio: 0.1, // 10% sampling in production
  otlpEndpoint: 'https://otel-collector.example.com:4318',
  resourceAttributes: {
    'deployment.region': 'ap-northeast-2',
  },
});
```

### Helper Functions

```typescript
import { initOtel, shutdownOtel, getOtelSdk, isOtelInitialized } from '@my-girok/nest-common';

// Graceful shutdown (call before app termination)
await shutdownOtel(10000); // 10 second timeout

// Check initialization status
if (isOtelInitialized()) {
  console.log('OTEL is active');
}

// Get SDK instance (for advanced use cases)
const sdk = getOtelSdk();
```

### Environment Variables

| Variable                      | Default                 | Description                 |
| ----------------------------- | ----------------------- | --------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP collector endpoint     |
| `OTEL_SDK_DISABLED`           | `false`                 | Set `true` to disable OTEL  |
| `OTEL_DEBUG`                  | `false`                 | Enable OTEL debug logging   |
| `OTEL_TRACES_SAMPLER_ARG`     | `1.0`                   | Sampling ratio (0.0-1.0)    |
| `OTEL_TRACE_EXPORT_TIMEOUT`   | `30000`                 | Trace export timeout (ms)   |
| `OTEL_METRIC_EXPORT_INTERVAL` | `60000`                 | Metric export interval (ms) |
| `SERVICE_VERSION`             | `0.0.0`                 | Service version for traces  |
| `SERVICE_NAMESPACE`           | `my-girok`              | Service namespace           |
| `K8S_NAMESPACE`               | -                       | Kubernetes namespace        |
| `POD_NAME`                    | -                       | Kubernetes pod name         |

### Resource Attributes

The SDK automatically sets these OpenTelemetry resource attributes:

- `service.name`, `service.version`, `service.namespace`, `service.instance.id`
- `process.pid`, `process.runtime.name`, `process.runtime.version`
- `telemetry.sdk.name`, `telemetry.sdk.version`, `telemetry.sdk.language`
- `deployment.environment.name`, `host.name`, `host.arch`
- Kubernetes attributes (when running in K8s)

---

## Pino Logging

Structured logging with ECS 8.11.0 compliance, OTEL trace correlation, and comprehensive security features.

### Module Setup

```typescript
import { PinoLoggerModule, createPinoHttpConfig } from '@my-girok/nest-common';

@Module({
  imports: [
    PinoLoggerModule.forRoot(
      createPinoHttpConfig({
        serviceName: 'auth-service',
        serviceVersion: '1.0.0',
        level: 'info',
        additionalRedactPaths: ['req.body.customSecret'],
      }),
    ),
  ],
})
export class AppModule {}
```

### Configuration Options

```typescript
interface PinoConfigOptions {
  serviceName?: string; // Default: SERVICE_NAME env
  serviceVersion?: string; // Default: SERVICE_VERSION env
  environment?: string; // Default: NODE_ENV
  level?: string; // Default: 'debug' (dev) / 'info' (prod)
  additionalRedactPaths?: string[]; // Extra fields to redact
}
```

### Security Features

#### 1. Sensitive Field Redaction (100+ patterns)

The logger automatically redacts sensitive fields from logs:

**Authentication & Tokens:**

```
password, token, secret, apiKey, authorization, refreshToken, accessToken,
bearerToken, jwtToken, sessionToken, csrfToken, x-csrf-token
```

**Personal Information (PII):**

```
ssn, email, phone, address, dateOfBirth, passportNumber, driversLicense
```

**Financial Data:**

```
creditCard, cardNumber, cvv, bankAccount, accountNumber, routingNumber, iban, pin
```

**Cloud Credentials:**

```
awsSecretAccessKey, azureClientSecret, gcpServiceAccountKey, clientSecret
```

**Deep Wildcards** (matches at any nesting level):

```
**.password, **.token, **.secret, **.apiKey, **.creditCard, **.ssn
```

#### 2. Log Injection Prevention

The logger sanitizes all user-controlled strings:

- **Unicode normalization (NFKC)**: Prevents homoglyph attacks
- **ANSI escape stripping**: Removes terminal control codes
- **Control character removal**: ASCII (0x00-0x1F, 0x7F), Unicode (0x80-0x9F)
- **Zero-width character removal**: U+200B-U+200D, U+FEFF
- **Bidirectional text override removal**: U+202A-U+202E
- **Length limits**: Prevents log bloat attacks

#### 3. IP Address Validation

Client IP addresses are validated against IPv4/IPv6 patterns before logging.

#### 4. Request ID Validation

Only UUID-formatted request IDs are accepted; invalid IDs are replaced with new UUIDs.

### Log Output Format (ECS 8.11.0)

```json
{
  "@timestamp": "2024-01-01T00:00:00.000Z",
  "log.level": "info",
  "message": "Request completed in 45ms with status 200",
  "ecs.version": "8.11.0",
  "service.name": "auth-service",
  "service.version": "1.0.0",
  "service.environment": "production",
  "trace.id": "abc123def456...",
  "span.id": "789xyz...",
  "trace.sampled": true,
  "http.request_id": "550e8400-e29b-41d4-a716-446655440000",
  "http.method": "POST",
  "http.path": "/v1/auth/login",
  "http.status_code": 200,
  "http.response_time_ms": 45,
  "client.ip": "192.168.1.1",
  "event.category": "web",
  "event.outcome": "success"
}
```

### Automatic Health Endpoint Skipping

These endpoints are automatically excluded from request logging:

- `/health`, `/health/ready`, `/health/live`
- `/healthz`, `/readyz`, `/livez`
- `/metrics`, `/ping`, `/_health`

---

## Rate Limiting

Distributed rate limiting with Redis/Valkey storage, circuit breaker pattern, and fail-open fallback.

### Basic Setup (In-Memory)

```typescript
import { RateLimitModule } from '@my-girok/nest-common';

@Module({
  imports: [RateLimitModule.forRoot()],
})
export class AppModule {}
```

### Distributed Setup (Redis/Valkey)

```typescript
@Module({
  imports: [
    RateLimitModule.forRoot({
      defaultTier: 'AUTH',
      redisUrl: 'redis://localhost:6379',
      keyPrefix: 'myapp:throttle:',
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
@Module({
  imports: [RateLimitModule.forRootAsync()],
})
export class AppModule {}

// Reads from environment:
// - VALKEY_URL or REDIS_URL
// - RATE_LIMIT_TIER (STANDARD, AUTH, etc.)
// - RATE_LIMIT_KEY_PREFIX
```

### Pre-Configured Rate Limit Tiers

| Tier             | Limit    | TTL | Description                     |
| ---------------- | -------- | --- | ------------------------------- |
| `STANDARD`       | 100 req  | 60s | Default for most APIs           |
| `AUTH`           | 10 req   | 60s | Login, register, password reset |
| `HIGH_FREQUENCY` | 1000 req | 60s | Public read-heavy endpoints     |
| `WRITE_HEAVY`    | 30 req   | 60s | Create, update operations       |
| `ADMIN`          | 500 req  | 60s | Admin panel APIs                |
| `PUBLIC`         | 50 req   | 60s | Unauthenticated endpoints       |

### Controller Usage

```typescript
import { Throttle, SkipThrottle } from '@my-girok/nest-common';

@Controller('auth')
export class AuthController {
  // Custom rate limit for this endpoint
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    // Only 5 attempts per minute
  }

  // Skip rate limiting entirely
  @SkipThrottle()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
```

### Redis Storage Configuration

```typescript
interface RedisThrottlerStorageOptions {
  url: string; // Required: Redis connection URL
  keyPrefix?: string; // Default: 'throttle:'
  connectTimeout?: number; // Default: 5000ms
  commandTimeout?: number; // Default: 3000ms
  tls?: boolean; // Default: false
  enableFallback?: boolean; // Default: true (fail-open)
  circuitBreakerThreshold?: number; // Default: 5 failures
  circuitBreakerResetTime?: number; // Default: 30000ms
}
```

### Circuit Breaker Behavior

The Redis storage includes a circuit breaker to handle Redis failures:

1. **CLOSED** (normal): Requests go to Redis
2. **OPEN** (after threshold failures): Requests bypass Redis, use fallback
3. **HALF-OPEN** (after reset time): Single test request to Redis

With `enableFallback: true` (default), requests are **allowed** when Redis is unavailable.

### Response Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100        # Maximum requests per window
X-RateLimit-Remaining: 95     # Remaining requests
X-RateLimit-Reset: 1704067260 # Unix timestamp when limit resets
Retry-After: 60               # Seconds to wait (only when 429)
```

### Environment Variables

| Variable                    | Default     | Description                     |
| --------------------------- | ----------- | ------------------------------- |
| `RATE_LIMIT_TTL`            | `60000`     | Default TTL in milliseconds     |
| `RATE_LIMIT_STANDARD`       | `100`       | Standard tier limit             |
| `RATE_LIMIT_AUTH`           | `10`        | Auth tier limit                 |
| `RATE_LIMIT_HIGH_FREQUENCY` | `1000`      | High frequency tier limit       |
| `RATE_LIMIT_WRITE_HEAVY`    | `30`        | Write heavy tier limit          |
| `RATE_LIMIT_ADMIN`          | `500`       | Admin tier limit                |
| `RATE_LIMIT_PUBLIC`         | `50`        | Public tier limit               |
| `VALKEY_URL`                | -           | Valkey connection URL           |
| `REDIS_URL`                 | -           | Redis connection URL (fallback) |
| `RATE_LIMIT_KEY_PREFIX`     | `throttle:` | Redis key prefix                |
| `RATE_LIMIT_TIER`           | `STANDARD`  | Default tier (for forRootAsync) |

---

## @Transactional Decorator

Declarative transaction management for Prisma with AsyncLocalStorage-based context propagation, automatic retry on deadlock, and OTEL tracing.

### Basic Usage

```typescript
import { Transactional, getPrismaClient } from '@my-girok/nest-common';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  @Transactional()
  async createUserWithProfile(dto: CreateUserDto) {
    // All operations share the same transaction
    const user = await this.prisma.user.create({
      data: { email: dto.email },
    });

    // This also runs in the same transaction!
    await this.profileService.createProfile(user.id, dto.profile);

    return user;
  }
}
```

### Propagation Modes

The decorator supports 6 propagation modes, similar to Spring's `@Transactional`:

| Mode                 | Behavior                                  | Use Case                              |
| -------------------- | ----------------------------------------- | ------------------------------------- |
| `required` (default) | Join existing transaction or create new   | Most operations                       |
| `requires_new`       | Always create new, suspend existing       | Audit logs, independent operations    |
| `supports`           | Use existing if available, none otherwise | Optional transaction participation    |
| `mandatory`          | Must have existing, throw if none         | Operations that require transaction   |
| `never`              | Must NOT have existing, throw if exists   | Operations that must run outside tx   |
| `not_supported`      | Suspend existing, run without transaction | Read-only queries, external API calls |

```typescript
@Transactional({ propagation: 'requires_new' })
async auditLog(action: string) {
  // Always in its own transaction, even if called from another @Transactional method
}

@Transactional({ propagation: 'mandatory' })
async updateInventory(productId: string, quantity: number) {
  // Throws error if called without existing transaction
}
```

### Configuration Options

```typescript
interface TransactionalOptions {
  timeout?: number; // Default: 30000ms (min: 1000, max: 300000)
  isolationLevel?: TransactionIsolationLevel; // Default: 'ReadCommitted'
  maxRetries?: number; // Default: 3 (total attempts)
  retryDelay?: number; // Default: 100ms (base delay)
  prismaProperty?: string; // Default: 'prisma'
  propagation?: TransactionPropagation; // Default: 'required'
  enableTracing?: boolean; // Default: true
}

type TransactionIsolationLevel =
  | 'ReadUncommitted'
  | 'ReadCommitted'
  | 'RepeatableRead'
  | 'Serializable'
  | 'Snapshot';
```

### Automatic Retry Logic

The decorator automatically retries on transient errors using **full jitter exponential backoff**:

**Retryable errors:**

- Prisma: `P2034` (deadlock), `P2024` (pool timeout), `P2028` (tx error), `P1001/P1002/P1017` (connection)
- PostgreSQL: `40001` (serialization), `40P01` (deadlock), `53300` (too many connections), `55P03` (lock timeout)
- Network: `ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET`

**Non-retryable errors (fail immediately):**

- `23505` (unique violation), `23503` (FK violation), `42P01` (undefined table), syntax errors

### Helper Functions

```typescript
import {
  getPrismaClient,
  isInTransaction,
  getCurrentTransactionId,
  getTransactionDepth,
} from '@my-girok/nest-common';

// Get transaction-aware Prisma client
async someMethod() {
  const client = getPrismaClient(this.prisma);
  // Uses transaction client if in transaction, otherwise normal client
}

// Check if currently in transaction
if (isInTransaction()) {
  // We're inside a @Transactional method
}

// Get current transaction ID (for logging)
const txId = getCurrentTransactionId(); // 'tx_abc123...' or undefined

// Get nesting depth
const depth = getTransactionDepth(); // 0, 1, 2, ...
```

### OTEL Integration

When `enableTracing: true` (default), each transaction creates an OTEL span with:

```
db.operation: transaction
db.system: postgresql
db.transaction.id: tx_m2x9k1_abc123
db.transaction.isolation_level: ReadCommitted
db.transaction.attempt: 1
db.transaction.timeout_ms: 30000
db.transaction.propagation: required
```

### Max Depth Protection

Transactions are limited to 10 nesting levels to prevent stack overflow. Exceeding this throws an error.

### Example: Complex Transaction with Multiple Services

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly paymentService: PaymentService,
    private readonly auditService: AuditService,
  ) {}

  @Transactional({ timeout: 60000, isolationLevel: 'Serializable' })
  async createOrder(dto: CreateOrderDto) {
    // 1. Create order
    const order = await this.prisma.order.create({ data: dto });

    // 2. Update inventory (same transaction via AsyncLocalStorage)
    await this.inventoryService.decrementStock(dto.productId, dto.quantity);

    // 3. Process payment (same transaction)
    await this.paymentService.charge(dto.userId, order.total);

    // 4. Audit log (new independent transaction)
    await this.auditService.log('order.created', order.id);

    return order;
  }
}

@Injectable()
export class AuditService {
  @Transactional({ propagation: 'requires_new' })
  async log(action: string, entityId: string) {
    // Always commits, even if parent transaction rolls back
  }
}
```

---

**Quick reference**: `.ai/packages/nest-common.md`
