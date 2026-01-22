# @my-girok/nest-common - Modules Reference

This document provides detailed API documentation for all modules available in the `@my-girok/nest-common` package.

## Overview

The `@my-girok/nest-common` package provides shared utilities, modules, and helpers for NestJS services across the platform.

## CacheKey Helper

Generate consistent cache keys across all services.

### Usage

```typescript
import { CacheKey } from '@my-girok/nest-common';

CacheKey.make('auth', 'permissions', roleId);
// Output: "dev:auth:permissions:{uuid}"

CacheKey.pattern('auth', 'permissions', '*');
// Output: "dev:auth:permissions:*"
```

### Key Format

All cache keys follow the pattern: `{env}:{service}:{entity}:{identifier}`

## CacheTTL Constants

Predefined TTL values for common caching scenarios.

### Usage

```typescript
import { CacheTTL } from '@my-girok/nest-common';

await cache.set(key, data, CacheTTL.STATIC_CONFIG); // 24 hours
```

### Available Constants

| Constant          | Duration | Recommended Use Cases             |
| ----------------- | -------- | --------------------------------- |
| `STATIC_CONFIG`   | 24h      | Services, permissions             |
| `SEMI_STATIC`     | 15m      | Legal documents, funnel configs   |
| `USER_DATA`       | 5m       | User preferences, resume metadata |
| `SESSION`         | 30m      | Admin/operator sessions           |
| `SHORT_LIVED`     | 1m       | Rate limits, temporary tokens     |
| `EPHEMERAL`       | 10s      | Real-time metrics                 |
| `USERNAME_LOOKUP` | 2h       | Username to userId mapping        |
| `EXPORT_STATUS`   | 24h      | Export job tracking               |

## ID Generation (UUIDv7)

Generate and validate UUIDv7 identifiers per RFC 9562.

### Usage

```typescript
import { ID, UUIDv7, ParseUUIDPipe, ParseUUIDv7Pipe } from '@my-girok/nest-common';

// Generate a new UUIDv7
ID.generate(); // "01935c6d-c2d0-7abc-8def-1234567890ab"

// Validate any UUID (v1-v8)
ID.isValid(id); // boolean

// Validate UUIDv7 specifically
UUIDv7.isValid(id); // boolean

// Extract timestamp from UUIDv7
ID.getTimestamp(id); // Date object
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
// Automatically generates UUIDv7 for new records
```

## ClickHouse Integration

Connect to and query ClickHouse databases.

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

// Parameterized query
await clickhouse.query<T>('SELECT * FROM t WHERE id = {id:UUID}', { id });

// Single insert
await clickhouse.insert('table', [{ id, data }]);

// Batch insert (default batch size: 5000)
await clickhouse.batchInsert('table', largeDataset, 5000);
```

### Query Builder

```typescript
const builder = createQueryBuilder()
  .whereBetween('timestamp', start, end, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID');

const { whereClause, params } = builder.build();
```

## OpenTelemetry (OTEL) SDK

Initialize OpenTelemetry instrumentation for distributed tracing.

### Setup (MUST BE FIRST IMPORT)

```typescript
// main.ts - This must be the first import
import { initOtel } from '@my-girok/nest-common';

initOtel({ serviceName: 'auth-service' });

// Other imports follow...
```

### Configuration Options

| Option        | Default        | Description                    |
| ------------- | -------------- | ------------------------------ |
| serviceName   | required       | Service identifier for traces  |
| otlpEndpoint  | localhost:4318 | OTLP collector endpoint        |
| samplingRatio | 1.0            | Trace sampling ratio (0.0-1.0) |

## Pino Logging

Structured logging with automatic PII redaction.

### Module Setup

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

### Auto-Redacted Fields

The following fields are automatically redacted from logs:

- password, token, secret, apiKey
- ssn, email, phone, creditCard
- authorization headers

## Rate Limiting

Configurable rate limiting with Redis backend.

### Module Setup

```typescript
import { RateLimitModule } from '@my-girok/nest-common';

RateLimitModule.forRoot({
  defaultTier: 'AUTH',
  redisUrl: 'redis://localhost:6379',
});
```

### Decorator Usage

```typescript
import { Throttle, SkipThrottle } from '@my-girok/nest-common';

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login() {}

@SkipThrottle()
@Get('health')
async health() {}
```

### Rate Limit Tiers

| Tier           | Limit | TTL | Description           |
| -------------- | ----- | --- | --------------------- |
| STANDARD       | 100   | 60s | Default tier          |
| AUTH           | 10    | 60s | Login/register        |
| HIGH_FREQUENCY | 1000  | 60s | Public read endpoints |
| WRITE_HEAVY    | 30    | 60s | Create/update         |

## @Transactional Decorator

Automatic transaction management for Prisma operations.

### Basic Usage

```typescript
import { Transactional } from '@my-girok/nest-common';

@Transactional()
async createUserWithProfile(dto: CreateUserDto) {
  const user = await this.prisma.user.create({ data: { email: dto.email } });
  await this.profileService.createProfile(user.id, dto.profile);
  return user;
}
```

### With Options

```typescript
@Transactional({
  timeout: 60000,
  isolationLevel: 'Serializable',
  maxRetries: 5,
})
async complexOperation() {}
```

## gRPC Clients

Pre-configured gRPC clients for inter-service communication.

### Module Setup

```typescript
import { GrpcClientsModule } from '@my-girok/nest-common';

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

## PII Masking

Mask sensitive data for logging and display.

### Usage

```typescript
import { maskEmail, maskPhone, maskObject } from '@my-girok/nest-common';

maskEmail('user@example.com');
// Output: "u***@example.com"

maskPhone('+821012345678');
// Output: "+820***5678"

maskObject({ email: 'user@example.com', status: 'active' });
// Auto-detects and masks PII fields
```

## Related Documentation

- **Main nest-common Guide**: See `nest-common.md`

---

_This document is auto-generated from `docs/llm/packages/nest-common-modules.md`_
