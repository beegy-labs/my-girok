# 데이터베이스 정책

> goose migrations (SSOT) + Prisma ORM + ArgoCD GitOps

## 개요

이 문서는 my-girok 플랫폼의 데이터베이스 전략을 정의합니다. 우리는 **goose**를 스키마 마이그레이션을 위한 SSOT(Single Source of Truth)로 사용하며, **Prisma**를 타입-안전한 ORM 클라이언트로 사용합니다.

## 기술 스택

| 구성 요소    | 도구          | 목적                                |
| ------------ | ------------- | ----------------------------------- |
| 마이그레이션 | goose         | SQL 스키마 관리 (SSOT)              |
| ORM          | Prisma 6      | 타입-안전한 데이터베이스 클라이언트 |
| RDBMS        | PostgreSQL 16 | 주요 데이터 저장소                  |
| Analytics DB | ClickHouse    | 분석 및 감사 로그                   |
| GitOps       | ArgoCD        | PreSync 마이그레이션 실행           |

## Single Source of Truth (SSOT)

```
goose migrations/ -> SSOT for database schema
prisma/schema.prisma -> Client generation only (synced from DB)
```

**중요**: Prisma 스키마는 데이터베이스에서 파생되며, 그 반대는 아닙니다. 스키마 변경은 항상 goose를 사용하십시오.

## 데이터베이스 매핑

### PostgreSQL 서비스

| 서비스           | 개발 DB                           | 프로덕션 DB           |
| ---------------- | --------------------------------- | --------------------- |
| auth-service     | girok_auth_dev                    | girok_auth            |
| personal-service | girok_personal_dev                | girok_personal        |
| identity-service | identity_dev, auth_dev, legal_dev | identity, auth, legal |

### ClickHouse 서비스

| 서비스            | 데이터베이스 | 보존 정책        |
| ----------------- | ------------ | ---------------- |
| audit-service     | audit_db     | 5 years          |
| analytics-service | analytics_db | 90 days - 1 year |

## 프로젝트 구조

```
services/<service>/
├── migrations/                    # goose SQL migrations (SSOT)
│   ├── 20250101120000_initial.sql
│   └── 20250115140000_add_feature.sql
├── helm/
│   └── templates/
│       └── migration-job.yaml     # K8s migration job
└── prisma/
    └── schema.prisma              # Generated client schema
```

## goose 명령

### PostgreSQL

```bash
# Create new migration
goose -dir migrations create add_feature sql

# Apply migrations
goose -dir migrations postgres "$DATABASE_URL" up

# Check migration status
goose -dir migrations postgres "$DATABASE_URL" status

# Rollback last migration
goose -dir migrations postgres "$DATABASE_URL" down
```

### ClickHouse

```bash
# Apply ClickHouse migrations
goose -dir migrations clickhouse "$CLICKHOUSE_URL" up
```

## 마이그레이션 파일 형식

### PostgreSQL 예시

```sql
-- +goose Up
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    locale VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- +goose Down
DROP TABLE IF EXISTS user_preferences;
```

### ClickHouse 예시

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS analytics_db.events ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3),
    event_name LowCardinality(String),
    properties String
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, id)
TTL timestamp + INTERVAL 90 DAY;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS analytics_db.events ON CLUSTER 'my_cluster';
-- +goose StatementEnd
```

### PL/pgSQL 함수

```sql
-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## 마이그레이션 워크플로우

```
1. Create migration with goose
2. Test locally against dev database
3. Run prisma db pull to sync schema
4. Commit migration files
5. CI builds and validates
6. ArgoCD Manual Sync (PreSync hook)
7. Verify migration success
```

## Prisma 명령

```bash
# Generate Prisma client from current schema
pnpm prisma generate

# Sync schema from database (after goose migration)
pnpm prisma db pull

# Open Prisma Studio GUI
pnpm prisma studio
```

### 절대 사용 금지 명령

```bash
# DO NOT use these - goose is the SSOT
pnpm prisma migrate dev    # Creates Prisma migrations
pnpm prisma db push        # Direct schema changes
```

## 최선의 실천

| 해야 할 일                                   | 하지 말아야 할 일                                  |
| -------------------------------------------- | -------------------------------------------------- |
| 모든 스키마 변경은 goose를 사용하십시오      | prisma migrate를 사용하지 마십시오                 |
| ID에는 TEXT 타입을 사용하십시오 (PostgreSQL) | UUID 타입을 직접 사용하지 마십시오                 |
| 타임스탬프에는 TIMESTAMPTZ(6)를 사용하십시오 | 타임스탬프에 타임존 없이 사용하지 마십시오         |
| `-- +goose Down`를 항상 포함하십시오         | 기존 마이그레이션 파일을 수정하지 마십시오         |
| $ 블록에 StatementBegin/End를 사용하십시오   | DB에 대해 ArgoCD를 자동 동기화로 설정하지 마십시오 |
| ClickHouse ID에는 UUIDv7을 사용하십시오      | UUIDv4(시간 순서 없음)를 사용하지 마십시오         |

## 문제 해결

| 오류                      | 해결책                                             |
| ------------------------- | -------------------------------------------------- |
| Foreign key type mismatch | TEXT 타입을 사용하십시오, UUID를 사용하지 마십시오 |
| PL/pgSQL parsing errors   | $ 블록에 StatementBegin/End를 추가하십시오         |
| Prisma schema drift       | `pnpm prisma db pull`을 실행하십시오               |
| ClickHouse cluster error  | 마이그레이션에서 클러스터 구성을 확인하십시오      |

---

**LLM Reference**: `docs/llm/policies/DATABASE.md`
