# 캐싱 정책

> Valkey 기반 캐싱 전략과 Cache-Aside 패턴

## 개요

이 문서는 my-girok 플랫폼의 캐싱 전략을 정의합니다. 우리는 **Valkey**(Redis 호환 인메모리 데이터 저장소)와 **Cache-Aside** 패턴을 사용하여 데이터베이스 부하를 줄이고 응답 시간을 개선합니다.

## 기술 스택

| 구성요소     | 기술                  | 버전 |
| ------------ | --------------------- | ---- |
| 캐시 저장소  | Valkey                | 9.x  |
| NestJS 통합  | @nestjs/cache-manager | 3.x  |
| 캐시 매니저  | cache-manager         | 7.x  |
| 키-값 저장소 | keyv                  | 5.x  |
| Redis 어댑터 | @keyv/redis           | 5.x  |

## 왜 Valkey인가?

Valkey는 커뮤니티 주도 Redis 포크로, 상당한 개선을 제공합니다:

| 이점          | 가치                              |
| ------------- | --------------------------------- |
| 메모리 효율성 | 40% 감소 vs Redis OSS             |
| 확장 성능     | 클러스터 모드에서 230% 개선       |
| 비용 절감     | AWS ElastiCache에서 33% 가격 절감 |
| 호환성        | 완전한 Redis 프로토콜 호환        |

## Cache-Aside 패턴

Cache-Aside 패턴(일명 "Lazy Loading")은 우리의 주요 캐싱 전략입니다:

```
Request -> Cache HIT? -> Return cached data
              |
           MISS? -> Query DB -> Store in cache -> Return data
```

### 이점

1. **간단한 구현**: 복잡한 동기화 로직이 필요 없습니다
2. **탄력적**: 캐시가 실패해도 애플리케이션은 DB로 폴백하면서 동작합니다
3. **Lazy Loading**: 실제 요청된 데이터만 캐시합니다
4. **메모리 효율적**: 사용되지 않은 데이터는 TTL에 따라 자연스럽게 만료됩니다

### 트레이드오프

1. **첫 번째 요청 지연**: 캐시 미스 시 DB 조회 + 캐시 쓰기가 발생합니다
2. **잠재적 데이터 불일치**: TTL이 만료될 때까지 데이터가 오래될 수 있습니다
3. **번개 herd**: 동시 미스에 대해 락을 사용해 완화합니다

## 설정

```typescript
import { CacheModule } from '@nestjs/cache-manager';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const host = configService.get('VALKEY_HOST', 'localhost');
        const port = configService.get('VALKEY_PORT', 6379);
        const password = configService.get('VALKEY_PASSWORD');
        const db = configService.get('VALKEY_DB', 0);

        const authPart = password ? `:${password}@` : '';
        const redisUrl = `redis://${authPart}${host}:${port}/${db}`;

        return {
          stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
          ttl: 300000, // 5 minutes default (in milliseconds!)
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## 캐시 키 형식

모든 캐시 키는 표준화된 형식을 따릅니다:

```
{env}:{service}:{entity}:{id}
```

### 환경 접두사

| 환경        | 접두사  |
| ----------- | ------- |
| Development | dev     |
| Staging     | release |
| Production  | prod    |

### CacheKey 헬퍼

```typescript
import { CacheKey } from '@my-girok/nest-common';

// Generate cache key
CacheKey.make('auth', 'permissions', roleId);
// Output: "dev:auth:permissions:uuid"

// Generate pattern for scanning
CacheKey.pattern('auth', 'permissions', '*');
// Output: "dev:auth:permissions:*"
```

## TTL 정책

`@my-girok/nest-common`에서 표준 TTL 상수를 사용합니다:

| 상수            | TTL   | 밀리초   | 사용 사례                     |
| --------------- | ----- | -------- | ----------------------------- |
| STATIC_CONFIG   | 24h   | 86400000 | Services, OAuth configs, laws |
| SEMI_STATIC     | 15min | 900000   | Permissions, legal documents  |
| USER_DATA       | 5min  | 300000   | Preferences, resume metadata  |
| SESSION         | 30min | 1800000  | Admin/operator sessions       |
| SHORT_LIVED     | 1min  | 60000    | Rate limiting, temp tokens    |
| EPHEMERAL       | 10s   | 10000    | Real-time metrics             |
| USERNAME_LOOKUP | 2h    | 7200000  | Username → userId mapping     |
| EXPORT_STATUS   | 24h   | 86400000 | Export job tracking           |
| ANALYTICS       | 5min  | 300000   | Behavior summary              |
| FUNNEL          | 15min | 900000   | Funnel data                   |

## 서비스별 캐싱

### auth-service

| 데이터           | 키 패턴                         | TTL   | 무효화 이벤트            |
| ---------------- | ------------------------------- | ----- | ------------------------ |
| Role Permissions | auth:role_permissions:{id}      | 15min | role.permissions.updated |
| Service          | auth:service:{slug}             | 1h    | service.updated          |
| Legal Docs       | auth:legal_docs:{locale}:{type} | 30min | legal_document.published |

### personal-service

| 데이터           | 키 패턴                   | TTL  | 무효화 이벤트            |
| ---------------- | ------------------------- | ---- | ------------------------ |
| User Preferences | personal:user_prefs:{id}  | 5min | user_preferences.updated |
| Resume Metadata  | personal:resume_meta:{id} | 5min | resume.updated           |

## 캐시 무효화 전략

### 1. TTL 기반(수동)

```typescript
await this.cache.set(key, data, 900000); // Expires after 15 minutes
```

### 2. Write-Through(액티브)

```typescript
// Update DB and invalidate cache
await this.prisma.service.update({ where: { slug }, data });
await this.cache.del(`auth:service:${slug}`);
```

### 3. 패턴 기반 삭제

```typescript
const redis = (this.cache as any).store.getClient();
const keys = await redis.keys(`auth:role_permissions:${roleId}:*`);
if (keys.length) await redis.del(...keys);
```

### 4. 이벤트 기반

```typescript
// Emit event on data change
this.eventEmitter.emit('role.permissions.updated', { roleId });

// Listen and invalidate
@OnEvent('role.permissions.updated')
async handleRolePermissionsUpdated({ roleId }: { roleId: string }) {
  await this.cache.del(`auth:role_permissions:${roleId}`);
}
```

## 캐시 래퍼 유틸리티

```typescript
async getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300000
): Promise<T> {
  const cached = await this.cache.get<T>(key);
  if (cached !== undefined) return cached;

  const data = await fetcher();
  await this.cache.set(key, data, ttl);
  return data;
}
```

## 피해야 할 반패턴

| 문제                     | 해결책                                        |
| ------------------------ | --------------------------------------------- |
| Caching everything       | Only cache hot paths with high read frequency |
| No TTL set               | Always set appropriate TTL                    |
| Caching mutable entities | Cache derived/read-only data                  |
| Key collisions           | Use namespaced keys with env prefix           |
| N+1 cache calls          | Batch operations with mget/mset               |

## 모니터링 & 지표

| 지표           | 목표 | 알림 임계값 |
| -------------- | ---- | ----------- |
| Cache Hit Rate | >80% | <60%        |
| GET Latency    | <1ms | >5ms        |
| Memory Usage   | <70% | >85%        |

## 환경 변수

```bash
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=secret
VALKEY_DB=0
CACHE_DEFAULT_TTL=300000
CACHE_ENABLED=true
```

**LLM 참조**: `docs/llm/policies/CACHING.md`
