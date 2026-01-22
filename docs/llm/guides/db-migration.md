# Database Migration

> goose + ArgoCD PreSync for zero-downtime schema evolution

## Tools

| Service               | DB         | Tool  | Location                                       |
| --------------------- | ---------- | ----- | ---------------------------------------------- |
| auth-service          | PostgreSQL | goose | services/auth-service/migrations/              |
| personal-service      | PostgreSQL | goose | services/personal-service/migrations/          |
| authorization-service | PostgreSQL | goose | services/authorization-service/migrations/     |
| audit-service         | ClickHouse | goose | services/audit-service/migrations/             |
| analytics-service     | ClickHouse | goose | services/analytics-service/migrations/         |
| identity-service      | PostgreSQL | goose | services/identity-service/migrations/postgres/ |

## ArgoCD Sync-Wave

```yaml
execution_order:
  -5: ExternalSecret (DB credentials)
  -4: ConfigMap (ClickHouse SQL files)
  -3: ServiceAccount
  -2: Migration Job
   0: Deployment (default)

critical: Migration Job MUST complete before Deployment starts
```

## Creating Migration

```bash
# Create
cd services/auth-service
goose -dir migrations create add_feature_name sql
vim migrations/YYYYMMDDHHMMSS_add_feature_name.sql

# Test locally
export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
goose -dir migrations postgres "$DATABASE_URL" up
goose -dir migrations postgres "$DATABASE_URL" status

# Sync Prisma (PostgreSQL only)
pnpm --filter @my-girok/auth-service prisma db pull
pnpm --filter @my-girok/auth-service prisma generate
```

## Deployment Flow

```yaml
1: Developer commits migration file
2: CI builds Docker image with migration
3: ArgoCD detects change
4: PreSync - ExternalSecret created (-5)
5: PreSync - Migration Job runs (-2)
6: Sync - Deployment updates (0)
7: Job auto-deleted after 5 minutes
```

## Quick Troubleshooting

| Issue                     | Solution                                       |
| ------------------------- | ---------------------------------------------- |
| Migration Job not created | Check `migration.enabled: true` in values.yaml |
| `invalid port` error      | URL-encode password special chars (%, /, :, @) |
| Job OutOfSync in ArgoCD   | Expected after TTL (300s) - Job auto-deletes   |

## Best Practices

| DO                                       | DON'T                            |
| ---------------------------------------- | -------------------------------- |
| Use `uuid_generate_v7()` for new tables  | Use UUIDv4 (random, no ordering) |
| Include `-- +goose Down` for rollback    | Skip rollback migrations         |
| Test migrations locally first            | Commit untested migrations       |
| Use `TEXT` for UUID columns (PostgreSQL) | Use `UUID` type                  |
| Use `TIMESTAMPTZ(6)` for timestamps      | Use `TIMESTAMP` without TZ       |

## Related Documentation

- **Templates & Full Troubleshooting**: `db-migration-templates.md`
- Database Policy: `../policies/database.md`
