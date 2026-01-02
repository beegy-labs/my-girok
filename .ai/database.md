# Database Quick Reference

> goose (SSOT) + Prisma (client) + ArgoCD

## Stack

| Component  | Tool          | Purpose                  |
| ---------- | ------------- | ------------------------ |
| Migration  | goose (MIT)   | Schema versioning (SSOT) |
| ORM        | Prisma 6      | Client generation only   |
| PostgreSQL | PostgreSQL 16 | Primary data store       |
| ClickHouse | ClickHouse    | Analytics & Audit        |

## SSOT Principle

**goose is the Single Source of Truth for ALL database schemas (PostgreSQL + ClickHouse).**

```
migrations/ (goose SQL)  →  Docker Image  →  ArgoCD PreSync  →  App Deploy
                                                  ↓
                                           prisma db pull (PostgreSQL only)
```

## File Structure

```
services/<service>/
├── migrations/              # goose SQL (SSOT)
│   └── 20251231000000_*.sql
└── prisma/schema.prisma     # Client only (PostgreSQL)
```

## Commands

### PostgreSQL

```bash
# Create migration
goose -dir migrations create add_feature sql

# Apply
goose -dir migrations postgres "$DATABASE_URL" up

# Status
goose -dir migrations postgres "$DATABASE_URL" status

# Rollback
goose -dir migrations postgres "$DATABASE_URL" down

# Sync Prisma (after goose)
pnpm prisma db pull && pnpm prisma generate
```

### ClickHouse

```bash
# Apply
goose -dir migrations clickhouse "$CLICKHOUSE_URL" up

# Status
goose -dir migrations clickhouse "$CLICKHOUSE_URL" status
```

## SQL Format

### PostgreSQL

```sql
-- +goose Up
CREATE TABLE features (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS features;
```

### ClickHouse

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS db.table ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3)
) ENGINE = ReplicatedMergeTree(...)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS db.table ON CLUSTER 'my_cluster';
-- +goose StatementEnd
```

## Best Practices

| Do                        | Don't                    |
| ------------------------- | ------------------------ |
| Use goose for ALL DBs     | Use `prisma migrate`     |
| Use TEXT for PostgreSQL   | Use UUID type            |
| Use UUIDv7 for ClickHouse | Use UUIDv4               |
| Use TIMESTAMPTZ(6)        | Use TIMESTAMP            |
| Include `-- +goose Down`  | Skip down migration      |
| Manual Sync in ArgoCD     | Auto-sync for DB changes |

## Databases

### PostgreSQL

| Service          | Database (dev / prod)               |
| ---------------- | ----------------------------------- |
| auth-service     | girok_auth_dev / girok_auth         |
| personal-service | girok_personal_dev / girok_personal |
| identity-service | identity_dev / identity             |
|                  | auth_dev / auth                     |
|                  | legal_dev / legal                   |

### ClickHouse

| Service           | Database     | Retention |
| ----------------- | ------------ | --------- |
| audit-service     | audit_db     | 5 years   |
| analytics-service | analytics_db | 90d ~ 1y  |

---

**Full guide**: `docs/policies/DATABASE.md`
