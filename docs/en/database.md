# Database

> goose (SSOT) + Prisma (client) + ArgoCD for database migrations

## Overview

The project uses goose as the single source of truth for database migrations across PostgreSQL and ClickHouse. Prisma is used only as the database client after pulling the schema.

## Commands

### PostgreSQL Commands

```bash
# PostgreSQL
goose -dir migrations create add_feature sql
goose -dir migrations postgres "$DATABASE_URL" up
goose -dir migrations postgres "$DATABASE_URL" status
```

### ClickHouse Commands

```bash
# ClickHouse
goose -dir migrations clickhouse "$CLICKHOUSE_URL" up
```

### Prisma Sync

After applying goose migrations, sync Prisma client:

```bash
# Sync Prisma
pnpm prisma db pull && pnpm prisma generate
```

## SQL Format

All migration files must include both Up and Down sections:

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

**Detailed Guidelines**:

- **goose for ALL DBs**: Use goose for PostgreSQL, ClickHouse, and any other database. Never use Prisma migrations.
- **TEXT for PostgreSQL**: Store UUIDs as TEXT type. While PostgreSQL has a native UUID type, TEXT provides better compatibility and simpler debugging.
- **TIMESTAMPTZ(6)**: Always use TIMESTAMPTZ with 6 decimal places for microsecond precision. Never use TIMESTAMP without timezone.
- **Include `-- +goose Down`**: Every migration must have a rollback section. This ensures deployments can be safely reverted.

## Migration Workflow

1. Create the migration file with goose
2. Write both Up and Down SQL
3. Test the migration locally
4. Apply with goose
5. Sync Prisma client with `db pull` and `generate`
6. Commit the migration file

---

**LLM Reference**: `docs/llm/database.md`
