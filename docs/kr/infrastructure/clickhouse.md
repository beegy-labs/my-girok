# ClickHouse 인프라스트럭처

> 감사 및 분석 서비스를 위한 고성능 분석 데이터베이스

## 데이터베이스

| Database       | Owner             | Purpose        | Retention  |
| -------------- | ----------------- | -------------- | ---------- |
| `audit_db`     | audit-service     | 규정 준수 로깅 | 5년        |
| `analytics_db` | analytics-service | 비즈니스 분석  | 90일 - 1년 |

## 클러스터 아키텍처

```
my_cluster (2 shards x 2 replicas)
├── Shard 1
│   ├── replica-01 (primary)
│   └── replica-02 (standby)
├── Shard 2
│   ├── replica-01 (primary)
│   └── replica-02 (standby)
└── Distributed Tables (Query Router)
```

## 스키마 파일

```
infrastructure/clickhouse/schemas/
├── 01-audit_db.sql        # Audit tables
├── 02-analytics_db.sql    # Analytics tables
└── 03-materialized_views.sql
```

## audit_db 테이블

| Table           | Purpose            | TTL | Partitioning |
| --------------- | ------------------ | --- | ------------ |
| access_logs     | API 접근 기록      | 5년 | 월별         |
| consent_history | 동의 변경 사항     | 5년 | 월별         |
| admin_actions   | 관리자 활동 감사   | 5년 | 월별         |
| data_exports    | GDPR 내보내기 추적 | 5년 | 월별         |

## analytics_db 테이블

| Table         | Purpose                     | TTL  |
| ------------- | --------------------------- | ---- |
| sessions      | 사용자 세션                 | 1년  |
| events        | 사용자 이벤트               | 90일 |
| page_views    | 페이지 뷰 + Core Web Vitals | 90일 |
| funnel_events | 퍼널 추적                   | 90일 |
| user_profiles | 집계된 사용자 데이터        | 없음 |
| errors        | 프론트엔드 오류             | 30일 |

## Materialized Views

| MV Name                | Purpose          | TTL  |
| ---------------------- | ---------------- | ---- |
| daily_session_stats_mv | 일간 세션 지표   | 1년  |
| hourly_event_counts_mv | 이벤트 빈도      | 90일 |
| page_performance_mv    | Core Web Vitals  | 90일 |
| funnel_stats_mv        | 퍼널 전환율      | 90일 |
| session_dist_device_mv | 디바이스 분포    | 90일 |
| utm_campaign_stats_mv  | 캠페인 속성 부여 | 90일 |

## Schema Patterns

```sql
-- UUIDv7 primary keys
id UUID DEFAULT generateUUIDv7()

-- LowCardinality for limited distinct values
action LowCardinality(String)       -- ~50 values
device_type LowCardinality(String)  -- desktop, mobile, tablet

-- Monthly partitioning
PARTITION BY toYYYYMM(timestamp)

-- TTL configurations
TTL timestamp + INTERVAL 90 DAY
TTL retention_until  -- Custom column-based TTL
```

## Query Builder (SQL Injection Prevention)

```typescript
import { createQueryBuilder } from '@my-girok/nest-common';

const builder = createQueryBuilder()
  .whereBetween('timestamp', startDate, endDate, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID')
  .whereIn('action', ['login', 'logout'], 'String');

const { whereClause, params } = builder.build();
const result = await clickhouse.query(sql + whereClause, params);
```

### Builder Methods

| Method            | Purpose                        |
| ----------------- | ------------------------------ |
| `where()`         | 필수 조건                      |
| `whereOptional()` | 값이 존재할 때 조건            |
| `whereIn()`       | IN 절                          |
| `whereBetween()`  | 범위 조건                      |
| `whereNull()`     | IS NULL 검사                   |
| `build()`         | `{ whereClause, params }` 반환 |

## NestJS Integration

```typescript
import { ClickHouseModule, ClickHouseService } from '@my-girok/nest-common';

@Module({
  imports: [ClickHouseModule],
})
export class AppModule {}

// Usage
await clickhouse.query<T>('SELECT * FROM t WHERE id = {id:UUID}', { id });
await clickhouse.insert('table', [{ id, data }]);
await clickhouse.batchInsert('table', largeDataset, 5000); // Auto-chunks
```

## Environment Variables

```bash
CLICKHOUSE_HOST=clickhouse.internal
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=audit_db        # or analytics_db
CLICKHOUSE_USERNAME=service_user
CLICKHOUSE_PASSWORD=secret
CLICKHOUSE_ASYNC_INSERT=true

# For audit service (guaranteed writes)
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true

# For analytics service (higher throughput)
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false

CLICKHOUSE_MAX_RETRIES=3
```

## 모니터링

| Metric          | Target | Alert  |
| --------------- | ------ | ------ |
| Query latency   | <100ms | >500ms |
| Insert latency  | <50ms  | >200ms |
| Memory usage    | <70%   | >85%   |
| Disk usage      | <80%   | >90%   |
| Replication lag | <1s    | >10s   |

### 유용한 쿼리

```sql
-- Active queries
SELECT * FROM system.processes;

-- Table sizes
SELECT database, table, formatReadableSize(sum(bytes_on_disk))
FROM system.parts WHERE active GROUP BY database, table;
```

---

**LLM Reference**: `docs/llm/infrastructure/CLICKHOUSE.md`
