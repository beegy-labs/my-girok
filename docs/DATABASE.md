# Database Management Guide

Complete guide for database setup, migrations, and management across environments.

## Table of Contents

- [Database Structure](#database-structure)
- [Database Setup](#database-setup)
- [Migration Strategy](#migration-strategy)
- [Data Synchronization](#data-synchronization)
- [Collaboration Guidelines](#collaboration-guidelines)
- [Backup & Restore](#backup--restore)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Database Structure

### Three-Tier Environment

```
┌─────────────┬──────────────────────┬──────────────────────────────────┐
│ Environment │ Database             │ Purpose                          │
├─────────────┼──────────────────────┼──────────────────────────────────┤
│ Development │ dev_girok_user       │ Dev/Testing/Free experimentation │
│ Staging     │ staging_girok_user   │ QA/Migration verification        │
│ Production  │ girok_user           │ Live production service          │
└─────────────┴──────────────────────┴──────────────────────────────────┘
```

### Git Branch → Database Mapping

| Git Branch | Database | Namespace | Manual Migration |
|------------|----------|-----------|------------------|
| `develop` | `dev_girok_user` | my-girok-dev | ✅ Required |
| `release/*` | `staging_girok_user` | my-girok-staging | ✅ Required |
| `main` | `girok_user` | my-girok-prod | ✅ Required |

**Note**: All migrations are manual for team collaboration safety.

## Database Setup

### PostgreSQL Installation

#### Option A: Docker (Development)

```bash
# Development DB
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=dev_girok_user \
  -e POSTGRES_USER=dev_girok_user \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  postgres:16

# Staging DB (separate instance or different port on same server)
docker run -d \
  --name postgres-staging \
  -e POSTGRES_DB=staging_girok_user \
  -e POSTGRES_USER=staging_girok_user \
  -e POSTGRES_PASSWORD=staging_password \
  -p 5433:5432 \
  postgres:16

# Production DB (separate server recommended)
docker run -d \
  --name postgres-prod \
  -e POSTGRES_DB=girok_user \
  -e POSTGRES_USER=girok_user \
  -e POSTGRES_PASSWORD=prod_password \
  -p 5434:5432 \
  postgres:16
```

#### Option B: Native PostgreSQL

```sql
-- Development Database
CREATE DATABASE dev_girok_user;
CREATE USER dev_girok_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE dev_girok_user TO dev_girok_user;

-- Staging Database
CREATE DATABASE staging_girok_user;
CREATE USER staging_girok_user WITH PASSWORD 'staging_password';
GRANT ALL PRIVILEGES ON DATABASE staging_girok_user TO staging_girok_user;

-- Production Database
CREATE DATABASE girok_user;
CREATE USER girok_user WITH PASSWORD 'prod_password';
GRANT ALL PRIVILEGES ON DATABASE girok_user TO girok_user;
```

#### Option C: Managed Service (Recommended for Production)

**AWS RDS:**
```
Development:  dev-girok.xxxxx.rds.amazonaws.com
Staging:      staging-girok.xxxxx.rds.amazonaws.com
Production:   prod-girok.xxxxx.rds.amazonaws.com
```

**Features**: PostgreSQL 16, Multi-AZ, Automated Backups

### Connection Strings

```bash
# Development
DATABASE_URL="postgresql://dev_girok_user:dev_password@localhost:5432/dev_girok_user?schema=public"

# Staging
DATABASE_URL="postgresql://staging_girok_user:staging_password@localhost:5433/staging_girok_user?schema=public"

# Production
DATABASE_URL="postgresql://girok_user:prod_password@localhost:5434/girok_user?schema=public"
```

## Migration Strategy

**All environments require manual migrations for team collaboration safety.**

### Development Environment

**Create migration locally:**
```bash
cd services/auth-service

# 1. Modify schema (edit prisma/schema.prisma)

# 2. Generate migration
pnpm prisma migrate dev --name add_user_profile

# 3. Commit to Git
git add prisma/migrations
git commit -m "feat: add user profile migration"
git push
```

**Apply migration to server:**
```bash
# Run manually after deployment
kubectl run migration-dev \
  --image=harbor.girok.dev/my-girok/auth-service:develop:latest \
  --restart=Never \
  --namespace=my-girok-dev \
  --env="DATABASE_URL=postgresql://dev_girok_user:xxx@db-host:5432/dev_girok_user" \
  --command -- pnpm prisma migrate deploy

# Check logs
kubectl logs -f migration-dev -n my-girok-dev

# Delete after success
kubectl delete pod migration-dev -n my-girok-dev
```

**Quick prototyping (local only):**
```bash
# Apply immediately without migration file (Warning: local dev only!)
pnpm prisma db push
```

### Staging Environment

**Manual migration before release deployment:**

```bash
# 1. When creating release branch
git checkout -b release/v1.0.0

# 2. Apply migration to staging DB (manual)
kubectl run migration-staging \
  --image=harbor.girok.dev/my-girok/auth-service:release:latest \
  --restart=Never \
  --namespace=my-girok-staging \
  --env="DATABASE_URL=postgresql://staging_girok_user:xxx@staging-db:5432/staging_girok_user" \
  --command -- pnpm prisma migrate deploy

# 3. Check logs
kubectl logs -f migration-staging -n my-girok-staging

# 4. Delete after success
kubectl delete pod migration-staging -n my-girok-staging

# 5. Deploy application to staging (ArgoCD)
# 6. QA testing
```

**Rollback on failure:**
```bash
# Rollback migration
pnpm prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
psql -h staging-db -U staging_girok_user staging_girok_user < backup.sql
```

### Production Environment

**Very careful manual migration:**

```bash
# 1. Complete testing in staging

# 2. Backup production DB (REQUIRED!)
pg_dump -h prod-db -U girok_user girok_user > prod_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Apply migration
kubectl run migration-prod \
  --image=harbor.girok.dev/my-girok/auth-service:latest \
  --restart=Never \
  --namespace=my-girok-prod \
  --env="DATABASE_URL=postgresql://girok_user:xxx@prod-db:5432/girok_user" \
  --command -- pnpm prisma migrate deploy

# 4. Check logs thoroughly
kubectl logs -f migration-prod -n my-girok-prod

# 5. Delete after verification
kubectl delete pod migration-prod -n my-girok-prod

# 6. Deploy production application (ArgoCD or manual)

# 7. Monitor for errors and performance
```

## Data Synchronization

### Staging ← Production (Weekly Recommended)

#### Automated Sync Script

Located at `scripts/sync-staging-db.sh`:

```bash
#!/bin/bash
# Syncs production data to staging with masking
# Run weekly: Sunday 3am recommended

./scripts/sync-staging-db.sh
```

**Features:**
- Dumps production database
- Masks sensitive data (emails, names, tokens)
- Restores to staging
- Verifies data integrity
- Cleans up old backups

#### Cron Job Setup

```bash
# Run every Sunday at 3am
0 3 * * 0 /path/to/scripts/sync-staging-db.sh >> /var/log/db-sync.log 2>&1
```

#### Data Masking

The script automatically masks:
- User emails: `user_<id>@test.example.com`
- User names: `Test User <id>`
- Provider IDs: `masked_<id>`
- Refresh tokens: Replaced with random hash
- OAuth secrets: `masked_secret_<id>`

#### Manual Sync

```bash
# Set environment variables
export PROD_DB_HOST="prod-db.example.com"
export PROD_DB_USER="girok_user"
export STAGING_DB_HOST="staging-db.example.com"
export STAGING_DB_USER="staging_girok_user"

# Run sync
./scripts/sync-staging-db.sh
```

## Collaboration Guidelines

### Migration Workflow for Teams

**Developer A creates migration:**
```bash
# 1. Update develop branch
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/add-user-profile

# 3. Modify schema
# Edit prisma/schema.prisma

# 4. Generate migration
cd services/auth-service
pnpm prisma migrate dev --name add_user_profile

# 5. Commit to Git
git add .
git commit -m "feat: add user profile fields to User model"
git push origin feature/add-user-profile

# 6. Create Pull Request
# Create PR on GitHub → develop
```

**Developer B works on different migration simultaneously:**
```bash
# 1. Pull latest develop
git checkout develop
git pull origin develop

# 2. Create different feature branch
git checkout -b feature/add-oauth-provider

# 3. Modify schema & generate migration
pnpm prisma migrate dev --name add_oauth_provider_table

# 4. Commit & create PR
```

**Resolving migration conflicts:**
```bash
# When PR has migration conflicts

# 1. Update develop
git checkout develop
git pull origin develop

# 2. Go back to feature branch and rebase
git checkout feature/my-feature
git rebase develop

# 3. Regenerate migration if needed
cd services/auth-service
rm -rf prisma/migrations/<my-migration>
pnpm prisma migrate dev --name my_migration_new

# 4. Push again
git add .
git commit -m "fix: regenerate migration after rebase"
git push origin feature/my-feature --force
```

### Migration Review Checklist

When reviewing PRs, check:
- [ ] Migration files are included
- [ ] Migration name is clear and descriptive
- [ ] No data loss potential
- [ ] Indexes added for queried fields
- [ ] Foreign key constraints are correct
- [ ] Rollback is possible (if needed)
- [ ] Migration tested locally

## Backup & Restore

### Automated Backups

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="/backups/postgresql"
RETENTION_DAYS=30

# Development (daily)
pg_dump -h dev-db -U dev_girok_user dev_girok_user | \
  gzip > ${BACKUP_DIR}/dev_$(date +%Y%m%d).sql.gz

# Staging (daily)
pg_dump -h staging-db -U staging_girok_user staging_girok_user | \
  gzip > ${BACKUP_DIR}/staging_$(date +%Y%m%d).sql.gz

# Production (hourly)
pg_dump -h prod-db -U girok_user girok_user | \
  gzip > ${BACKUP_DIR}/prod_$(date +%Y%m%d_%H%M).sql.gz

# Delete old backups
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
```

### Restore from Backup

```bash
# Restore from gzipped backup
gunzip < backup.sql.gz | psql -h db-host -U user database

# Restore from plain SQL
psql -h db-host -U user database < backup.sql
```

## Best Practices

### 1. Migration Safety

✅ **DO:**
- Always backup before migration
- Test in staging first
- Run migrations manually
- Keep migration history in Git
- Review migration PRs carefully
- Use descriptive migration names

❌ **DON'T:**
- Auto-migrate production (team collaboration risk)
- Skip staging tests
- Modify existing migrations
- Delete migration files
- Change migration order

### 2. Data Security

✅ **DO:**
- Mask sensitive data in non-production
- Use SSL/TLS connections
- Use strong passwords
- Regular security updates
- Rotate credentials periodically

❌ **DON'T:**
- Copy production data without masking
- Use plain text passwords
- Expose database to public network
- Share production credentials

### 3. Performance

✅ **DO:**
- Optimize indexes
- Use connection pooling
- Regular VACUUM operations
- Monitor query performance
- Set appropriate resource limits

❌ **DON'T:**
- Over-index (slows writes)
- Skip maintenance
- Use SELECT * in production
- Ignore slow query warnings

### 4. Monitoring

```bash
# Connection count
SELECT count(*) FROM pg_stat_activity;

# Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

# Database size
SELECT pg_size_pretty(pg_database_size('girok_user'));

# Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Troubleshooting

### Migration Failed

```bash
# Check migration status
pnpm prisma migrate status

# Mark migration as applied
pnpm prisma migrate resolve --applied <migration-name>

# Mark migration as rolled back
pnpm prisma migrate resolve --rolled-back <migration-name>

# Reset database (development only!)
pnpm prisma migrate reset
```

### Connection Issues

```bash
# Test connection
psql -h db-host -U user -d database -c "SELECT 1"

# Check connection limit
SELECT max_connections FROM pg_settings WHERE name = 'max_connections';

# Check current connections
SELECT count(*) FROM pg_stat_activity;

# Kill stuck connection
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
AND datname = 'your_database';
```

### Performance Issues

```bash
# Enable slow query log
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 second
SELECT pg_reload_conf();

# Check locks
SELECT * FROM pg_locks WHERE NOT granted;

# Check blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Data Consistency Issues

```bash
# Check for inconsistencies
pnpm prisma validate

# Regenerate Prisma client
pnpm prisma generate

# Compare schema with database
pnpm prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma
```

## Resources

- **Prisma Migrations**: https://www.prisma.io/docs/concepts/components/prisma-migrate
- **PostgreSQL Backup**: https://www.postgresql.org/docs/current/backup.html
- **PostgreSQL Performance**: https://www.postgresql.org/docs/current/performance-tips.html
- **Data Masking**: https://postgresql-anonymizer.readthedocs.io/

## Support

For database issues:
- Check migration status: `pnpm prisma migrate status`
- View application logs: `kubectl logs <pod-name> -n <namespace>`
- Check PostgreSQL logs
- GitHub Issues: https://github.com/your-org/my-girok/issues
