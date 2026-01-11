# @my-girok/nest-common

> 마이크로서비스용 공유 NestJS 유틸리티

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
@Public()       // JWT 인증 건너뛰기
@CurrentUser()  // 요청에서 인증된 사용자 가져오기
```

## Health Endpoints

| Endpoint        | Kubernetes Probe | 설명                 |
| --------------- | ---------------- | -------------------- |
| `/health`       | General          | 전체 건강 점검       |
| `/health/live`  | Liveness         | 컨테이너가 실행 중임 |
| `/health/ready` | Readiness        | 종료 중에 503 반환   |

## configureApp Options

| 옵션                   | 기본값     | 설명                      |
| ---------------------- | ---------- | ------------------------- |
| serviceName            | required   | 로그/스웨거용 서비스 이름 |
| description            | required   | Swagger API 설명          |
| defaultPort            | 3000       | HTTP 서버 포트            |
| enableSwagger          | true       | /docs에서 API 문서 활성화 |
| enableGracefulShutdown | true       | SIGTERM을 정상적으로 처리 |
| shutdownTimeout        | 30000      | 종료 타임아웃(ms)         |
| excludeFromPrefix      | ['health'] | /v1 접두어가 없는 경로    |

## Environment Variables

| 변수         | 필수 | 기본값      | 설명               |
| ------------ | ---- | ----------- | ------------------ |
| JWT_SECRET   | Yes  | -           | JWT 서명 비밀키    |
| PORT         | No   | config      | 서버 포트          |
| NODE_ENV     | No   | development | 환경               |
| CORS_ORIGINS | No   | -           | 쉼표로 구분된 출처 |

## CacheKey Helper

환경 접두어를 사용한 표준화된 캐시 키 생성:

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

| 상수            | 기간 | 사용 사례                        |
| --------------- | ---- | -------------------------------- |
| STATIC_CONFIG   | 24h  | 서비스, 권한                     |
| SEMI_STATIC     | 15m  | 법적 문서, 퍼널 설정             |
| USER_DATA       | 5m   | 사용자 선호도, 이력서 메타데이터 |
| SESSION         | 30m  | 관리자/운영자 세션               |
| SHORT_LIVED     | 1m   | 비율 제한, 임시 토큰             |
| EPHEMERAL       | 10s  | 실시간 메트릭                    |
| USERNAME_LOOKUP | 2h   | 사용자명 → userId 매핑           |
| EXPORT_STATUS   | 24h  | 내보내기 작업 추적               |

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

| 변수                             | 기본값 | 설명                |
| -------------------------------- | ------ | ------------------- |
| CLICKHOUSE_HOST                  | -      | 호스트 (필수)       |
| CLICKHOUSE_PORT                  | 8123   | HTTP 포트           |
| CLICKHOUSE_DATABASE              | -      | 데이터베이스 (필수) |
| CLICKHOUSE_USERNAME              | -      | 사용자명 (필수)     |
| CLICKHOUSE_PASSWORD              | -      | 비밀번호 (필수)     |
| CLICKHOUSE_ASYNC_INSERT          | true   | 비동기 삽입 활성화  |
| CLICKHOUSE_WAIT_FOR_ASYNC_INSERT | true   | 완료 대기           |

---

## OpenTelemetry (OTEL) SDK

**중요**: main.ts에서 가장 먼저 가져와야 함

```typescript
// main.ts - MUST BE FIRST IMPORT
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'auth-service' });

// Then other imports...
import { NestFactory } from '@nestjs/core';
```

### Configuration Options

| 옵션                 | 기본값                  | 설명                     |
| -------------------- | ----------------------- | ------------------------ |
| serviceName          | required                | 서비스 식별자            |
| otlpEndpoint         | localhost:4318          | OTLP 수집기 URL          |
| samplingRatio        | 1.0                     | 샘플링 비율 (0.0-1.0)    |
| metricExportInterval | 60000                   | 메트릭 내보내기 간격(ms) |
| ignoreEndpoints      | ['/health', '/metrics'] | 이 엔드포인트 건너뛰기   |
| disabled             | false                   | OTEL 완전 비활성화       |

### Environment Variables

| 변수                        | 기본값    | 설명            |
| --------------------------- | --------- | --------------- |
| OTEL_EXPORTER_OTLP_ENDPOINT | localhost | OTLP 엔드포인트 |
| OTEL_SDK_DISABLED           | false     | OTEL 비활성화   |
| OTEL_TRACES_SAMPLER_ARG     | 1.0       | 샘플링 비율     |
| OTEL_METRIC_EXPORT_INTERVAL | 60000     | 메트릭 간격     |
| SERVICE_VERSION             | 0.0.0     | 서비스 버전     |

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

- 자동으로 마스킹되는 필드: password, token, secret, apiKey, ssn, email, phone, creditCard 등 (100+ 패턴)
- 보안: Unicode 정규화, ANSI 이스케이프 제거, 제어 문자 제거
- 출력: OTEL 트레이스 상관관계가 포함된 ECS 8.11.0 호환 JSON

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

| 티어           | 제한 | TTL | 사용 사례          |
| -------------- | ---- | --- | ------------------ |
| STANDARD       | 100  | 60s | 기본 엔드포인트    |
| AUTH           | 10   | 60s | 로그인/등록        |
| HIGH_FREQUENCY | 1000 | 60s | 공개 읽기 API      |
| WRITE_HEAVY    | 30   | 60s | 생성/업데이트 작업 |
| ADMIN          | 500  | 60s | 관리자 API         |
| PUBLIC         | 50   | 60s | 비인증 엔드포인트  |

### Circuit Breaker

CLOSED → OPEN (5 실패) → HALF-OPEN (30초 재설정)

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

### 전파 모드

| 전파 모드     | 동작                                        |
| ------------- | ------------------------------------------- |
| required      | 기존 트랜잭션에 참여하거나 새로 생성 (기본) |
| requires_new  | 항상 새 트랜잭션, 기존 트랜잭션 일시 중지   |
| supports      | 존재하면 참여, 없으면 비트랜잭션            |
| mandatory     | 트랜잭션이 없으면 오류                      |
| never         | 트랜잭션이 있으면 오류                      |
| not_supported | 기존 트랜잭션 일시 중지, 비트랜잭션 실행    |

### Configuration Options

| 옵션           | 기본값        | 설명                  |
| -------------- | ------------- | --------------------- |
| timeout        | 30000         | 트랜잭션 타임아웃(ms) |
| isolationLevel | ReadCommitted | 격리 수준             |
| maxRetries     | 3             | 재시도 횟수           |
| retryDelay     | 100           | 백오프 기본 지연      |
| enableTracing  | true          | OTEL 스팬 생성        |

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

| 클라이언트   | 포트  | 연산                                 |
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

| 변수               | 기본값    | 설명                   |
| ------------------ | --------- | ---------------------- |
| IDENTITY_GRPC_HOST | localhost | Identity 서비스 호스트 |
| IDENTITY_GRPC_PORT | 50051     | Identity 서비스 포트   |
| AUTH_GRPC_HOST     | localhost | Auth 서비스 호스트     |
| AUTH_GRPC_PORT     | 50052     | Auth 서비스 포트       |
| LEGAL_GRPC_HOST    | localhost | Legal 서비스 호스트    |
| LEGAL_GRPC_PORT    | 50053     | Legal 서비스 포트      |

---

## PII Masking

```typescript
import { maskEmail, maskPhone, maskObject } from '@my-girok/nest-common';

maskEmail('user@example.com'); // "u***@example.com"
maskPhone('+821012345678'); // "+820***5678"
maskObject({ email: 'user@example.com', status: 'active' });
```

### Available Functions

| 함수           | 출력 예시               |
| -------------- | ----------------------- |
| maskEmail      | u\*\*\*@example.com     |
| maskPhone      | +820\*\*\*5678          |
| maskIpAddress  | 192.168.x.x             |
| maskName       | J*** D*** / Kim\*\*     |
| maskUuid       | 0193\*\*\*\*890a        |
| maskCreditCard | 4111-\***\*-\*\***-1111 |
| maskBirthDate  | 1990-**-**              |
| maskObject     | 자동으로 PII 필드 감지  |

LLM Reference: `docs/llm/packages/nest-common.md`
