# Database Quick Reference

> goose (SSOT) + Prisma (client) + ArgoCD

## Stack

| Component  | Tool          | Purpose            |
| ---------- | ------------- | ------------------ |
| Migration  | goose (MIT)   | Schema versioning  |
| ORM        | Prisma 6      | Client generation  |
| PostgreSQL | PostgreSQL 16 | Primary data store |
| ClickHouse | ClickHouse    | Analytics & Audit  |

## SSOT Principle

**goose is the Single Source of Truth for ALL database schemas.**

```
migrations/ (goose SQL)  →  Docker Image  →  ArgoCD PreSync  →  App Deploy
                                                  ↓
                                           prisma db pull
```

## Commands

### PostgreSQL

```bash
goose -dir migrations create add_feature sql   # Create
goose -dir migrations postgres "$DATABASE_URL" up      # Apply
goose -dir migrations postgres "$DATABASE_URL" status  # Status
goose -dir migrations postgres "$DATABASE_URL" down    # Rollback

pnpm prisma db pull && pnpm prisma generate    # Sync Prisma
```

### ClickHouse

```bash
goose -dir migrations clickhouse "$CLICKHOUSE_URL" up
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

| Do                        | Don't                |
| ------------------------- | -------------------- |
| Use goose for ALL DBs     | Use `prisma migrate` |
| Use TEXT for PostgreSQL   | Use UUID type        |
| Use TIMESTAMPTZ(6)        | Use TIMESTAMP        |
| Include `-- +goose Down`  | Skip down migration  |
| Use UUIDv7 for ClickHouse | Use UUIDv4           |

## Databases

| Service   | Dev DB             | Prod DB        |
| --------- | ------------------ | -------------- |
| identity  | identity_dev       | identity       |
| auth      | auth_dev           | auth           |
| legal     | legal_dev          | legal          |
| personal  | girok_personal_dev | girok_personal |
| audit     | audit_db           | audit_db       |
| analytics | analytics_db       | analytics_db   |

---

**Full guide**: `docs/policies/DATABASE.md`
