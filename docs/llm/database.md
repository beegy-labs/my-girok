# Database

goose (SSOT) + Prisma (client) + ArgoCD

## Commands

```bash
# PostgreSQL
goose -dir migrations create add_feature sql
goose -dir migrations postgres "$DATABASE_URL" up
goose -dir migrations postgres "$DATABASE_URL" status

# ClickHouse
goose -dir migrations clickhouse "$CLICKHOUSE_URL" up

# Sync Prisma
pnpm prisma db pull && pnpm prisma generate
```

## SQL Format

```sql
-- +goose Up
CREATE TABLE features (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS features;
```

## Rules

| Do                       | Don't            |
| ------------------------ | ---------------- |
| goose for ALL DBs        | `prisma migrate` |
| TEXT for PostgreSQL      | UUID type        |
| TIMESTAMPTZ(6)           | TIMESTAMP        |
| Include `-- +goose Down` | Skip rollback    |
