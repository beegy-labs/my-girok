# Database Quick Reference

> goose (MIT) + Prisma + ArgoCD | **Last Updated**: 2026-01-17

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
# Create
goose -dir migrations create add_feature sql

# Migrate (auto in ArgoCD PreSync)
goose -dir migrations postgres "$DATABASE_URL" up

# Sync Prisma
pnpm prisma db pull && pnpm prisma generate
```

## Rules

| Do                                                          | Don't                                 |
| ----------------------------------------------------------- | ------------------------------------- |
| goose for ALL DBs, UUID type (UUIDv7), TIMESTAMPTZ(6)       | `prisma migrate`, TEXT IDs, TIMESTAMP |
| App-generated ID: `ID.generate()`, Include `-- +goose Down` | DB DEFAULT for ID, Skip rollback      |

**ID Policy**: Use `ID.generate()` from `@my-girok/nest-common` (UUIDv7), DB column type: `UUID`

**SSOT**: `docs/llm/policies/database.md`, `docs/llm/guides/db-migration.md`, `docs/llm/guides/migration-troubleshooting.md`
