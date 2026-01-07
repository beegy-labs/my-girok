# Database Policy

> goose migrations (SSOT) + Prisma ORM + ArgoCD GitOps

## Overview

This document defines the database strategy for the my-girok platform. We use **goose** for schema migrations as the Single Source of Truth (SSOT), with **Prisma** as a type-safe ORM client.

## Technology Stack

| Component    | Tool          | Purpose                      |
| ------------ | ------------- | ---------------------------- |
| Migration    | goose         | SQL schema management (SSOT) |
| ORM          | Prisma 6      | Type-safe database client    |
| RDBMS        | PostgreSQL 16 | Primary data store           |
| Analytics DB | ClickHouse    | Analytics and audit logs     |
| GitOps       | ArgoCD        | PreSync migration execution  |

## Single Source of Truth (SSOT)

```
goose migrations/ -> SSOT for database schema
prisma/schema.prisma -> Client generation only (synced from DB)
```

**Important**: Prisma schema is derived from the database, not the other way around. Always use goose for schema changes.

## Database Mapping

### PostgreSQL Services

| Service          | Development DB                    | Production DB         |
| ---------------- | --------------------------------- | --------------------- |
| auth-service     | girok_auth_dev                    | girok_auth            |
| personal-service | girok_personal_dev                | girok_personal        |
| identity-service | identity_dev, auth_dev, legal_dev | identity, auth, legal |

### ClickHouse Services

| Service           | Database     | Retention Policy |
| ----------------- | ------------ | ---------------- |
| audit-service     | audit_db     | 5 years          |
| analytics-service | analytics_db | 90 days - 1 year |

## Project Structure

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

## goose Commands

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

## Migration File Format

### PostgreSQL Example

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

### ClickHouse Example

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

### PL/pgSQL Functions

```sql
-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## Migration Workflow

```
1. Create migration with goose
2. Test locally against dev database
3. Run prisma db pull to sync schema
4. Commit migration files
5. CI builds and validates
6. ArgoCD Manual Sync (PreSync hook)
7. Verify migration success
```

## Prisma Commands

```bash
# Generate Prisma client from current schema
pnpm prisma generate

# Sync schema from database (after goose migration)
pnpm prisma db pull

# Open Prisma Studio GUI
pnpm prisma studio
```

### Commands to NEVER Use

```bash
# DO NOT use these - goose is the SSOT
pnpm prisma migrate dev    # Creates Prisma migrations
pnpm prisma db push        # Direct schema changes
```

## Best Practices

| DO                                   | DO NOT                          |
| ------------------------------------ | ------------------------------- |
| Use goose for ALL schema changes     | Use prisma migrate              |
| Use TEXT type for IDs (PostgreSQL)   | Use UUID type directly          |
| Use TIMESTAMPTZ(6) for timestamps    | Use TIMESTAMP without timezone  |
| Always include `-- +goose Down`      | Modify existing migration files |
| Use StatementBegin/End for $$ blocks | Set ArgoCD to auto-sync for DB  |
| Use UUIDv7 for ClickHouse IDs        | Use UUIDv4 (no time-ordering)   |

## Troubleshooting

| Error                     | Solution                                 |
| ------------------------- | ---------------------------------------- |
| Foreign key type mismatch | Use TEXT type, not UUID                  |
| PL/pgSQL parsing errors   | Add StatementBegin/End around $$ blocks  |
| Prisma schema drift       | Run `pnpm prisma db pull`                |
| ClickHouse cluster error  | Check cluster configuration in migration |

---

**LLM Reference**: `docs/llm/policies/DATABASE.md`
