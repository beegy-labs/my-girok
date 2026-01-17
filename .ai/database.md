# Database Quick Reference

> goose (MIT, zero cost) + Prisma (TypeScript types) + ArgoCD | **Last Updated**: 2026-01-17

## Databases

| Service               | Dev DB               | Type       |
| --------------------- | -------------------- | ---------- |
| auth-service          | girok_auth_dev       | PostgreSQL |
| personal-service      | girok_personal_dev   | PostgreSQL |
| authorization-service | authorization_db_dev | PostgreSQL |
| audit-service         | audit_db_dev         | ClickHouse |
| analytics-service     | analytics_db_dev     | ClickHouse |

## Commands

```bash
# Create migration
goose -dir migrations create add_feature sql

# Run migrations (auto in ArgoCD PreSync)
goose -dir migrations postgres "$DATABASE_URL" up

# Sync Prisma after migration
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

**SSOT**:

- **Migration Strategy**: `docs/llm/policies/database-migration-strategy.md` (2026 decision: goose vs Atlas/Liquibase)
- Policy: `docs/llm/policies/database.md`
- Migration Guide: `docs/llm/guides/db-migration.md`
- **Troubleshooting**: `docs/llm/guides/migration-troubleshooting.md`
