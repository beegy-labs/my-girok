# @my-girok/nest-common - Modules Reference

> Detailed API for all nest-common modules

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

## ID Generation (UUIDv7 - RFC 9562)

```typescript
import { ID, UUIDv7, ParseUUIDPipe, ParseUUIDv7Pipe } from '@my-girok/nest-common';

ID.generate();                    // "01935c6d-c2d0-7abc-8def-1234567890ab"
ID.isValid(id);                   // Any UUID v1-8
UUIDv7.isValid(id);               // UUIDv7 only
ID.getTimestamp(id);              // Date object

// Pipes
@Get(':id') async get(@Param('id', ParseUUIDv7Pipe) id: string) {}

// Prisma extension
const prisma = new PrismaClient().$extends(uuidv7Extension);
```

## ClickHouse Integration

```typescript
import { ClickHouseModule, ClickHouseService, createQueryBuilder } from '@my-girok/nest-common';

@Module({ imports: [ClickHouseModule] })

await clickhouse.query<T>('SELECT * FROM t WHERE id = {id:UUID}', { id });
await clickhouse.insert('table', [{ id, data }]);
await clickhouse.batchInsert('table', largeDataset, 5000);

// Query Builder
const builder = createQueryBuilder()
  .whereBetween('timestamp', start, end, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID');
```

## OpenTelemetry (OTEL) SDK

```typescript
// main.ts - MUST BE FIRST IMPORT
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'auth-service' });
```

| Config Option | Default        | Description        |
| ------------- | -------------- | ------------------ |
| serviceName   | required       | Service identifier |
| otlpEndpoint  | localhost:4318 | OTLP collector     |
| samplingRatio | 1.0            | Sampling (0.0-1.0) |

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

**Auto-redacted fields**: password, token, secret, apiKey, ssn, email, phone, creditCard, etc.

## Rate Limiting

```typescript
import { RateLimitModule, Throttle, SkipThrottle } from '@my-girok/nest-common';

RateLimitModule.forRoot({ defaultTier: 'AUTH', redisUrl: 'redis://localhost:6379' })

@Throttle({ default: { limit: 5, ttl: 60000 } }) @Post('login')
@SkipThrottle() @Get('health')
```

| Tier           | Limit | TTL | Description    |
| -------------- | ----- | --- | -------------- |
| STANDARD       | 100   | 60s | Default        |
| AUTH           | 10    | 60s | Login/register |
| HIGH_FREQUENCY | 1000  | 60s | Public read    |
| WRITE_HEAVY    | 30    | 60s | Create/update  |

## @Transactional Decorator

```typescript
import { Transactional, getPrismaClient } from '@my-girok/nest-common';

@Transactional()
async createUserWithProfile(dto: CreateUserDto) {
  const user = await this.prisma.user.create({ data: { email: dto.email } });
  await this.profileService.createProfile(user.id, dto.profile);
  return user;
}

// Options
@Transactional({ timeout: 60000, isolationLevel: 'Serializable', maxRetries: 5 })
```

## gRPC Clients

```typescript
import { GrpcClientsModule, IdentityGrpcClient, AuthGrpcClient } from '@my-girok/nest-common';

@Module({
  imports: [GrpcClientsModule.forRoot({ identity: true, auth: true, legal: true })],
})
```

| Client       | Port  | Operations                           |
| ------------ | ----- | ------------------------------------ |
| IdentityGrpc | 50051 | Account, Session, Device, Profile    |
| AuthGrpc     | 50052 | Permission, Role, Operator, Sanction |
| LegalGrpc    | 50053 | Consent, Document, DSR, Law Registry |

## PII Masking

```typescript
import { maskEmail, maskPhone, maskObject } from '@my-girok/nest-common';

maskEmail('user@example.com'); // "u***@example.com"
maskPhone('+821012345678'); // "+820***5678"
maskObject({ email: 'user@example.com', status: 'active' }); // Auto-detect PII
```

---

_Main: `nest-common.md`_
