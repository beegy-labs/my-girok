# Database Quick Reference

## Environment Structure

```
Development:  dev_girok_user       (develop branch)
Staging:      staging_girok_user   (release/* branch)
Production:   girok_user           (main branch)
```

## Connection Strings

```bash
# Development
DATABASE_URL="postgresql://dev_girok_user:password@host:5432/dev_girok_user"

# Staging
DATABASE_URL="postgresql://staging_girok_user:password@host:5432/staging_girok_user"

# Production
DATABASE_URL="postgresql://girok_user:password@host:5432/girok_user"
```

## Migration Strategy

**ALL environments: Manual migrations only (for team collaboration safety)**

**Development:**
```bash
# Create migration locally
pnpm prisma migrate dev --name my_migration

# Commit to Git
git add prisma/migrations
git commit -m "feat: add migration"

# Apply to server (after deployment)
kubectl run migration-dev \
  --image=harbor.girok.dev/my-girok/auth-service:develop:latest \
  --restart=Never \
  --namespace=my-girok-dev \
  --env="DATABASE_URL=..." \
  --command -- pnpm prisma migrate deploy
```

**Staging:**
```bash
# Manual execution before release deployment
kubectl run migration-staging \
  --image=harbor.girok.dev/my-girok/auth-service:release:latest \
  --restart=Never \
  --namespace=my-girok-staging \
  --env="DATABASE_URL=..." \
  --command -- pnpm prisma migrate deploy
```

**Production:**
```bash
# 1. Backup first (REQUIRED!)
pg_dump ... > backup.sql

# 2. Apply migration
kubectl run migration-prod \
  --image=harbor.girok.dev/my-girok/auth-service:latest \
  --restart=Never \
  --namespace=my-girok-prod \
  --env="DATABASE_URL=..." \
  --command -- pnpm prisma migrate deploy
```

## Data Sync

**Staging ← Production (Weekly)**
```bash
# Automated script
./scripts/sync-staging-db.sh

# Cron: Sunday 3am
0 3 * * 0 /path/to/sync-staging-db.sh
```

## Common Commands

```bash
# Check migration status
pnpm prisma migrate status

# Apply migrations
pnpm prisma migrate deploy

# Reset database (dev only!)
pnpm prisma migrate reset

# Studio (GUI)
pnpm prisma studio

# Generate client
pnpm prisma generate
```

## Collaboration Tips

**Avoid migration conflicts:**
1. Always update develop before working
2. Create migrations in feature branches
3. Rebase before merging PR
4. Regenerate migration if conflicts occur

**PR Review Checklist:**
- [ ] Migration files included?
- [ ] No data loss potential?
- [ ] Indexes added where needed?
- [ ] Can be rolled back?

## Best Practices

✅ **DO:**
- Manual migrations in all environments
- Backup before migration
- Test in staging first
- Mask sensitive data
- Commit migrations to Git

❌ **DON'T:**
- Auto-migrate (team collaboration risk)
- Copy prod data without masking
- Skip staging tests
- Change migration order

## See Also

- **[Full Guide](../docs/DATABASE.md)** - Complete database documentation
- **[Sync Script](../scripts/sync-staging-db.sh)** - Staging sync automation
