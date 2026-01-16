# Migration Troubleshooting Guide

> Common migration issues, root causes, and solutions

## Critical Issue: goose_db_version Desynchronization

### Symptom

Migration job fails with errors like:

```
ERROR: type "tenant_type" already exists (SQLSTATE 42710)
ERROR: relation "legal_entities" already exists (SQLSTATE 42P07)
```

Despite the database schema already containing these objects, goose attempts to create them again.

### Root Cause Analysis

**What Happened:**

The `goose_db_version` table was out of sync with the actual database state. Specifically:

- **goose_db_version records**: Only 2 migrations recorded (20251220, 20251221)
- **Actual database schema**: Contained objects from 25+ later migrations (20251224 through 20260108000001)

**How This Happened:**

One of the following scenarios occurred:

1. **Prisma Migrate was used** instead of goose (violates SSOT policy)
2. **Manual SQL execution** was performed directly on the database
3. **Schema import** from another environment bypassed goose tracking
4. **goose_db_version table was truncated** or corrupted

**Why It Matters:**

goose uses the `goose_db_version` table as its source of truth for tracking applied migrations. When this table is desynchronized:

- goose thinks migrations haven't been applied yet
- goose tries to run them again
- Database rejects duplicate object creation
- Migration job fails, blocking deployments

### Impact

- **Immediate**: Migration job fails, preventing ArgoCD sync
- **Deployment**: Cannot deploy new application versions (sync-wave 0 blocked by failed sync-wave -2)
- **Development**: Cannot apply new migrations on top of broken state
- **Trust**: Migration history is unreliable

### Prevention

**DO:**

- ✅ Always use goose for ALL schema changes
- ✅ Never run SQL directly on production/release databases
- ✅ Use `prisma db pull` ONLY to sync client schema after goose migrations
- ✅ Verify `goose status` after each migration
- ✅ Monitor migration job logs in ArgoCD

**DO NOT:**

- ❌ Never use `prisma migrate dev` or `prisma db push` (violates goose SSOT)
- ❌ Never execute schema SQL manually outside of goose
- ❌ Never import schemas without corresponding goose migrations
- ❌ Never modify `goose_db_version` table manually (except for recovery)

### Solution Options

When goose_db_version is desynchronized, you have several options:

#### Option 1: Synchronize goose_db_version (RECOMMENDED)

**Best for**: Production environments where actual schema is correct.

Create a sync migration that backfills missing records in goose_db_version:

```sql
-- +goose Up
-- Sync goose_db_version with actual DB state
-- CRITICAL: This file MUST have timestamp BEFORE pending migrations
-- Example: If pending migrations start at 20251224, this should be 20251223

-- +goose StatementBegin
DO $$
DECLARE
  v_version_id BIGINT;
BEGIN
  FOR v_version_id IN
    SELECT unnest(ARRAY[
      -- List ALL missing migration version_ids here
      20251224000000,
      20251226000000,
      20251226000001
      -- ... add all missing versions
    ])
  LOOP
    IF NOT EXISTS (SELECT 1 FROM goose_db_version WHERE version_id = v_version_id) THEN
      INSERT INTO goose_db_version (version_id, is_applied, tstamp)
      VALUES (v_version_id, TRUE, NOW());
    END IF;
  END LOOP;
END $$;
-- +goose StatementEnd

-- +goose Down
DELETE FROM goose_db_version WHERE version_id IN (
  20251224000000,
  20251226000000,
  20251226000001
  -- ... same list as above
);
```

**Key Requirements:**

1. **Timestamp**: Must be BEFORE pending migrations (e.g., 20251223 if pending start at 20251224)
2. **PL/pgSQL Wrapper**: Required because `ON CONFLICT` needs unique constraint (which goose_db_version may not have)
3. **StatementBegin/End**: Required for PL/pgSQL blocks
4. **Idempotency**: Uses `IF NOT EXISTS` to safely retry

**Pros:**

- ✅ Preserves actual database state
- ✅ Minimal downtime
- ✅ Reversible (via Down migration)
- ✅ Documents what was synchronized

**Cons:**

- ❌ Doesn't verify if schema truly matches migrations
- ❌ Requires manual identification of missing versions

#### Option 2: Drop and Recreate Database

**Best for**: Development environments where data loss is acceptable.

```bash
# Backup first (if needed)
pg_dump -h $HOST -U $USER $DATABASE > backup.sql

# Drop and recreate
psql -h $HOST -U $USER -c "DROP DATABASE $DATABASE;"
psql -h $HOST -U $USER -c "CREATE DATABASE $DATABASE;"

# Run all migrations from scratch
goose -dir migrations postgres "$DATABASE_URL" up
```

**Pros:**

- ✅ Clean state guaranteed
- ✅ All migrations verified

**Cons:**

- ❌ Data loss
- ❌ Downtime required
- ❌ Not viable for production

#### Option 3: Manual Schema Verification

**Best for**: When you need to verify schema integrity.

```bash
# Export current schema
pg_dump -h $HOST -U $USER --schema-only $DATABASE > actual_schema.sql

# Create clean DB and run all migrations
createdb test_migration_db
goose -dir migrations postgres "postgresql://...test_migration_db" up
pg_dump --schema-only test_migration_db > expected_schema.sql

# Compare
diff actual_schema.sql expected_schema.sql
```

If schemas match, use Option 1. If they differ, manual reconciliation is needed.

### Step-by-Step Recovery (Option 1)

**1. Identify Missing Migrations**

```bash
# Get current goose status
goose -dir migrations postgres "$DATABASE_URL" status

# Check actual database objects
psql "$DATABASE_URL" -c "\dt"  # Tables
psql "$DATABASE_URL" -c "\dT"  # Types
```

**2. Determine Missing Version IDs**

Compare goose status output with migration files in `migrations/` directory:

```bash
# List all migration files
ls -1 migrations/*.sql | sed 's/.*\/\([0-9]*\)_.*/\1/'

# Compare with goose_db_version table
psql "$DATABASE_URL" -c "SELECT version_id FROM goose_db_version ORDER BY version_id;"
```

**3. Create Sync Migration**

**CRITICAL**: Filename timestamp must be BEFORE pending migrations.

```bash
# If pending migrations start at 20251224000000
# Sync migration should be 20251223000000 or earlier

goose -dir migrations create sync_goose_db_version sql
mv migrations/YYYYMMDD_sync_goose_db_version.sql \
   migrations/20251223000000_sync_goose_db_version.sql
```

**4. Write Sync Logic**

Use the template from Option 1 above, filling in all missing version_ids.

**5. Test Locally**

```bash
# Test on dev database first
goose -dir migrations postgres "$DEV_DATABASE_URL" status
goose -dir migrations postgres "$DEV_DATABASE_URL" up
goose -dir migrations postgres "$DEV_DATABASE_URL" status
```

**6. Commit and Deploy**

```bash
git add migrations/20251223000000_sync_goose_db_version.sql
git commit -m "fix(db): sync goose_db_version with actual schema

Resolves desynchronization where DB contained applied migrations
but goose_db_version table was missing records.

Migrations synchronized: 20251224000000 through 20260108000001"
git push
```

**7. Verify ArgoCD Sync**

```bash
# Watch migration job
kubectl get jobs -n dev-my-girok -w

# Check logs
kubectl logs -n dev-my-girok -l app.kubernetes.io/component=migration

# Verify final status
kubectl exec -n dev-my-girok deployment/auth-service -- \
  goose -dir /app/services/auth-service/migrations postgres "$DATABASE_URL" status
```

### Common Mistakes During Recovery

#### Mistake 1: Wrong Timestamp

```
❌ 20260116000000_sync_goose_db_version.sql
✅ 20251223000000_sync_goose_db_version.sql
```

If sync migration timestamp is AFTER pending migrations, goose will try to run pending migrations first, causing the same errors.

#### Mistake 2: Missing StatementBegin/End

```sql
❌ DO $$ ... END $$;  -- Will fail with "unterminated dollar-quoted string"

✅ -- +goose StatementBegin
   DO $$ ... END $$;
   -- +goose StatementEnd
```

#### Mistake 3: Using ON CONFLICT Without Constraint

```sql
❌ INSERT INTO goose_db_version ... ON CONFLICT (version_id) DO NOTHING;
   -- ERROR: no unique constraint on version_id

✅ IF NOT EXISTS (SELECT 1 FROM goose_db_version WHERE version_id = ...) THEN
     INSERT INTO goose_db_version ...
   END IF;
```

#### Mistake 4: Incomplete Version List

If you miss even one version_id in the sync migration, subsequent migrations may still fail due to dependency on that missing migration's objects.

**Solution**: Cross-reference migration files with goose_db_version thoroughly.

### Monitoring and Alerting

To prevent future desynchronization:

**1. Post-Migration Verification**

Add verification step to migration jobs:

```yaml
command:
  - /bin/sh
  - -c
  - |
    goose -dir /app/services/auth-service/migrations postgres "$DATABASE_URL" up

    # Verify all migrations applied
    PENDING=$(goose -dir /app/services/auth-service/migrations postgres "$DATABASE_URL" status | grep Pending | wc -l)
    if [ "$PENDING" -gt 0 ]; then
      echo "ERROR: Pending migrations detected after 'up' command"
      exit 1
    fi
```

**2. Schema Drift Detection**

Periodically compare prisma schema with database:

```bash
# In CI/CD pipeline
pnpm prisma db pull
git diff --exit-code prisma/schema.prisma || {
  echo "WARNING: Prisma schema drift detected"
  exit 1
}
```

**3. Audit Logging**

Log all database schema changes:

```sql
CREATE TABLE IF NOT EXISTS schema_change_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  timestamp TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  migration_version BIGINT,
  applied_by TEXT,
  source TEXT -- 'goose', 'manual', 'unknown'
);
```

### Related Documentation

- **Database Policy**: `docs/llm/policies/database.md`
- **Migration Guide**: `docs/en/guides/db-migration.md`
- **goose Official Docs**: https://github.com/pressly/goose

### Real-World Example

**Incident**: auth-service Phase 1 migration failure (2026-01-16)

**Timeline**:

- Database contained schema from 25 migrations
- goose_db_version only recorded 2 migrations
- Phase 1 migrations (20260116000001-5) failed with "already exists" errors

**Resolution**:

1. Created `20251223000000_sync_goose_db_version.sql`
2. Backfilled 25 missing goose_db_version records
3. Phase 1 migrations applied successfully
4. Total migrations: 33 (verified via `goose status`)

**Lessons Learned**:

- Always verify goose status after any schema change
- Never trust database state without goose_db_version verification
- Test recovery procedures in dev before applying to production
- Document desynchronization incidents for future reference

---

**Last Updated**: 2026-01-16
**Maintainer**: Platform Team
